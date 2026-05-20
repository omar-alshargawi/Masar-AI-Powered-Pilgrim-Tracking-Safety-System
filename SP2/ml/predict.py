"""
Real-Time Inference Module

Loads the best trained model and provides per-pilgrim sliding-window inference.
Used by backend/services/inference_service.py.

The predictor maintains per-pilgrim deques internally — callers just pass
one new reading at a time and get a prediction (or None if the window is not yet full).
"""

import json
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import joblib

sys.path.insert(0, str(Path(__file__).parent))
from features import LiveFeatureState, WINDOW_SIZE, FEATURE_NAMES
from train_timeseries import LSTMClassifier, TransformerClassifier, N_FEATURES, N_CLASSES

MODELS_DIR = Path(__file__).parent / "models"
DEVICE = torch.device("cpu")   # CPU is fine for single-sample real-time inference

LABEL_MAP = {0: "Safe", 1: "Warning", 2: "Critical"}


class RealTimePredictor:
    """
    Thread-safe* real-time predictor for multiple pilgrims.

    (*) Stateless between calls for different pilgrim_ids; safe under asyncio
    single-threaded concurrency. For true multi-threading add a lock.

    Usage:
        predictor = RealTimePredictor()
        result = predictor.update("P001", location_reading_dict)
        # result is None until 10 readings have been collected
        # result = {"label": 0, "label_name": "Safe", "confidence": 0.92, "probabilities": [...]}
    """

    def __init__(self):
        self._model: Optional[torch.nn.Module] = None
        self._scaler = None
        self._feature_state = LiveFeatureState()
        self._model_name: str = ""
        self._loaded = False

    def load(self, models_dir: Path = MODELS_DIR) -> None:
        """Load model and scaler from disk. Call once at startup."""
        config_path = models_dir / "config.json"
        if not config_path.exists():
            raise FileNotFoundError(f"config.json not found at {config_path}. Train models first.")

        with open(config_path) as f:
            config = json.load(f)

        self._model_name = config.get("best_model", "LSTM")
        model_cls = LSTMClassifier if self._model_name == "LSTM" else TransformerClassifier

        model_path = models_dir / "best_model.pt"
        if not model_path.exists():
            raise FileNotFoundError(f"best_model.pt not found at {model_path}.")

        self._model = model_cls(n_features=N_FEATURES, n_classes=N_CLASSES).to(DEVICE)
        self._model.load_state_dict(torch.load(model_path, map_location=DEVICE))
        self._model.eval()

        scaler_path = models_dir / "scaler.pkl"
        if not scaler_path.exists():
            raise FileNotFoundError(f"scaler.pkl not found at {scaler_path}.")
        self._scaler = joblib.load(scaler_path)

        self._loaded = True
        print(f"[Predictor] Loaded {self._model_name} model from {model_path}")

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def update(self, pilgrim_id: str, reading: dict) -> Optional[dict]:
        """
        Process one new location reading and return a prediction if ready.

        reading dict keys (all required):
            pilgrim_lat, pilgrim_lon, supervisor_lat, supervisor_lon,
            pilgrim_speed, supervisor_speed, pilgrim_heading, supervisor_heading

        Returns dict or None:
            {
                "label":        int   (0/1/2),
                "label_name":   str   ("Safe"/"Warning"/"Critical"),
                "confidence":   float (max softmax probability),
                "probabilities": list [p_safe, p_warning, p_critical],
                "window_full":  bool
            }
        """
        if not self._loaded:
            raise RuntimeError("Predictor not loaded. Call predictor.load() first.")

        window = self._feature_state.update(pilgrim_id, reading)

        if window is None:
            return {"label": None, "label_name": None, "confidence": None,
                    "probabilities": None, "window_full": False}

        # Scale the window
        n_feat = len(FEATURE_NAMES)
        scaled = self._scaler.transform(window.reshape(-1, n_feat)).reshape(1, WINDOW_SIZE, n_feat)

        tensor = torch.tensor(scaled, dtype=torch.float32).to(DEVICE)
        with torch.no_grad():
            logits = self._model(tensor)
            probs = torch.softmax(logits, dim=1).squeeze().cpu().numpy()

        label = int(probs.argmax())
        return {
            "label":         label,
            "label_name":    LABEL_MAP[label],
            "confidence":    float(probs[label]),
            "probabilities": probs.tolist(),
            "window_full":   True,
        }

    def reset_pilgrim(self, pilgrim_id: str) -> None:
        """Clear the sliding window for a specific pilgrim (e.g. new session)."""
        state = self._feature_state
        for d in [state._dist_history, state._prev_dist, state._safe_step,
                  state._step, state._feature_window]:
            d.pop(pilgrim_id, None)


# Module-level singleton — imported by inference_service
predictor = RealTimePredictor()
