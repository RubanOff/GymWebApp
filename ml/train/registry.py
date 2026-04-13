from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import torch

from ml.config import LATEST_ARTIFACT_POINTER, ensure_directories


def save_artifact_bundle(
    *,
    model_state: dict[str, object],
    metadata: dict[str, object],
    artifact_root: Path,
) -> Path:
    ensure_directories()
    run_name = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    artifact_dir = artifact_root / run_name
    artifact_dir.mkdir(parents=True, exist_ok=True)

    torch.save(model_state, artifact_dir / "model.pt")
    with (artifact_dir / "metadata.json").open("w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2)

    with LATEST_ARTIFACT_POINTER.open("w", encoding="utf-8") as handle:
        json.dump({"path": str(artifact_dir)}, handle, indent=2)

    return artifact_dir


def load_latest_artifact_dir() -> Path | None:
    if not LATEST_ARTIFACT_POINTER.exists():
        return None

    payload = json.loads(LATEST_ARTIFACT_POINTER.read_text(encoding="utf-8"))
    path = Path(payload["path"])
    return path if path.exists() else None

