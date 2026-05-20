"""
Simulation Replay Script

Replays rows from the generated dataset to the backend API,
simulating real-time pilgrim movement.

Usage:
    python simulate.py                        # all pilgrims, real-time speed
    python simulate.py --speed 5              # 5× faster
    python simulate.py --scenario rapid_separation --speed 2
    python simulate.py --pilgrims 10 --speed 3
"""

import argparse
import asyncio
import time
from pathlib import Path

import aiohttp
import pandas as pd

API_URL = "http://localhost:8000/api/location"
DATA_PATH = Path("data/datasets/pilgrim_data.csv")
TIMESTEP_SECONDS = 2   # matches generator


async def post_location(session: aiohttp.ClientSession, row: dict) -> None:
    payload = {
        "pilgrim_id":         row["pilgrim_id"],
        "supervisor_id":      row["supervisor_id"],
        "pilgrim_lat":        row["pilgrim_lat"],
        "pilgrim_lon":        row["pilgrim_lon"],
        "supervisor_lat":     row["supervisor_lat"],
        "supervisor_lon":     row["supervisor_lon"],
        "pilgrim_speed":      row["pilgrim_speed"],
        "supervisor_speed":   row["supervisor_speed"],
        "pilgrim_heading":    row["pilgrim_heading"],
        "supervisor_heading": row["supervisor_heading"],
    }
    try:
        async with session.post(API_URL, json=payload) as resp:
            if resp.status not in (200, 201):
                print(f"  [!] {row['pilgrim_id']} → HTTP {resp.status}")
    except aiohttp.ClientError as e:
        print(f"  [!] Connection error: {e}")


async def run(df: pd.DataFrame, speed: float) -> None:
    delay = TIMESTEP_SECONDS / speed
    pilgrims = df["pilgrim_id"].unique()
    print(f"Simulating {len(pilgrims)} pilgrims at {speed}× speed (delay={delay:.2f}s/step)")
    print(f"Posting to {API_URL}\n")

    # Group by step index within each pilgrim sequence, then send all pilgrims
    # for the same step in parallel before moving to the next step.
    max_steps = df.groupby("pilgrim_id").size().max()

    # Build per-pilgrim row lists sorted by timestamp
    by_pilgrim = {
        pid: group.reset_index(drop=True)
        for pid, group in df.sort_values("timestamp").groupby("pilgrim_id")
    }

    connector = aiohttp.TCPConnector(limit=50)
    async with aiohttp.ClientSession(connector=connector) as session:
        for step in range(max_steps):
            t0 = time.monotonic()
            tasks = []
            for pid, rows in by_pilgrim.items():
                if step < len(rows):
                    tasks.append(post_location(session, rows.iloc[step].to_dict()))
            await asyncio.gather(*tasks)

            elapsed = time.monotonic() - t0
            sleep = max(0.0, delay - elapsed)
            if step % 10 == 0:
                print(f"  Step {step:>4}/{max_steps}  active={len(tasks)}  sleep={sleep:.3f}s")
            await asyncio.sleep(sleep)

    print("\nSimulation complete.")


def main():
    parser = argparse.ArgumentParser(description="Replay dataset to the backend API")
    parser.add_argument("--speed",    type=float, default=1.0,  help="Replay speed multiplier (default: 1)")
    parser.add_argument("--scenario", type=str,   default=None, help="Filter to one scenario name")
    parser.add_argument("--pilgrims", type=int,   default=None, help="Limit to N pilgrims")
    args = parser.parse_args()

    if not DATA_PATH.exists():
        print(f"Dataset not found: {DATA_PATH}\nRun: python data/generate_dataset.py")
        return

    print(f"Loading dataset from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)

    if args.scenario:
        df = df[df["scenario"] == args.scenario]
        if df.empty:
            print(f"No rows for scenario '{args.scenario}'")
            return
        print(f"Filtered to scenario '{args.scenario}': {len(df)} rows")

    if args.pilgrims:
        pilgrim_ids = df["pilgrim_id"].unique()[: args.pilgrims]
        df = df[df["pilgrim_id"].isin(pilgrim_ids)]
        print(f"Limited to {len(pilgrim_ids)} pilgrims: {len(df)} rows")

    asyncio.run(run(df, args.speed))


if __name__ == "__main__":
    main()
