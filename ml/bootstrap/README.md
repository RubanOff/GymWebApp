# Bootstrap Data

Synthetic history is the primary bootstrap source for the first ML iteration.

## Why synthetic first

- The production app does not yet have enough real users.
- The synthetic generator can match the real GymPulse schema exactly.
- The course still gets a reproducible end-to-end MLOps pipeline.

## Files

- [`synthetic.py`](./synthetic.py): creates realistic CSV bundles for users, workouts, workout exercises, and sets
- [`load_to_postgres.py`](./load_to_postgres.py): loads synthetic bundles into the existing PostgreSQL schema
- [`from_csv.py`](./from_csv.py): adapts a simple public CSV format into the same normalized bundle

## Expected public CSV columns

The optional CSV adapter expects at least:

- `user_email`
- `workout_date`
- `exercise_name`
- `set_order`
- `reps`
- `weight`

Optional:

- `rpe`
- `workout_title`
- `exercise_notes`

