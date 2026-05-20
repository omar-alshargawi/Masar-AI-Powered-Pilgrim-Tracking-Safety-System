"""
WebSocket Connection Manager

Maintains registries for admin, supervisor, and pilgrim connections.
- Admin connections receive all pilgrim_update broadcasts (existing behaviour).
- Supervisor connections receive updates only for their assigned pilgrims.
- Pilgrim connections receive status updates addressed to that pilgrim.

The existing `manager.broadcast()` and `/ws` endpoint are UNCHANGED so the
admin dashboard and simulate.py keep working without modification.
"""

import json
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Admin / global dashboard (original)
        self._connections: list[WebSocket] = []

        # supervisor_id (int) → list of WebSocket
        self._supervisor_connections: dict[int, list[WebSocket]] = {}

        # pilgrim_id (int) → list of WebSocket
        self._pilgrim_connections: dict[int, list[WebSocket]] = {}

        # pilgrim_user_id (int) → supervisor_user_id (int)
        self._supervisor_map: dict[int, int] = {}

        # supervisor_user_id (int) → {lat, lon, speed, heading}
        self._supervisor_positions: dict[int, dict] = {}

    # ── Admin (original interface, unchanged) ─────────────────────────────────

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self._connections:
            self._connections.remove(ws)

    async def broadcast(self, data: dict) -> None:
        message = json.dumps(data)
        dead = []
        for ws in self._connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._connections.remove(ws)

    @property
    def connection_count(self) -> int:
        return len(self._connections)

    # ── Supervisor ─────────────────────────────────────────────────────────────

    async def connect_supervisor(self, supervisor_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self._supervisor_connections.setdefault(supervisor_id, []).append(ws)

    def disconnect_supervisor(self, supervisor_id: int, ws: WebSocket) -> None:
        conns = self._supervisor_connections.get(supervisor_id, [])
        if ws in conns:
            conns.remove(ws)

    async def send_to_supervisor(self, supervisor_id: int, data: dict) -> None:
        message = json.dumps(data)
        dead = []
        for ws in self._supervisor_connections.get(supervisor_id, []):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._supervisor_connections[supervisor_id].remove(ws)

    # ── Pilgrim ────────────────────────────────────────────────────────────────

    async def connect_pilgrim(self, pilgrim_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self._pilgrim_connections.setdefault(pilgrim_id, []).append(ws)

    def disconnect_pilgrim(self, pilgrim_id: int, ws: WebSocket) -> None:
        conns = self._pilgrim_connections.get(pilgrim_id, [])
        if ws in conns:
            conns.remove(ws)

    async def send_to_pilgrim(self, pilgrim_id: int, data: dict) -> None:
        message = json.dumps(data)
        dead = []
        for ws in self._pilgrim_connections.get(pilgrim_id, []):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._pilgrim_connections[pilgrim_id].remove(ws)

    # ── Supervisor map (pilgrim → supervisor routing) ─────────────────────────

    def update_supervisor_map(self, pilgrim_user_id: int, supervisor_user_id: int) -> None:
        self._supervisor_map[pilgrim_user_id] = supervisor_user_id

    def remove_from_supervisor_map(self, pilgrim_user_id: int) -> None:
        self._supervisor_map.pop(pilgrim_user_id, None)

    def get_supervisor_for_pilgrim(self, pilgrim_user_id: int) -> int | None:
        return self._supervisor_map.get(pilgrim_user_id)

    async def broadcast_to_supervisor(self, pilgrim_user_id: int, data: dict) -> None:
        sup_id = self._supervisor_map.get(pilgrim_user_id)
        if sup_id is not None:
            await self.send_to_supervisor(sup_id, data)

    # ── Supervisor position store ──────────────────────────────────────────────

    def set_supervisor_position(self, supervisor_id: int, pos: dict) -> None:
        self._supervisor_positions[supervisor_id] = pos

    def get_supervisor_position(self, supervisor_id: int) -> dict | None:
        return self._supervisor_positions.get(supervisor_id)


manager = ConnectionManager()
