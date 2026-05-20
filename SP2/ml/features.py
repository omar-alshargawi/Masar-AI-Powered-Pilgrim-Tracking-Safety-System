"""
Feature Engineering Module

Canonical source for all 8 spatial-temporal features used by every model.
Works in two modes:
  - batch:  compute features for a full DataFrame (training)
  - live:   compute features for a single new row + history deque (inference)
"""

import math
import numpy as np
import pandas as pd
from collections import deque
from typing import Optional

# Feature names in the exact order expected by the model
FEATURE_NAMES = [
    "distance_m",
    "speed_diff",
    "heading_diff",
    "separation_rate",
    "avg_dist_5",
    "dist_trend",
    "time_since_safe",
    "group_consistency",
]

WINDOW_SIZE = 10       # timesteps for the sliding window fed to LSTM/Transformer
HISTORY_SIZE = 5       # rolling window used for avg_dist_5 / dist_trend / group_consistency
TIMESTEP_SECONDS = 2   # seconds between readings (must match generator)


# ─── Core Distance Metric ─────────────────────────────────────────────────────

def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in metres between two (lat, lon) points."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def heading_diff_deg(h1: float, h2: float) -> float:
    """Absolute angular difference between two headings [0°–180°]."""
    diff = abs(h1 - h2) % 360
    return diff if diff <= 180 else 360 - diff


# ─── Batch Mode (Training) ────────────────────────────────────────────────────

