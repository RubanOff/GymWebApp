from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import mlflow
import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader

from ml.config import ensure_directories, get_settings
from ml.data.dataset import DatasetBundle, TensorSequenceDataset, build_dataset_bundle
from ml.models.baseline import repeat_last_baseline
from ml.models.lstm import LSTMRegressor
from ml.train.evaluate import regression_metrics, save_prediction_frame
from ml.train.registry import save_artifact_bundle


def inverse_scale_targets(values: np.ndarray, bundle: DatasetBundle) -> np.ndarray:
    mean = np.array(bundle.target_mean, dtype=np.float32)
    std = np.array(bundle.target_std, dtype=np.float32)
    return values * std + mean


def train_epoch(
    model: LSTMRegressor,
    loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
) -> float:
    model.train()
    total_loss = 0.0

    for inputs, targets in loader:
        inputs = inputs.to(device)
        targets = targets.to(device)
        optimizer.zero_grad()
        predictions = model(inputs)
        loss = criterion(predictions, targets)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * len(inputs)

    return total_loss / max(len(loader.dataset), 1)


@torch.no_grad()
def predict_array(model: LSTMRegressor, inputs: np.ndarray, device: torch.device) -> np.ndarray:
    if len(inputs) == 0:
        return np.empty((0, 2), dtype=np.float32)

    model.eval()
    tensor = torch.tensor(inputs, dtype=torch.float32, device=device)
    prediction = model(tensor).cpu().numpy()
    return prediction


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the GymPulse lifting forecast model.")
    parser.add_argument("--processed-csv", type=Path, required=True)
    parser.add_argument("--lookback", type=int, default=8)
    parser.add_argument("--min-history-points", type=int, default=6)
    parser.add_argument("--hidden-size", type=int, default=64)
    parser.add_argument("--num-layers", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ensure_directories()
    settings = get_settings()

    random.seed(settings.random_seed)
    np.random.seed(settings.random_seed)
    torch.manual_seed(settings.random_seed)

    frame = pd.read_csv(args.processed_csv)
    bundle = build_dataset_bundle(
        frame,
        lookback=args.lookback,
        min_history_points=args.min_history_points,
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = LSTMRegressor(
        input_size=len(bundle.feature_columns),
        hidden_size=args.hidden_size,
        num_layers=args.num_layers,
        output_size=2,
    ).to(device)
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=args.learning_rate,
        weight_decay=args.weight_decay,
    )
    criterion = nn.MSELoss()
    train_loader = DataLoader(
        TensorSequenceDataset(bundle.train_inputs, bundle.train_targets),
        batch_size=args.batch_size,
        shuffle=True,
    )

    mlflow.set_tracking_uri(settings.tracking_uri)
    mlflow.set_experiment(settings.experiment_name)

    with mlflow.start_run() as run:
        mlflow.log_params(
            {
                "data_source": "synthetic",
                "lookback": args.lookback,
                "min_history_points": args.min_history_points,
                "hidden_size": args.hidden_size,
                "num_layers": args.num_layers,
                "batch_size": args.batch_size,
                "epochs": args.epochs,
                "learning_rate": args.learning_rate,
                "weight_decay": args.weight_decay,
                "train_sequences": len(bundle.train_inputs),
                "val_sequences": len(bundle.val_inputs),
                "test_sequences": len(bundle.test_inputs),
                "unique_users": int(frame["user_id"].nunique()),
                "unique_exercises": int(frame["exercise_name"].nunique()),
            }
        )

        best_val = None
        for epoch in range(args.epochs):
            train_loss = train_epoch(model, train_loader, optimizer, criterion, device)
            val_pred_scaled = predict_array(model, bundle.val_inputs, device)
            val_true = inverse_scale_targets(bundle.val_targets, bundle)
            val_pred = inverse_scale_targets(val_pred_scaled, bundle)
            val_metrics = regression_metrics(val_true, val_pred)
            mlflow.log_metric("train_loss", train_loss, step=epoch)
            mlflow.log_metric("val_mae_weight", val_metrics["mae_weight"], step=epoch)
            mlflow.log_metric("val_mae_reps", val_metrics["mae_reps"], step=epoch)

            score = val_metrics["mae_weight"] + val_metrics["mae_reps"]
            if best_val is None or score < best_val:
                best_val = score
                best_state = {
                    "state_dict": model.state_dict(),
                    "feature_mean": bundle.feature_mean,
                    "feature_std": bundle.feature_std,
                    "target_mean": bundle.target_mean,
                    "target_std": bundle.target_std,
                    "lookback": bundle.lookback,
                    "min_history_points": bundle.min_history_points,
                    "feature_columns": bundle.feature_columns,
                    "target_columns": bundle.target_columns,
                    "model_config": {
                        "input_size": len(bundle.feature_columns),
                        "hidden_size": args.hidden_size,
                        "num_layers": args.num_layers,
                        "output_size": 2,
                    },
                }

        model.load_state_dict(best_state["state_dict"])

        test_pred_scaled = predict_array(model, bundle.test_inputs, device)
        test_true = inverse_scale_targets(bundle.test_targets, bundle)
        test_pred = inverse_scale_targets(test_pred_scaled, bundle)
        baseline_scaled = repeat_last_baseline(bundle.test_inputs)
        baseline = inverse_scale_targets(baseline_scaled, bundle)

        test_metrics = regression_metrics(test_true, test_pred)
        baseline_metrics = regression_metrics(test_true, baseline)
        mlflow.log_metrics({f"test_{key}": value for key, value in test_metrics.items()})
        mlflow.log_metrics({f"baseline_{key}": value for key, value in baseline_metrics.items()})

        artifact_dir = save_artifact_bundle(
            model_state=best_state,
            metadata={
                "run_id": run.info.run_id,
                "data_source": "synthetic",
                "lookback": args.lookback,
                "min_history_points": args.min_history_points,
                "test_metrics": test_metrics,
                "baseline_metrics": baseline_metrics,
                "model_config": best_state["model_config"],
            },
            artifact_root=settings.artifacts_dir,
        )

        prediction_csv = artifact_dir / "test_predictions.csv"
        save_prediction_frame(
            prediction_csv,
            bundle.test_metadata,
            test_true,
            test_pred,
            baseline,
        )
        mlflow.log_artifact(str(prediction_csv))
        mlflow.log_text(json.dumps(test_metrics, indent=2), "metrics/test_metrics.json")
        mlflow.log_text(json.dumps(baseline_metrics, indent=2), "metrics/baseline_metrics.json")
        print(json.dumps({"test_metrics": test_metrics, "baseline_metrics": baseline_metrics}, indent=2))


if __name__ == "__main__":
    main()

