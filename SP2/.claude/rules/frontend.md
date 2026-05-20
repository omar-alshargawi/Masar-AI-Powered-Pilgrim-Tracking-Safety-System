---
paths:
  - "frontend/**/*"
  - "data/**/*"
---

# Frontend & Data Rules

## Frontend Stack
React 18 + Vite + react-leaflet + axios.
Dev server: `cd frontend && npm run dev` (port 5173).

## Dashboard Layout
```
┌────────────────────────────────────────────────────────────┐
│  Header: "Pilgrim Supervision Dashboard"    [Safe:X Warn:Y Crit:Z] │
├─────────────────────┬──────────────────────────────────────┤
│  Pilgrim List       │                                      │
│  ● P1   SAFE        │         Leaflet Map                  │
│  ● P2   WARNING     │   Mecca area — colored markers       │
│  ● P3   CRITICAL    │   lat=21.4225, lon=39.8262           │
├─────────────────────┴──────────────────────────────────────┤
│  Alert History (scrollable, newest on top)                 │
└────────────────────────────────────────────────────────────┘
```

## Marker Colors
- Safe (0): green `#22c55e`
- Warning (1): orange `#f97316`
- Critical (2): red `#ef4444`

## Component Responsibilities
- `Map.jsx` — react-leaflet map, renders a `<CircleMarker>` per pilgrim, updates on WebSocket message.
- `PilgrimList.jsx` — sidebar list with `<StatusBadge>` for each pilgrim; clicking highlights on map.
- `AlertPanel.jsx` — scrollable list of alert events fetched from `GET /api/alerts`; auto-scrolls to newest.
- `StatusBadge.jsx` — reusable chip: `{ 0: "SAFE", 1: "WARNING", 2: "CRITICAL" }` with matching bg color.

## WebSocket Client (`src/services/ws.js`)
- Connect to `ws://localhost:8000/ws` on mount.
- Auto-reconnect with exponential backoff (max 30 s).
- On message: update the pilgrim state map in React context/state.

## REST Client (`src/services/api.js`)
- Base URL from env var `VITE_API_URL` (default `http://localhost:8000`).
- Fetch `/api/pilgrims` on mount for initial state.
- Fetch `/api/alerts` on mount and after each WebSocket Critical event.

## Data Generation Rules (`data/**/*`)
- 7 scenarios defined in `data/scenarios.py` — do not add ad-hoc scenario logic in the generator.
- Each scenario produces rows with fields:
  `timestamp, pilgrim_id, supervisor_id, pilgrim_lat, pilgrim_lon,
   supervisor_lat, supervisor_lon, pilgrim_speed, supervisor_speed,
   pilgrim_heading, supervisor_heading, label`
- Target: ~50,000 rows, roughly balanced across labels via scenario weighting.
- Output: `data/datasets/pilgrim_data.csv`
- Add GPS noise (Gaussian, std from `ScenarioConfig.noise_std`) to all lat/lon values.
