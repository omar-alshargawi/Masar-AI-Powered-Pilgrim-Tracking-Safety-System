"""
Synthetic Hajj Pilgrim Movement Dataset Generator

Generates realistic spatial-temporal movement sequences around Masjid al-Haram
for 7 scenario types. Outputs a CSV ready for feature engineering and model training.

Usage:
    python data/generate_dataset.py
"""

import math
import random
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta

from scenarios import (
    SCENARIOS, ScenarioConfig,
    SAFE_THRESHOLD_M, WARNING_THRESHOLD_M,
    MECCA_LAT, MECCA_LON,
    meters_to_deg_lat, meters_to_deg_lon,
)

RANDOM_SEED = 42
TIMESTEP_SECONDS = 2          # one GPS reading every 2 seconds
OUTPUT_PATH = Path(__file__).parent / "datasets" / "pilgrim_data.csv"


# ─── Helpers ──────────────────────────────────────────────────────────────────

def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def add_noise(value: float, std: float) -> float:
    return value + random.gauss(0, std)


def label_from_distance(dist_m: float) -> int:
    if dist_m < SAFE_THRESHOLD_M:
        return 0
    elif dist_m < WARNING_THRESHOLD_M:
        return 1
    return 2


def random_heading() -> float:
    return random.uniform(0, 360)


def move_point(lat: float, lon: float, heading_deg: float, speed_mps: float,
               dt: float) -> tuple[float, float]:
    """Move a coordinate by (speed * dt) metres in direction heading_deg."""
    dist_m = speed_mps * dt
    heading_rad = math.radians(heading_deg)
    dlat = (dist_m * math.cos(heading_rad)) / 111_320
    dlon = (dist_m * math.sin(heading_rad)) / (111_320 * math.cos(math.radians(lat)))
    return lat + dlat, lon + dlon


# ─── Single Sequence Generator ────────────────────────────────────────────────

def generate_sequence(
    scenario: ScenarioConfig,
    pilgrim_id: str,
    supervisor_id: str,
    sequence_id: int,
    base_time: datetime,
) -> list[dict]:
    """Generate one pilgrim-supervisor sequence for a given scenario."""
    rng = random  # module-level random is seeded globally

    rows = []

    # Starting position: random offset from Mecca center
    sup_lat = MECCA_LAT + meters_to_deg_lat(rng.uniform(-200, 200))
    sup_lon = MECCA_LON + meters_to_deg_lon(rng.uniform(-200, 200))

    # Initial distance between pilgrim and supervisor
    init_dist = rng.uniform(*scenario.initial_distance_range)
    init_angle = rng.uniform(0, 2 * math.pi)
    pil_lat = sup_lat + meters_to_deg_lat(init_dist * math.cos(init_angle))
    pil_lon = sup_lon + meters_to_deg_lon(init_dist * math.sin(init_angle))

    # Speeds and headings
    sup_speed = rng.uniform(*scenario.supervisor_speed_range)
    sup_heading = random_heading()

    pil_speed = scenario.pilgrim_speed_base + rng.uniform(-0.2, 0.2)
    pil_heading = sup_heading + rng.uniform(-30, 30)  # loosely following

    # Phase schedule: split steps evenly among label phases
    phases = scenario.label_distribution
    n_phases = len(phases)
    steps = scenario.steps_per_sequence
    phase_len = steps // n_phases
    phase_schedule = []
    for i, (label, phase_name) in enumerate(phases):
        start = i * phase_len
        end = start + phase_len if i < n_phases - 1 else steps
        phase_schedule.append((start, end, label, phase_name))

    current_label = phases[0][0]
    separation_speed = 0.0   # extra drift speed added to pilgrim

    for step in range(steps):
        t = base_time + timedelta(seconds=step * TIMESTEP_SECONDS)

        # Determine current phase
        for start, end, label, phase_name in phase_schedule:
            if start <= step < end:
                current_label = label
                break

        # ── Supervisor movement ──────────────────────────────────────────────
        # Slightly randomise supervisor heading each step
        sup_heading += rng.uniform(-5, 5)
        sup_speed_t = sup_speed + rng.uniform(-0.1, 0.1)
        sup_lat, sup_lon = move_point(sup_lat, sup_lon, sup_heading, sup_speed_t, TIMESTEP_SECONDS)

        # ── Pilgrim movement ─────────────────────────────────────────────────
        dist = haversine_m(pil_lat, pil_lon, sup_lat, sup_lon)

        if current_label == 0:  # Safe — pilgrim follows supervisor
            # Steer pilgrim gradually toward supervisor
            angle_to_sup = math.degrees(
                math.atan2(
                    meters_to_deg_lon(sup_lon - pil_lon),
                    meters_to_deg_lat(sup_lat - pil_lat),
                )
            )
            pil_heading = pil_heading + 0.3 * (angle_to_sup - pil_heading) + rng.uniform(-10, 10)
            separation_speed = max(0.0, separation_speed - scenario.recovery_deceleration * TIMESTEP_SECONDS)
            pil_speed_t = pil_speed + rng.uniform(-0.1, 0.1) - separation_speed

        elif current_label == 1:  # Warning — gradual drift or recovery
            if "recovery" in phase_name:
                angle_to_sup = math.degrees(
                    math.atan2(
                        meters_to_deg_lon(sup_lon - pil_lon),
                        meters_to_deg_lat(sup_lat - pil_lat),
                    )
                )
                pil_heading = pil_heading + 0.5 * (angle_to_sup - pil_heading) + rng.uniform(-15, 15)
                separation_speed = max(0.0, separation_speed - scenario.recovery_deceleration * TIMESTEP_SECONDS)
            else:
                pil_heading += rng.uniform(-20, 20)  # drifting
                separation_speed = min(
                    separation_speed + scenario.separation_acceleration * TIMESTEP_SECONDS,
                    2.0,
                )
            pil_speed_t = pil_speed + separation_speed + rng.uniform(-0.1, 0.1)

        else:  # Critical — rapid separation
            pil_heading += rng.uniform(-15, 15)
            separation_speed = min(
                separation_speed + scenario.separation_acceleration * TIMESTEP_SECONDS,
                3.0,
            )
            pil_speed_t = pil_speed + separation_speed + rng.uniform(-0.1, 0.2)

        pil_speed_t = max(0.1, pil_speed_t)
        pil_lat, pil_lon = move_point(pil_lat, pil_lon, pil_heading, pil_speed_t, TIMESTEP_SECONDS)

        # ── GPS noise ────────────────────────────────────────────────────────
        noise_m = scenario.noise_std
        noisy_pil_lat = pil_lat + meters_to_deg_lat(add_noise(0, noise_m))
        noisy_pil_lon = pil_lon + meters_to_deg_lon(add_noise(0, noise_m))
        noisy_sup_lat = sup_lat + meters_to_deg_lat(add_noise(0, noise_m * 0.5))
        noisy_sup_lon = sup_lon + meters_to_deg_lon(add_noise(0, noise_m * 0.5))

        # Recalculate label based on actual noisy distance (more realistic)
        actual_dist = haversine_m(noisy_pil_lat, noisy_pil_lon, noisy_sup_lat, noisy_sup_lon)
        # Blend scenario-driven label with distance-based label (scenario label dominates)
        dist_label = label_from_distance(actual_dist)
        # Use scenario label if dist_label is within 1 class, else use dist_label
        final_label = current_label if abs(current_label - dist_label) <= 1 else dist_label

        rows.append({
            "timestamp": t.isoformat(),
            "scenario": scenario.name,
            "sequence_id": sequence_id,
            "pilgrim_id": pilgrim_id,
            "supervisor_id": supervisor_id,
            "pilgrim_lat": round(noisy_pil_lat, 7),
            "pilgrim_lon": round(noisy_pil_lon, 7),
            "supervisor_lat": round(noisy_sup_lat, 7),
            "supervisor_lon": round(noisy_sup_lon, 7),
            "pilgrim_speed": round(max(0.0, pil_speed_t), 3),
            "supervisor_speed": round(max(0.0, sup_speed_t), 3),
            "pilgrim_heading": round(pil_heading % 360, 2),
            "supervisor_heading": round(sup_heading % 360, 2),
            "label": final_label,
        })

    return rows


