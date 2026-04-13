from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd


def compute_top_set_frame(raw_frame: pd.DataFrame) -> pd.DataFrame:
    if raw_frame.empty:
        return pd.DataFrame(
            columns=[
                "user_id",
                "exercise_name",
                "workout_id",
                "workout_date",
                "weight",
                "reps",
                "rpe",
                "days_since_previous_session",
                "session_index",
                "history_points_used",
            ]
        )

    frame = raw_frame.copy()
    frame["workout_date"] = pd.to_datetime(frame["workout_date"])
    frame["weight"] = pd.to_numeric(frame["weight"], errors="coerce")
    frame["reps"] = pd.to_numeric(frame["reps"], errors="coerce")
    frame["rpe"] = pd.to_numeric(frame["rpe"], errors="coerce")
    frame["set_order_index"] = pd.to_numeric(frame["set_order_index"], errors="coerce")

    frame = frame.sort_values(
        ["user_id", "exercise_name", "workout_date", "weight", "set_order_index"],
        ascending=[True, True, True, False, False],
    )
    top_sets = (
        frame.groupby(["user_id", "exercise_name", "workout_id"], as_index=False)
        .first()
        .sort_values(["user_id", "exercise_name", "workout_date"])
        .reset_index(drop=True)
    )

    top_sets["days_since_previous_session"] = (
        top_sets.groupby(["user_id", "exercise_name"])["workout_date"]
        .diff()
        .dt.days
        .fillna(0)
        .astype(int)
    )
    top_sets["session_index"] = (
        top_sets.groupby(["user_id", "exercise_name"]).cumcount().astype(int)
    )
    top_sets["history_points_used"] = top_sets["session_index"] + 1
    top_sets["rpe_filled"] = top_sets["rpe"].fillna(0.0)
    top_sets["workout_date"] = top_sets["workout_date"].dt.date.astype(str)
    return top_sets[
        [
            "user_id",
            "exercise_name",
            "workout_id",
            "workout_date",
            "weight",
            "reps",
            "rpe",
            "rpe_filled",
            "days_since_previous_session",
            "session_index",
            "history_points_used",
        ]
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Transform raw sets into top-set history.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    frame = pd.read_csv(args.input)
    transformed = compute_top_set_frame(frame)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    transformed.to_csv(args.output, index=False)
    print(f"Wrote {len(transformed)} top-set rows to {args.output}")


if __name__ == "__main__":
    main()

