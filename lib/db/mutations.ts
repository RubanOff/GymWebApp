import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  mlPredictionLogs,
  sets,
  templateExercises,
  templates,
  workoutExercises,
  workouts,
} from "@/lib/db/schema";
import { demoTemplateSeeds, demoWorkoutSeeds } from "@/lib/demo-seed";
import { daysAgoInputValue, parseDbNumber, todayInputValue } from "@/lib/format";
import { getTemplateById, getWorkoutById } from "@/lib/data";
import { createId } from "@/lib/db/tokens";
import { NotFoundError } from "@/lib/errors";

function normalizeTitle(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export async function createWorkoutRecord(userId: string, input: {
  title: string;
  date: string;
  notes: string | null;
}) {
  const id = createId();

  await db.insert(workouts).values({
    id,
    userId,
    title: normalizeTitle(input.title, "Workout"),
    date: input.date,
    notes: input.notes,
  });

  return id;
}

export async function duplicateWorkoutRecord(userId: string, workoutId: string) {
  const workout = await getWorkoutById(userId, workoutId);

  if (!workout) {
    throw new NotFoundError("Workout not found.");
  }

  return db.transaction(async (tx) => {
    const createdWorkoutId = createId();

    await tx.insert(workouts).values({
      id: createdWorkoutId,
      userId,
      title: `Copy of ${normalizeTitle(workout.title, "Workout")}`,
      date: todayInputValue(),
      notes: workout.notes,
    });

    for (let exerciseIndex = 0; exerciseIndex < workout.exercises.length; exerciseIndex += 1) {
      const exercise = workout.exercises[exerciseIndex];
      const createdExerciseId = createId();

      await tx.insert(workoutExercises).values({
        id: createdExerciseId,
        workoutId: createdWorkoutId,
        exerciseName: exercise.exercise_name,
        notes: exercise.notes,
        orderIndex: exerciseIndex,
      });

      if (exercise.sets.length) {
        await tx.insert(sets).values(
          exercise.sets.map((set, setIndex) => ({
            id: createId(),
            workoutExerciseId: createdExerciseId,
            reps: set.reps,
            weight: set.weight === null ? null : String(set.weight),
            rpe: set.rpe === null ? null : String(set.rpe),
            orderIndex: setIndex,
          })),
        );
      }
    }

    return createdWorkoutId;
  });
}

export async function createWorkoutFromTemplateRecord(userId: string, templateId: string) {
  const template = await getTemplateById(userId, templateId);

  if (!template) {
    throw new NotFoundError("Template not found.");
  }

  return db.transaction(async (tx) => {
    const createdWorkoutId = createId();

    await tx.insert(workouts).values({
      id: createdWorkoutId,
      userId,
      title: template.title,
      date: todayInputValue(),
      notes: null,
    });

    for (let exerciseIndex = 0; exerciseIndex < template.exercises.length; exerciseIndex += 1) {
      const exercise = template.exercises[exerciseIndex];
      const exerciseId = createId();

      await tx.insert(workoutExercises).values({
        id: exerciseId,
        workoutId: createdWorkoutId,
        exerciseName: exercise.exercise_name,
        notes: null,
        orderIndex: exerciseIndex,
      });

      await tx.insert(sets).values(
        Array.from({ length: exercise.default_sets }, (_, setIndex) => ({
          id: createId(),
          workoutExerciseId: exerciseId,
          reps: exercise.default_reps,
          weight: null,
          rpe: null,
          orderIndex: setIndex,
        })),
      );
    }

    return createdWorkoutId;
  });
}

export async function saveTemplateFromWorkoutRecord(userId: string, workoutId: string) {
  const workout = await getWorkoutById(userId, workoutId);

  if (!workout) {
    throw new NotFoundError("Workout not found.");
  }

  return db.transaction(async (tx) => {
    const templateId = createId();

    await tx.insert(templates).values({
      id: templateId,
      userId,
      title: workout.title,
    });

    if (workout.exercises.length) {
      await tx.insert(templateExercises).values(
        workout.exercises.map((exercise, exerciseIndex) => ({
          id: createId(),
          templateId,
          exerciseName: exercise.exercise_name,
          orderIndex: exerciseIndex,
          defaultSets: Math.max(1, exercise.sets.length || 1),
          defaultReps: parseDbNumber(exercise.sets[0]?.reps) ?? 8,
        })),
      );
    }

    return templateId;
  });
}

export async function updateWorkoutRecord(userId: string, workoutId: string, input: {
  title: string;
  date: string;
  notes: string | null;
}) {
  const updated = await db
    .update(workouts)
    .set({
      title: normalizeTitle(input.title, "Workout"),
      date: input.date,
      notes: input.notes,
    })
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .returning({ id: workouts.id });

  if (!updated[0]) {
    throw new NotFoundError("Workout not found.");
  }
}

export async function deleteWorkoutRecord(userId: string, workoutId: string) {
  const deleted = await db
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .returning({ id: workouts.id });

  if (!deleted[0]) {
    throw new NotFoundError("Workout not found.");
  }
}

export async function createExerciseRecord(userId: string, workoutId: string, name: string) {
  const workout = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .limit(1);

  if (!workout[0]) {
    throw new NotFoundError("Workout not found.");
  }

  const existingExercises = await db
    .select({ orderIndex: workoutExercises.orderIndex })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId));

  const nextOrder =
    existingExercises.reduce((max, exercise) => Math.max(max, exercise.orderIndex), -1) + 1;
  const id = createId();

  await db.insert(workoutExercises).values({
    id,
    workoutId,
    exerciseName: name.trim(),
    notes: null,
    orderIndex: nextOrder,
  });

  return {
    id,
    exercise_name: name.trim(),
    notes: null,
    order_index: nextOrder,
    sets: [],
  };
}

