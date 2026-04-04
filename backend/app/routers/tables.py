from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import RestaurantTable, Floor

router = APIRouter()

@router.get("/")
def get_tables(db: Session = Depends(get_db)):
    tables = db.query(RestaurantTable).filter(RestaurantTable.is_active == True).all()
    return [
        {
            "id": t.id,
            "table_number": t.table_number,
            "seats": t.seats,
            "status": t.status,
            "floor_id": t.floor_id,
            "floor_name": t.floor.name if t.floor else None
        }
        for t in tables
    ]

@router.patch("/{table_id}/status")
def update_table_status(table_id: int, payload: dict, db: Session = Depends(get_db)):
    table = db.query(RestaurantTable).filter(RestaurantTable.id == table_id).first()
    if not table:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Table not found")
    table.status = payload["status"]
    db.commit()
    return {"id": table.id, "status": table.status}

@router.get("/floors")
def get_floors(db: Session = Depends(get_db)):
    floors = db.query(Floor).all()
    return [{"id": f.id, "name": f.name} for f in floors]