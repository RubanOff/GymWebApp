from __future__ import annotations

from dataclasses import dataclass


FEATURE_COLUMNS = [
    "weight",
    "reps",
    "rpe_filled",
    "days_since_previous_session",
]

TARGET_COLUMNS = ["next_weight", "next_reps"]


@dataclass(frozen=True)
class SequenceRecord:
    user_id: str
    exercise_name: str
    target_date: str
    history_points_used: int
    features: list[list[float]]
    target: list[float]

