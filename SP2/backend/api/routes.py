"""
REST API Routes
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_session, LocationEvent, AlertEvent
from backend.services import feature_service, inference_service, alert_service
from backend.api.ws_manager import manager

router = APIRouter(prefix="/api")


# ─── Schemas ──────────────────────────────────────────────────────────────────

MECCA_LAT = 21.4225
MECCA_LON = 39.8262


class LocationUpdate(BaseModel):
    pilgrim_id:         str   = Field(..., example="PIL_00001")
    supervisor_id:      str   = Field(..., example="SUP_0000")
    pilgrim_lat:        float = Field(..., example=21.4225)
    pilgrim_lon:        float = Field(..., example=39.8262)
    supervisor_lat:     Optional[float] = Field(default=None, example=21.4226)
    supervisor_lon:     Optional[float] = Field(default=None, example=39.8263)
    pilgrim_speed:      float = Field(default=1.0, ge=0)
    supervisor_speed:   float = Field(default=1.0, ge=0)
    pilgrim_heading:    float = Field(default=0.0, ge=0, le=360)
    supervisor_heading: float = Field(default=0.0, ge=0, le=360)
    campaign_id:        Optional[int] = Field(default=None)


class PilgrimStatus(BaseModel):
    pilgrim_id:    str
    supervisor_id: str
    pilgrim_lat:   float
    pilgrim_lon:   float
    supervisor_lat:  float
    supervisor_lon:  float
    label:         Optional[int]
    label_name:    Optional[str]
    confidence:    Optional[float]
    last_seen:     Optional[str]


class AlertOut(BaseModel):
    id:           int
    pilgrim_id:   str
    risk_level:   int
    message:      str
    acknowledged: bool
    ts:           str


class StatsOut(BaseModel):
    total:    int
    safe:     int
    warning:  int
    critical: int
    ws_connections: int


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/location", status_code=200)
async def post_location(
    body: LocationUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Submit a pilgrim location update, run inference, store and broadcast."""
    # Auto-fill supervisor coords from stored GPS position if not provided
    sup_lat = body.supervisor_lat
    sup_lon = body.supervisor_lon
    if sup_lat is None or sup_lon is None:
        try:
            pilgrim_user_id = int(body.pilgrim_id)
            sup_user_id = manager.get_supervisor_for_pilgrim(pilgrim_user_id)
            if sup_user_id is not None:
                pos = manager.get_supervisor_position(sup_user_id)
                if pos is not None:
                    sup_lat = pos["lat"]
                    sup_lon = pos["lon"]
        except ValueError:
            pass
        # Final fallback to Mecca center
        if sup_lat is None:
            sup_lat = MECCA_LAT
        if sup_lon is None:
            sup_lon = MECCA_LON

    reading = body.model_dump()
    reading["supervisor_lat"] = sup_lat
    reading["supervisor_lon"] = sup_lon

    # 1. Feature engineering
    feat_result = await feature_service.compute_features(body.pilgrim_id, reading, session)

    # 2. Inference
    prediction = inference_service.predict(body.pilgrim_id, reading)
    label = prediction.get("label")
    confidence = prediction.get("confidence")

    # 3. Persist location event
    event = LocationEvent(
        pilgrim_id=body.pilgrim_id,
        supervisor_id=body.supervisor_id,
        pilgrim_lat=body.pilgrim_lat,
        pilgrim_lon=body.pilgrim_lon,
        supervisor_lat=sup_lat,
        supervisor_lon=sup_lon,
        pilgrim_speed=body.pilgrim_speed,
        supervisor_speed=body.supervisor_speed,
        pilgrim_heading=body.pilgrim_heading,
        supervisor_heading=body.supervisor_heading,
        label=label,
        confidence=confidence,
        campaign_id=body.campaign_id,
    )
    session.add(event)

    # 4. Maybe create alert
    alert = None
    if label is not None:
        alert = await alert_service.maybe_create_alert(body.pilgrim_id, label, session, body.campaign_id)

    await session.commit()

    # 5. Broadcast via WebSocket
    broadcast_payload = {
        "type":          "pilgrim_update",
        "pilgrim_id":    body.pilgrim_id,
        "supervisor_id": body.supervisor_id,
        "pilgrim_lat":   body.pilgrim_lat,
        "pilgrim_lon":   body.pilgrim_lon,
        "supervisor_lat":  sup_lat,
        "supervisor_lon":  sup_lon,
        "label":         label,
        "label_name":    prediction.get("label_name"),
        "confidence":    confidence,
        "probabilities": prediction.get("probabilities"),
        "alert":         alert.message if alert else None,
        "timestamp":     datetime.utcnow().isoformat(),
    }
    await manager.broadcast(broadcast_payload)

    # Route to assigned supervisor if this pilgrim is a managed user (numeric ID string)
    try:
        pilgrim_user_id = int(body.pilgrim_id)
        await manager.broadcast_to_supervisor(pilgrim_user_id, broadcast_payload)
        # Also push status to the pilgrim's own WS connection
        await manager.send_to_pilgrim(pilgrim_user_id, broadcast_payload)
    except ValueError:
        pass  # simulate.py uses string IDs like "PIL_00001" — not a managed user

    return broadcast_payload


