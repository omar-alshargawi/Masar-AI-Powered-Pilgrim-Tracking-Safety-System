"""
Pilgrim API Routes.
All endpoints are under /api/pilgrim.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_session, User, Assignment, HelpRequest, LocationEvent
from backend.api.ws_manager import manager

router = APIRouter(prefix="/api/pilgrim", tags=["pilgrim"])


class PilgrimStatus(BaseModel):
    user_id: int
    display_name: str
    label: int | None
    label_name: str | None
    confidence: float | None
    pilgrim_lat: float | None
    pilgrim_lon: float | None

class HelpRequestCreate(BaseModel):
    message: str = "SOS — I need help"

class HelpRequestOut(BaseModel):
    id: int
    pilgrim_id: int
    supervisor_id: int
    message: str
    acknowledged: bool
    ts: str

LABEL_NAMES = {0: "Safe", 1: "Warning", 2: "Critical"}


@router.get("/{pilgrim_id}/status", response_model=PilgrimStatus)
async def get_pilgrim_status(pilgrim_id: int, session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(User).where(User.id == pilgrim_id))
    user = res.scalar_one_or_none()
    if user is None or user.role != "pilgrim":
        raise HTTPException(status_code=404, detail="Pilgrim not found")

    pid_str = str(pilgrim_id)
    res2 = await session.execute(
        select(LocationEvent)
        .where(LocationEvent.pilgrim_id == pid_str)
        .order_by(desc(LocationEvent.id))
        .limit(1)
    )
    loc = res2.scalar_one_or_none()

    return PilgrimStatus(
        user_id=user.id,
        display_name=user.display_name,
        label=loc.label if loc else None,
        label_name=LABEL_NAMES.get(loc.label) if loc and loc.label is not None else None,
        confidence=loc.confidence if loc else None,
        pilgrim_lat=loc.pilgrim_lat if loc else None,
        pilgrim_lon=loc.pilgrim_lon if loc else None,
    )


@router.post("/{pilgrim_id}/help", response_model=HelpRequestOut, status_code=201)
async def create_help_request(
    pilgrim_id: int,
    body: HelpRequestCreate,
    session: AsyncSession = Depends(get_session),
):
    res = await session.execute(select(User).where(User.id == pilgrim_id))
    user = res.scalar_one_or_none()
    if user is None or user.role != "pilgrim":
        raise HTTPException(status_code=404, detail="Pilgrim not found")

    # Find assigned supervisor
    res = await session.execute(
        select(Assignment)
        .where(Assignment.pilgrim_id == pilgrim_id)
        .limit(1)
    )
    assignment = res.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(status_code=400, detail="Pilgrim has no assigned supervisor")

    hr = HelpRequest(
        campaign_id=assignment.campaign_id,
        pilgrim_id=pilgrim_id,
        supervisor_id=assignment.supervisor_id,
        message=body.message,
    )
    session.add(hr)
    await session.commit()
    await session.refresh(hr)

    # Notify supervisor via WebSocket
    await manager.send_to_supervisor(assignment.supervisor_id, {
        "type": "help_request",
        "id": hr.id,
        "pilgrim_id": pilgrim_id,
        "pilgrim_name": user.display_name,
        "message": hr.message,
        "ts": hr.ts.isoformat(),
    })

    # Also notify pilgrim (confirmation)
    await manager.send_to_pilgrim(pilgrim_id, {
        "type": "help_sent",
        "id": hr.id,
        "message": hr.message,
        "ts": hr.ts.isoformat(),
    })

    return HelpRequestOut(
        id=hr.id,
        pilgrim_id=hr.pilgrim_id,
        supervisor_id=hr.supervisor_id,
        message=hr.message,
        acknowledged=hr.acknowledged,
        ts=hr.ts.isoformat(),
    )
