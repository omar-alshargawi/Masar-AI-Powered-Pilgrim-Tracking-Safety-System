---
paths:
  - "ml/**/*"
---

# ML / AI Model Rules

## Primary Models — Time Series (PyTorch)

### LSTM Architecture
```
Input (batch, T=10, 8 features)
  → LSTM(hidden=128, num_layers=2, dropout=0.3, batch_first=True)
  → last hidden state → Linear(128→32) → ReLU → Linear(32→3) → Softmax
```

### Transformer Architecture
```
Input (batch, T=10, 8 features)
  → Linear(8→64)  [projection]
  → + sinusoidal positional encoding
  → 2× TransformerEncoderLayer(d_model=64, nhead=4, dim_feedforward=128, dropout=0.1)
  → mean-pool over T → Linear(64→3) → Softmax
```

### Training Config (both models)
- Loss: `CrossEntropyLoss` with class weights for imbalance
- Optimizer: `Adam(lr=1e-3)` with cosine annealing LR
- Early stopping: patience=10 epochs, monitor macro-F1 on validation
- Batch size: 256 | Epochs: max 100

## Classical Comparison Models (scikit-learn / xgboost)
Trained on **flattened** windows: shape `(N, T*8)` = `(N, 80)`.
- `RandomForestClassifier(n_estimators=200, max_depth=15)`
- `XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.05)`
- `LogisticRegression(max_iter=1000, C=1.0)`

## Baseline
`ml/baseline.py` — pure distance-threshold rule:
- `distance_m < 10` → Safe (0)
- `10 ≤ distance_m < 25` → Warning (1)
- `distance_m ≥ 25` → Critical (2)

## Feature Names & Order (must match `config.json`)
```python
FEATURE_NAMES = [
    "distance_m",       # Haversine distance pilgrim ↔ supervisor
    "speed_diff",       # |pilgrim_speed - supervisor_speed|
    "heading_diff",     # angular difference 0–180°
    "separation_rate",  # Δdistance / Δtime (m/s)
    "avg_dist_5",       # rolling mean of last 5 distance readings
    "dist_trend",       # linear slope of last 5 distance readings
    "time_since_safe",  # seconds since last Safe label
    "group_consistency" # std dev of last 5 distances
]
```

## Data Windowing
- Window size: T=10, stride=1 (overlapping windows)
- Label: label at the **last** timestep of the window
- Windows generated per-pilgrim to avoid cross-pilgrim contamination
- Train/val/test split: 70/15/15 (split by sequence, not by row)

## Evaluation Outputs (`ml/evaluate.py`)
- Per-class Precision / Recall / F1
- Macro-averaged F1 (primary ranking metric)
- Confusion matrix heatmap saved to `ml/models/confusion_matrix.png`
- Comparison table: Baseline → LR → RF → XGBoost → LSTM → Transformer
- Early-detection metric: avg timesteps before Critical that Warning first fires

## Model Artifacts Location
```
ml/models/
├── best_model.pt        # PyTorch state_dict of the best time-series model
├── lstm_model.pt        # LSTM specifically
├── transformer_model.pt # Transformer specifically
├── rf_model.pkl         # Random Forest
├── xgb_model.pkl        # XGBoost
├── lr_model.pkl         # Logistic Regression
├── scaler.pkl           # StandardScaler fitted on training features
└── config.json          # feature names, window size, label map, best model name
```
