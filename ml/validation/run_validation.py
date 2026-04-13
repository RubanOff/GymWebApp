from __future__ import annotations

import argparse
import json
from pathlib import Path

import great_expectations as gx
import pandas as pd


def validate_top_set_frame(frame: pd.DataFrame) -> dict[str, object]:
    ge_frame = gx.from_pandas(frame)
    rpe_frame = gx.from_pandas(frame[frame["rpe"].notna()]) if frame["rpe"].notna().any() else None
    results = [
        ge_frame.expect_column_values_to_be_between("weight", min_value=0.01),
        ge_frame.expect_column_values_to_be_between("reps", min_value=1, max_value=30),
        ge_frame.expect_compound_columns_to_be_unique(
            ["user_id", "exercise_name", "workout_id"]
        ),
    ]
    if rpe_frame is not None:
        results.append(
            rpe_frame.expect_column_values_to_be_between("rpe", min_value=1, max_value=10)
        )

    enough_history = (
        frame.groupby(["user_id", "exercise_name"]).size().reset_index(name="count")
    )
    history_ok = bool((enough_history["count"] >= 2).all()) if not enough_history.empty else False

    success = all(result.success for result in results) and history_ok
    payload = {
        "success": success,
        "expectations": [result.to_json_dict() for result in results],
        "history_check": {
            "success": history_ok,
            "min_count_per_series": int(enough_history["count"].min()) if not enough_history.empty else 0,
        },
        "row_count": int(len(frame)),
    }
    return payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Great Expectations validation.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    frame = pd.read_csv(args.input)
    payload = validate_top_set_frame(frame)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    if not payload["success"]:
        raise SystemExit("Great Expectations validation failed.")
    print(f"Validation passed. Report saved to {args.report}")


if __name__ == "__main__":
    main()
