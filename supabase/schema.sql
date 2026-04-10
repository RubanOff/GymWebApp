create extension if not exists pgcrypto;

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_name text not null,
  notes text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  reps integer,
  weight numeric(8, 2),
  rpe numeric(3, 1),
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  exercise_name text not null,
  order_index integer not null default 0,
  default_sets integer not null default 3,
  default_reps integer not null default 8,
  created_at timestamptz not null default now()
);

create index if not exists workouts_user_id_date_idx on public.workouts (user_id, date desc, created_at desc);
create index if not exists workout_exercises_workout_id_idx on public.workout_exercises (workout_id, order_index asc);
create index if not exists sets_workout_exercise_id_idx on public.sets (workout_exercise_id, order_index asc);
create index if not exists templates_user_id_created_at_idx on public.templates (user_id, created_at desc);
create index if not exists template_exercises_template_id_idx on public.template_exercises (template_id, order_index asc);

alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.sets enable row level security;
alter table public.templates enable row level security;
alter table public.template_exercises enable row level security;

create policy "workouts_select_own" on public.workouts
  for select using (user_id = auth.uid());

create policy "workouts_insert_own" on public.workouts
  for insert with check (user_id = auth.uid());

create policy "workouts_update_own" on public.workouts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "workouts_delete_own" on public.workouts
  for delete using (user_id = auth.uid());

create policy "workout_exercises_select_own" on public.workout_exercises
  for select using (
    exists (
      select 1
      from public.workouts
      where workouts.id = workout_exercises.workout_id
        and workouts.user_id = auth.uid()
    )
  );

create policy "workout_exercises_insert_own" on public.workout_exercises
  for insert with check (
    exists (
      select 1
      from public.workouts
      where workouts.id = workout_exercises.workout_id
        and workouts.user_id = auth.uid()
    )
  );

create policy "workout_exercises_update_own" on public.workout_exercises
  for update using (
    exists (
      select 1
      from public.workouts
      where workouts.id = workout_exercises.workout_id
        and workouts.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.workouts
      where workouts.id = workout_exercises.workout_id
        and workouts.user_id = auth.uid()
    )
  );

create policy "workout_exercises_delete_own" on public.workout_exercises
  for delete using (
    exists (
      select 1
      from public.workouts
      where workouts.id = workout_exercises.workout_id
        and workouts.user_id = auth.uid()
    )
  );

create policy "sets_select_own" on public.sets
  for select using (
    exists (
      select 1
      from public.workout_exercises
      join public.workouts on workouts.id = workout_exercises.workout_id
      where workout_exercises.id = sets.workout_exercise_id
        and workouts.user_id = auth.uid()
    )
  );

create policy "sets_insert_own" on public.sets
  for insert with check (
    exists (
      select 1
      from public.workout_exercises
      join public.workouts on workouts.id = workout_exercises.workout_id
      where workout_exercises.id = sets.workout_exercise_id
        and workouts.user_id = auth.uid()
    )
  );

create policy "sets_update_own" on public.sets
  for update using (
    exists (
      select 1
      from public.workout_exercises
      join public.workouts on workouts.id = workout_exercises.workout_id
      where workout_exercises.id = sets.workout_exercise_id
        and workouts.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.workout_exercises
      join public.workouts on workouts.id = workout_exercises.workout_id
      where workout_exercises.id = sets.workout_exercise_id
        and workouts.user_id = auth.uid()
    )
  );

create policy "sets_delete_own" on public.sets
  for delete using (
    exists (
      select 1
      from public.workout_exercises
      join public.workouts on workouts.id = workout_exercises.workout_id
      where workout_exercises.id = sets.workout_exercise_id
        and workouts.user_id = auth.uid()
    )
  );

create policy "templates_select_own" on public.templates
  for select using (user_id = auth.uid());

create policy "templates_insert_own" on public.templates
  for insert with check (user_id = auth.uid());

create policy "templates_update_own" on public.templates
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "templates_delete_own" on public.templates
  for delete using (user_id = auth.uid());

create policy "template_exercises_select_own" on public.template_exercises
  for select using (
    exists (
      select 1
      from public.templates
      where templates.id = template_exercises.template_id
        and templates.user_id = auth.uid()
    )
  );

create policy "template_exercises_insert_own" on public.template_exercises
  for insert with check (
    exists (
      select 1
      from public.templates
      where templates.id = template_exercises.template_id
        and templates.user_id = auth.uid()
    )
  );

create policy "template_exercises_update_own" on public.template_exercises
  for update using (
    exists (
      select 1
      from public.templates
      where templates.id = template_exercises.template_id
        and templates.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.templates
      where templates.id = template_exercises.template_id
        and templates.user_id = auth.uid()
    )
  );

create policy "template_exercises_delete_own" on public.template_exercises
  for delete using (
    exists (
      select 1
      from public.templates
      where templates.id = template_exercises.template_id
        and templates.user_id = auth.uid()
    )
  );
