from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, products, orders, payments, tables, sessions, dashboard
from app.websocket_manager import router as ws_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Velvet & Vapor Cafe POS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(tables.router, prefix="/api/tables", tags=["tables"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(ws_router)

@app.get("/")
def health():
    return {"status": "Velvet & Vapor Cafe POS running"}