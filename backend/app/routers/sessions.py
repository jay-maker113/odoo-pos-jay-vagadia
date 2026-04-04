from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database import get_db
from app.models import POSSession, SessionStatus, Order, OrderStatus
from app.routers.auth import get_current_user
from app.models import User
from datetime import datetime

router = APIRouter()

@router.post("/open")
def open_session(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(POSSession).filter(POSSession.status == SessionStatus.open).first()
    if existing:
        return {"id": existing.id, "status": existing.status, "opened_at": existing.opened_at}
    session = POSSession(opened_by=current_user.id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"id": session.id, "status": session.status, "opened_at": session.opened_at}

@router.get("/active")
def get_active_session(db: Session = Depends(get_db)):
    session = db.query(POSSession).filter(POSSession.status == SessionStatus.open).first()
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return {"id": session.id, "status": session.status, "opened_at": session.opened_at}

@router.post("/{session_id}/close")
def close_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(POSSession).filter(POSSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    total = db.query(func.sum(Order.total_amount)).filter(
        Order.session_id == session_id,
        Order.status == OrderStatus.paid
    ).scalar() or 0
    session.status = SessionStatus.closed
    session.closed_at = datetime.utcnow()
    session.total_sales = total
    db.commit()
    return {"id": session.id, "total_sales": total, "status": session.status}