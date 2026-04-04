from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room: str):
        await websocket.accept()
        if room not in self.rooms:
            self.rooms[room] = []
        self.rooms[room].append(websocket)

    def disconnect(self, websocket: WebSocket, room: str):
        if room in self.rooms:
            self.rooms[room].remove(websocket)

    async def broadcast(self, room: str, message: dict):
        if room in self.rooms:
            dead = []
            for ws in self.rooms[room]:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.rooms[room].remove(ws)

manager = ConnectionManager()

@router.websocket("/ws/{room}")
async def websocket_endpoint(websocket: WebSocket, room: str):
    await manager.connect(websocket, room)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo stage updates from kitchen back to POS
            await manager.broadcast(room, json.loads(data))
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)