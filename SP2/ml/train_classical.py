"""
Classical Model Training: Random Forest, XGBoost, Logistic Regression

Trains comparison models on flattened windows (T*8 = 80 features).
Requires scaler.pkl and config.json to already exist (run train_timeseries.py first).

Usage:
    python ml/train_classical.py
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, classification_report
from xgboost import XGBClassifier

sys.path.insert(0, str(Path(__file__).parent))
from features import compute_features_batch, build_windows, FEATURE_NAMES, WINDOW_SIZE

DATA_PATH  = Path(__file__).parent.parent / "data" / "datasets" / "pilgrim_data.csv"
MODELS_DIR = Path(__file__).parent / "models"


CLASSICAL_MODELS = {
    "RandomForest": RandomForestClassifier(
        n_estimators=200, max_depth=15, n_jobs=-1, random_state=42
    ),
    "XGBoost": XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.05,
        use_label_encoder=False, eval_metric="mlogloss",
        random_state=42, n_jobs=-1,
    ),
    "LogisticRegression": LogisticRegression(
        max_iter=1000, C=1.0, multi_class="multinomial",
        solver="lbfgs", random_state=42, n_jobs=-1,
    ),
}


def main():
    if not DATA_PATH.exists():
        print(f"Dataset not found: {DATA_PATH}\nRun: python data/generate_dataset.py")
        sys.exit(1)

    scaler_path = MODELS_DIR / "scaler.pkl"
    if not scaler_path.exists():
        print("scaler.pkl not found. Run train_timeseries.py first.")
        sys.exit(1)

    print("Loading dataset...")
    df = pd.read_csv(DATA_PATH)

    print("Engineering features...")
    df = compute_features_batch(df)
    df = df.dropna(subset=FEATURE_NAMES)

    print("Building windows...")
    windows, labels, _ = build_windows(df, window_size=WINDOW_SIZE)

    # ── Split (same random state as timeseries trainer) ───────────────────────
    idx = np.arange(len(labels))
    idx_tv, idx_test, y_tv, y_test = train_test_split(idx, labels, test_size=0.15, stratify=labels, random_state=42)
    idx_train, _, y_train, _ = train_test_split(idx_tv, y_tv, test_size=0.15 / 0.85, stratify=y_tv, random_state=42)

    # ── Scale + flatten ───────────────────────────────────────────────────────
    scaler = joblib.load(scaler_path)
    n_feat = len(FEATURE_NAMES)

    def scale_flat(idx_subset):
        w = windows[idx_subset]
        s = w.shape
        return scaler.transform(w.reshape(-1, n_feat)).reshape(s[0], -1)

    X_train = scale_flat(idx_train)
    X_test  = scale_flat(idx_test)

    print(f"\nFlattened shape: train={X_train.shape}  test={X_test.shape}")

    # ── Load existing config ──────────────────────────────────────────────────
    config_path = MODELS_DIR / "config.json"
    with open(config_path) as f:
        config = json.load(f)

    classical_results = config.get("classical_results", {})

    # ── Train each model ──────────────────────────────────────────────────────
    for name, clf in CLASSICAL_MODELS.items():
        print(f"\nTraining {name}...")
        clf.fit(X_train, y_train)
        joblib.dump(clf, MODELS_DIR / f"{name.lower()}_model.pkl")

        y_pred = clf.predict(X_test)
        test_f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
        classical_results[name] = {"test_f1": float(test_f1)}

        print(classification_report(y_test, y_pred, target_names=["Safe", "Warning", "Critical"], zero_division=0))
        print(f"  {name} macro F1: {test_f1:.4f}  → saved {name.lower()}_model.pkl")

    # ── Update config ─────────────────────────────────────────────────────────
    config["classical_results"] = classical_results
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    print(f"\nResults appended to {config_path}")


if __name__ == "__main__":
    main()