export async function updateExerciseRecord(userId: string, exerciseId: string, input: {
  exerciseName: string;
  notes: string | null;
}) {
  const owned = await db
    .select({ id: workoutExercises.id })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(eq(workoutExercises.id, exerciseId), eq(workouts.userId, userId)))
    .limit(1);

  if (!owned[0]) {
    throw new NotFoundError("Exercise not found.");
  }

  await db
    .update(workoutExercises)
    .set({
      exerciseName: normalizeTitle(input.exerciseName, "Exercise"),
      notes: input.notes,
    })
    .where(eq(workoutExercises.id, exerciseId));
}

export async function deleteExerciseRecord(userId: string, exerciseId: string) {
  const owned = await db
    .select({ id: workoutExercises.id })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(eq(workoutExercises.id, exerciseId), eq(workouts.userId, userId)))
    .limit(1);

  if (!owned[0]) {
    throw new NotFoundError("Exercise not found.");
  }

  await db.delete(workoutExercises).where(eq(workoutExercises.id, exerciseId));
}

export async function createSetRecord(userId: string, exerciseId: string, input: {
  reps: number | null;
  weight: number | null;
  rpe: number | null;
}) {
  const exercise = await db
    .select({ id: workoutExercises.id })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(eq(workoutExercises.id, exerciseId), eq(workouts.userId, userId)))
    .limit(1);

  if (!exercise[0]) {
    throw new NotFoundError("Exercise not found.");
  }

  const existingSets = await db
    .select({ orderIndex: sets.orderIndex })
    .from(sets)
    .where(eq(sets.workoutExerciseId, exerciseId));

  const nextOrder = existingSets.reduce((max, set) => Math.max(max, set.orderIndex), -1) + 1;
  const id = createId();

  await db.insert(sets).values({
    id,
    workoutExerciseId: exerciseId,
    reps: input.reps,
    weight: input.weight === null ? null : String(input.weight),
    rpe: input.rpe === null ? null : String(input.rpe),
    orderIndex: nextOrder,
  });

  await resolvePredictionLogForExercise(userId, exerciseId);

  return {
    id,
    reps: input.reps,
    weight: input.weight,
    rpe: input.rpe,
    order_index: nextOrder,
  };
}

export async function updateSetRecord(userId: string, setId: string, input: {
  reps: number | null;
  weight: number | null;
  rpe: number | null;
}) {
  const owned = await db
    .select({ id: sets.id })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(eq(sets.id, setId), eq(workouts.userId, userId)))
    .limit(1);

  if (!owned[0]) {
    throw new NotFoundError("Set not found.");
  }

  await db
    .update(sets)
    .set({
      reps: input.reps,
      weight: input.weight === null ? null : String(input.weight),
      rpe: input.rpe === null ? null : String(input.rpe),
    })
    .where(eq(sets.id, setId));

  const exercise = await db
    .select({ exerciseId: workoutExercises.id })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(eq(sets.id, setId), eq(workouts.userId, userId)))
    .limit(1);

  const exerciseId = exercise[0]?.exerciseId;

  if (exerciseId) {
    await resolvePredictionLogForExercise(userId, exerciseId);
  }
}

export async function deleteSetRecord(userId: string, setId: string) {
  const owned = await db
    .select({ id: sets.id })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(eq(sets.id, setId), eq(workouts.userId, userId)))
    .limit(1);

  if (!owned[0]) {
    throw new NotFoundError("Set not found.");
  }

  await db.delete(sets).where(eq(sets.id, setId));
}

