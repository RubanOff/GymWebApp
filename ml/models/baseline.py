from __future__ import annotations

import numpy as np


def repeat_last_baseline(inputs: np.ndarray) -> np.ndarray:
    if len(inputs) == 0:
        return np.empty((0, 2), dtype=np.float32)

    last_steps = inputs[:, -1, :]
    return last_steps[:, :2].astype(np.float32)

