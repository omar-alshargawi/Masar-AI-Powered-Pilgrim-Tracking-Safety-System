"""
Alert Service — creates alert records with a 30-second cooldown per pilgrim.
"""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import AlertEvent

COOLDOWN_SECONDS = 30
LABEL_NAMES = {1: "Warning", 2: "Critical"}


async def maybe_create_alert(
    pilgrim_id: str,
    risk_level: int,
    session: AsyncSession,
    campaign_id: Optional[int] = None,
) -> Optional[AlertEvent]:
    """
    Insert an alert if risk_level >= 1 and no alert exists within COOLDOWN_SECONDS.
    Returns the new AlertEvent or None.
    """
    if risk_level < 1:
        return None

    cutoff = datetime.utcnow() - timedelta(seconds=COOLDOWN_SECONDS)
    result = await session.execute(
        select(AlertEvent)
        .where(AlertEvent.pilgrim_id == pilgrim_id)
        .where(AlertEvent.ts >= cutoff)
        .order_by(desc(AlertEvent.ts))
        .limit(1)
    )
    recent = result.scalar_one_or_none()
    if recent is not None:
        return None   # still within cooldown window

    level_name = LABEL_NAMES.get(risk_level, "Unknown")
    message = f"Pilgrim {pilgrim_id} — {level_name} risk detected"
    alert = AlertEvent(
        pilgrim_id=pilgrim_id,
        risk_level=risk_level,
        message=message,
        campaign_id=campaign_id,
    )
    session.add(alert)
    await session.flush()   # get the id without committing
    return alert
