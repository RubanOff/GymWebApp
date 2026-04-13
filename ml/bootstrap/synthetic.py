from __future__ import annotations

import argparse
import math
import random
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from uuid import uuid4

import pandas as pd


EXERCISES = {
    "Bench Press": {"base_weight": 60.0, "base_reps": 8, "increment": 1.25},
    "Back Squat": {"base_weight": 80.0, "base_reps": 6, "increment": 2.5},
    "Deadlift": {"base_weight": 100.0, "base_reps": 5, "increment": 2.5},
    "Overhead Press": {"base_weight": 35.0, "base_reps": 8, "increment": 1.25},
    "Barbell Row": {"base_weight": 50.0, "base_reps": 8, "increment": 1.25},
    "Incline Dumbbell Press": {"base_weight": 24.0, "base_reps": 10, "increment": 1.0},
    "Lat Pulldown": {"base_weight": 45.0, "base_reps": 10, "increment": 1.25},
    "Romanian Deadlift": {"base_weight": 70.0, "base_reps": 8, "increment": 2.5},
}

PROFILES = {
    "novice": {
        "sessions_per_week": (2, 3),
        "exercise_count": (3, 4),
        "progress_multiplier": 1.1,
        "inconsistency": 0.08,
        "plateau_chance": 0.08,
    },
    "intermediate": {
        "sessions_per_week": (3, 4),
        "exercise_count": (4, 5),
        "progress_multiplier": 0.8,
        "inconsistency": 0.05,
        "plateau_chance": 0.15,
    },
    "inconsistent": {
        "sessions_per_week": (1, 3),
        "exercise_count": (3, 4),
        "progress_multiplier": 0.65,
        "inconsistency": 0.25,
        "plateau_chance": 0.25,
    },
    "hypertrophy-focused": {
        "sessions_per_week": (3, 5),
        "exercise_count": (4, 6),
        "progress_multiplier": 0.7,
        "inconsistency": 0.1,
        "plateau_chance": 0.2,
    },
}


@dataclass
class ExerciseState:
    top_weight: float
    top_reps: int
    appearances: int = 0


def round_to_plate(value: float) -> float:
    return round(value / 2.5) * 2.5


def iso_timestamp(day: date, hour_offset: int) -> str:
    dt = datetime.combine(day, time(hour=6 + hour_offset, minute=0), tzinfo=timezone.utc)
    return dt.isoformat()


def build_user_profile(rng: random.Random, user_index: int) -> tuple[str, str]:
    profile = rng.choice(list(PROFILES.keys()))
    email = f"ml.synthetic+{user_index}@gympulse.local"
    return email, profile


def generate_set_rows(
    rng: random.Random,
    workout_exercise_id: str,
    top_weight: float,
    top_reps: int,
    day: date,
) -> list[dict[str, object]]:
    set_count = rng.randint(3, 5)
    top_index = set_count - 1 if rng.random() < 0.7 else set_count - 2
    rows: list[dict[str, object]] = []

    for set_index in range(set_count):
        if set_index == top_index:
            weight = top_weight
            reps = top_reps
            rpe = round(rng.uniform(8.0, 9.5), 1)
        else:
            distance = top_index - set_index
            factor = max(0.72, 1 - distance * rng.uniform(0.05, 0.09))
            weight = round_to_plate(top_weight * factor)
            reps = max(3, top_reps + rng.randint(1, 3))
            rpe = round(rng.uniform(6.5, 8.5), 1)

        rows.append(
            {
                "id": str(uuid4()),
                "workout_exercise_id": workout_exercise_id,
                "reps": reps,
                "weight": float(weight),
                "rpe": None if rng.random() < 0.22 else rpe,
                "order_index": set_index,
                "created_at": iso_timestamp(day, set_index),
            }
        )

    return rows


