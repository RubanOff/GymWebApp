from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

from ml.bootstrap.synthetic import generate_synthetic_tables, write_tables
from ml.config import get_settings


def load_tables_to_postgres(tables: dict[str, pd.DataFrame], clear_synthetic: bool) -> None:
    engine = create_engine(get_settings().database_url)

    with engine.begin() as connection:
        if clear_synthetic:
            connection.execute(
                text("DELETE FROM users WHERE email LIKE 'ml.synthetic+%@gympulse.local'")
            )

    for name in ("users", "workouts", "workout_exercises", "sets"):
        tables[name].to_sql(name, engine, if_exists="append", index=False, method="multi")


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

