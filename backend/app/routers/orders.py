from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Order, OrderItem, Product, RestaurantTable, TableStatus, OrderStatus, KitchenStage, POSSession, SessionStatus
from app.websocket_manager import manager
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import qrcode
from io import BytesIO
import base64
import uuid

router = APIRouter()

class OrderItemIn(BaseModel):
    product_id: int
    quantity: int

class CreateOrderRequest(BaseModel):
    table_id: int
    items: List[OrderItemIn]
    session_id: Optional[int] = None

class UpdateItemsRequest(BaseModel):
    items: List[OrderItemIn]

def serialize_order(order: Order):
    return {
        "id": order.id,
        "order_number": order.order_number,
        "table_id": order.table_id,
        "table_number": order.table.table_number if order.table else None,
        "status": order.status,
        "kitchen_stage": order.kitchen_stage,
        "total_amount": order.total_amount,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "items": [
            {
                "id": i.id,
                "product_id": i.product_id,
                "product_name": i.product.name if i.product else None,
                "quantity": i.quantity,
                "unit_price": i.unit_price,
                "subtotal": i.quantity * i.unit_price,
            }
            for i in order.items
        ]
    }


def serialize_customer_order(order: Order, status_override: Optional[str] = None):
    return {
        "event": "order_update",
        "order_number": order.order_number,
        "table_number": order.table.table_number if order.table else None,
        "items": [
            {
                "name": i.product.name if i.product else "Item",
                "quantity": i.quantity,
                "price": i.unit_price * i.quantity,
            }
            for i in order.items
        ],
        "total": order.total_amount,
        "status": status_override or (
            "ready" if order.status == OrderStatus.ready else
            "preparing" if order.status == OrderStatus.sent_to_kitchen else
            "unpaid"
        ),
        "kitchen_stage": order.kitchen_stage,
    }

