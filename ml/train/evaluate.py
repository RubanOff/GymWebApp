from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    if len(y_true) == 0:
        return {
            "mae_weight": 0.0,
            "rmse_weight": 0.0,
            "mae_reps": 0.0,
            "rmse_reps": 0.0,
        }

    weight_error = y_pred[:, 0] - y_true[:, 0]
    reps_error = y_pred[:, 1] - y_true[:, 1]
    return {
        "mae_weight": float(np.mean(np.abs(weight_error))),
        "rmse_weight": float(np.sqrt(np.mean(weight_error ** 2))),
        "mae_reps": float(np.mean(np.abs(reps_error))),
        "rmse_reps": float(np.sqrt(np.mean(reps_error ** 2))),
    }


def save_prediction_frame(
    output_path: Path,
    metadata: list[dict[str, object]],
    truth: np.ndarray,
    prediction: np.ndarray,
    baseline: np.ndarray,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    frame = pd.DataFrame(metadata)
    frame["true_weight"] = truth[:, 0]
    frame["true_reps"] = truth[:, 1]
    frame["pred_weight"] = prediction[:, 0]
    frame["pred_reps"] = prediction[:, 1]
    frame["baseline_weight"] = baseline[:, 0]
    frame["baseline_reps"] = baseline[:, 1]
    frame.to_csv(output_path, index=False)

