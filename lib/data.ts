import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseDbNumber } from "@/lib/format";
import type {
  ExerciseProgressPoint,
  Template,
  TemplateExercise,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from "@/lib/types";

type WorkoutRow = {
  id: string;
  title: string;
  date: string;
  notes: string | null;
  created_at: string;
};

type WorkoutExerciseRow = {
  id: string;
  workout_id: string;
  exercise_name: string;
  notes: string | null;
  order_index: number;
};

type WorkoutSetRow = {
  id: string;
  workout_exercise_id: string;
  reps: number | string | null;
  weight: number | string | null;
  rpe: number | string | null;
  order_index: number;
};

type TemplateRow = {
  id: string;
  title: string;
  created_at: string;
};

type TemplateExerciseRow = {
  id: string;
  template_id: string;
  exercise_name: string;
  order_index: number;
  default_sets: number;
  default_reps: number;
};

type WorkoutGraphOptions = {
  limit?: number;
};

function sortByOrderIndex<T extends { order_index: number }>(items: T[]) {
  return [...items].sort((left, right) => left.order_index - right.order_index);
}

function sortWorkouts(workouts: WorkoutRow[]) {
  return [...workouts].sort(
    (left, right) =>
      right.date.localeCompare(left.date) ||
      right.created_at.localeCompare(left.created_at),
  );
}

function toNumber(value: number | string | null) {
  return parseDbNumber(value) ?? 0;
}

function groupWorkoutGraph(
  workoutRows: WorkoutRow[],
  exerciseRows: WorkoutExerciseRow[],
  setRows: WorkoutSetRow[],
) {
  const setsByExercise = new Map<string, WorkoutSet[]>();

  for (const row of setRows) {
    const collection = setsByExercise.get(row.workout_exercise_id) ?? [];
    collection.push({
      id: row.id,
      reps: parseDbNumber(row.reps),
      weight: parseDbNumber(row.weight),
      rpe: parseDbNumber(row.rpe),
      order_index: row.order_index,
    });
    setsByExercise.set(row.workout_exercise_id, collection);
  }

  const exercisesByWorkout = new Map<string, WorkoutExercise[]>();

  for (const row of exerciseRows) {
    const collection = exercisesByWorkout.get(row.workout_id) ?? [];
    collection.push({
      id: row.id,
      exercise_name: row.exercise_name,
      notes: row.notes,
      order_index: row.order_index,
      sets: sortByOrderIndex(setsByExercise.get(row.id) ?? []),
    });
    exercisesByWorkout.set(row.workout_id, collection);
  }

  return sortWorkouts(workoutRows).map<Workout>((workout) => ({
    id: workout.id,
    title: workout.title,
    date: workout.date,
    notes: workout.notes,
    created_at: workout.created_at,
    exercises: sortByOrderIndex(exercisesByWorkout.get(workout.id) ?? []),
  }));
}

function groupTemplates(
  templateRows: TemplateRow[],
  exerciseRows: TemplateExerciseRow[],
) {
  const exercisesByTemplate = new Map<string, TemplateExercise[]>();

  for (const row of exerciseRows) {
    const collection = exercisesByTemplate.get(row.template_id) ?? [];
    collection.push({
      id: row.id,
      exercise_name: row.exercise_name,
      order_index: row.order_index,
      default_sets: row.default_sets,
      default_reps: row.default_reps,
    });
    exercisesByTemplate.set(row.template_id, collection);
  }

  return [...templateRows]
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .map<Template>((template) => ({
      id: template.id,
      title: template.title,
      created_at: template.created_at,
      exercises: sortByOrderIndex(exercisesByTemplate.get(template.id) ?? []),
    }));
}

export async function getWorkoutGraph(
  userId: string,
  options: WorkoutGraphOptions = {},
) {
  const supabase = await createServerSupabaseClient();

  let workoutQuery = supabase
    .from("workouts")
    .select("id,title,date,notes,created_at")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (typeof options.limit === "number") {
    workoutQuery = workoutQuery.limit(options.limit);
  }

  const { data: workoutRows, error: workoutError } = await workoutQuery;

  if (workoutError) {
    throw workoutError;
  }

  if (!workoutRows?.length) {
    return [] as Workout[];
  }

  const workoutIds = workoutRows.map((row) => row.id);

  const { data: exerciseRows, error: exerciseError } = await supabase
    .from("workout_exercises")
    .select("id,workout_id,exercise_name,notes,order_index")
    .in("workout_id", workoutIds)
    .order("order_index", { ascending: true });

  if (exerciseError) {
    throw exerciseError;
  }

  const exerciseIds = (exerciseRows ?? []).map((row) => row.id);
  let setRows: WorkoutSetRow[] = [];

  if (exerciseIds.length) {
    const { data, error: setError } = await supabase
      .from("sets")
      .select("id,workout_exercise_id,reps,weight,rpe,order_index")
      .in("workout_exercise_id", exerciseIds)
      .order("order_index", { ascending: true });

    if (setError) {
      throw setError;
    }

    setRows = (data ?? []) as WorkoutSetRow[];
  }

  return groupWorkoutGraph(
    workoutRows as WorkoutRow[],
    (exerciseRows ?? []) as WorkoutExerciseRow[],
    setRows,
  );
}

export async function getWorkoutById(userId: string, workoutId: string) {
  const workouts = await getWorkoutGraph(userId);
  return workouts.find((workout) => workout.id === workoutId) ?? null;
}

export async function getWorkoutStats(userId: string) {
  const workouts = await getWorkoutGraph(userId);

  let exerciseCount = 0;
  let setCount = 0;
  let volume = 0;

  for (const workout of workouts) {
    exerciseCount += workout.exercises.length;

    for (const exercise of workout.exercises) {
      setCount += exercise.sets.length;

      for (const set of exercise.sets) {
        volume += (parseDbNumber(set.weight) ?? 0) * (parseDbNumber(set.reps) ?? 0);
      }
    }
  }

  return {
    workoutCount: workouts.length,
    exerciseCount,
    setCount,
    volume,
  };
}

export async function getRecentWorkouts(userId: string, limit = 5) {
  return getWorkoutGraph(userId, { limit });
}

export async function getAllExerciseNames(userId: string) {
  const workouts = await getWorkoutGraph(userId);
  const names = new Set<string>();

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      names.add(exercise.exercise_name);
    }
  }

  return [...names].sort((left, right) => left.localeCompare(right));
}

