"use client";

import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { daysAgoInputValue } from "@/lib/format";
import { demoTemplateSeeds, demoWorkoutSeeds } from "@/lib/demo-seed";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function seedWorkouts(supabase = createClient()) {
  for (const workoutSeed of demoWorkoutSeeds) {
    const { data: workout, error: workoutError } = await supabase
      .from("workouts")
      .insert({
        title: workoutSeed.title,
        date: daysAgoInputValue(workoutSeed.daysAgo),
        notes: workoutSeed.notes ?? null,
      })
      .select("id")
      .single();

    if (workoutError) {
      throw workoutError;
    }

    for (let exerciseIndex = 0; exerciseIndex < workoutSeed.exercises.length; exerciseIndex += 1) {
      const exerciseSeed = workoutSeed.exercises[exerciseIndex];
      const { data: exercise, error: exerciseError } = await supabase
        .from("workout_exercises")
        .insert({
          workout_id: workout.id,
          exercise_name: exerciseSeed.exercise_name,
          notes: exerciseSeed.notes ?? null,
          order_index: exerciseIndex,
        })
        .select("id")
        .single();

      if (exerciseError) {
        throw exerciseError;
      }

      const setsPayload = exerciseSeed.sets.map((setSeed, setIndex) => ({
        workout_exercise_id: exercise.id,
        reps: setSeed.reps,
        weight: setSeed.weight,
        rpe: setSeed.rpe ?? null,
        order_index: setIndex,
      }));

      const { error: setError } = await supabase.from("sets").insert(setsPayload);

      if (setError) {
        throw setError;
      }
    }
  }
}

async function seedTemplates(supabase = createClient()) {
  for (const templateSeed of demoTemplateSeeds) {
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .insert({ title: templateSeed.title })
      .select("id")
      .single();

    if (templateError) {
      throw templateError;
    }

    const { error: exerciseError } = await supabase.from("template_exercises").insert(
      templateSeed.exercises.map((exerciseSeed, exerciseIndex) => ({
        template_id: template.id,
        exercise_name: exerciseSeed.exercise_name,
        order_index: exerciseIndex,
        default_sets: exerciseSeed.default_sets,
        default_reps: exerciseSeed.default_reps,
      })),
    );

    if (exerciseError) {
      throw exerciseError;
    }
  }
}

export function SeedDemoDataButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSeed() {
    setLoading(true);
    setStatus(null);

    try {
      const supabase = createClient();
      await seedWorkouts(supabase);
      await seedTemplates(supabase);
      setStatus("Demo data loaded.");
      router.refresh();
    } catch (seedError) {
      setStatus(
        seedError instanceof Error ? seedError.message : "Could not load demo data",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full rounded-full sm:w-auto"
        onClick={handleSeed}
        disabled={loading}
      >
        {loading ? "Loading demo data..." : "Load demo data"}
      </Button>
      {status ? <p className="text-sm text-zinc-500">{status}</p> : null}
    </div>
  );
}
