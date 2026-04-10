"use client";

import { createClient } from "@/lib/supabase/client";
import { formatDate, formatShortDate, parseDbNumber, todayInputValue } from "@/lib/format";
import type { Template, Workout, ExerciseProgressPoint } from "@/lib/types";
import { Badge, Button, Card, EmptyState, Input, SectionHeader, Textarea } from "@/components/ui";
import {
  ArrowRight,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function normalizeTitle(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

async function duplicateWorkout(workout: Workout) {
  const supabase = createClient();
  const { data: createdWorkout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      title: `Copy of ${normalizeTitle(workout.title, "Workout")}`,
      date: todayInputValue(),
      notes: workout.notes,
    })
    .select("id")
    .single();

  if (workoutError) {
    throw workoutError;
  }

  for (let exerciseIndex = 0; exerciseIndex < workout.exercises.length; exerciseIndex += 1) {
    const exercise = workout.exercises[exerciseIndex];
    const { data: createdExercise, error: exerciseError } = await supabase
      .from("workout_exercises")
      .insert({
        workout_id: createdWorkout.id,
        exercise_name: exercise.exercise_name,
        notes: exercise.notes,
        order_index: exerciseIndex,
      })
      .select("id")
      .single();

    if (exerciseError) {
      throw exerciseError;
    }

    const setsPayload = exercise.sets.map((set, setIndex) => ({
      workout_exercise_id: createdExercise.id,
      reps: set.reps,
      weight: set.weight,
      rpe: set.rpe,
      order_index: setIndex,
    }));

    if (setsPayload.length) {
      const { error: setError } = await supabase.from("sets").insert(setsPayload);
      if (setError) {
        throw setError;
      }
    }
  }

  return createdWorkout.id;
}

async function createWorkoutFromTemplate(template: Template) {
  const supabase = createClient();
  const { data: createdWorkout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      title: template.title,
      date: todayInputValue(),
      notes: null,
    })
    .select("id")
    .single();

  if (workoutError) {
    throw workoutError;
  }

  for (let exerciseIndex = 0; exerciseIndex < template.exercises.length; exerciseIndex += 1) {
    const exercise = template.exercises[exerciseIndex];
    const { data: createdExercise, error: exerciseError } = await supabase
      .from("workout_exercises")
      .insert({
        workout_id: createdWorkout.id,
        exercise_name: exercise.exercise_name,
        notes: null,
        order_index: exerciseIndex,
      })
      .select("id")
      .single();

    if (exerciseError) {
      throw exerciseError;
    }

    const setsPayload = Array.from({ length: exercise.default_sets }, (_, setIndex) => ({
      workout_exercise_id: createdExercise.id,
      reps: exercise.default_reps,
      weight: null,
      rpe: null,
      order_index: setIndex,
    }));

    const { error: setError } = await supabase.from("sets").insert(setsPayload);
    if (setError) {
      throw setError;
    }
  }

  return createdWorkout.id;
}

async function createTemplateFromWorkout(workout: Workout) {
  const supabase = createClient();
  const { data: createdTemplate, error: templateError } = await supabase
    .from("templates")
    .insert({ title: workout.title })
    .select("id")
    .single();

  if (templateError) {
    throw templateError;
  }

  for (let exerciseIndex = 0; exerciseIndex < workout.exercises.length; exerciseIndex += 1) {
    const exercise = workout.exercises[exerciseIndex];
    const firstSet = exercise.sets[0] ?? null;

    const { error: exerciseError } = await supabase.from("template_exercises").insert({
      template_id: createdTemplate.id,
      exercise_name: exercise.exercise_name,
      order_index: exerciseIndex,
      default_sets: Math.max(1, exercise.sets.length || 1),
      default_reps: parseDbNumber(firstSet?.reps) ?? 8,
    });

    if (exerciseError) {
      throw exerciseError;
    }
  }

  return createdTemplate.id;
}