@router.get("/self-order-qr/{table_id}")
def get_self_order_qr(table_id: int, db: Session = Depends(get_db)):
    table = db.query(RestaurantTable).filter(RestaurantTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    # Token is just table_id encoded - simple, no JWT overhead
    token = base64.b64encode(f"table:{table_id}".encode()).decode()
    
    url = f"http://localhost:5173/self-order/{token}"
    
    qr = qrcode.QRCode(version=1, box_size=8, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "token": token,
        "table_id": table_id,
        "table_number": table.table_number,
        "qr_base64": encoded,
        "url": url
    }

@router.post("/")
async def create_order(req: CreateOrderRequest, db: Session = Depends(get_db)):
    if req.session_id:
        session = db.query(POSSession).filter(
            POSSession.id == req.session_id,
            POSSession.status == SessionStatus.open
        ).first()
    else:
        session = db.query(POSSession).filter(
            POSSession.status == SessionStatus.open
        ).first()
    if not session:
        raise HTTPException(status_code=400, detail="No active POS session. Open a session first.")

    table = db.query(RestaurantTable).filter(RestaurantTable.id == req.table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    # Check for existing active order on this table
    existing = db.query(Order).filter(
        Order.table_id == req.table_id,
        Order.status.in_([OrderStatus.draft, OrderStatus.sent_to_kitchen])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Table already has an active order #{existing.order_number}")

    order_number = f"ORD-{datetime.now().strftime('%H%M%S')}-{str(uuid.uuid4())[:4].upper()}"
    
    total = 0.0
    order_items = []
    for item in req.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        subtotal = product.price * item.quantity
        total += subtotal
        order_items.append(OrderItem(product_id=item.product_id,
                                      quantity=item.quantity,
                                      unit_price=product.price))

    order = Order(
        order_number=order_number,
        table_id=req.table_id,
        session_id=session.id,
        status=OrderStatus.draft,
        total_amount=total,
        items=order_items
    )
    db.add(order)
    table.status = TableStatus.occupied
    db.commit()
    db.refresh(order)
    await manager.broadcast("customer-display", serialize_customer_order(order))
    return serialize_order(order)

@router.post("/self-order")
async def place_self_order(req: CreateOrderRequest, db: Session = Depends(get_db)):
    if req.session_id:
        session = db.query(POSSession).filter(
            POSSession.id == req.session_id,
            POSSession.status == SessionStatus.open
        ).first()
    else:
        session = db.query(POSSession).filter(
            POSSession.status == SessionStatus.open
        ).first()
    if not session:
        raise HTTPException(status_code=400, detail="No active POS session")

    table = db.query(RestaurantTable).filter(RestaurantTable.id == req.table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    existing = db.query(Order).filter(
        Order.table_id == req.table_id,
        Order.status.in_([OrderStatus.draft, OrderStatus.sent_to_kitchen])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Table already has an active order")

    order_number = f"SELF-{datetime.now().strftime('%H%M%S')}-{str(uuid.uuid4())[:4].upper()}"

    total = 0.0
    order_items = []
    for item in req.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        subtotal = product.price * item.quantity
        total += subtotal
        order_items.append(OrderItem(
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=product.price
        ))

    order = Order(
        order_number=order_number,
        table_id=req.table_id,
        session_id=session.id,
        status=OrderStatus.sent_to_kitchen,
        kitchen_stage=KitchenStage.to_cook,
        total_amount=total,
        items=order_items
    )
    db.add(order)
    table.status = TableStatus.occupied
    db.commit()
    db.refresh(order)

    # Auto broadcast to kitchen
    await manager.broadcast("kitchen", {
        "event": "new_order",
        "order": serialize_order(order)
    })

    await manager.broadcast("customer-display", serialize_customer_order(order, "preparing"))

    return serialize_order(order)

@router.get("/")
def get_orders(db: Session = Depends(get_db)):
    orders = db.query(Order).filter(
        Order.status.in_([OrderStatus.draft, OrderStatus.sent_to_kitchen, OrderStatus.ready])
    ).all()
    return [serialize_order(o) for o in orders]

@router.get("/history")
def get_order_history(db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.status == OrderStatus.paid).order_by(Order.id.desc()).limit(20).all()
    return [serialize_order(o) for o in orders]


@router.get("/customer-display/current")
def get_current_customer_order(db: Session = Depends(get_db)):
    order = db.query(Order).filter(
        Order.status.in_([OrderStatus.draft, OrderStatus.sent_to_kitchen, OrderStatus.ready])
    ).order_by(Order.id.desc()).first()
    if not order:
        raise HTTPException(status_code=404, detail="No active order for customer display")
    return serialize_customer_order(order)

@router.get("/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return serialize_order(order)

@router.get("/table/{table_id}")
def get_table_order(table_id: int, session_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Order).filter(
        Order.table_id == table_id,
        Order.status.in_([OrderStatus.draft, OrderStatus.sent_to_kitchen, OrderStatus.ready])
    )
    if session_id:
        query = query.filter(Order.session_id == session_id)

    order = query.first()
    if not order:
        raise HTTPException(status_code=404, detail="No active order for this table")
    return serialize_order(order)

@router.patch("/{order_id}/items")
async def update_order_items(order_id: int, req: UpdateItemsRequest, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == OrderStatus.paid:
        raise HTTPException(status_code=400, detail="Cannot modify a paid order")

    # Clear and rebuild items
    for item in order.items:
        db.delete(item)
    db.flush()

    total = 0.0
    for item in req.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        subtotal = product.price * item.quantity
        total += subtotal
        db.add(OrderItem(order_id=order.id, product_id=item.product_id,
                          quantity=item.quantity, unit_price=product.price))

    order.total_amount = total
    db.commit()
    db.refresh(order)
    await manager.broadcast("customer-display", serialize_customer_order(order))
    return serialize_order(order)

@router.post("/{order_id}/request-bill")
async def request_bill(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == OrderStatus.paid:
        raise HTTPException(status_code=400, detail="Paid orders cannot request bill")

    table = db.query(RestaurantTable).filter(RestaurantTable.id == order.table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    table.status = TableStatus.bill_requested
    db.commit()

    await manager.broadcast("pos", {
        "event": "table_update",
        "table_id": order.table_id,
        "status": TableStatus.bill_requested,
    })

    return {
        "order_id": order.id,
        "table_id": order.table_id,
        "table_status": table.status,
    }

@router.post("/{order_id}/send-to-kitchen")
async def send_to_kitchen(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = OrderStatus.sent_to_kitchen
    order.kitchen_stage = KitchenStage.to_cook
    db.commit()
    db.refresh(order)

    # Broadcast to kitchen display
    await manager.broadcast("kitchen", {
        "event": "new_order",
        "order": serialize_order(order)
    })

    await manager.broadcast("customer-display", serialize_customer_order(order, "preparing"))

    return serialize_order(order)

@router.patch("/{order_id}/kitchen-stage")
async def update_kitchen_stage(order_id: int, payload: dict, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.kitchen_stage = payload["stage"]
    if payload["stage"] == KitchenStage.completed:
        order.status = OrderStatus.ready
    db.commit()
    db.refresh(order)

    # Broadcast stage update to POS
    await manager.broadcast("pos", {
        "event": "kitchen_update",
        "order_id": order.id,
        "stage": order.kitchen_stage,
        "status": order.status
    })

    await manager.broadcast("customer-display", {
        "event": "kitchen_update",
        "order_number": order.order_number,
        "table_number": order.table.table_number if order.table else None,
        "stage": order.kitchen_stage,
        "status": order.status,
    })

    return {"order_id": order.id, "kitchen_stage": order.kitchen_stage}
