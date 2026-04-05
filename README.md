# Velvet & Vapor Cafe POS

> A real-time, multi-terminal Restaurant Point of Sale system built for the Odoo Hackathon.
> Cashier sends an order — kitchen sees it instantly. Payment confirmed — customer display updates live.

---

## Table of Contents

- [Overview](#overview)
- [Live Demo Flow](#live-demo-flow)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Odoo Integration](#odoo-integration)
- [Demo Credentials](#demo-credentials)
- [Screens & Flows](#screens--flows)

---

## Overview

**Velvet & Vapor Cafe POS** is a production-grade restaurant point-of-sale system that handles the complete cafe business loop — from table selection to receipt generation — with real-time coordination between the cashier terminal, kitchen display, and customer-facing display.

Built as a solo submission for the **Odoo 24-Hour Hackathon**, the system demonstrates:

- Real-time order lifecycle management via WebSockets
- Multi-terminal session support (multiple cashiers, independent sessions)
- Native UPI QR payment generation with live amount encoding
- Voice-to-order using the Web Speech API
- Self-ordering via scannable QR codes per table
- Full Odoo XML-RPC sync on session close

---

## Live Demo Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPLETE ORDER LIFECYCLE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. LOGIN          →  Staff logs in, selects or creates          │
│                        a POS terminal (Counter 1, Counter 2...)  │
│                                                                  │
│  2. FLOOR VIEW     →  See all tables (Free / Occupied /          │
│                        Bill Requested) color-coded live          │
│                                                                  │
│  3. ORDER SCREEN   →  Pick products, use Voice Order,            │
│                        adjust quantities, view cart totals        │
│                                                                  │
│  4. SEND TO        →  Kitchen Display updates INSTANTLY           │
│     KITCHEN            via WebSocket — no refresh needed         │
│                                                                  │
│  5. KITCHEN        →  Chef sees order card, advances stages:     │
│     DISPLAY            To Cook → Preparing → Completed           │
│                        Click items to strike-through as done     │
│                                                                  │
│  6. PAYMENT        →  Cash / Card (with card entry UI) /         │
│                        UPI QR (dynamic QR per amount)            │
│                                                                  │
│  7. CUSTOMER       →  Shows order items + UNPAID/PAID status     │
│     DISPLAY            Updates live when payment confirmed        │
│                                                                  │
│  8. RECEIPT        →  Itemized receipt generated, printable      │
│                        thermal-style print layout                 │
│                                                                  │
│  9. ODOO SYNC      →  Session close auto-syncs to Odoo           │
│                        via XML-RPC — visible on Dashboard         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React | 18 |
| Build Tool | Vite | Latest |
| Styling | Tailwind CSS | v4 (Vite plugin) |
| Icons | Lucide React | 0.383.0 |
| HTTP Client | Axios | Latest |
| Routing | React Router DOM | v6 |
| Backend | FastAPI | Latest |
| ORM | SQLAlchemy | 2.0 |
| Database | SQLite (dev) / PostgreSQL (prod) | — |
| Auth | JWT via python-jose | — |
| Password Hashing | passlib (bcrypt) | — |
| QR Generation | qrcode[pil] + Pillow | — |
| WebSockets | FastAPI / Starlette native | — |
| Odoo Integration | xmlrpc.client (stdlib) | — |
| PDF Export | jsPDF + jspdf-autotable | — |
| XLS Export | SheetJS (xlsx) | — |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         BROWSER CLIENTS                              │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  POS Terminal   │  │  Kitchen Display  │  │ Customer Display  │  │
│  │  (Staff Tab)    │  │  /kitchen         │  │ /customer-display │  │
│  └────────┬────────┘  └────────┬──────────┘  └────────┬──────────┘  │
│           │                    │                        │             │
│           └────────────────────┴────────────────────────┘            │
│                                │  WebSocket + REST                   │
└────────────────────────────────┼─────────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│                        FASTAPI BACKEND                               │
│                                                                      │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │
│  │  REST API    │  │ WebSocket Hub   │  │   UPI QR Generator   │   │
│  │  /api/*      │  │ /ws/{room}      │  │   qrcode[pil]        │   │
│  └──────────────┘  └─────────────────┘  └──────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    SQLite / PostgreSQL                        │   │
│  │  users · floors · tables · products · product_attributes     │   │
│  │  categories · payment_methods · pos_sessions · orders        │   │
│  │  order_items · payments                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Odoo XML-RPC Bridge (async thread)              │   │
│  │  velvet-vapor-cafe.odoo.com  ←  session close sync          │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### WebSocket Rooms

| Room | Purpose | Events |
|---|---|---|
| `kitchen` | POS → Kitchen | `new_order`, `kitchen_update` |
| `customer-display` | POS → Customer | `order_update`, `payment_confirmed` |
| `pos` | Kitchen → POS | `kitchen_update`, `table_update` |

---

## Features

### POS Terminal
- **Multi-terminal sessions** — multiple cashiers open independent sessions simultaneously; each session tracks its own orders
- **Floor View** — tables color-coded by status (Free / Occupied / Bill Requested) across multiple floors
- **Order Screen** — product grid with category tabs, cart with quantity controls, real-time total
- **Voice Ordering** — Web Speech API integration; say "two margherita one cappuccino" and items populate the cart
- **Product Variants** — multi-attribute selection (e.g. Size + Temperature) with price combinations

### Payment
- **Cash** — direct mark-as-paid
- **Card / Digital** — card entry UI with number formatting, expiry, CVV validation
- **UPI QR** — dynamic QR generated server-side with exact rupee amount encoded in the UPI deep link; scans with any UPI app
- **Receipt Generation** — itemized receipt on payment confirmation, printable thermal-style layout

### Kitchen Display
- **Real-time order cards** — appear instantly via WebSocket when cashier sends order
- **3-stage workflow** — To Cook → Preparing → Completed; click card to advance
- **Item strike-through** — click individual items to mark them prepared
- **Live connection status** — green/red indicator, auto-reconnects on disconnect

### Customer Display
- **Live order summary** — shows items, quantities, total as soon as order is sent
- **Payment status** — UNPAID badge flips to PAID with full-screen confirmation when payment processed
- **Auto-reset** — returns to idle welcome screen after 10 seconds post-payment

### Self-Ordering
- **QR per table** — staff generates table-specific QR codes from Self Order screen
- **Mobile-friendly menu** — customer scans QR, picks items, places order directly
- **Auto-kitchen routing** — self-orders bypass cashier and go straight to Kitchen Display with `SELF-` prefix

### Backend Configuration
- **Product Management** — add/edit products with name, price, category, unit, description, tax %, variants
- **Payment Methods** — toggle Cash/Digital/UPI on/off, configure UPI ID
- **Floor Plan** — create floors, add/edit/enable/disable tables
- **POS Terminal** — view active session, close terminal with sales summary

### Reports & Analytics
- **Dashboard** — today's revenue, orders, occupied tables, active orders, top products
- **Session History** — closed sessions with terminal name, staff, revenue, Odoo sync status
- **Filtered Reports** — filter by date range, session, product name, responsible staff
- **Export** — PDF (styled with headers) and XLS (with summary rows)

### Odoo Integration
- **XML-RPC sync** — on session close, sales data pushed to Odoo as a contact note
- **Non-blocking** — runs in background thread, never delays the POS response
- **Visual confirmation** — "Odoo Synced" badge on session history in Dashboard

---

## Project Structure

```
velvet-vapor-cafe/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, router registration
│   │   ├── database.py          # SQLAlchemy engine, session, Base
│   │   ├── models.py            # All DB models
│   │   ├── auth.py              # JWT utils, password hashing
│   │   ├── odoo_sync.py         # XML-RPC Odoo bridge
│   │   ├── websocket_manager.py # WebSocket room manager + /ws/{room}
│   │   └── routers/
│   │       ├── auth.py          # /api/auth/login, /signup
│   │       ├── products.py      # /api/products/ CRUD + variants
│   │       ├── orders.py        # /api/orders/ lifecycle + self-order
│   │       ├── payments.py      # /api/payments/ + UPI QR
│   │       ├── tables.py        # /api/tables/ + floors
│   │       ├── sessions.py      # /api/sessions/ multi-terminal
│   │       └── dashboard.py     # /api/dashboard/ + filtered reports
│   ├── seed.py                  # DB seed with demo data
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   └── src/
│       ├── context/
│       │   └── AuthContext.jsx  # Auth + terminal session state
│       ├── lib/
│       │   └── api.js           # Axios instance with JWT interceptor
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── ProtectedRoute.jsx
│       │   └── TerminalPicker.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Signup.jsx
│           ├── Dashboard.jsx
│           ├── FloorView.jsx
│           ├── OrderScreen.jsx
│           ├── PaymentScreen.jsx
│           ├── KitchenDisplay.jsx
│           ├── CustomerDisplay.jsx
│           ├── Reports.jsx
│           ├── SettingsPage.jsx
│           ├── SelfOrder.jsx
│           └── SelfOrderQR.jsx
│
├── docker-compose.yml
└── README.md
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (optional, for PostgreSQL)

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your values

# Seed database with demo data
python seed.py

# Start backend
uvicorn app.main:app --reload --port 8002
```

Backend runs at: `http://127.0.0.1:8002`  
API docs at: `http://127.0.0.1:8002/docs`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

### PostgreSQL (optional, via Docker)

```bash
docker compose up -d
```

Then update `DATABASE_URL` in `.env` to:
```
DATABASE_URL=postgresql://vvc:vvc123@localhost:5432/velvet_vapor
```

---

## Environment Variables

```env
# Database
DATABASE_URL=sqlite:///./velvet_vapor.db

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Odoo Integration
ODOO_URL=https://your-instance.odoo.com
ODOO_DB=your-db-name
ODOO_USER=your-admin-email@example.com
ODOO_PASSWORD=your-odoo-password
ODOO_ENABLED=true
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/signup` | Register new user |
| GET | `/api/auth/me` | Current user info |

### Products
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products/` | List all active products |
| POST | `/api/products/` | Create product with variants |
| PATCH | `/api/products/{id}` | Update product |
| GET | `/api/products/categories` | List categories |

### Orders
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/orders/` | Create order |
| GET | `/api/orders/` | Active orders |
| GET | `/api/orders/table/{id}` | Order for a table |
| PATCH | `/api/orders/{id}/items` | Update cart items |
| POST | `/api/orders/{id}/send-to-kitchen` | Send + broadcast to kitchen |
| PATCH | `/api/orders/{id}/kitchen-stage` | Advance kitchen stage |
| POST | `/api/orders/self-order` | Self-order (no auth) |
| GET | `/api/orders/self-order-qr/{table_id}` | Generate table QR |

### Payments
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/payments/methods` | Enabled payment methods |
| GET | `/api/payments/methods-all` | All methods (admin) |
| PATCH | `/api/payments/methods/{id}` | Toggle/update method |
| GET | `/api/payments/upi-qr?amount=X` | Generate UPI QR |
| POST | `/api/payments/` | Process payment |

### Sessions
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/sessions/open` | Open new terminal session |
| GET | `/api/sessions/active` | All active sessions |
| GET | `/api/sessions/{id}` | Single session |
| POST | `/api/sessions/{id}/close` | Close session + Odoo sync |
| GET | `/api/sessions/history/closed` | Closed session history |

### Tables
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tables/` | Active tables |
| GET | `/api/tables/all` | All tables (admin) |
| POST | `/api/tables/` | Create table |
| PATCH | `/api/tables/{id}` | Update table |
| PATCH | `/api/tables/{id}/status` | Update table status |
| GET | `/api/tables/floors` | List floors |
| POST | `/api/tables/floors` | Create floor |

### Dashboard & Reports
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/` | KPIs + top products |
| GET | `/api/dashboard/orders-filtered` | Filtered order history |
| GET | `/api/dashboard/sessions-list` | Sessions for filter dropdown |
| GET | `/api/dashboard/staff-list` | Staff for responsible filter |

---

## WebSocket Events

Connect to: `ws://localhost:8002/ws/{room}`

Rooms: `kitchen` · `customer-display` · `pos`

### Events sent to `kitchen`
```json
// New order from POS
{
  "event": "new_order",
  "order": {
    "id": 12,
    "order_number": "ORD-143022-A3F1",
    "table_number": 3,
    "kitchen_stage": "to_cook",
    "items": [
      { "product_name": "Margherita Pizza", "quantity": 2 },
      { "product_name": "Cappuccino", "quantity": 1 }
    ]
  }
}
```

### Events sent to `customer-display`
```json
// Order sent to kitchen
{
  "event": "order_update",
  "order_number": "ORD-143022-A3F1",
  "table_number": 3,
  "items": [{ "name": "Margherita Pizza", "quantity": 2, "price": 640 }],
  "total": 760,
  "status": "preparing"
}

// Payment confirmed
{
  "event": "payment_confirmed",
  "order_number": "ORD-143022-A3F1",
  "table_number": 3,
  "amount": 760,
  "method": "upi"
}
```

### Events sent to `pos`
```json
// Kitchen stage update
{
  "event": "kitchen_update",
  "order_id": 12,
  "stage": "completed",
  "status": "ready"
}

// Table freed after payment
{
  "event": "table_update",
  "table_id": 3,
  "status": "free"
}
```

---

## Odoo Integration

The system integrates with Odoo 17 via XML-RPC. On every POS session close:

1. Authenticates with `velvet-vapor-cafe.odoo.com` using admin credentials
2. Finds or creates the "Velvet & Vapor Cafe" contact record
3. Posts a session summary note to the contact's chatter:

```
POS Session #12 Closed
Total Sales: ₹2,550
Orders Completed: 8
```

The sync runs in a background thread — it never blocks the POS response. The sync status is visible in the Dashboard session history as an **"Odoo Synced"** badge.

**To enable:**
```env
ODOO_ENABLED=true
ODOO_URL=https://your-instance.odoo.com
ODOO_DB=your-db-name
ODOO_USER=admin@example.com
ODOO_PASSWORD=your-password
```

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@velvetvapor.com | admin123 |

---

## Screens & Flows

### Terminal Picker
After login, staff selects an existing active terminal or opens a new one (Counter 1, Counter 2, Drive-Through, etc). Each terminal is an independent POS session. Closing one terminal does not affect others.

### Floor View
Tables displayed as color-coded cards:
- 🟢 **Free** — available for seating
- 🟡 **Occupied** — active order in progress
- 🔴 **Bill Requested** — awaiting payment

### Order Screen
- Product grid with category filter tabs
- Voice Order button (Chrome only) — speak items and quantities
- Cart with +/− quantity controls
- Products with variants show a selection modal before adding to cart
- "Send to Kitchen" → kitchen display updates live
- "Payment" → payment screen (disabled with warning if kitchen hasn't completed)

### Payment Screen
1. Select method: Cash / Card / UPI
2. Card → enter cardholder name, number (auto-formats), expiry, CVV
3. UPI → QR generated with exact amount, scan with any UPI app, confirm payment received
4. "Validate Payment" → payment recorded, table freed, customer display updates
5. Receipt screen → itemized receipt, print button opens thermal-style print dialog
6. Tap anywhere to dismiss → returns to floor view

### Kitchen Display
- Order cards appear in real-time in "To Cook" column
- Click card to advance: To Cook → Preparing → Completed
- Click individual items to strike-through as prepared
- Live connection indicator (green dot = WebSocket active)

### Customer Display
Open `/customer-display` on a second screen facing customers.
- Idle: welcome screen
- Order sent: shows item list, quantities, total, UNPAID badge
- Payment confirmed: full-screen green confirmation, PAID badge, resets after 10 seconds

### Self-Ordering
1. Staff goes to Self Order → generates QR for a table
2. Customer scans QR with phone
3. Mobile-friendly menu loads (no login required)
4. Customer selects items, places order
5. Order goes directly to Kitchen Display with SELF- prefix
6. Table status updates to Occupied automatically

---

## Password Policy

Enforced on both frontend and backend:

- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

---

*Built for the Odoo 24-Hour Hackathon — Velvet & Vapor Cafe POS*