from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.dialects.postgresql import DATE, INTEGER, NUMERIC, TEXT, TIMESTAMP, UUID

from ml.bootstrap.synthetic import generate_synthetic_tables, write_tables
from ml.config import get_settings


TABLE_DTYPES = {
    "users": {
        "id": UUID(as_uuid=False),
        "email": TEXT(),
        "password_hash": TEXT(),
        "email_verified_at": TIMESTAMP(timezone=True),
        "created_at": TIMESTAMP(timezone=True),
        "updated_at": TIMESTAMP(timezone=True),
    },
    "workouts": {
        "id": UUID(as_uuid=False),
        "user_id": UUID(as_uuid=False),
        "title": TEXT(),
        "date": DATE(),
        "notes": TEXT(),
        "created_at": TIMESTAMP(timezone=True),
    },
    "workout_exercises": {
        "id": UUID(as_uuid=False),
        "workout_id": UUID(as_uuid=False),
        "exercise_name": TEXT(),
        "notes": TEXT(),
        "order_index": INTEGER(),
        "created_at": TIMESTAMP(timezone=True),
    },
    "sets": {
        "id": UUID(as_uuid=False),
        "workout_exercise_id": UUID(as_uuid=False),
        "reps": INTEGER(),
        "weight": NUMERIC(8, 2),
        "rpe": NUMERIC(3, 1),
        "order_index": INTEGER(),
        "created_at": TIMESTAMP(timezone=True),
    },
}


def load_tables_to_postgres(tables: dict[str, pd.DataFrame], clear_synthetic: bool) -> None:
    engine = create_engine(get_settings().database_url)

    with engine.begin() as connection:
        if clear_synthetic:
            connection.execute(
                text("DELETE FROM users WHERE email LIKE 'ml.synthetic+%@gympulse.local'")
            )

    for name in ("users", "workouts", "workout_exercises", "sets"):
        frame = tables[name].copy()
        if "date" in frame.columns:
            frame["date"] = pd.to_datetime(frame["date"]).dt.date
        for timestamp_column in ("email_verified_at", "created_at", "updated_at"):
            if timestamp_column in frame.columns:
                frame[timestamp_column] = pd.to_datetime(frame[timestamp_column], utc=True)
        for integer_column in ("order_index", "reps"):
            if integer_column in frame.columns:
                frame[integer_column] = frame[integer_column].astype("Int64")
        frame.to_sql(
            name,
            engine,
            if_exists="append",
            index=False,
            method="multi",
            dtype=TABLE_DTYPES[name],
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate and load synthetic history into PostgreSQL.")
    parser.add_argument("--users", type=int, default=12)
    parser.add_argument("--weeks", type=int, default=28)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--clear-synthetic", action="store_true")
    parser.add_argument("--skip-db", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    tables = generate_synthetic_tables(users=args.users, weeks=args.weeks, seed=args.seed)

    if args.output_dir:
        write_tables(tables, args.output_dir)

    if not args.skip_db:
        load_tables_to_postgres(tables, clear_synthetic=args.clear_synthetic)
        print("Loaded synthetic history into PostgreSQL.")


if __name__ == "__main__":
    main()
