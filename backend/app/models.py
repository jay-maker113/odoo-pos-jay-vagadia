from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class TableStatus(str, enum.Enum):
    free = "free"
    occupied = "occupied"
    bill_requested = "bill_requested"

class OrderStatus(str, enum.Enum):
    draft = "draft"
    sent_to_kitchen = "sent_to_kitchen"
    ready = "ready"
    paid = "paid"
    cancelled = "cancelled"

class KitchenStage(str, enum.Enum):
    to_cook = "to_cook"
    preparing = "preparing"
    completed = "completed"

class SessionStatus(str, enum.Enum):
    open = "open"
    closed = "closed"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Floor(Base):
    __tablename__ = "floors"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    tables = relationship("RestaurantTable", back_populates="floor")

class RestaurantTable(Base):
    __tablename__ = "restaurant_tables"
    id = Column(Integer, primary_key=True)
    table_number = Column(Integer, nullable=False)
    seats = Column(Integer, default=4)
    status = Column(Enum(TableStatus), default=TableStatus.free)
    is_active = Column(Boolean, default=True)
    floor_id = Column(Integer, ForeignKey("floors.id"))
    floor = relationship("Floor", back_populates="tables")
    orders = relationship("Order", back_populates="table")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = relationship("Category", back_populates="products")
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    send_to_kitchen = Column(Boolean, default=True)
    tax_percent = Column(Float, default=5.0)
    attributes = relationship("ProductAttribute", back_populates="product", cascade="all, delete-orphan")


class ProductAttribute(Base):
    __tablename__ = "product_attributes"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    name = Column(String, nullable=False)  # e.g. "Pack"
    product = relationship("Product", back_populates="attributes")
    values = relationship("ProductAttributeValue", back_populates="attribute", cascade="all, delete-orphan")


class ProductAttributeValue(Base):
    __tablename__ = "product_attribute_values"
    id = Column(Integer, primary_key=True)
    attribute_id = Column(Integer, ForeignKey("product_attributes.id"))
    value = Column(String, nullable=False)   # e.g. "6 items"
    extra_price = Column(Float, default=0.0) # e.g. 50.0
    attribute = relationship("ProductAttribute", back_populates="values")

class PaymentMethod(Base):
    __tablename__ = "payment_methods"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)  # cash, digital, upi
    is_enabled = Column(Boolean, default=True)
    upi_id = Column(String, nullable=True)

class POSSession(Base):
    __tablename__ = "pos_sessions"
    id = Column(Integer, primary_key=True)
    status = Column(Enum(SessionStatus), default=SessionStatus.open)
    opened_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
    opened_by = Column(Integer, ForeignKey("users.id"))
    total_sales = Column(Float, default=0.0)
    orders = relationship("Order", back_populates="session")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    order_number = Column(String, unique=True, nullable=False)
    table_id = Column(Integer, ForeignKey("restaurant_tables.id"))
    session_id = Column(Integer, ForeignKey("pos_sessions.id"))
    status = Column(Enum(OrderStatus), default=OrderStatus.draft)
    kitchen_stage = Column(Enum(KitchenStage), nullable=True)
    total_amount = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    table = relationship("RestaurantTable", back_populates="orders")
    session = relationship("POSSession", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False)

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=False)
    order = relationship("Order", back_populates="items")
    product = relationship("Product")

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True)
    method = Column(String, nullable=False)  # cash, digital, upi
    amount = Column(Float, nullable=False)
    paid_at = Column(DateTime(timezone=True), server_default=func.now())
    order = relationship("Order", back_populates="payment")
