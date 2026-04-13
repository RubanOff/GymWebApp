# GymPulse ML

Synthetic-first ML pipeline for forecasting the next useful working set in GymPulse.

## Scope

- Bootstrap realistic workout history into the existing PostgreSQL schema.
- Extract and transform top-set time series per `user_id + exercise_name`.
- Validate training data with Great Expectations.
- Train a lightweight PyTorch `LSTM` model.
- Log params and metrics to MLflow.
- Version bootstrap data and model artifacts with DVC.
- Serve predictions through a FastAPI microservice.

The first version is intentionally synthetic-first because the app does not yet have enough real production usage to train a useful model from organic history alone.

## Layout

- [`bootstrap/`](./bootstrap): synthetic generator, PostgreSQL loader, optional CSV adapter
- [`data/`](./data): extraction, transformation, sequence preparation
- [`models/`](./models): `LSTM` model and repeat-last baseline
- [`train/`](./train): train/evaluate/registry logic
- [`service/`](./service): FastAPI prediction service
- [`validation/`](./validation): Great Expectations runner

## Setup

```bash
cd /Users/eugene/Desktop/MyGymJournal/WebApp
python3.11 -m venv .venv-ml
source .venv-ml/bin/activate
pip install -r ml/requirements.txt
```

The training and serving scripts read `DATABASE_URL` by default. You can override it with `ML_DATABASE_URL`.

## Synthetic bootstrap

Generate CSV snapshots only:

```bash
python -m ml.bootstrap.synthetic --output-dir ml/data/raw/bootstrap --users 12 --weeks 28 --seed 42
```

Generate and load synthetic history into PostgreSQL:

```bash
python -m ml.bootstrap.load_to_postgres --users 12 --weeks 28 --seed 42 --clear-synthetic
```

## Training

End-to-end from the live database:

```bash
python -m ml.data.extract --output ml/data/raw/history.csv
python -m ml.data.transform --input ml/data/raw/history.csv --output ml/data/processed/top_sets.csv
python -m ml.validation.run_validation --input ml/data/processed/top_sets.csv --report ml/artifacts/validation_report.json
python -m ml.train.train --processed-csv ml/data/processed/top_sets.csv
```

## Serving

```bash
uvicorn ml.service.main:app --host 127.0.0.1 --port 8001
```

Health check:

```bash
curl -fsS http://127.0.0.1:8001/health
```

Prediction:

```bash
curl -X POST http://127.0.0.1:8001/predict \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<uuid>","exercise_name":"Bench Press"}'
```

## MLflow

The default tracking URI is a local file store under `ml/mlruns`.

```bash
mlflow ui --backend-store-uri ml/mlruns --port 5001
```

## DVC

The included [`dvc.yaml`](./dvc.yaml) defines the bootstrap, extract, transform, validate, dataset, and train stages:

```bash
dvc repro train-model
```

For a real remote, configure any local or object storage target, for example:

```bash
dvc remote add -d localcache /var/mlops/gympulse-dvc
```

## Notes

- The current target is the next workout's **top set** per exercise.
- The service falls back to `repeat_last` if history is sparse or a model artifact is unavailable.
- Prediction request logging and later resolution live in the app database table `ml_prediction_logs`.

