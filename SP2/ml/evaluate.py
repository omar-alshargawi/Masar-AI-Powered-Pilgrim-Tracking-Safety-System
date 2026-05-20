"""
Evaluation & Comparison Report

Loads all trained models + baseline, runs them on the test split,
and prints a ranked comparison table with confusion matrices.

Usage:
    python ml/evaluate.py
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    f1_score, accuracy_score, precision_score, recall_score,
    confusion_matrix, classification_report,
)

sys.path.insert(0, str(Path(__file__).parent))
from features import compute_features_batch, build_windows, FEATURE_NAMES, WINDOW_SIZE
from baseline import predict_batch as baseline_predict
from train_timeseries import LSTMClassifier, TransformerClassifier, N_FEATURES, N_CLASSES

DATA_PATH  = Path(__file__).parent.parent / "data" / "datasets" / "pilgrim_data.csv"
MODELS_DIR = Path(__file__).parent / "models"
DEVICE     = torch.device("cuda" if torch.cuda.is_available() else "cpu")
LABEL_NAMES = ["Safe", "Warning", "Critical"]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def load_pytorch_model(cls, path: Path):
    model = cls(n_features=N_FEATURES, n_classes=N_CLASSES).to(DEVICE)
    model.load_state_dict(torch.load(path, map_location=DEVICE))
    model.eval()
    return model


def predict_pytorch(model, X_scaled: np.ndarray) -> np.ndarray:
    all_preds = []
    t = torch.tensor(X_scaled, dtype=torch.float32)
    with torch.no_grad():
        for i in range(0, len(t), 256):
            batch = t[i:i+256].to(DEVICE)
            preds = model(batch).argmax(dim=1).cpu().numpy()
            all_preds.extend(preds)
    return np.array(all_preds)


def metrics_row(name: str, y_true, y_pred) -> dict:
    return {
        "Model": name,
        "Accuracy": accuracy_score(y_true, y_pred),
        "Precision (macro)": precision_score(y_true, y_pred, average="macro", zero_division=0),
        "Recall (macro)": recall_score(y_true, y_pred, average="macro", zero_division=0),
        "Macro F1": f1_score(y_true, y_pred, average="macro", zero_division=0),
    }


def early_detection_steps(y_true, y_pred) -> float:
    """
    For each transition to Critical (label=2) in y_true,
    count how many steps before the transition the model first predicted Warning or Critical.
    Returns the mean number of early-warning steps.
    """
    leads = []
    for i in range(1, len(y_true)):
        if y_true[i] == 2 and y_true[i-1] < 2:
            # found a transition to Critical
            lead = 0
            for j in range(i - 1, -1, -1):
                if y_pred[j] >= 1:
                    lead = i - j
                else:
                    break
            leads.append(lead)
    return float(np.mean(leads)) if leads else 0.0


def plot_confusion_matrix(cm, name: str, path: Path):
    fig, ax = plt.subplots(figsize=(5, 4))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=LABEL_NAMES, yticklabels=LABEL_NAMES, ax=ax,
    )
    ax.set_xlabel("Predicted")
    ax.set_ylabel("True")
    ax.set_title(f"Confusion Matrix — {name}")
    plt.tight_layout()
    plt.savefig(path, dpi=120)
    plt.close()


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    if not DATA_PATH.exists():
        print(f"Dataset not found: {DATA_PATH}")
        sys.exit(1)

    config_path = MODELS_DIR / "config.json"
    if not config_path.exists():
        print("config.json not found. Run train_timeseries.py first.")
        sys.exit(1)

    with open(config_path) as f:
        config = json.load(f)

    print("Loading dataset and engineering features...")
    df = pd.read_csv(DATA_PATH)
    df = compute_features_batch(df)
    df = df.dropna(subset=FEATURE_NAMES)

    windows, labels, _ = build_windows(df, window_size=WINDOW_SIZE)

    # ── Reproduce same test split ─────────────────────────────────────────────
    idx = np.arange(len(labels))
    idx_tv, idx_test, _, y_test = train_test_split(idx, labels, test_size=0.15, stratify=labels, random_state=42)

    scaler = joblib.load(MODELS_DIR / "scaler.pkl")
    n_feat = len(FEATURE_NAMES)

    X_test_seq = scaler.transform(windows[idx_test].reshape(-1, n_feat)).reshape(-1, WINDOW_SIZE, n_feat)
    X_test_flat = X_test_seq.reshape(len(idx_test), -1)

    # Test rows for baseline (needs raw coords + label)
    test_df = df.iloc[idx_test + WINDOW_SIZE - 1] if False else None   # not used directly

    rows_summary = []
    all_cms = {}

    # ── Baseline ──────────────────────────────────────────────────────────────
    baseline_df = df.iloc[idx_test].reset_index(drop=True)
    y_base = baseline_predict(baseline_df)
    rows_summary.append(metrics_row("Baseline (threshold)", y_test, y_base))
    all_cms["Baseline"] = confusion_matrix(y_test, y_base, labels=[0, 1, 2])

    # ── Classical models ──────────────────────────────────────────────────────
    for name, fname in [
        ("Logistic Regression", "logisticregression_model.pkl"),
        ("Random Forest",       "randomforest_model.pkl"),
        ("XGBoost",             "xgboost_model.pkl"),
    ]:
        path = MODELS_DIR / fname
        if not path.exists():
            print(f"  Skipping {name} (not found)")
            continue
        clf = joblib.load(path)
        y_pred = clf.predict(X_test_flat)
        rows_summary.append(metrics_row(name, y_test, y_pred))
        all_cms[name] = confusion_matrix(y_test, y_pred, labels=[0, 1, 2])

    # ── Time-series models ────────────────────────────────────────────────────
    for name, cls, fname in [
        ("LSTM",        LSTMClassifier,        "lstm_model.pt"),
        ("Transformer", TransformerClassifier, "transformer_model.pt"),
    ]:
        path = MODELS_DIR / fname
        if not path.exists():
            print(f"  Skipping {name} (not found)")
            continue
        model = load_pytorch_model(cls, path)
        y_pred = predict_pytorch(model, X_test_seq)
        rows_summary.append(metrics_row(name, y_test, y_pred))
        all_cms[name] = confusion_matrix(y_test, y_pred, labels=[0, 1, 2])
        lead = early_detection_steps(y_test, y_pred)
        print(f"  {name} early-detection lead: {lead:.1f} timesteps before Critical")

    # ── Print comparison table ────────────────────────────────────────────────
    results_df = pd.DataFrame(rows_summary).sort_values("Macro F1", ascending=False)
    print("\n" + "=" * 70)
    print("MODEL COMPARISON")
    print("=" * 70)
    print(results_df.to_string(index=False, float_format="{:.4f}".format))
    print("=" * 70)

    # ── Save confusion matrices ───────────────────────────────────────────────
    for name, cm in all_cms.items():
        safe_name = name.replace(" ", "_").replace("(", "").replace(")", "")
        out_path = MODELS_DIR / f"cm_{safe_name}.png"
        plot_confusion_matrix(cm, name, out_path)
    print(f"\nConfusion matrices saved to {MODELS_DIR}/")

    # ── Append to config ──────────────────────────────────────────────────────
    config["evaluation"] = results_df.to_dict(orient="records")
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    print(f"Results saved to {config_path}")


if __name__ == "__main__":
    main()
