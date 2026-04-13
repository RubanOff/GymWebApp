from __future__ import annotations

import json
import logging


logger = logging.getLogger("gympulse-ml")


def configure_logging() -> None:
    if logger.handlers:
        return
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def log_prediction_event(payload: dict[str, object]) -> None:
    configure_logging()
    logger.info(json.dumps(payload))
