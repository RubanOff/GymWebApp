create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key,
  email text not null unique,
  password_hash text,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists email_verification_tokens (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists magic_login_tokens (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists password_reset_tokens (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists workouts (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists workout_exercises (
  id uuid primary key,
  workout_id uuid not null references workouts(id) on delete cascade,
  exercise_name text not null,
  notes text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists sets (
  id uuid primary key,
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  reps integer,
  weight numeric(8, 2),
  rpe numeric(3, 1),
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists templates (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists template_exercises (
  id uuid primary key,
  template_id uuid not null references templates(id) on delete cascade,
  exercise_name text not null,
  order_index integer not null default 0,
  default_sets integer not null default 3,
  default_reps integer not null default 8,
  created_at timestamptz not null default now()
);

create table if not exists ml_prediction_logs (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  exercise_name text not null,
  model_version text,
  basis text not null,
  data_confidence text not null,
  history_points_used integer not null default 0,
  predicted_weight numeric(8, 2),
  predicted_reps integer,
  actual_weight numeric(8, 2),
  actual_reps integer,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists email_verification_tokens_user_id_idx on email_verification_tokens(user_id);
create index if not exists magic_login_tokens_user_id_idx on magic_login_tokens(user_id);
create index if not exists password_reset_tokens_user_id_idx on password_reset_tokens(user_id);
create index if not exists workouts_user_id_date_idx on workouts(user_id, date desc, created_at desc);
create index if not exists workout_exercises_workout_id_idx on workout_exercises(workout_id, order_index asc);
create index if not exists sets_workout_exercise_id_idx on sets(workout_exercise_id, order_index asc);
create index if not exists templates_user_id_created_at_idx on templates(user_id, created_at desc);
create index if not exists template_exercises_template_id_idx on template_exercises(template_id, order_index asc);
create index if not exists ml_prediction_logs_user_id_exercise_idx on ml_prediction_logs(user_id, exercise_name, created_at desc);
create index if not exists ml_prediction_logs_unresolved_idx on ml_prediction_logs(user_id, exercise_name, resolved_at);
