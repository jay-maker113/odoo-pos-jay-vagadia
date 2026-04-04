from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.sql import func
from app.database import get_db
from app.models import Order, OrderStatus, Payment, RestaurantTable, TableStatus, POSSession, SessionStatus
from datetime import datetime, date

router = APIRouter()

@router.get("/")
def get_dashboard(db: Session = Depends(get_db)):
    today = date.today()

    today_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.status == OrderStatus.paid,
        func.date(Order.created_at) == today
    ).scalar() or 0.0

    today_orders = db.query(func.count(Order.id)).filter(
        Order.status == OrderStatus.paid,
        func.date(Order.created_at) == today
    ).scalar() or 0

    occupied_tables = db.query(func.count(RestaurantTable.id)).filter(
        RestaurantTable.status == TableStatus.occupied
    ).scalar() or 0

    total_tables = db.query(func.count(RestaurantTable.id)).filter(
        RestaurantTable.is_active == True
    ).scalar() or 0

    active_session = db.query(POSSession).filter(
        POSSession.status == SessionStatus.open
    ).first()

    active_orders = db.query(func.count(Order.id)).filter(
        Order.status.in_([OrderStatus.draft, OrderStatus.sent_to_kitchen, OrderStatus.ready])
    ).scalar() or 0

    # Top products today
    top_products = db.execute(
        text("""
        SELECT p.name, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.unit_price) as revenue
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status = 'paid' AND date(o.created_at) = :today
        GROUP BY p.name
        ORDER BY total_qty DESC
        LIMIT 5
    """),
        {"today": str(today)}
    ).fetchall()

    return {
        "today_revenue": round(today_revenue, 2),
        "today_orders": today_orders,
        "occupied_tables": occupied_tables,
        "total_tables": total_tables,
        "active_orders": active_orders,
        "session_open": active_session is not None,
        "session_id": active_session.id if active_session else None,
        "top_products": [
            {"name": r[0], "qty": r[1], "revenue": round(r[2], 2)}
            for r in top_products
        ]
    }
