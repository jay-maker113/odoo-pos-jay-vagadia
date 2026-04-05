from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product, Category, ProductAttribute, ProductAttributeValue
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()


class AttributeValueIn(BaseModel):
    value: str
    extra_price: float = 0.0


class AttributeIn(BaseModel):
    name: str
    values: List[AttributeValueIn]


class ProductCreate(BaseModel):
    name: str
    price: float
    category_id: Optional[int] = None
    tax_percent: float = 5.0
    send_to_kitchen: bool = True
    description: Optional[str] = None
    unit: Optional[str] = "piece"
    attributes: Optional[List[AttributeIn]] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[int] = None
    tax_percent: Optional[float] = None
    send_to_kitchen: Optional[bool] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    attributes: Optional[List[AttributeIn]] = None
    is_active: Optional[bool] = None


def serialize_product(product):
    return {
        "id": product.id,
        "name": product.name,
        "price": product.price,
        "category_id": product.category_id,
        "category": product.category.name if product.category else None,
        "tax_percent": product.tax_percent,
        "send_to_kitchen": product.send_to_kitchen,
        "description": product.description or "",
        "unit": product.unit or "piece",
        "is_active": product.is_active,
        "attributes": [
            {
                "id": a.id,
                "name": a.name,
                "values": [
                    {"id": v.id, "value": v.value, "extra_price": v.extra_price}
                    for v in a.values
                ]
            }
            for a in product.attributes
        ]
    }

@router.get("/")
def get_products(db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.is_active == True).all()
    return [serialize_product(p) for p in products]


@router.get("/all")
def get_all_products(db: Session = Depends(get_db)):
    products = db.query(Product).order_by(Product.id.desc()).all()
    return [serialize_product(p) for p in products]


@router.post("/")
def create_product(req: ProductCreate, db: Session = Depends(get_db)):
    product = Product(
        name=req.name,
        price=req.price,
        category_id=req.category_id,
        tax_percent=req.tax_percent,
        send_to_kitchen=req.send_to_kitchen,
        description=req.description,
        unit=req.unit,
        is_active=True,
    )
    db.add(product)
    db.flush()

    for attr in (req.attributes or []):
        attribute = ProductAttribute(product_id=product.id, name=attr.name)
        db.add(attribute)
        db.flush()
        for val in attr.values:
            db.add(ProductAttributeValue(
                attribute_id=attribute.id,
                value=val.value,
                extra_price=val.extra_price
            ))

    db.commit()
    db.refresh(product)
    return serialize_product(product)


@router.patch("/{product_id}")
def update_product(product_id: int, req: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    payload = req.dict(exclude_unset=True)

    if "name" in payload:
        product.name = payload["name"]
    if "price" in payload:
        product.price = payload["price"]
    if "category_id" in payload:
        product.category_id = payload["category_id"]
    if "tax_percent" in payload:
        product.tax_percent = payload["tax_percent"]
    if "send_to_kitchen" in payload:
        product.send_to_kitchen = payload["send_to_kitchen"]
    if "description" in payload:
        product.description = payload["description"]
    if "unit" in payload:
        product.unit = payload["unit"]
    if "is_active" in payload:
        product.is_active = payload["is_active"]
    if "attributes" in payload:
        db.query(ProductAttribute).filter(ProductAttribute.product_id == product.id).delete()
        db.flush()
        for attr in payload["attributes"]:
            attribute = ProductAttribute(product_id=product.id, name=attr.name)
            db.add(attribute)
            db.flush()
            for val in attr.values:
                db.add(ProductAttributeValue(
                    attribute_id=attribute.id,
                    value=val.value,
                    extra_price=val.extra_price
                ))

    db.commit()
    db.refresh(product)
    return serialize_product(product)


@router.get("/{product_id}/variants")
def get_product_variants(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return serialize_product(product)

@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    return [{"id": c.id, "name": c.name} for c in db.query(Category).all()]
