from __future__ import annotations

import argparse
from pathlib import Path
from uuid import uuid4

import pandas as pd


REQUIRED_COLUMNS = {
    "user_email",
    "workout_date",
    "exercise_name",
    "set_order",
    "reps",
    "weight",
}


def normalize_public_csv(frame: pd.DataFrame) -> dict[str, pd.DataFrame]:
    missing = REQUIRED_COLUMNS.difference(frame.columns)
    if missing:
        raise ValueError(f"CSV is missing required columns: {', '.join(sorted(missing))}")

    frame = frame.copy()
    frame["rpe"] = frame.get("rpe")
    frame["workout_title"] = frame.get("workout_title", "Imported Session")
    frame["exercise_notes"] = frame.get("exercise_notes")
    frame["user_email"] = frame["user_email"].astype(str).str.strip().str.lower()
    frame["workout_date"] = pd.to_datetime(frame["workout_date"]).dt.date.astype(str)

    user_ids = {email: str(uuid4()) for email in sorted(frame["user_email"].unique())}
    now = pd.Timestamp.utcnow().isoformat()
    workout_keys = (
        frame[["user_email", "workout_date", "workout_title"]]
        .drop_duplicates()
        .reset_index(drop=True)
    )
    workout_keys["workout_id"] = [str(uuid4()) for _ in range(len(workout_keys))]

    users = pd.DataFrame(
        {
            "id": list(user_ids.values()),
            "email": list(user_ids.keys()),
            "password_hash": [None] * len(user_ids),
            "email_verified_at": [now] * len(user_ids),
            "created_at": [now] * len(user_ids),
            "updated_at": [now] * len(user_ids),
        }
    )

    workouts = workout_keys.rename(
        columns={
            "workout_id": "id",
            "workout_date": "date",
            "workout_title": "title",
        }
    )
    workouts["user_id"] = workouts["user_email"].map(user_ids)
    workouts["notes"] = None
    workouts["created_at"] = now
    workouts = workouts[["id", "user_id", "title", "date", "notes", "created_at"]]

    frame = frame.merge(
        workout_keys,
        on=["user_email", "workout_date", "workout_title"],
        how="left",
        suffixes=("", "_workout"),
    )

    exercise_keys = (
        frame[["workout_id", "exercise_name", "exercise_notes"]]
        .drop_duplicates()
        .reset_index(drop=True)
    )
    exercise_keys["workout_exercise_id"] = [str(uuid4()) for _ in range(len(exercise_keys))]
    exercise_keys["order_index"] = (
        exercise_keys.groupby("workout_id").cumcount()
    )
    exercise_keys["created_at"] = now
    workout_exercises = exercise_keys.rename(
        columns={
            "workout_exercise_id": "id",
            "exercise_notes": "notes",
        }
    )[["id", "workout_id", "exercise_name", "notes", "order_index", "created_at"]]

    frame = frame.merge(
        workout_exercises.rename(columns={"id": "workout_exercise_id"})[
            ["workout_exercise_id", "workout_id", "exercise_name"]
        ],
        on=["workout_id", "exercise_name"],
        how="left",
    )

    sets = frame.rename(columns={"set_order": "order_index"}).copy()
    sets["id"] = [str(uuid4()) for _ in range(len(sets))]
    sets["created_at"] = now
    sets = sets[["id", "workout_exercise_id", "reps", "weight", "rpe", "order_index", "created_at"]]

    return {
        "users": users,
        "workouts": workouts,
        "workout_exercises": workout_exercises,
        "sets": sets,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize a public CSV to GymPulse schema CSVs.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    frame = pd.read_csv(args.input)
    bundle = normalize_public_csv(frame)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, normalized in bundle.items():
        normalized.to_csv(args.output_dir / f"{name}.csv", index=False)
    print(f"Normalized CSV bundle written to {args.output_dir}")


if __name__ == "__main__":
    main()