export function WorkoutCard({
  workout,
  showActions = true,
}: {
  workout: Workout;
  showActions?: boolean;
}) {
  const totalSets = workout.exercises.reduce((count, exercise) => count + exercise.sets.length, 0);
  const volume = workout.exercises.reduce((sum, exercise) => {
    return (
      sum +
      exercise.sets.reduce((setSum, set) => {
        const weight = parseDbNumber(set.weight) ?? 0;
        const reps = parseDbNumber(set.reps) ?? 0;
        return setSum + weight * reps;
      }, 0)
    );
  }, 0);
  const topExercise = workout.exercises[0]?.exercise_name ?? "No exercises yet";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge>{formatShortDate(workout.date)}</Badge>
            <span className="text-xs text-zinc-500">{workout.exercises.length} exercises</span>
          </div>
          <h3 className="font-display text-xl font-semibold tracking-tight text-zinc-950">
            {workout.title}
          </h3>
          <p className="text-sm text-zinc-500">{topExercise}</p>
        </div>
        {showActions ? (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/workouts/${workout.id}`}
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Open
            </Link>
            <RepeatWorkoutButton workout={workout} />
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl bg-zinc-50 px-3 py-2">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Sets</p>
          <p className="mt-1 font-medium text-zinc-950">{totalSets}</p>
        </div>
        <div className="rounded-2xl bg-zinc-50 px-3 py-2">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Volume</p>
          <p className="mt-1 font-medium text-zinc-950">
            {Math.round(volume).toLocaleString("en-US")} kg
          </p>
        </div>
        <div className="rounded-2xl bg-zinc-50 px-3 py-2">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Date</p>
          <p className="mt-1 font-medium text-zinc-950">{formatDate(workout.date)}</p>
        </div>
      </div>
    </Card>
  );
}

export function TemplateCard({
  template,
  showActions = true,
}: {
  template: Template;
  showActions?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge>{template.exercises.length} exercises</Badge>
            <span className="text-xs text-zinc-500">Template</span>
          </div>
          <h3 className="font-display text-xl font-semibold tracking-tight text-zinc-950">
            {template.title}
          </h3>
          <p className="text-sm text-zinc-500">Created {formatDate(template.created_at)}</p>
        </div>
        {showActions ? <StartFromTemplateButton template={template} /> : null}
      </div>

      <div className="mt-4 space-y-2">
        {template.exercises.slice(0, 3).map((exercise) => (
          <div
            key={exercise.id}
            className="flex items-center justify-between rounded-2xl bg-zinc-50 px-3 py-2 text-sm"
          >
            <span className="font-medium text-zinc-950">{exercise.exercise_name}</span>
            <span className="text-zinc-500">
              {exercise.default_sets} x {exercise.default_reps}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function StartFromTemplateButton({ template }: { template: Template }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    try {
      const workoutId = await createWorkoutFromTemplate(template);
      router.push(`/workouts/${workoutId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" className="rounded-full px-3" onClick={handleStart} disabled={loading}>
      {loading ? "Starting" : "Start"}
    </Button>
  );
}

export function RepeatWorkoutButton({ workout }: { workout: Workout }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRepeat() {
    setLoading(true);
    try {
      const workoutId = await duplicateWorkout(workout);
      router.push(`/workouts/${workoutId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      className="rounded-full px-3"
      onClick={handleRepeat}
      disabled={loading}
    >
      {loading ? "Copying" : "Repeat"}
    </Button>
  );
}

export function SaveTemplateButton({ workout }: { workout: Workout }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      await createTemplateFromWorkout(workout);
      router.push("/templates");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      className="rounded-full px-3"
      onClick={handleSave}
      disabled={loading}
    >
      {loading ? "Saving" : "Save as template"}
    </Button>
  );
}

export function NewWorkoutForm({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("Workout");
  const [date, setDate] = useState(todayInputValue());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: workoutError } = await supabase
        .from("workouts")
        .insert({
          title: normalizeTitle(title, "Workout"),
          date,
          notes: notes.trim() ? notes.trim() : null,
        })
        .select("id")
        .single();

      if (workoutError) {
        throw workoutError;
      }

      router.push(`/workouts/${data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create workout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionHeader
          title="Start a workout"
          description="Defaults are prefilled so you can get into the set logger quickly."
        />

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700">Title</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Push day" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700">Date</span>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-700">Notes</span>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Energy, pain, missed lifts..."
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create workout"}
          </Button>
        </form>
      </Card>

      {templates.length ? (
        <Card className="p-5">
          <SectionHeader
            title="Start from template"
            description="One tap creates a workout with the template structure and default set counts."
          />
          <div className="mt-4 grid gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    const workoutId = await createWorkoutFromTemplate(template);
                    router.push(`/workouts/${workoutId}`);
                    router.refresh();
                  } catch (createError) {
                    setError(createError instanceof Error ? createError.message : "Could not start template");
                  } finally {
                    setLoading(false);
                  }
                }}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-left transition hover:bg-zinc-50 disabled:opacity-50"
                disabled={loading}
              >
                <div>
                  <p className="font-medium text-zinc-950">{template.title}</p>
                  <p className="text-sm text-zinc-500">{template.exercises.length} exercises</p>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400" />
              </button>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function SetRow({
  setValue,
  onChange,
  onBlur,
  onDelete,
}: {
  setValue: Workout["exercises"][number]["sets"][number];
  onChange: (patch: Partial<Workout["exercises"][number]["sets"][number]>) => void;
  onBlur: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid grid-cols-[1.1fr_1.1fr_0.9fr_auto] gap-2">
      <Input
        inputMode="numeric"
        type="number"
        min="0"
        value={setValue.reps ?? ""}
        onChange={(event) =>
          onChange({ reps: event.target.value === "" ? null : Number(event.target.value) })
        }
        onBlur={onBlur}
        placeholder="Reps"
      />
      <Input
        inputMode="decimal"
        type="number"
        step="0.5"
        min="0"
        value={setValue.weight ?? ""}
        onChange={(event) =>
          onChange({ weight: event.target.value === "" ? null : Number(event.target.value) })
        }
        onBlur={onBlur}
        placeholder="Weight"
      />
      <Input
        inputMode="decimal"
        type="number"
        step="0.5"
        min="0"
        max="10"
        value={setValue.rpe ?? ""}
        onChange={(event) =>
          onChange({ rpe: event.target.value === "" ? null : Number(event.target.value) })
        }
        onBlur={onBlur}
        placeholder="RPE"
      />
      <Button
        variant="ghost"
        size="md"
        onClick={onDelete}
        className="px-3 text-red-600 hover:bg-red-50"
        aria-label="Delete set"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ExerciseEditorCard({
  exercise,
  onExerciseChange,
  onExerciseBlur,
  onSetChange,
  onSetBlur,
  onAddSet,
  onRemoveExercise,
  onRemoveSet,
}: {
  exercise: Workout["exercises"][number];
  onExerciseChange: (field: "exercise_name" | "notes", value: string) => void;
  onExerciseBlur: () => void;
  onSetChange: (setId: string, patch: Partial<Workout["exercises"][number]["sets"][number]>) => void;
  onSetBlur: (setId: string) => void;
  onAddSet: () => void;
  onRemoveExercise: () => void;
  onRemoveSet: (setId: string) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <Input
            value={exercise.exercise_name}
            onChange={(event) => onExerciseChange("exercise_name", event.target.value)}
            onBlur={onExerciseBlur}
            placeholder="Exercise name"
            className="text-lg font-medium"
          />
          <Textarea
            value={exercise.notes ?? ""}
            onChange={(event) => onExerciseChange("notes", event.target.value)}
            onBlur={onExerciseBlur}
            placeholder="Optional exercise notes"
            className="min-h-20"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemoveExercise}
          className="text-red-600 hover:bg-red-50"
          aria-label="Delete exercise"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {exercise.sets.length ? (
          exercise.sets.map((setValue) => (
            <SetRow
              key={setValue.id}
              setValue={setValue}
              onChange={(patch) => onSetChange(setValue.id, patch)}
              onBlur={() => onSetBlur(setValue.id)}
              onDelete={() => onRemoveSet(setValue.id)}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
            No sets yet. Add the first one below.
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onAddSet} className="rounded-full px-3">
          <Plus className="h-4 w-4" />
          Add set
        </Button>
      </div>
    </Card>
  );
}

export function WorkoutEditor({ workout: initialWorkout }: { workout: Workout }) {
  const router = useRouter();
  const [workout, setWorkout] = useState(initialWorkout);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSets = useMemo(
    () => workout.exercises.reduce((count, exercise) => count + exercise.sets.length, 0),
    [workout.exercises],
  );

  function updateWorkoutField(field: "title" | "notes" | "date", value: string) {
    setWorkout((current) => ({ ...current, [field]: value }));
  }

  function updateExerciseField(exerciseId: string, field: "exercise_name" | "notes", value: string) {
    setWorkout((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, [field]: value } : exercise,
      ),
    }));
  }

  function updateSetField(
    exerciseId: string,
    setId: string,
    patch: Partial<Workout["exercises"][number]["sets"][number]>,
  ) {
    setWorkout((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
            }
          : exercise,
      ),
    }));
  }

  async function persistWorkout() {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: workoutError } = await supabase
        .from("workouts")
        .update({
          title: normalizeTitle(workout.title, "Workout"),
          date: workout.date,
          notes: workout.notes?.trim() ? workout.notes.trim() : null,
        })
        .eq("id", workout.id);

      if (workoutError) {
        throw workoutError;
      }
    } catch (persistError) {
      setError(persistError instanceof Error ? persistError.message : "Could not save workout");
    } finally {
      setSaving(false);
    }
  }

  async function persistExercise(exerciseId: string) {
    const exercise = workout.exercises.find((item) => item.id === exerciseId);
    if (!exercise) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: exerciseError } = await supabase
        .from("workout_exercises")
        .update({
          exercise_name: normalizeTitle(exercise.exercise_name, "Exercise"),
          notes: exercise.notes?.trim() ? exercise.notes.trim() : null,
        })
        .eq("id", exercise.id);

      if (exerciseError) {
        throw exerciseError;
      }
    } catch (persistError) {
      setError(persistError instanceof Error ? persistError.message : "Could not save exercise");
    } finally {
      setSaving(false);
    }
  }

  async function persistSet(exerciseId: string, setId: string) {
    const exercise = workout.exercises.find((item) => item.id === exerciseId);
    const setValue = exercise?.sets.find((item) => item.id === setId);
    if (!exercise || !setValue) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: setError } = await supabase
        .from("sets")
        .update({
          reps: setValue.reps,
          weight: setValue.weight,
          rpe: setValue.rpe,
        })
        .eq("id", setId);

      if (setError) {
        throw setError;
      }
    } catch (persistError) {
      setError(persistError instanceof Error ? persistError.message : "Could not save set");
    } finally {
      setSaving(false);
    }
  }

  async function addExercise() {
    const name = newExerciseName.trim();
    if (!name) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const nextOrder =
        workout.exercises.reduce(
          (max, exercise) => Math.max(max, exercise.order_index),
          -1,
        ) + 1;
      const { data, error: insertError } = await supabase
        .from("workout_exercises")
        .insert({
          workout_id: workout.id,
          exercise_name: name,
          notes: null,
          order_index: nextOrder,
        })
        .select("id,exercise_name,notes,order_index")
        .single();

      if (insertError) {
        throw insertError;
      }

      setWorkout((current) => ({
        ...current,
        exercises: [
          ...current.exercises,
          {
            id: data.id,
            exercise_name: data.exercise_name,
            notes: data.notes,
            order_index: data.order_index,
            sets: [],
          },
        ],
      }));
      setNewExerciseName("");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Could not add exercise");
    } finally {
      setSaving(false);
    }
  }

  async function addSet(exerciseId: string) {
    const exercise = workout.exercises.find((item) => item.id === exerciseId);
    if (!exercise) {
      return;
    }

    const previousSet = exercise.sets.at(-1) ?? null;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const nextOrder =
        exercise.sets.reduce((max, set) => Math.max(max, set.order_index), -1) + 1;
      const { data, error: insertError } = await supabase
        .from("sets")
        .insert({
          workout_exercise_id: exerciseId,
          reps: previousSet?.reps ?? 8,
          weight: previousSet?.weight,
          rpe: previousSet?.rpe,
          order_index: nextOrder,
        })
        .select("id,reps,weight,rpe,order_index")
        .single();

      if (insertError) {
        throw insertError;
      }

      setWorkout((current) => ({
        ...current,
        exercises: current.exercises.map((item) =>
          item.id === exerciseId
            ? {
                ...item,
                sets: [
                  ...item.sets,
                  {
                    id: data.id,
                    reps: parseDbNumber(data.reps),
                    weight: parseDbNumber(data.weight),
                    rpe: parseDbNumber(data.rpe),
                    order_index: data.order_index,
                  },
                ],
              }
            : item,
        ),
      }));
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Could not add set");
    } finally {
      setSaving(false);
    }
  }

  async function removeExercise(exerciseId: string) {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("workout_exercises").delete().eq("id", exerciseId);
      if (deleteError) {
        throw deleteError;
      }

      setWorkout((current) => ({
        ...current,
        exercises: current.exercises.filter((exercise) => exercise.id !== exerciseId),
      }));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not delete exercise");
    } finally {
      setSaving(false);
    }
  }

  async function removeSet(exerciseId: string, setId: string) {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("sets").delete().eq("id", setId);
      if (deleteError) {
        throw deleteError;
      }

      setWorkout((current) => ({
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? { ...exercise, sets: exercise.sets.filter((set) => set.id !== setId) }
            : exercise,
        ),
      }));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not delete set");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <Badge>{formatShortDate(workout.date)}</Badge>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-950">
              {workout.title}
            </h1>
            <p className="text-sm text-zinc-500">
              {workout.exercises.length} exercises · {totalSets} sets
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <RepeatWorkoutButton workout={workout} />
            <SaveTemplateButton workout={workout} />
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-zinc-700">Title</span>
            <Input
              value={workout.title}
              onChange={(event) => updateWorkoutField("title", event.target.value)}
              onBlur={persistWorkout}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700">Date</span>
              <Input
                type="date"
                value={workout.date}
                onChange={(event) => updateWorkoutField("date", event.target.value)}
                onBlur={persistWorkout}
              />
            </label>
            <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Status</p>
              <p className="mt-1">{saving ? "Saving changes" : "Saved locally and to Supabase"}</p>
            </div>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium text-zinc-700">Notes</span>
            <Textarea
              value={workout.notes ?? ""}
              onChange={(event) => updateWorkoutField("notes", event.target.value)}
              onBlur={persistWorkout}
              placeholder="Warm-up notes, injury details, setup reminders"
            />
          </label>
        </div>
      </Card>

      <div className="space-y-4">
        {workout.exercises.length ? (
          workout.exercises.map((exercise) => (
            <ExerciseEditorCard
              key={exercise.id}
              exercise={exercise}
              onExerciseChange={(field, value) => updateExerciseField(exercise.id, field, value)}
              onExerciseBlur={() => persistExercise(exercise.id)}
              onSetChange={(setId, patch) => updateSetField(exercise.id, setId, patch)}
              onSetBlur={(setId) => persistSet(exercise.id, setId)}
              onAddSet={() => addSet(exercise.id)}
              onRemoveExercise={() => removeExercise(exercise.id)}
              onRemoveSet={(setId) => removeSet(exercise.id, setId)}
            />
          ))
        ) : (
          <EmptyState
            title="No exercises yet"
            description="Add the first movement and the logger becomes useful immediately."
          />
        )}
      </div>

      <Card className="p-5">
        <SectionHeader
          title="Add exercise"
          description="Use a short name. You can edit it later."
        />
        <div className="mt-4 flex gap-2">
          <Input
            value={newExerciseName}
            onChange={(event) => setNewExerciseName(event.target.value)}
            placeholder="Bench press"
            onKeyDown={async (event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                await addExercise();
              }
            }}
          />
          <Button onClick={addExercise} className="shrink-0 px-4">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function ProgressChart({ points }: { points: ExerciseProgressPoint[] }) {
  const chartData = useMemo(
    () =>
      points.map((point) => ({
        name: formatShortDate(point.date),
        weight: point.weight,
      })),
    [points],
  );

  if (!points.length) {
    return (
      <EmptyState
        title="No progress yet"
        description="Log a few sessions for this movement and the chart will show up here."
      />
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Progress</p>
          <h3 className="font-display text-2xl font-semibold tracking-tight text-zinc-950">
            Latest trends
          </h3>
        </div>
        <Badge>{points.length} sessions</Badge>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="name" stroke="#71717a" tickLine={false} axisLine={false} />
            <YAxis stroke="#71717a" tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{
                borderRadius: 16,
                border: "1px solid #e4e4e7",
                background: "rgba(255,255,255,0.96)",
              }}
            />
            <Line type="monotone" dataKey="weight" stroke="#09090b" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
