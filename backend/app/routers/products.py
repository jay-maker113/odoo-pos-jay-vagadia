from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product, Category

router = APIRouter()

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

@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    return [{"id": c.id, "name": c.name} for c in db.query(Category).all()]