# SP2 — Pilgrim Supervision AI

AI-based real-time pilgrim supervision system for Hajj environments. Detects and predicts pilgrim-supervisor separation risk using spatial-temporal movement analysis.

## Directory Layout

```
SP2/
├── data/          # Synthetic data generation (scenarios + generator)
├── ml/            # Feature engineering, LSTM/Transformer models, evaluation
├── backend/       # FastAPI + SQLite + WebSocket
├── frontend/      # React 18 + Vite + Leaflet dashboard
└── simulate.py    # Replay script for end-to-end demo
```

## Risk Labels

| Label | Value | Distance (rule-based threshold) |
|-------|-------|--------------------------------|
| Safe | 0 | < 10 m |
| Warning | 1 | 10–25 m |
| Critical | 2 | > 25 m |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Data & ML | Python 3.11, numpy, pandas, scikit-learn, xgboost, PyTorch |
| Backend | FastAPI, SQLAlchemy, SQLite, uvicorn, pydantic, passlib[bcrypt] |
| Frontend | React 18, Vite, react-leaflet, axios |

## Role Auth System

Authentication is localStorage-based (`sp2_auth` key).
Format: `{ role: "admin"|"supervisor"|"pilgrim", id: number|null }`

- `frontend/src/hooks/useAuthGuard.js` — checks localStorage on mount, redirects to `/` if role mismatch
- Each protected page calls `useAuthGuard("role")` at the top
- Logout: `localStorage.removeItem("sp2_auth")` then navigate to `/`
- Admin has `id: null` (no numeric ID required at login)
- Login validated server-side via `POST /api/auth/login` — returns `{ role, id, display_name }`

## Supervisor GPS Sharing

In-memory supervisor position store in `backend/api/ws_manager.py`:
- `_supervisor_positions: dict[int, dict]` keyed by supervisor user_id
- `set_supervisor_position(id, pos)` / `get_supervisor_position(id) → dict | None`
- `POST /api/supervisor/{id}/location` — supervisor posts real GPS; broadcasts `supervisor_update` to assigned pilgrims
- `POST /api/location` — `supervisor_lat/lon` are optional; backend auto-fills from stored position, fallback to Mecca center (21.4225, 39.8262)

## Admin Setup UX

- Admin dashboard shows a **Quick Setup** 3-step banner when there are 0 campaigns
- Campaign detail page has a **User ID Reference** panel listing all non-admin users with their numeric IDs and copy buttons — share these IDs + passwords with supervisors/pilgrims
