"""
Feature Service — wraps ml/features.py for live backend use.

Fetches the last N location rows for a pilgrim from the DB,
appends the new reading, and returns a feature-ready dict
for the inference service.
"""

import sys
from pathlib import Path
from typing import Optional

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "ml"))
from features import LiveFeatureState, WINDOW_SIZE

from backend.db.models import LocationEvent

# One global LiveFeatureState instance — shared across all requests
_state = LiveFeatureState()


async def compute_features(
    pilgrim_id: str,
    reading: dict,
    session: AsyncSession,
) -> Optional[dict]:
    """
    Update the per-pilgrim sliding window with the new reading.

    Returns:
        dict with key "window" (np.ndarray shape (WINDOW_SIZE, 8)) if full,
        or {"window": None} if fewer than WINDOW_SIZE readings collected.
    """
    # If the in-memory state for this pilgrim is empty (e.g. server restart),
    # seed it with the last WINDOW_SIZE-1 rows from the DB.
    state = _state
    if pilgrim_id not in state._step:
        result = await session.execute(
            select(LocationEvent)
            .where(LocationEvent.pilgrim_id == pilgrim_id)
            .order_by(desc(LocationEvent.ts))
            .limit(WINDOW_SIZE - 1)
        )
        history = list(reversed(result.scalars().all()))
        for row in history:
            hist_reading = {
                "pilgrim_lat": row.pilgrim_lat,
                "pilgrim_lon": row.pilgrim_lon,
                "supervisor_lat": row.supervisor_lat,
                "supervisor_lon": row.supervisor_lon,
                "pilgrim_speed": row.pilgrim_speed,
                "supervisor_speed": row.supervisor_speed,
                "pilgrim_heading": row.pilgrim_heading,
                "supervisor_heading": row.supervisor_heading,
                "label": row.label or 0,
            }
            state.update(pilgrim_id, hist_reading)

    window = state.update(pilgrim_id, reading)
    return {"window": window}
