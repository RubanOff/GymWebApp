from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset

from ml.data.schemas import FEATURE_COLUMNS, SequenceRecord, TARGET_COLUMNS


@dataclass
class DatasetBundle:
    train_inputs: np.ndarray
    train_targets: np.ndarray
    val_inputs: np.ndarray
    val_targets: np.ndarray
    test_inputs: np.ndarray
    test_targets: np.ndarray
    train_metadata: list[dict[str, object]]
    val_metadata: list[dict[str, object]]
    test_metadata: list[dict[str, object]]
    feature_mean: list[float]
    feature_std: list[float]
    target_mean: list[float]
    target_std: list[float]
    lookback: int
    min_history_points: int
    feature_columns: list[str]
    target_columns: list[str]


class TensorSequenceDataset(Dataset):
    def __init__(self, inputs: np.ndarray, targets: np.ndarray) -> None:
        self.inputs = torch.tensor(inputs, dtype=torch.float32)
        self.targets = torch.tensor(targets, dtype=torch.float32)

    def __len__(self) -> int:
        return len(self.inputs)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        return self.inputs[index], self.targets[index]


def build_sequence_records(
    top_set_frame: pd.DataFrame,
    lookback: int,
    min_history_points: int,
) -> list[SequenceRecord]:
    if top_set_frame.empty:
        return []

    frame = top_set_frame.copy()
    frame["workout_date"] = pd.to_datetime(frame["workout_date"])
    records: list[SequenceRecord] = []

    for (user_id, exercise_name), group in frame.groupby(["user_id", "exercise_name"]):
        group = group.sort_values("workout_date").reset_index(drop=True)
        if len(group) < min_history_points:
            continue

        for target_index in range(1, len(group)):
            history = group.iloc[max(0, target_index - lookback):target_index].copy()
            if len(history) < 1:
                continue

            history_points_used = len(history)
            history_array = history[FEATURE_COLUMNS].fillna(0.0).to_numpy(dtype=np.float32)
            if history_points_used < lookback:
                padding = np.zeros((lookback - history_points_used, len(FEATURE_COLUMNS)), dtype=np.float32)
                history_array = np.vstack([padding, history_array])

            target_row = group.iloc[target_index]
            records.append(
                SequenceRecord(
                    user_id=user_id,
                    exercise_name=exercise_name,
                    target_date=str(target_row["workout_date"].date()),
                    history_points_used=history_points_used,
                    features=history_array.tolist(),
                    target=[float(target_row["weight"]), float(target_row["reps"])],
                )
            )

    return records


def split_records(records: list[SequenceRecord]) -> tuple[list[SequenceRecord], list[SequenceRecord], list[SequenceRecord]]:
    grouped: dict[tuple[str, str], list[SequenceRecord]] = {}
    for record in records:
        grouped.setdefault((record.user_id, record.exercise_name), []).append(record)

    train: list[SequenceRecord] = []
    val: list[SequenceRecord] = []
    test: list[SequenceRecord] = []

    for series in grouped.values():
        series.sort(key=lambda item: item.target_date)
        if len(series) == 1:
            test.extend(series)
            continue
        if len(series) == 2:
            val.append(series[-2])
            test.append(series[-1])
            continue

        train.extend(series[:-2])
        val.append(series[-2])
        test.append(series[-1])

    return train, val, test


def fit_scalers(records: list[SequenceRecord]) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    inputs = np.array([record.features for record in records], dtype=np.float32)
    targets = np.array([record.target for record in records], dtype=np.float32)

    feature_mean = inputs.reshape(-1, inputs.shape[-1]).mean(axis=0)
    feature_std = inputs.reshape(-1, inputs.shape[-1]).std(axis=0)
    target_mean = targets.mean(axis=0)
    target_std = targets.std(axis=0)

    feature_std[feature_std == 0] = 1.0
    target_std[target_std == 0] = 1.0
    return feature_mean, feature_std, target_mean, target_std


def transform_records(
    records: list[SequenceRecord],
    feature_mean: np.ndarray,
    feature_std: np.ndarray,
    target_mean: np.ndarray,
    target_std: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, list[dict[str, object]]]:
    inputs = np.array([record.features for record in records], dtype=np.float32)
    targets = np.array([record.target for record in records], dtype=np.float32)
    metadata = [
        {
            "user_id": record.user_id,
            "exercise_name": record.exercise_name,
            "target_date": record.target_date,
            "history_points_used": record.history_points_used,
        }
        for record in records
    ]

    if len(inputs):
        inputs = (inputs - feature_mean) / feature_std
        targets = (targets - target_mean) / target_std

    return inputs, targets, metadata


def build_dataset_bundle(
    top_set_frame: pd.DataFrame,
    lookback: int,
    min_history_points: int,
) -> DatasetBundle:
    records = build_sequence_records(top_set_frame, lookback=lookback, min_history_points=min_history_points)
    train_records, val_records, test_records = split_records(records)

    if not train_records:
        raise ValueError("Not enough sequence data to build a training dataset.")

    feature_mean, feature_std, target_mean, target_std = fit_scalers(train_records)
    train_inputs, train_targets, train_meta = transform_records(
        train_records, feature_mean, feature_std, target_mean, target_std
    )
    val_inputs, val_targets, val_meta = transform_records(
        val_records, feature_mean, feature_std, target_mean, target_std
    )
    test_inputs, test_targets, test_meta = transform_records(
        test_records, feature_mean, feature_std, target_mean, target_std
    )

    return DatasetBundle(
        train_inputs=train_inputs,
        train_targets=train_targets,
        val_inputs=val_inputs,
        val_targets=val_targets,
        test_inputs=test_inputs,
        test_targets=test_targets,
        train_metadata=train_meta,
        val_metadata=val_meta,
        test_metadata=test_meta,
        feature_mean=feature_mean.tolist(),
        feature_std=feature_std.tolist(),
        target_mean=target_mean.tolist(),
        target_std=target_std.tolist(),
        lookback=lookback,
        min_history_points=min_history_points,
        feature_columns=FEATURE_COLUMNS,
        target_columns=TARGET_COLUMNS,
    )


def save_dataset_bundle(output_path: Path, bundle: DatasetBundle) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(asdict(bundle), output_path)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare a PyTorch-ready dataset bundle.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--lookback", type=int, default=8)
    parser.add_argument("--min-history-points", type=int, default=6)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    frame = pd.read_csv(args.input)
    bundle = build_dataset_bundle(
        frame,
        lookback=args.lookback,
        min_history_points=args.min_history_points,
    )
    save_dataset_bundle(args.output, bundle)
    print(f"Saved dataset bundle to {args.output}")


if __name__ == "__main__":
    main()

