from app.database import SessionLocal, engine, Base
from app.models import *
from passlib.context import CryptContext

Base.metadata.create_all(bind=engine)
pwd = CryptContext(schemes=["bcrypt"])
db = SessionLocal()

# Admin user
admin = User(name="Admin", email="admin@velvetvapor.com",
             hashed_password=pwd.hash("admin123"), is_admin=True)
db.add(admin)

# Floors
gf = Floor(name="Ground Floor")
ff = Floor(name="First Floor")
db.add_all([gf, ff])
db.flush()

# Tables
for i in [1, 2, 3, 4, 5, 6]:
    db.add(RestaurantTable(table_number=i, seats=4, floor_id=gf.id))
for i in [7, 8, 9]:
    db.add(RestaurantTable(table_number=i, seats=6, floor_id=ff.id))

# Categories
food = Category(name="Food")
drinks = Category(name="Drinks")
desserts = Category(name="Desserts")
db.add_all([food, drinks, desserts])
db.flush()

# Products
products = [
    Product(name="Margherita Pizza", price=320, category_id=food.id, tax_percent=5),
    Product(name="Pasta Arrabbiata", price=280, category_id=food.id, tax_percent=5),
    Product(name="Truffle Burger", price=350, category_id=food.id, tax_percent=5),
    Product(name="Cappuccino", price=120, category_id=drinks.id, tax_percent=0),
    Product(name="Cold Brew", price=150, category_id=drinks.id, tax_percent=0),
    Product(name="Sparkling Water", price=80, category_id=drinks.id, tax_percent=0),
    Product(name="Tiramisu", price=180, category_id=desserts.id, tax_percent=5),
    Product(name="Chocolate Lava Cake", price=200, category_id=desserts.id, tax_percent=5),
]
db.add_all(products)

# Payment methods
db.add_all([
    PaymentMethod(name="cash", is_enabled=True),
    PaymentMethod(name="digital", is_enabled=True),
    PaymentMethod(name="upi", is_enabled=True, upi_id="velvetvapor@ybl"),
])

db.commit()
db.close()
print("✅ Seeded Velvet & Vapor Cafe")