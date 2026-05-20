"""
Inference Service — loads the trained model once and serves predictions.
"""

import sys
from pathlib import Path
from typing import Optional

import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "ml"))
from predict import predictor   # module-level singleton


def load_model() -> None:
    """Call once at application startup."""
    models_dir = Path(__file__).parent.parent.parent / "ml" / "models"
    try:
        predictor.load(models_dir)
    except FileNotFoundError as e:
        print(f"[WARNING] Model not loaded: {e}")
        print("  The backend will start but predictions will be unavailable until models are trained.")


def predict(pilgrim_id: str, reading: dict) -> dict:
    """
    Run inference for one pilgrim reading.

    Returns:
        {
            "label":         int or None,
            "label_name":    str or None,
            "confidence":    float or None,
            "probabilities": list or None,
            "window_full":   bool,
        }
    """
    if not predictor.is_loaded:
        return {"label": None, "label_name": None, "confidence": None,
                "probabilities": None, "window_full": False}
    return predictor.update(pilgrim_id, reading)
