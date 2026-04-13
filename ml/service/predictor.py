from __future__ import annotations

import json
from dataclasses import dataclass

import numpy as np
import pandas as pd
import torch
from pydantic import BaseModel
from sqlalchemy import create_engine, text

from ml.config import get_settings
from ml.data.transform import compute_top_set_frame
from ml.models.lstm import LSTMRegressor
from ml.monitoring.logging import log_prediction_event
from ml.train.registry import load_latest_artifact_dir


TOP_SET_QUERY = """
SELECT
  w.user_id,
  w.id AS workout_id,
  w.date AS workout_date,
  we.exercise_name,
  s.order_index AS set_order_index,
  s.reps,
  s.weight,
  s.rpe,
  s.created_at
FROM workouts w
JOIN workout_exercises we ON we.workout_id = w.id
JOIN sets s ON s.workout_exercise_id = we.id
WHERE w.user_id = :user_id
  AND we.exercise_name = :exercise_name
  AND s.reps IS NOT NULL
  AND s.weight IS NOT NULL
ORDER BY w.date, s.order_index
"""


class PredictRequest(BaseModel):
    user_id: str
    exercise_name: str
    lookback: int | None = None


class PredictResponse(BaseModel):
    status: str
    predicted_weight: float | None
    predicted_reps: int | None
    basis: str
    model_version: str | None
    history_points_used: int
    data_confidence: str


@dataclass
class LoadedModelBundle:
    model: LSTMRegressor
    feature_mean: np.ndarray
    feature_std: np.ndarray
    target_mean: np.ndarray
    target_std: np.ndarray
    lookback: int
    min_history_points: int
    model_version: str | None


def confidence_for_history(points: int, basis: str, lookback: int) -> str:
    if basis != "lstm":
        return "low"
    if points >= lookback + 4:
        return "high"
    return "medium"


class Predictor:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.engine = create_engine(self.settings.database_url)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.bundle = self._load_bundle()

    def _load_bundle(self) -> LoadedModelBundle | None:
        artifact_dir = load_latest_artifact_dir()
        if not artifact_dir:
            return None

        model_payload = torch.load(artifact_dir / "model.pt", map_location="cpu")
        metadata = json.loads((artifact_dir / "metadata.json").read_text(encoding="utf-8"))
        config = model_payload["model_config"]
        model = LSTMRegressor(
            input_size=config["input_size"],
            hidden_size=config["hidden_size"],
            num_layers=config["num_layers"],
            output_size=config["output_size"],
        )
        model.load_state_dict(model_payload["state_dict"])
        model.eval()
        model.to(self.device)

        return LoadedModelBundle(
            model=model,
            feature_mean=np.array(model_payload["feature_mean"], dtype=np.float32),
            feature_std=np.array(model_payload["feature_std"], dtype=np.float32),
            target_mean=np.array(model_payload["target_mean"], dtype=np.float32),
            target_std=np.array(model_payload["target_std"], dtype=np.float32),
            lookback=int(model_payload["lookback"]),
            min_history_points=int(model_payload["min_history_points"]),
            model_version=metadata.get("run_id"),
        )

    def reload(self) -> None:
        self.bundle = self._load_bundle()

    def _fetch_history(self, user_id: str, exercise_name: str) -> pd.DataFrame:
        with self.engine.begin() as connection:
            frame = pd.read_sql(
                text(TOP_SET_QUERY),
                connection,
                params={"user_id": user_id, "exercise_name": exercise_name},
            )

        if frame.empty:
            return frame

        frame["workout_date"] = pd.to_datetime(frame["workout_date"])
        frame["weight"] = pd.to_numeric(frame["weight"], errors="coerce")
        frame["reps"] = pd.to_numeric(frame["reps"], errors="coerce")
        frame["rpe"] = pd.to_numeric(frame["rpe"], errors="coerce")
        return compute_top_set_frame(frame)

    def _repeat_last(self, history: pd.DataFrame, basis: str) -> PredictResponse:
        if history.empty:
            return PredictResponse(
                status="unavailable",
                predicted_weight=None,
                predicted_reps=None,
                basis="service_unavailable" if basis == "service_unavailable" else "insufficient_history",
                model_version=None,
                history_points_used=0,
                data_confidence="low",
            )

        last_row = history.iloc[-1]
        return PredictResponse(
            status="fallback",
            predicted_weight=float(last_row["weight"]),
            predicted_reps=int(last_row["reps"]),
            basis=basis,
            model_version=self.bundle.model_version if self.bundle else None,
            history_points_used=int(len(history)),
            data_confidence="low",
        )

    def predict(self, request: PredictRequest) -> PredictResponse:
        history = self._fetch_history(request.user_id, request.exercise_name)

        if history.empty:
            response = self._repeat_last(history, "insufficient_history")
        elif len(history) < 2:
            response = self._repeat_last(history, "insufficient_history")
        elif not self.bundle:
            response = self._repeat_last(history, "repeat_last")
        else:
            lookback = request.lookback or self.bundle.lookback
            history_points_used = min(len(history), lookback)

            if len(history) < self.bundle.min_history_points:
                response = self._repeat_last(history, "repeat_last")
            else:
                window = history.tail(lookback).copy()
                window["rpe_filled"] = window["rpe"].fillna(0.0)
                feature_matrix = window[
                    ["weight", "reps", "rpe_filled", "days_since_previous_session"]
                ].to_numpy(dtype=np.float32)
                if len(window) < lookback:
                    padding = np.zeros((lookback - len(window), feature_matrix.shape[1]), dtype=np.float32)
                    feature_matrix = np.vstack([padding, feature_matrix])

                normalized = (feature_matrix - self.bundle.feature_mean) / self.bundle.feature_std
                tensor = torch.tensor(normalized[None, ...], dtype=torch.float32, device=self.device)

                with torch.no_grad():
                    scaled_prediction = self.bundle.model(tensor).cpu().numpy()[0]

                prediction = scaled_prediction * self.bundle.target_std + self.bundle.target_mean
                response = PredictResponse(
                    status="ok",
                    predicted_weight=float(round(prediction[0] / 2.5) * 2.5),
                    predicted_reps=int(max(1, round(prediction[1]))),
                    basis="lstm",
                    model_version=self.bundle.model_version,
                    history_points_used=history_points_used,
                    data_confidence=confidence_for_history(
                        points=len(history),
                        basis="lstm",
                        lookback=lookback,
                    ),
                )

        log_prediction_event(
            {
                "event": "predict",
                "user_id": request.user_id,
                "exercise_name": request.exercise_name,
                "status": response.status,
                "basis": response.basis,
                "history_points_used": response.history_points_used,
            }
        )
        return response

