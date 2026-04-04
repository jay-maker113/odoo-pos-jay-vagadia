from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database import get_db
from app.models import POSSession, SessionStatus, Order, OrderStatus
from app.routers.auth import get_current_user
from app.models import User
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class OpenSessionRequest(BaseModel):
    terminal_name: Optional[str] = "Main Terminal"


@router.post("/open")
def open_session(
    req: OpenSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    terminal_name = (req.terminal_name or "Main Terminal").strip() or "Main Terminal"
    existing_name = db.query(POSSession).filter(
        POSSession.terminal_name == terminal_name,
        POSSession.status == SessionStatus.open
    ).first()
    if existing_name:
        raise HTTPException(
            status_code=400,
            detail=f"Terminal '{terminal_name}' is already open"
        )

    session = POSSession(
        opened_by=current_user.id,
        terminal_name=terminal_name
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "terminal_name": session.terminal_name,
        "status": session.status,
        "opened_at": session.opened_at
    }

@router.get("/active")
def get_active_sessions(db: Session = Depends(get_db)):
    sessions = db.query(POSSession).filter(
        POSSession.status == SessionStatus.open
    ).all()
    return [
        {
            "id": s.id,
            "terminal_name": s.terminal_name,
            "status": s.status,
            "opened_at": s.opened_at.isoformat() if s.opened_at else None,
            "order_count": len([o for o in s.orders if o.status != OrderStatus.cancelled]),
        }
        for s in sessions
    ]


@router.get("/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(POSSession).filter(POSSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    paid_orders = db.query(func.count(Order.id)).filter(
        Order.session_id == session_id,
        Order.status == OrderStatus.paid
    ).scalar() or 0
    active_orders = db.query(func.count(Order.id)).filter(
        Order.session_id == session_id,
        Order.status.in_([OrderStatus.draft, OrderStatus.sent_to_kitchen, OrderStatus.ready])
    ).scalar() or 0
    total_sales = db.query(func.sum(Order.total_amount)).filter(
        Order.session_id == session_id,
        Order.status == OrderStatus.paid
    ).scalar() or 0
    user = db.query(User).filter(User.id == session.opened_by).first()
    return {
        "id": session.id,
        "terminal_name": session.terminal_name,
        "status": session.status,
        "opened_at": session.opened_at.isoformat() if session.opened_at else None,
        "closed_at": session.closed_at.isoformat() if session.closed_at else None,
        "opened_by": user.name if user else "Unknown",
        "paid_orders": paid_orders,
        "active_orders": active_orders,
        "total_sales": total_sales if session.status == SessionStatus.open else session.total_sales,
    }

@router.get("/history/closed")
def get_session_history(db: Session = Depends(get_db)):
    sessions = db.query(POSSession).filter(
        POSSession.status == SessionStatus.closed
    ).order_by(POSSession.id.desc()).limit(10).all()

    result = []
    for s in sessions:
        user = db.query(User).filter(User.id == s.opened_by).first()
        result.append({
            "id": s.id,
            "terminal_name": s.terminal_name,
            "opened_by": user.name if user else "Unknown",
            "opened_at": s.opened_at.isoformat() if s.opened_at else None,
            "closed_at": s.closed_at.isoformat() if s.closed_at else None,
            "total_sales": s.total_sales,
            "paid_orders": db.query(func.count(Order.id)).filter(
                Order.session_id == s.id,
                Order.status == OrderStatus.paid
            ).scalar() or 0,
            "odoo_synced": True
        })
    return result


@router.post("/{session_id}/close")
def close_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(POSSession).filter(POSSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == SessionStatus.closed:
        raise HTTPException(status_code=400, detail="Session already closed")

    total = db.query(func.sum(Order.total_amount)).filter(
        Order.session_id == session_id,
        Order.status == OrderStatus.paid
    ).scalar() or 0

    order_count = db.query(func.count(Order.id)).filter(
        Order.session_id == session_id,
        Order.status == OrderStatus.paid
    ).scalar() or 0

    session.status = SessionStatus.closed
    session.closed_at = datetime.utcnow()
    session.total_sales = total
    db.commit()

    import threading
    try:
        from app.odoo_sync import push_session_to_odoo
        thread = threading.Thread(
            target=push_session_to_odoo,
            args=(session_id, total, order_count)
        )
        thread.daemon = True
        thread.start()
    except Exception as e:
        print(f"Odoo sync thread failed: {e}")

    return {
        "id": session.id,
        "terminal_name": session.terminal_name,
        "total_sales": total,
        "status": session.status
    }
