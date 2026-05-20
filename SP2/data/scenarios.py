"""
Scenario definitions for synthetic Hajj movement data generation.

Each scenario defines how pilgrim and supervisor move relative to each other
over a sequence of timesteps, producing realistic spatial-temporal patterns
around Masjid al-Haram (lat ~21.42, lon ~39.82).
"""

from dataclasses import dataclass, field
from typing import List, Tuple

# Masjid al-Haram approximate center
MECCA_LAT = 21.4225
MECCA_LON = 39.8262

# Meters per degree (approximate at Mecca latitude)
METERS_PER_DEG_LAT = 111_320
METERS_PER_DEG_LON = 102_470  # cos(21.42°) * 111_320


def meters_to_deg_lat(m: float) -> float:
    return m / METERS_PER_DEG_LAT


def meters_to_deg_lon(m: float) -> float:
    return m / METERS_PER_DEG_LON


@dataclass
class ScenarioConfig:
    name: str
    description: str
    n_sequences: int          # number of independent pilgrim-supervisor pairs
    steps_per_sequence: int   # timesteps per sequence
    label_distribution: List[Tuple[int, str]]  # (label, phase_name) list for phases

    # Spatial dynamics
    initial_distance_range: Tuple[float, float]  # meters, (min, max)
    supervisor_speed_range: Tuple[float, float]   # m/s
    pilgrim_speed_base: float                      # base m/s for pilgrim

    # Separation/recovery dynamics
    separation_acceleration: float  # m/s^2 — how fast pilgrim drifts away
    recovery_deceleration: float    # m/s^2 — how fast pilgrim returns
    noise_std: float                # GPS noise std in meters


# ─── Scenario Definitions ─────────────────────────────────────────────────────

SCENARIOS: List[ScenarioConfig] = [

    ScenarioConfig(
        name="normal_following",
        description="Pilgrim stays close to supervisor throughout",
        n_sequences=200,
        steps_per_sequence=60,
        label_distribution=[(0, "safe")],
        initial_distance_range=(1.0, 8.0),
        supervisor_speed_range=(0.5, 1.2),
        pilgrim_speed_base=1.0,
        separation_acceleration=0.0,
        recovery_deceleration=0.0,
        noise_std=0.5,
    ),

    ScenarioConfig(
        name="gradual_drift",
        description="Pilgrim gradually drifts into warning zone",
        n_sequences=200,
        steps_per_sequence=80,
        label_distribution=[(0, "safe"), (1, "warning")],
        initial_distance_range=(2.0, 6.0),
        supervisor_speed_range=(0.5, 1.0),
        pilgrim_speed_base=0.9,
        separation_acceleration=0.04,
        recovery_deceleration=0.0,
        noise_std=0.8,
    ),

    ScenarioConfig(
        name="rapid_separation",
        description="Pilgrim quickly moves from warning to critical",
        n_sequences=150,
        steps_per_sequence=60,
        label_distribution=[(1, "warning"), (2, "critical")],
        initial_distance_range=(10.0, 18.0),
        supervisor_speed_range=(0.4, 0.9),
        pilgrim_speed_base=1.5,
        separation_acceleration=0.12,
        recovery_deceleration=0.0,
        noise_std=1.0,
    ),

    ScenarioConfig(
        name="dense_crowd_interference",
        description="Pilgrim temporarily separates due to crowd, then returns",
        n_sequences=150,
        steps_per_sequence=90,
        label_distribution=[(0, "safe"), (1, "warning"), (0, "recovery")],
        initial_distance_range=(2.0, 7.0),
        supervisor_speed_range=(0.3, 0.7),
        pilgrim_speed_base=0.8,
        separation_acceleration=0.08,
        recovery_deceleration=0.15,
        noise_std=1.2,
    ),

    ScenarioConfig(
        name="recovery_after_warning",
        description="Pilgrim was warned and actively returns to supervisor",
        n_sequences=150,
        steps_per_sequence=70,
        label_distribution=[(1, "warning"), (0, "recovery")],
        initial_distance_range=(12.0, 22.0),
        supervisor_speed_range=(0.5, 1.0),
        pilgrim_speed_base=1.2,
        separation_acceleration=0.0,
        recovery_deceleration=0.12,
        noise_std=0.8,
    ),

    ScenarioConfig(
        name="full_separation",
        description="Pilgrim drifts from safe through warning to critical",
        n_sequences=150,
        steps_per_sequence=90,
        label_distribution=[(0, "safe"), (1, "warning"), (2, "critical")],
        initial_distance_range=(3.0, 8.0),
        supervisor_speed_range=(0.5, 1.0),
        pilgrim_speed_base=1.0,
        separation_acceleration=0.06,
        recovery_deceleration=0.0,
        noise_std=1.0,
    ),

    ScenarioConfig(
        name="erratic_edge_case",
        description="Unpredictable movement with rapid direction changes",
        n_sequences=100,
        steps_per_sequence=80,
        label_distribution=[(0, "safe"), (2, "critical"), (1, "warning"), (0, "safe")],
        initial_distance_range=(1.0, 25.0),
        supervisor_speed_range=(0.2, 1.8),
        pilgrim_speed_base=1.3,
        separation_acceleration=0.15,
        recovery_deceleration=0.20,
        noise_std=2.0,
    ),
]

# Label thresholds used for rule-based baseline (also guides synthetic labeling)
SAFE_THRESHOLD_M = 10.0    # distance < 10m → Safe
WARNING_THRESHOLD_M = 25.0  # 10–25m → Warning, >25m → Critical
