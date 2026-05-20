"""
Supervisor API Routes.
All endpoints are under /api/supervisor.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_session, User, Assignment, AlertEvent, HelpRequest, LocationEvent
from backend.api.ws_manager import manager

router = APIRouter(prefix="/api/supervisor", tags=["supervisor"])


class SupervisorLocationIn(BaseModel):
    lat: float
    lon: float
    speed: float = 0.0
    heading: float = 0.0


class PilgrimOut(BaseModel):
    user_id: int
    display_name: str
    pilgrim_lat: float | None
    pilgrim_lon: float | None
    label: int | None
    label_name: str | None
    confidence: float | None

class AlertOut(BaseModel):
    id: int
    pilgrim_id: str
    risk_level: int
    message: str
    acknowledged: bool
    ts: str

class HelpRequestOut(BaseModel):
    id: int
    pilgrim_id: int
    pilgrim_name: str
    message: str
    acknowledged: bool
    ts: str

LABEL_NAMES = {0: "Safe", 1: "Warning", 2: "Critical"}


@router.post("/{supervisor_id}/location", status_code=200)
async def share_supervisor_location(
    supervisor_id: int,
    body: SupervisorLocationIn,
    session: AsyncSession = Depends(get_session),
):
    """Store supervisor GPS position and push it to assigned pilgrims."""
    res = await session.execute(select(User).where(User.id == supervisor_id))
    sup = res.scalar_one_or_none()
    if sup is None or sup.role != "supervisor":
        raise HTTPException(status_code=404, detail="Supervisor not found")

    pos = {"lat": body.lat, "lon": body.lon, "speed": body.speed, "heading": body.heading}
    manager.set_supervisor_position(supervisor_id, pos)

    # Notify all pilgrims assigned to this supervisor so they can update the map
    res2 = await session.execute(
        select(Assignment.pilgrim_id).where(Assignment.supervisor_id == supervisor_id)
    )
    for pilgrim_id in res2.scalars().all():
        await manager.send_to_pilgrim(pilgrim_id, {
            "type": "supervisor_update",
            "supervisor_id": supervisor_id,
            "lat": body.lat,
            "lon": body.lon,
        })

    return {"ok": True}


@router.get("/{supervisor_id}/pilgrims", response_model=list[PilgrimOut])
async def get_assigned_pilgrims(supervisor_id: int, session: AsyncSession = Depends(get_session)):
    # Verify supervisor exists
    res = await session.execute(select(User).where(User.id == supervisor_id))
    sup = res.scalar_one_or_none()
    if sup is None or sup.role != "supervisor":
        raise HTTPException(status_code=404, detail="Supervisor not found")

    # Get all pilgrims assigned to this supervisor
    res = await session.execute(
        select(Assignment).where(Assignment.supervisor_id == supervisor_id)
    )
    assignments = res.scalars().all()

    out = []
    for a in assignments:
        res2 = await session.execute(select(User).where(User.id == a.pilgrim_id))
        pilgrim_user = res2.scalar_one_or_none()
        if pilgrim_user is None:
            continue

        # Latest location event for this pilgrim user (matched by string pilgrim_id = str(user.id))
        pid_str = str(a.pilgrim_id)
        res3 = await session.execute(
            select(LocationEvent)
            .where(LocationEvent.pilgrim_id == pid_str)
            .order_by(desc(LocationEvent.id))
            .limit(1)
        )
        loc = res3.scalar_one_or_none()

        out.append(PilgrimOut(
            user_id=a.pilgrim_id,
            display_name=pilgrim_user.display_name,
            pilgrim_lat=loc.pilgrim_lat if loc else None,
            pilgrim_lon=loc.pilgrim_lon if loc else None,
            label=loc.label if loc else None,
            label_name=LABEL_NAMES.get(loc.label) if loc and loc.label is not None else None,
            confidence=loc.confidence if loc else None,
        ))
    return out


@router.get("/{supervisor_id}/alerts", response_model=list[AlertOut])
async def get_supervisor_alerts(
    supervisor_id: int,
    session: AsyncSession = Depends(get_session),
):
    # Get pilgrim IDs assigned to this supervisor
    res = await session.execute(
        select(Assignment.pilgrim_id).where(Assignment.supervisor_id == supervisor_id)
    )
    pilgrim_ids = [str(r) for r in res.scalars().all()]

    if not pilgrim_ids:
        return []

    res = await session.execute(
        select(AlertEvent)
        .where(AlertEvent.pilgrim_id.in_(pilgrim_ids))
        .order_by(desc(AlertEvent.ts))
        .limit(100)
    )
    return [
        AlertOut(
            id=a.id, pilgrim_id=a.pilgrim_id, risk_level=a.risk_level,
            message=a.message, acknowledged=a.acknowledged, ts=a.ts.isoformat()
        )
        for a in res.scalars().all()
    ]


@router.get("/{supervisor_id}/help-requests", response_model=list[HelpRequestOut])
async def get_help_requests(supervisor_id: int, session: AsyncSession = Depends(get_session)):
    res = await session.execute(
        select(HelpRequest)
        .where(HelpRequest.supervisor_id == supervisor_id)
        .order_by(desc(HelpRequest.ts))
    )
    requests = res.scalars().all()

    out = []
    for hr in requests:
        res2 = await session.execute(select(User).where(User.id == hr.pilgrim_id))
        pilgrim = res2.scalar_one_or_none()
        out.append(HelpRequestOut(
            id=hr.id,
            pilgrim_id=hr.pilgrim_id,
            pilgrim_name=pilgrim.display_name if pilgrim else str(hr.pilgrim_id),
            message=hr.message,
            acknowledged=hr.acknowledged,
            ts=hr.ts.isoformat(),
        ))
    return out


@router.patch("/{supervisor_id}/help-requests/{request_id}/acknowledge", response_model=HelpRequestOut)
async def acknowledge_help_request(
    supervisor_id: int,
    request_id: int,
    session: AsyncSession = Depends(get_session),
):
    res = await session.execute(
        select(HelpRequest)
        .where(HelpRequest.id == request_id)
        .where(HelpRequest.supervisor_id == supervisor_id)
    )
    hr = res.scalar_one_or_none()
    if hr is None:
        raise HTTPException(status_code=404, detail="Help request not found")
    hr.acknowledged = True
    await session.commit()
    await session.refresh(hr)

    res2 = await session.execute(select(User).where(User.id == hr.pilgrim_id))
    pilgrim = res2.scalar_one_or_none()
    return HelpRequestOut(
        id=hr.id,
        pilgrim_id=hr.pilgrim_id,
        pilgrim_name=pilgrim.display_name if pilgrim else str(hr.pilgrim_id),
        message=hr.message,
        acknowledged=hr.acknowledged,
        ts=hr.ts.isoformat(),
    )
