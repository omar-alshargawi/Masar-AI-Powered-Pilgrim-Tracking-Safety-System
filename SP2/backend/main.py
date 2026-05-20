"""
FastAPI Application Entry Point

Run with:
    uvicorn backend.main:app --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from passlib.context import CryptContext

from backend.db import init_db, Assignment
from backend.db.session import AsyncSessionLocal
from backend.db.models import User
from backend.api.routes import router
from backend.api.admin_routes import router as admin_router
from backend.api.supervisor_routes import router as supervisor_router
from backend.api.pilgrim_routes import router as pilgrim_router
from backend.api.auth_routes import router as auth_router
from backend.api.ws_manager import manager
from backend.services.inference_service import load_model, predictor

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    load_model()

    async with AsyncSessionLocal() as session:
        # Seed supervisor map from DB assignments
        result = await session.execute(select(Assignment))
        for a in result.scalars().all():
            manager.update_supervisor_map(a.pilgrim_id, a.supervisor_id)

        # Seed default admin user if none exists
        result = await session.execute(select(User).where(User.role == "admin"))
        if result.scalar_one_or_none() is None:
            session.add(User(
                display_name="Admin",
                role="admin",
                password_hash=_pwd_ctx.hash("admin123"),
            ))
            await session.commit()

    yield
    # Shutdown — nothing to clean up


app = FastAPI(
    title="Pilgrim Supervision AI",
    description="Real-time pilgrim separation risk detection API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(admin_router)
app.include_router(supervisor_router)
app.include_router(pilgrim_router)
app.include_router(auth_router)


# ── WebSocket endpoints ────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """Admin / global dashboard connection."""
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)


@app.websocket("/ws/supervisor/{supervisor_id}")
async def supervisor_ws(supervisor_id: int, ws: WebSocket):
    await manager.connect_supervisor(supervisor_id, ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_supervisor(supervisor_id, ws)


@app.websocket("/ws/pilgrim/{pilgrim_id}")
async def pilgrim_ws(pilgrim_id: int, ws: WebSocket):
    await manager.connect_pilgrim(pilgrim_id, ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_pilgrim(pilgrim_id, ws)


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": predictor.is_loaded}
