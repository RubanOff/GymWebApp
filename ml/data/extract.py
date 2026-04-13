from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine

from ml.config import get_settings


RAW_HISTORY_QUERY = """
SELECT
  w.user_id,
  w.id AS workout_id,
  w.date AS workout_date,
  we.id AS workout_exercise_id,
  we.exercise_name,
  we.order_index AS exercise_order_index,
  s.id AS set_id,
  s.order_index AS set_order_index,
  s.reps,
  s.weight,
  s.rpe,
  s.created_at
FROM workouts w
JOIN users u ON u.id = w.user_id
JOIN workout_exercises we ON we.workout_id = w.id
JOIN sets s ON s.workout_exercise_id = we.id
WHERE s.reps IS NOT NULL
  AND s.weight IS NOT NULL
ORDER BY w.user_id, we.exercise_name, w.date, s.order_index
"""


def extract_raw_history_frame(
    database_url: str | None = None,
    *,
    synthetic_only: bool = False,
) -> pd.DataFrame:
    engine = create_engine(database_url or get_settings().database_url)
    query = RAW_HISTORY_QUERY
    if synthetic_only:
        query = query.replace(
            "WHERE s.reps IS NOT NULL\n  AND s.weight IS NOT NULL",
            "WHERE s.reps IS NOT NULL\n  AND s.weight IS NOT NULL\n  AND u.email LIKE 'ml.synthetic+%%@gympulse.local'",
        )
    frame = pd.read_sql(
        query,
        engine,
    )
    if frame.empty:
        return frame

    frame["workout_date"] = pd.to_datetime(frame["workout_date"])
    frame["weight"] = pd.to_numeric(frame["weight"], errors="coerce")
    frame["rpe"] = pd.to_numeric(frame["rpe"], errors="coerce")
    frame["reps"] = pd.to_numeric(frame["reps"], errors="coerce")
    frame["created_at"] = pd.to_datetime(frame["created_at"], utc=True, errors="coerce")
    return frame


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract raw history from PostgreSQL.")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--synthetic-only", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    frame = extract_raw_history_frame(synthetic_only=args.synthetic_only)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(args.output, index=False)
    print(f"Wrote {len(frame)} raw set rows to {args.output}")


if __name__ == "__main__":
    main()
