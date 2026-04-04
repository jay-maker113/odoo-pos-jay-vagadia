from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import RestaurantTable, Floor
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class TableCreate(BaseModel):
    table_number: int
    seats: int
    floor_id: int


class TableUpdate(BaseModel):
    seats: Optional[int] = None
    is_active: Optional[bool] = None


class FloorCreate(BaseModel):
    name: str

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
            "floor_name": t.floor.name if t.floor else None,
            "is_active": t.is_active
        }
        for t in tables
    ]


@router.get("/all")
def get_all_tables(db: Session = Depends(get_db)):
    tables = db.query(RestaurantTable).all()
    return [
        {
            "id": t.id,
            "table_number": t.table_number,
            "seats": t.seats,
            "status": t.status,
            "floor_id": t.floor_id,
            "floor_name": t.floor.name if t.floor else None,
            "is_active": t.is_active
        }
        for t in tables
    ]


@router.post("/")
def create_table(req: TableCreate, db: Session = Depends(get_db)):
    existing = db.query(RestaurantTable).filter(
        RestaurantTable.table_number == req.table_number,
        RestaurantTable.floor_id == req.floor_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Table number already exists on this floor")
    table = RestaurantTable(
        table_number=req.table_number,
        seats=req.seats,
        floor_id=req.floor_id,
        is_active=True
    )
    db.add(table)
    db.commit()
    db.refresh(table)
    return {
        "id": table.id,
        "table_number": table.table_number,
        "seats": table.seats,
        "status": table.status,
        "floor_id": table.floor_id,
        "is_active": table.is_active
    }


@router.patch("/{table_id}")
def update_table(table_id: int, req: TableUpdate, db: Session = Depends(get_db)):
    table = db.query(RestaurantTable).filter(RestaurantTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if req.seats is not None:
        table.seats = req.seats
    if req.is_active is not None:
        table.is_active = req.is_active
    db.commit()
    return {"id": table.id, "table_number": table.table_number,
            "seats": table.seats, "is_active": table.is_active}

@router.patch("/{table_id}/status")
def update_table_status(table_id: int, payload: dict, db: Session = Depends(get_db)):
    table = db.query(RestaurantTable).filter(RestaurantTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    table.status = payload["status"]
    db.commit()
    return {"id": table.id, "status": table.status}

@router.get("/floors")
def get_floors(db: Session = Depends(get_db)):
    floors = db.query(Floor).all()
    return [{"id": f.id, "name": f.name} for f in floors]


@router.post("/floors")
def create_floor(req: FloorCreate, db: Session = Depends(get_db)):
    existing = db.query(Floor).filter(Floor.name == req.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Floor with this name already exists")
    floor = Floor(name=req.name)
    db.add(floor)
    db.commit()
    db.refresh(floor)
    return {"id": floor.id, "name": floor.name}
