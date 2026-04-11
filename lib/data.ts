import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  sets as setsTable,
  templateExercises,
  templates,
  workoutExercises,
  workouts,
} from "@/lib/db/schema";
import { parseDbNumber } from "@/lib/format";
import { NotFoundError } from "@/lib/errors";
import type {
  ExerciseProgressPoint,
  Template,
  TemplateExercise,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from "@/lib/types";

function sortByOrderIndex<T extends { order_index: number }>(items: T[]) {
  return [...items].sort((left, right) => left.order_index - right.order_index);
}

function sortWorkouts(items: Workout[]) {
  return [...items].sort(
    (left, right) =>
      right.date.localeCompare(left.date) ||
      right.created_at.localeCompare(left.created_at),
  );
}

function toNumber(value: number | string | null) {
  return parseDbNumber(value) ?? 0;
}

export async function getWorkoutGraph(userId: string) {
  const workoutRows = await db
    .select({
      id: workouts.id,
      title: workouts.title,
      date: workouts.date,
      notes: workouts.notes,
      created_at: workouts.createdAt,
    })
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.date), desc(workouts.createdAt));

  if (!workoutRows.length) {
    return [] as Workout[];
  }

  const workoutIds = workoutRows.map((row) => row.id);

  const exerciseRows = await db
    .select({
      id: workoutExercises.id,
      workout_id: workoutExercises.workoutId,
      exercise_name: workoutExercises.exerciseName,
      notes: workoutExercises.notes,
      order_index: workoutExercises.orderIndex,
    })
    .from(workoutExercises)
    .where(inArray(workoutExercises.workoutId, workoutIds))
    .orderBy(workoutExercises.orderIndex);

  const exerciseIds = exerciseRows.map((row) => row.id);

  const setRows = exerciseIds.length
    ? await db
        .select({
          id: setsTable.id,
          workout_exercise_id: setsTable.workoutExerciseId,
          reps: setsTable.reps,
          weight: setsTable.weight,
          rpe: setsTable.rpe,
          order_index: setsTable.orderIndex,
        })
        .from(setsTable)
        .where(inArray(setsTable.workoutExerciseId, exerciseIds))
        .orderBy(setsTable.orderIndex)
    : [];

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

  return workoutRows.map<Workout>((workout) => ({
    id: workout.id,
    title: workout.title,
    date: workout.date,
    notes: workout.notes,
    created_at: workout.created_at,
    exercises: sortByOrderIndex(exercisesByWorkout.get(workout.id) ?? []),
  }));
}

export async function getWorkoutById(userId: string, workoutId: string) {
  const workoutsGraph = await getWorkoutGraph(userId);
  return workoutsGraph.find((workout) => workout.id === workoutId) ?? null;
}

export async function getWorkoutStats(userId: string) {
  const workoutsGraph = await getWorkoutGraph(userId);

  let exerciseCount = 0;
  let setCount = 0;
  let volume = 0;

  for (const workout of workoutsGraph) {
    exerciseCount += workout.exercises.length;

    for (const exercise of workout.exercises) {
      setCount += exercise.sets.length;

      for (const set of exercise.sets) {
        volume += (parseDbNumber(set.weight) ?? 0) * (parseDbNumber(set.reps) ?? 0);
      }
    }
  }

  return {
    workoutCount: workoutsGraph.length,
    exerciseCount,
    setCount,
    volume,
  };
}

export async function getRecentWorkouts(userId: string, limit = 5) {
  const workoutsGraph = await getWorkoutGraph(userId);
  return workoutsGraph.slice(0, limit);
}

export async function getAllExerciseNames(userId: string) {
  const workoutsGraph = await getWorkoutGraph(userId);
  const names = new Set<string>();

  for (const workout of workoutsGraph) {
    for (const exercise of workout.exercises) {
      names.add(exercise.exercise_name);
    }
  }

  return [...names].sort((left, right) => left.localeCompare(right));
}

export async function getExerciseProgress(userId: string, exerciseName: string) {
  const workoutsGraph = await getWorkoutGraph(userId);
  const points: ExerciseProgressPoint[] = [];

  for (const workout of workoutsGraph) {
    const matchingExercises = workout.exercises.filter(
      (exercise) => exercise.exercise_name.toLowerCase() === exerciseName.toLowerCase(),
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
  const templateRows = await db
    .select({
      id: templates.id,
      title: templates.title,
      created_at: templates.createdAt,
    })
    .from(templates)
    .where(eq(templates.userId, userId))
    .orderBy(desc(templates.createdAt));

  if (!templateRows.length) {
    return [] as Template[];
  }

  const templateIds = templateRows.map((row) => row.id);

  const exerciseRows = await db
    .select({
      id: templateExercises.id,
      template_id: templateExercises.templateId,
      exercise_name: templateExercises.exerciseName,
      order_index: templateExercises.orderIndex,
      default_sets: templateExercises.defaultSets,
      default_reps: templateExercises.defaultReps,
    })
    .from(templateExercises)
    .where(inArray(templateExercises.templateId, templateIds))
    .orderBy(templateExercises.orderIndex);

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

  return templateRows.map<Template>((template) => ({
    id: template.id,
    title: template.title,
    created_at: template.created_at,
    exercises: sortByOrderIndex(exercisesByTemplate.get(template.id) ?? []),
  }));
}

export async function getTemplateById(userId: string, templateId: string) {
  const templateList = await getTemplates(userId);
  return templateList.find((template) => template.id === templateId) ?? null;
}

export async function assertWorkoutOwnership(userId: string, workoutId: string) {
  const rows = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .limit(1);

  if (!rows[0]) {
    throw new NotFoundError("Workout not found.");
  }
}

export async function assertTemplateOwnership(userId: string, templateId: string) {
  const rows = await db
    .select({ id: templates.id })
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
    .limit(1);

  if (!rows[0]) {
    throw new NotFoundError("Template not found.");
  }
}
