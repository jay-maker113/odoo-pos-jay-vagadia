from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product, Category
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class ProductCreate(BaseModel):
    name: str
    price: float
    category_id: Optional[int] = None
    tax_percent: float = 5.0
    send_to_kitchen: bool = True

@router.get("/")
def get_products(db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.is_active == True).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "category": p.category.name if p.category else None,
            "tax_percent": p.tax_percent,
            "send_to_kitchen": p.send_to_kitchen,
        }
        for p in products
    ]


@router.post("/")
def create_product(req: ProductCreate, db: Session = Depends(get_db)):
    product = Product(**req.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return {
        "id": product.id,
        "name": product.name,
        "price": product.price,
        "category": product.category.name if product.category else None,
        "tax_percent": product.tax_percent,
    }

@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    return [{"id": c.id, "name": c.name} for c in db.query(Category).all()]
