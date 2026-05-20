---
paths:
  - "backend/**/*"
---

# Backend Rules

## Entry Point
`backend/main.py` — FastAPI app, CORS, WebSocket mount, DB init on startup.
Run with: `uvicorn backend.main:app --reload`

## REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/location` | Submit one pilgrim location update |
| GET | `/api/pilgrims` | All pilgrims with current risk status |
| GET | `/api/pilgrims/{id}` | Single pilgrim + recent history |
| GET | `/api/alerts` | Paginated alert log |
| GET | `/api/stats` | Aggregate counts: Safe / Warning / Critical |

## WebSocket
- Path: `/ws`
- Broadcast a `PilgrimUpdate` JSON message to all connected clients on every `POST /api/location`.
- Connection manager lives in `backend/api/ws_manager.py`.
- Message schema: `{ pilgrim_id, lat, lon, risk_label, risk_label_name, confidence, timestamp }`

## Request Pipeline (POST /api/location)
```
validate input (Pydantic)
  → feature_service: fetch last 9 rows from DB + append new → compute 8 features
  → inference_service: load model (cached), predict label + confidence
  → alert_service: if label ≥ 1 (Warning/Critical) → insert alert record
  → DB: insert location_event row
  → ws_manager.broadcast(pilgrim_update)
  → return JSON response
```

## Database (SQLite via SQLAlchemy)
- File: `backend/pilgrim.db`
- Tables:
  - `location_events(id, pilgrim_id, supervisor_id, lat, lon, speed, heading, ts, label, confidence)`
  - `alert_events(id, pilgrim_id, risk_level, message, ts, acknowledged)`
- Always use async sessions (`AsyncSession`); do not use sync SQLAlchemy in request handlers.

## Service Layer Rules
- `feature_service.py` — fetches history from DB, calls `ml/features.py`, returns feature array. No model code here.
- `inference_service.py` — loads model once at startup (cached), wraps `ml/predict.py`. No DB access here.
- `alert_service.py` — inserts alert records, applies cooldown (no duplicate alerts within 30 s per pilgrim).

## Error Handling
- Return `422` for invalid input (Pydantic handles this automatically).
- Return `503` if model is not loaded yet.
- All 500 errors must log the full traceback.