# ─── Main Generator ───────────────────────────────────────────────────────────

def generate_dataset() -> pd.DataFrame:
    random.seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)

    all_rows: list[dict] = []
    sequence_counter = 0
    base_time = datetime(2024, 6, 15, 8, 0, 0)  # Hajj season date

    print("Generating synthetic pilgrim movement dataset...")
    print(f"{'Scenario':<30} {'Sequences':>10} {'Rows':>10}")
    print("-" * 52)

    for scenario in SCENARIOS:
        scenario_rows = 0
        for seq_idx in range(scenario.n_sequences):
            pilgrim_id = f"PIL_{sequence_counter:05d}"
            supervisor_id = f"SUP_{(sequence_counter // 5):04d}"  # 5 pilgrims per supervisor
            seq_time = base_time + timedelta(minutes=sequence_counter * 3)

            rows = generate_sequence(
                scenario=scenario,
                pilgrim_id=pilgrim_id,
                supervisor_id=supervisor_id,
                sequence_id=sequence_counter,
                base_time=seq_time,
            )
            all_rows.extend(rows)
            scenario_rows += len(rows)
            sequence_counter += 1

        print(f"  {scenario.name:<28} {scenario.n_sequences:>10} {scenario_rows:>10}")

    df = pd.DataFrame(all_rows)
    print("-" * 52)
    print(f"  {'TOTAL':<28} {sequence_counter:>10} {len(df):>10}")

    return df


def print_stats(df: pd.DataFrame) -> None:
    print("\nDataset Statistics:")
    print(f"  Total rows:     {len(df):,}")
    print(f"  Total pilgrims: {df['pilgrim_id'].nunique():,}")
    print(f"  Scenarios:      {df['scenario'].nunique()}")
    print("\nLabel distribution:")
    label_names = {0: "Safe", 1: "Warning", 2: "Critical"}
    for label, name in label_names.items():
        count = (df["label"] == label).sum()
        pct = count / len(df) * 100
        print(f"  {name:<10} ({label}): {count:>7,}  ({pct:.1f}%)")
    print("\nScenario breakdown:")
    print(df.groupby(["scenario", "label"]).size().unstack(fill_value=0).to_string())


if __name__ == "__main__":
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df = generate_dataset()
    print_stats(df)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"\nSaved to: {OUTPUT_PATH}")
