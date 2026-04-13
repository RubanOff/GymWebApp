from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
ARTIFACTS_DIR = ROOT_DIR / "artifacts"
MLRUNS_DIR = ROOT_DIR / "mlruns"
LATEST_ARTIFACT_POINTER = ARTIFACTS_DIR / "latest.json"


@dataclass(frozen=True)
class Settings:
    database_url: str
    tracking_uri: str
    experiment_name: str
    lookback_default: int
    min_history_points: int
    service_port: int
    model_dir: Path
    raw_data_dir: Path
    processed_data_dir: Path
    artifacts_dir: Path
    random_seed: int


def get_settings() -> Settings:
    database_url = os.getenv("ML_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("ML_DATABASE_URL or DATABASE_URL is required.")

    return Settings(
        database_url=database_url,
        tracking_uri=os.getenv("MLFLOW_TRACKING_URI", f"file://{MLRUNS_DIR}"),
        experiment_name=os.getenv("MLFLOW_EXPERIMENT_NAME", "gympulse-lifting-forecast"),
        lookback_default=int(os.getenv("ML_LOOKBACK_DEFAULT", "8")),
        min_history_points=int(os.getenv("ML_MIN_HISTORY_POINTS", "6")),
        service_port=int(os.getenv("ML_SERVICE_PORT", "8001")),
        model_dir=Path(os.getenv("ML_MODEL_DIR", ARTIFACTS_DIR)),
        raw_data_dir=RAW_DATA_DIR,
        processed_data_dir=PROCESSED_DATA_DIR,
        artifacts_dir=ARTIFACTS_DIR,
        random_seed=int(os.getenv("ML_RANDOM_SEED", "42")),
    )


def ensure_directories() -> None:
    for directory in (RAW_DATA_DIR, PROCESSED_DATA_DIR, ARTIFACTS_DIR, MLRUNS_DIR):
        directory.mkdir(parents=True, exist_ok=True)