export async function getExerciseProgress(userId: string, exerciseName: string) {
  const workouts = await getWorkoutGraph(userId);
  const points: ExerciseProgressPoint[] = [];

  for (const workout of workouts) {
    const matchingExercises = workout.exercises.filter(
      (exercise) =>
        exercise.exercise_name.toLowerCase() === exerciseName.toLowerCase(),
    );

    if (!matchingExercises.length) {
      continue;
    }

    const topSet = matchingExercises
      .flatMap((exercise) => exercise.sets)
      .reduce<WorkoutSet | null>((best, current) => {
        if (!best) {
          return current;
        }

        const bestWeight = parseDbNumber(best.weight) ?? 0;
        const currentWeight = parseDbNumber(current.weight) ?? 0;

        if (currentWeight > bestWeight) {
          return current;
        }

        if (currentWeight === bestWeight && current.order_index > best.order_index) {
          return current;
        }

        return best;
      }, null);

    if (!topSet) {
      continue;
    }

    points.push({
      workout_id: workout.id,
      workout_title: workout.title,
      date: workout.date,
      created_at: workout.created_at,
      weight: toNumber(topSet.weight),
      reps: parseDbNumber(topSet.reps),
      rpe: parseDbNumber(topSet.rpe),
    });
  }

  points.sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.created_at.localeCompare(right.created_at),
  );

  return {
    points,
    latestWeight: points.at(-1)?.weight ?? null,
    bestWeight:
      points.length > 0
        ? points.reduce((best, point) => Math.max(best, point.weight), 0)
        : null,
  };
}

export async function getTemplates(userId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: templateRows, error: templateError } = await supabase
    .from("templates")
    .select("id,title,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (templateError) {
    throw templateError;
  }

  if (!templateRows?.length) {
    return [] as Template[];
  }

  const templateIds = templateRows.map((row) => row.id);

  const { data: exerciseRows, error: exerciseError } = await supabase
    .from("template_exercises")
    .select("id,template_id,exercise_name,order_index,default_sets,default_reps")
    .in("template_id", templateIds)
    .order("order_index", { ascending: true });

  if (exerciseError) {
    throw exerciseError;
  }

  return groupTemplates(
    templateRows as TemplateRow[],
    (exerciseRows ?? []) as TemplateExerciseRow[],
  );
}

export async function getTemplateById(userId: string, templateId: string) {
  const templates = await getTemplates(userId);
  return templates.find((template) => template.id === templateId) ?? null;
}
