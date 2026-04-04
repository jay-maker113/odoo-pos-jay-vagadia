# Velvet & Vapor Cafe POS

A real-time Restaurant Point of Sale system built for the Odoo Hackathon.

## Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** FastAPI + SQLAlchemy + SQLite
- **Real-time:** WebSockets (FastAPI/Starlette)
- **Odoo Integration:** XML-RPC sync on session close
- **QR Payments:** Dynamic UPI QR generation

## Features
- Table-based floor management with live status
- Real-time kitchen display (WebSocket)
- Customer-facing display
- Voice-to-order (Chrome Web Speech API)
- UPI QR payment generation
- Session management with Odoo sync
- Reports and order history

## Quick Start

### Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8002

### Frontend
cd frontend
npm install
npm run dev

### Demo Credentials
Email: admin@velvetvapor.com
Password: admin123

## Demo Flow
1. Dashboard -> Open POS Session
2. Floor View -> Select table -> Add items
3. Send to Kitchen -> Watch Kitchen Display update live
4. Payment -> UPI QR -> Confirm
5. Customer Display shows payment confirmed
6. Settings -> Close Session -> Syncs to Odoo