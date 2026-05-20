# Project Conventions

## Coordinate Math
- Always use **Haversine distance** for pilgrim ↔ supervisor distance — never Euclidean on raw lat/lon.
- The canonical Haversine implementation lives in `ml/features.py`. Import it everywhere; do not re-implement it.
- Mecca center coordinates: lat=21.4225, lon=39.8262.

## Sliding Window
- The per-pilgrim feature window is always **T=10 timesteps**.
- In the backend (live inference), maintain the window as a `collections.deque(maxlen=10)` keyed by `pilgrim_id` inside `ml/predict.py`.
- Inference requires a full window; return `None` (no prediction) if fewer than 10 readings are available.

## Feature Engineering Shared Contract
- `ml/features.py` is the single source of truth for all 8 features:
  `distance_m`, `speed_diff`, `heading_diff`, `separation_rate`,
  `avg_dist_5`, `dist_trend`, `time_since_safe`, `group_consistency`
- `backend/services/feature_service.py` wraps `ml/features.py` for live use — it must not duplicate feature logic.
- Any change to the feature set must be reflected in both files and in `ml/models/config.json`.

## Model Artifacts
- Saved to `ml/models/`: `best_model.pt` (PyTorch), `scaler.pkl` (StandardScaler), `config.json` (feature names + window size + label map).
- `config.json` is the contract between training and inference — always regenerate it when the model changes.

## Labels
- Use integer labels throughout: `0=Safe`, `1=Warning`, `2=Critical`.
- Never use string labels in model I/O; use strings only in display/dashboard code.

## Dataset
- Raw generated data: `data/datasets/pilgrim_data.csv`
- Processed (windowed, scaled): `data/datasets/processed/`
