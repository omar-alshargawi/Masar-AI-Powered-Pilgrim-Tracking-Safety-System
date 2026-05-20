"""
Rule-Based Baseline Classifier

Replicates the binary MVP logic extended to 3 classes using
pure distance thresholds. Used as the comparison baseline in evaluation.
"""

import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix

from features import haversine_m, FEATURE_NAMES

SAFE_THRESHOLD_M = 10.0
WARNING_THRESHOLD_M = 25.0

LABEL_NAMES = {0: "Safe", 1: "Warning", 2: "Critical"}


def predict_single(distance_m: float) -> int:
    """Predict risk label for a single distance value."""
    if distance_m < SAFE_THRESHOLD_M:
        return 0
    elif distance_m < WARNING_THRESHOLD_M:
        return 1
    return 2


def predict_batch(df: pd.DataFrame) -> np.ndarray:
    """
    Predict labels for a DataFrame with pre-computed distance_m column.
    If distance_m is not present, computes it from raw coordinates.
    """
    if "distance_m" not in df.columns:
        df = df.copy()
        df["distance_m"] = df.apply(
            lambda r: haversine_m(r.pilgrim_lat, r.pilgrim_lon, r.supervisor_lat, r.supervisor_lon),
            axis=1,
        )
    return df["distance_m"].apply(predict_single).values


def evaluate(df: pd.DataFrame) -> dict:
    """
    Run baseline predictions on a DataFrame and return evaluation metrics.
    DataFrame must have a 'label' column and either 'distance_m' or raw coords.
    """
    y_true = df["label"].values
    y_pred = predict_batch(df)

    report = classification_report(
        y_true, y_pred,
        target_names=[LABEL_NAMES[i] for i in range(3)],
        output_dict=True,
        zero_division=0,
    )
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2])

    return {
        "model": "Baseline (distance threshold)",
        "accuracy": report["accuracy"],
        "macro_f1": report["macro avg"]["f1-score"],
        "report": report,
        "confusion_matrix": cm,
    }


if __name__ == "__main__":
    import sys
    from pathlib import Path

    data_path = Path(__file__).parent.parent / "data" / "datasets" / "pilgrim_data.csv"
    if not data_path.exists():
        print(f"Dataset not found at {data_path}. Run data/generate_dataset.py first.")
        sys.exit(1)

    print("Loading dataset...")
    df = pd.read_csv(data_path)

    print("Evaluating baseline classifier...")
    results = evaluate(df)

    print(f"\n{'=' * 50}")
    print(f"Model: {results['model']}")
    print(f"Accuracy: {results['accuracy']:.4f}")
    print(f"Macro F1: {results['macro_f1']:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(
        df["label"].values,
        predict_batch(df),
        target_names=[LABEL_NAMES[i] for i in range(3)],
        zero_division=0,
    ))
    print(f"Confusion Matrix:\n{results['confusion_matrix']}")