@router.get("/pilgrims", response_model=list[PilgrimStatus])
async def get_pilgrims(session: AsyncSession = Depends(get_session)):
    """Return the latest status for every known pilgrim."""
    # Subquery: latest event id per pilgrim
    subq = (
        select(
            LocationEvent.pilgrim_id,
            func.max(LocationEvent.id).label("max_id"),
        )
        .group_by(LocationEvent.pilgrim_id)
        .subquery()
    )
    result = await session.execute(
        select(LocationEvent).join(subq, LocationEvent.id == subq.c.max_id)
    )
    rows = result.scalars().all()

    label_names = {0: "Safe", 1: "Warning", 2: "Critical"}
    return [
        PilgrimStatus(
            pilgrim_id=r.pilgrim_id,
            supervisor_id=r.supervisor_id,
            pilgrim_lat=r.pilgrim_lat,
            pilgrim_lon=r.pilgrim_lon,
            supervisor_lat=r.supervisor_lat,
            supervisor_lon=r.supervisor_lon,
            label=r.label,
            label_name=label_names.get(r.label) if r.label is not None else None,
            confidence=r.confidence,
            last_seen=r.ts.isoformat() if r.ts else None,
        )
        for r in rows
    ]


@router.get("/pilgrims/{pilgrim_id}", response_model=PilgrimStatus)
async def get_pilgrim(pilgrim_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(LocationEvent)
        .where(LocationEvent.pilgrim_id == pilgrim_id)
        .order_by(desc(LocationEvent.id))
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Pilgrim not found")
    label_names = {0: "Safe", 1: "Warning", 2: "Critical"}
    return PilgrimStatus(
        pilgrim_id=row.pilgrim_id,
        supervisor_id=row.supervisor_id,
        pilgrim_lat=row.pilgrim_lat,
        pilgrim_lon=row.pilgrim_lon,
        supervisor_lat=row.supervisor_lat,
        supervisor_lon=row.supervisor_lon,
        label=row.label,
        label_name=label_names.get(row.label) if row.label is not None else None,
        confidence=row.confidence,
        last_seen=row.ts.isoformat() if row.ts else None,
    )


@router.get("/alerts", response_model=list[AlertOut])
async def get_alerts(
    limit: int = Query(default=50, le=200),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(AlertEvent).order_by(desc(AlertEvent.ts)).limit(limit)
    )
    return [
        AlertOut(
            id=a.id,
            pilgrim_id=a.pilgrim_id,
            risk_level=a.risk_level,
            message=a.message,
            acknowledged=a.acknowledged,
            ts=a.ts.isoformat(),
        )
        for a in result.scalars().all()
    ]


@router.get("/stats", response_model=StatsOut)
async def get_stats(session: AsyncSession = Depends(get_session)):
    subq = (
        select(func.max(LocationEvent.id).label("max_id"))
        .group_by(LocationEvent.pilgrim_id)
        .subquery()
    )
    result = await session.execute(
        select(LocationEvent.label, func.count().label("cnt"))
        .join(subq, LocationEvent.id == subq.c.max_id)
        .group_by(LocationEvent.label)
    )
    counts = {row.label: row.cnt for row in result}
    total = sum(counts.values())
    return StatsOut(
        total=total,
        safe=counts.get(0, 0),
        warning=counts.get(1, 0),
        critical=counts.get(2, 0),
        ws_connections=manager.connection_count,
    )
