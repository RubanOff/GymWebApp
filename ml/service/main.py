from __future__ import annotations

from fastapi import FastAPI

from ml.config import get_settings
from ml.service.predictor import PredictRequest, PredictResponse, Predictor


settings = get_settings()
app = FastAPI(title="GymPulse ML Service", version="0.1.0")
predictor = Predictor()


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "service": "gympulse-ml",
        "model_loaded": predictor.bundle is not None,
        "port": settings.service_port,
    }


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    return predictor.predict(request)


@app.post("/reload")
def reload_model() -> dict[str, bool]:
    predictor.reload()
    return {"ok": True}