export async function logPredictionRecord(
  userId: string,
  input: {
    exerciseName: string;
    modelVersion: string | null;
    basis: string;
    dataConfidence: string;
    historyPointsUsed: number;
    predictedWeight: number | null;
    predictedReps: number | null;
  },
) {
  const id = createId();

  await db.insert(mlPredictionLogs).values({
    id,
    userId,
    exerciseName: normalizeTitle(input.exerciseName, "Exercise"),
    modelVersion: input.modelVersion,
    basis: input.basis,
    dataConfidence: input.dataConfidence,
    historyPointsUsed: input.historyPointsUsed,
    predictedWeight:
      input.predictedWeight === null ? null : String(input.predictedWeight),
    predictedReps: input.predictedReps,
  });
}

export async function resolvePredictionLogForExercise(userId: string, exerciseId: string) {
  const exerciseRow = await db
    .select({
      exerciseId: workoutExercises.id,
      exerciseName: workoutExercises.exerciseName,
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(eq(workoutExercises.id, exerciseId), eq(workouts.userId, userId)))
    .limit(1);

  const exercise = exerciseRow[0];

  if (!exercise) {
    return;
  }

  const setRows = await db
    .select({
      reps: sets.reps,
      weight: sets.weight,
      orderIndex: sets.orderIndex,
    })
    .from(sets)
    .where(eq(sets.workoutExerciseId, exerciseId));

  const topSet = setRows.reduce<{
    reps: number | null;
    weight: number | null;
    orderIndex: number;
  } | null>((best, current) => {
    const currentWeight = parseDbNumber(current.weight) ?? 0;
    const bestWeight = best ? best.weight ?? 0 : -1;

    if (!best || currentWeight > bestWeight) {
      return {
        reps: current.reps,
        weight: parseDbNumber(current.weight),
        orderIndex: current.orderIndex,
      };
    }

    if (currentWeight === bestWeight && current.orderIndex > best.orderIndex) {
      return {
        reps: current.reps,
        weight: parseDbNumber(current.weight),
        orderIndex: current.orderIndex,
      };
    }

    return best;
  }, null);

  if (!topSet) {
    return;
  }

  const logRow = await db
    .select({ id: mlPredictionLogs.id })
    .from(mlPredictionLogs)
    .where(
      and(
        eq(mlPredictionLogs.userId, userId),
        eq(mlPredictionLogs.exerciseName, exercise.exerciseName),
        isNull(mlPredictionLogs.resolvedAt),
      ),
    )
    .orderBy(desc(mlPredictionLogs.createdAt))
    .limit(1);

  const log = logRow[0];

  if (!log) {
    return;
  }

  await db
    .update(mlPredictionLogs)
    .set({
      actualWeight: topSet.weight === null ? null : String(topSet.weight),
      actualReps: topSet.reps,
      resolvedAt: new Date().toISOString(),
    })
    .where(eq(mlPredictionLogs.id, log.id));
}

export async function seedDemoDataRecord(userId: string) {
  await db.transaction(async (tx) => {
    for (const workoutSeed of demoWorkoutSeeds) {
      const workoutId = createId();

      await tx.insert(workouts).values({
        id: workoutId,
        userId,
        title: workoutSeed.title,
        date: daysAgoInputValue(workoutSeed.daysAgo),
        notes: workoutSeed.notes ?? null,
      });

      for (let exerciseIndex = 0; exerciseIndex < workoutSeed.exercises.length; exerciseIndex += 1) {
        const exerciseSeed = workoutSeed.exercises[exerciseIndex];
        const exerciseId = createId();

        await tx.insert(workoutExercises).values({
          id: exerciseId,
          workoutId,
          exerciseName: exerciseSeed.exercise_name,
          notes: exerciseSeed.notes ?? null,
          orderIndex: exerciseIndex,
        });

        await tx.insert(sets).values(
          exerciseSeed.sets.map((setSeed, setIndex) => ({
            id: createId(),
            workoutExerciseId: exerciseId,
            reps: setSeed.reps,
            weight: String(setSeed.weight),
            rpe: setSeed.rpe === null || setSeed.rpe === undefined ? null : String(setSeed.rpe),
            orderIndex: setIndex,
          })),
        );
      }
    }

    for (const templateSeed of demoTemplateSeeds) {
      const templateId = createId();

      await tx.insert(templates).values({
        id: templateId,
        userId,
        title: templateSeed.title,
      });

      await tx.insert(templateExercises).values(
        templateSeed.exercises.map((exerciseSeed, exerciseIndex) => ({
          id: createId(),
          templateId,
          exerciseName: exerciseSeed.exercise_name,
          orderIndex: exerciseIndex,
          defaultSets: exerciseSeed.default_sets,
          defaultReps: exerciseSeed.default_reps,
        })),
      );
    }
  });
}
