# How to Run the System

> **Windows note:** PowerShell 5.x does not support `&&`. Either run commands
> separately, or use PowerShell 7+ (`pwsh`). All multi-step commands below
> are written as individual lines for PowerShell compatibility.

## Full Stack (first time)

```powershell
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Generate synthetic dataset (~50k rows, 7 scenarios)
python data/generate_dataset.py

# 3. Train time-series models (LSTM + Transformer)
python ml/train_timeseries.py

# 4. Train classical comparison models (RF, XGBoost, LR)
python ml/train_classical.py

# 5. Start FastAPI backend (port 8000)
uvicorn backend.main:app --reload

# 6. Start React dashboard — open a NEW terminal window for this
cd frontend
npm install
npm run dev

# 7. Run simulation demo — open a NEW terminal window for this
python simulate.py
```

## Common Individual Commands

```bash
# Re-run evaluation / comparison report only
python ml/evaluate.py

# Check backend API is alive
curl http://localhost:8000/api/stats

# Simulate a single location update
curl -X POST http://localhost:8000/api/location \
  -H "Content-Type: application/json" \
  -d '{"pilgrim_id":"P1","supervisor_id":"S1","pilgrim_lat":21.4225,"pilgrim_lon":39.8262,"supervisor_lat":21.4226,"supervisor_lon":39.8263,"pilgrim_speed":1.0,"supervisor_speed":1.0,"pilgrim_heading":90,"supervisor_heading":90}'
```

## Ports
- Backend API: http://localhost:8000
- Frontend dashboard: http://localhost:5173
- API docs (Swagger): http://localhost:8000/docs