def compute_features_batch(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute all 8 features for a full dataset DataFrame.

    The DataFrame must be sorted by (pilgrim_id, timestamp) before calling.
    Returns a new DataFrame with feature columns appended.

    Required input columns:
        pilgrim_lat, pilgrim_lon, supervisor_lat, supervisor_lon,
        pilgrim_speed, supervisor_speed, pilgrim_heading, supervisor_heading,
        timestamp, pilgrim_id, label
    """
    df = df.sort_values(["pilgrim_id", "timestamp"]).copy()

    # ── distance_m ────────────────────────────────────────────────────────────
    df["distance_m"] = df.apply(
        lambda r: haversine_m(r.pilgrim_lat, r.pilgrim_lon, r.supervisor_lat, r.supervisor_lon),
        axis=1,
    )

    # ── speed_diff ────────────────────────────────────────────────────────────
    df["speed_diff"] = (df["pilgrim_speed"] - df["supervisor_speed"]).abs()

    # ── heading_diff ──────────────────────────────────────────────────────────
    df["heading_diff"] = df.apply(
        lambda r: heading_diff_deg(r.pilgrim_heading, r.supervisor_heading),
        axis=1,
    )

    # Per-pilgrim rolling features ────────────────────────────────────────────
    grp = df.groupby("pilgrim_id", sort=False)

    # ── separation_rate: Δdistance / Δtime ───────────────────────────────────
    df["_dist_prev"] = grp["distance_m"].shift(1)
    df["separation_rate"] = (df["distance_m"] - df["_dist_prev"]) / TIMESTEP_SECONDS
    df["separation_rate"] = df["separation_rate"].fillna(0.0)

    # ── avg_dist_5: rolling mean of last 5 distances ──────────────────────────
    df["avg_dist_5"] = (
        grp["distance_m"]
        .transform(lambda s: s.rolling(HISTORY_SIZE, min_periods=1).mean())
    )

    # ── dist_trend: linear slope over last 5 distances ───────────────────────
    def rolling_slope(series: pd.Series, window: int = HISTORY_SIZE) -> pd.Series:
        x = np.arange(window, dtype=float)
        slopes = [np.nan] * len(series)
        vals = series.values
        for i in range(len(vals)):
            start = max(0, i - window + 1)
            seg = vals[start : i + 1]
            if len(seg) < 2:
                slopes[i] = 0.0
            else:
                xi = np.arange(len(seg), dtype=float)
                slope = np.polyfit(xi, seg, 1)[0]
                slopes[i] = slope
        return pd.Series(slopes, index=series.index)

    df["dist_trend"] = grp["distance_m"].transform(rolling_slope)

    # ── group_consistency: std dev of last 5 distances ───────────────────────
    df["group_consistency"] = (
        grp["distance_m"]
        .transform(lambda s: s.rolling(HISTORY_SIZE, min_periods=2).std().fillna(0.0))
    )

    # ── time_since_safe: seconds since last Safe (label==0) reading ───────────
    def time_since_safe_col(sub: pd.DataFrame) -> pd.Series:
        result = []
        last_safe_step = None
        for i, (_, row) in enumerate(sub.iterrows()):
            if row["label"] == 0:
                last_safe_step = i
            if last_safe_step is None:
                result.append(float(i * TIMESTEP_SECONDS))
            else:
                result.append(float((i - last_safe_step) * TIMESTEP_SECONDS))
        return pd.Series(result, index=sub.index)

    df["time_since_safe"] = grp.apply(time_since_safe_col).reset_index(level=0, drop=True)

    # Drop temp columns
    df.drop(columns=["_dist_prev"], inplace=True)

    return df


def build_windows(df: pd.DataFrame, window_size: int = WINDOW_SIZE):
    """
    Create sliding windows from a feature-engineered DataFrame.

    Returns:
        windows : np.ndarray  shape (N, window_size, 8)
        labels  : np.ndarray  shape (N,)   — label at last step of window
        meta    : list[dict]  pilgrim_id + sequence_id for each window
    """
    windows, labels, meta = [], [], []

    for (pilgrim_id,), group in df.groupby(["pilgrim_id"], sort=False):
        group = group.reset_index(drop=True)
        feats = group[FEATURE_NAMES].values.astype(np.float32)
        labs = group["label"].values

        for i in range(len(group) - window_size + 1):
            windows.append(feats[i : i + window_size])
            labels.append(int(labs[i + window_size - 1]))
            meta.append({"pilgrim_id": pilgrim_id})

    return np.array(windows), np.array(labels), meta


# ─── Live Mode (Inference) ────────────────────────────────────────────────────

class LiveFeatureState:
    """
    Maintains per-pilgrim rolling state for live inference.

    Usage:
        state = LiveFeatureState()
        features = state.update("P001", new_location_dict)
        # features is None until WINDOW_SIZE readings have been collected
    """

    def __init__(self):
        # keyed by pilgrim_id
        self._dist_history: dict[str, deque] = {}      # last HISTORY_SIZE distances
        self._last_label: dict[str, int] = {}           # last known label (for time_since_safe)
        self._safe_step: dict[str, int] = {}            # step index of last safe reading
        self._step: dict[str, int] = {}                 # current step counter
        self._feature_window: dict[str, deque] = {}    # sliding window of feature vectors
        self._prev_dist: dict[str, Optional[float]] = {}

    def update(self, pilgrim_id: str, reading: dict) -> Optional[np.ndarray]:
        """
        Process one new location reading for a pilgrim.

        reading dict keys:
            pilgrim_lat, pilgrim_lon, supervisor_lat, supervisor_lon,
            pilgrim_speed, supervisor_speed, pilgrim_heading, supervisor_heading,
            label (optional — if not present, uses 0 for time_since_safe calc)

        Returns:
            np.ndarray of shape (WINDOW_SIZE, 8) if window is full, else None.
        """
        # Initialise state for new pilgrim
        if pilgrim_id not in self._step:
            self._dist_history[pilgrim_id] = deque(maxlen=HISTORY_SIZE)
            self._prev_dist[pilgrim_id] = None
            self._safe_step[pilgrim_id] = None
            self._step[pilgrim_id] = 0
            self._feature_window[pilgrim_id] = deque(maxlen=WINDOW_SIZE)

        step = self._step[pilgrim_id]
        self._step[pilgrim_id] += 1

        # ── distance_m ────────────────────────────────────────────────────────
        dist = haversine_m(
            reading["pilgrim_lat"], reading["pilgrim_lon"],
            reading["supervisor_lat"], reading["supervisor_lon"],
        )
        self._dist_history[pilgrim_id].append(dist)
        hist = list(self._dist_history[pilgrim_id])

        # ── speed_diff ────────────────────────────────────────────────────────
        speed_diff = abs(reading["pilgrim_speed"] - reading["supervisor_speed"])

        # ── heading_diff ──────────────────────────────────────────────────────
        h_diff = heading_diff_deg(reading["pilgrim_heading"], reading["supervisor_heading"])

        # ── separation_rate ───────────────────────────────────────────────────
        prev = self._prev_dist[pilgrim_id]
        sep_rate = (dist - prev) / TIMESTEP_SECONDS if prev is not None else 0.0
        self._prev_dist[pilgrim_id] = dist

        # ── avg_dist_5 ────────────────────────────────────────────────────────
        avg_dist_5 = float(np.mean(hist))

        # ── dist_trend ────────────────────────────────────────────────────────
        if len(hist) >= 2:
            x = np.arange(len(hist), dtype=float)
            dist_trend = float(np.polyfit(x, hist, 1)[0])
        else:
            dist_trend = 0.0

        # ── group_consistency ─────────────────────────────────────────────────
        group_consistency = float(np.std(hist)) if len(hist) >= 2 else 0.0

        # ── time_since_safe ───────────────────────────────────────────────────
        current_label = reading.get("label", 0)
        if current_label == 0:
            self._safe_step[pilgrim_id] = step
        last_safe = self._safe_step[pilgrim_id]
        time_since_safe = float((step - last_safe) * TIMESTEP_SECONDS) if last_safe is not None else float(step * TIMESTEP_SECONDS)

        # ── Build feature vector ──────────────────────────────────────────────
        feat_vec = np.array([
            dist, speed_diff, h_diff, sep_rate,
            avg_dist_5, dist_trend, time_since_safe, group_consistency,
        ], dtype=np.float32)

        self._feature_window[pilgrim_id].append(feat_vec)

        if len(self._feature_window[pilgrim_id]) == WINDOW_SIZE:
            return np.stack(self._feature_window[pilgrim_id])   # (WINDOW_SIZE, 8)
        return None