def evolve_state(
    rng: random.Random,
    profile_name: str,
    exercise_name: str,
    state: ExerciseState,
) -> ExerciseState:
    exercise_cfg = EXERCISES[exercise_name]
    profile_cfg = PROFILES[profile_name]

    appearances = state.appearances + 1
    progression = exercise_cfg["increment"] * profile_cfg["progress_multiplier"]

    if appearances % rng.randint(7, 10) == 0:
        next_weight = max(exercise_cfg["base_weight"] * 0.8, state.top_weight * 0.92)
        next_reps = min(12, state.top_reps + 1)
    else:
        if rng.random() < profile_cfg["plateau_chance"]:
            next_weight = state.top_weight
        elif rng.random() < profile_cfg["inconsistency"]:
            next_weight = max(exercise_cfg["base_weight"] * 0.75, state.top_weight - progression)
        else:
            next_weight = state.top_weight + progression + rng.uniform(0.0, progression * 0.5)

        rep_shift = 0
        if rng.random() < 0.25:
            rep_shift = rng.choice([-1, 1])

        inverse_pressure = max(0, math.floor((next_weight - exercise_cfg["base_weight"]) / 15))
        next_reps = max(3, min(12, exercise_cfg["base_reps"] - inverse_pressure + rep_shift))

    return ExerciseState(
        top_weight=round_to_plate(max(exercise_cfg["base_weight"] * 0.7, next_weight)),
        top_reps=next_reps,
        appearances=appearances,
    )


def generate_synthetic_tables(
    users: int = 12,
    weeks: int = 28,
    seed: int = 42,
) -> dict[str, pd.DataFrame]:
    rng = random.Random(seed)
    today = date.today()
    start = today - timedelta(weeks=weeks)

    user_rows: list[dict[str, object]] = []
    workout_rows: list[dict[str, object]] = []
    workout_exercise_rows: list[dict[str, object]] = []
    set_rows: list[dict[str, object]] = []

    for user_index in range(users):
        email, profile_name = build_user_profile(rng, user_index)
        user_id = str(uuid4())
        profile_cfg = PROFILES[profile_name]
        user_rows.append(
            {
                "id": user_id,
                "email": email,
                "password_hash": None,
                "email_verified_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        focus_exercises = rng.sample(list(EXERCISES.keys()), k=min(5, len(EXERCISES)))
        states = {
            name: ExerciseState(
                top_weight=round_to_plate(EXERCISES[name]["base_weight"] * rng.uniform(0.85, 1.15)),
                top_reps=EXERCISES[name]["base_reps"] + rng.randint(-1, 1),
            )
            for name in focus_exercises
        }

        for week_offset in range(weeks):
            sessions_this_week = rng.randint(*profile_cfg["sessions_per_week"])
            session_days = sorted(rng.sample(range(7), k=min(sessions_this_week, 4)))

            for session_index, day_offset in enumerate(session_days):
                if rng.random() < profile_cfg["inconsistency"] * 0.35:
                    continue

                workout_day = start + timedelta(days=week_offset * 7 + day_offset)
                workout_id = str(uuid4())
                exercise_count = rng.randint(*profile_cfg["exercise_count"])
                session_exercises = rng.sample(
                    focus_exercises,
                    k=min(exercise_count, len(focus_exercises)),
                )

                workout_rows.append(
                    {
                        "id": workout_id,
                        "user_id": user_id,
                        "title": f"{profile_name.title()} Session",
                        "date": workout_day.isoformat(),
                        "notes": None,
                        "created_at": iso_timestamp(workout_day, session_index),
                    }
                )

                for exercise_order, exercise_name in enumerate(session_exercises):
                    state = evolve_state(rng, profile_name, exercise_name, states[exercise_name])
                    states[exercise_name] = state
                    workout_exercise_id = str(uuid4())

                    workout_exercise_rows.append(
                        {
                            "id": workout_exercise_id,
                            "workout_id": workout_id,
                            "exercise_name": exercise_name,
                            "notes": None,
                            "order_index": exercise_order,
                            "created_at": iso_timestamp(workout_day, exercise_order),
                        }
                    )

                    set_rows.extend(
                        generate_set_rows(
                            rng=rng,
                            workout_exercise_id=workout_exercise_id,
                            top_weight=state.top_weight,
                            top_reps=state.top_reps,
                            day=workout_day,
                        )
                    )

    return {
        "users": pd.DataFrame(user_rows),
        "workouts": pd.DataFrame(workout_rows),
        "workout_exercises": pd.DataFrame(workout_exercise_rows),
        "sets": pd.DataFrame(set_rows),
    }


def write_tables(tables: dict[str, pd.DataFrame], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for name, frame in tables.items():
        frame.to_csv(output_dir / f"{name}.csv", index=False)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate synthetic lifting history.")
    parser.add_argument("--users", type=int, default=12)
    parser.add_argument("--weeks", type=int, default=28)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output-dir", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    tables = generate_synthetic_tables(users=args.users, weeks=args.weeks, seed=args.seed)
    write_tables(tables, args.output_dir)
    print(f"Wrote synthetic bundle to {args.output_dir}")


if __name__ == "__main__":
    main()

