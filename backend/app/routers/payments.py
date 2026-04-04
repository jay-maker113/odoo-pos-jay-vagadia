from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Order, OrderStatus, Payment, RestaurantTable, TableStatus, PaymentMethod
from app.websocket_manager import manager
from pydantic import BaseModel
from typing import Optional
import qrcode
import qrcode.image.svg
from io import BytesIO
import base64

router = APIRouter()

class PaymentRequest(BaseModel):
    order_id: int
    method: str  # cash, digital, upi
    amount: float


class PaymentMethodUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    upi_id: Optional[str] = None

@router.get("/methods")
def get_payment_methods(db: Session = Depends(get_db)):
    methods = db.query(PaymentMethod).filter(PaymentMethod.is_enabled == True).all()
    return [{"id": m.id, "name": m.name, "upi_id": m.upi_id} for m in methods]


@router.get("/methods-all")
def get_all_payment_methods(db: Session = Depends(get_db)):
    methods = db.query(PaymentMethod).all()
    return [{"id": m.id, "name": m.name, "is_enabled": m.is_enabled, "upi_id": m.upi_id} for m in methods]


@router.patch("/methods/{method_id}")
def update_payment_method(method_id: int, req: PaymentMethodUpdate, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    method = db.query(PaymentMethod).filter(PaymentMethod.id == method_id).first()
    if not method:
        raise HTTPException(status_code=404, detail="Method not found")
    if req.is_enabled is not None:
        method.is_enabled = req.is_enabled
    if req.upi_id is not None:
        method.upi_id = req.upi_id
    db.commit()
    return {"id": method.id, "name": method.name, "is_enabled": method.is_enabled, "upi_id": method.upi_id}

@router.get("/upi-qr")
def generate_upi_qr(amount: float, db: Session = Depends(get_db)):
    upi_method = db.query(PaymentMethod).filter(PaymentMethod.name == "upi").first()
    upi_id = upi_method.upi_id if upi_method else "velvetvapor@ybl"

    upi_string = f"upi://pay?pa={upi_id}&pn=Velvet%20%26%20Vapor%20Cafe&am={amount}&cu=INR"

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(upi_string)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode()

    return {"qr_base64": encoded, "upi_id": upi_id, "amount": amount}

@router.post("/")
async def process_payment(req: PaymentRequest, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == req.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == OrderStatus.paid:
        raise HTTPException(status_code=400, detail="Order already paid")

    payment = Payment(order_id=order.id, method=req.method, amount=req.amount)
    db.add(payment)

    order.status = OrderStatus.paid
    table = db.query(RestaurantTable).filter(RestaurantTable.id == order.table_id).first()
    if table:
        table.status = TableStatus.free

    db.commit()

    # Broadcast to customer display
    await manager.broadcast("customer-display", {
        "event": "payment_confirmed",
        "order_number": order.order_number,
        "table_number": table.table_number if table else None,
        "amount": req.amount,
        "method": req.method
    })

    # Broadcast table status update to POS
    await manager.broadcast("pos", {
        "event": "table_update",
        "table_id": order.table_id,
        "status": "free"
    })

    return {"success": True, "order_number": order.order_number, "amount": req.amount}
