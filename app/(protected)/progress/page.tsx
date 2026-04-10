import { requireUser } from "@/lib/auth";
import { getAllExerciseNames, getExerciseProgress } from "@/lib/data";
import { formatWeight } from "@/lib/format";
import { ProgressChart } from "@/components/workout-ui";
import { Card, EmptyState, SectionHeader, StatCard } from "@/components/ui";
import Link from "next/link";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams?: Promise<{ exercise?: string | string[] }>;
}) {
  const user = await requireUser();
  const exerciseNames = await getAllExerciseNames(user.id);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawExercise = resolvedSearchParams.exercise;
  const selectedExerciseName = Array.isArray(rawExercise)
    ? rawExercise[0]
    : rawExercise;
  const selectedExercise =
    selectedExerciseName && exerciseNames.includes(selectedExerciseName)
      ? selectedExerciseName
      : exerciseNames[0] ?? "";

  if (!exerciseNames.length) {
    return (
      <EmptyState
        title="No progress yet"
        description="Log a few workouts first, then choose an exercise to see a chart."
        action={
          <Link
            href="/workouts/new"
            className="text-sm font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4"
          >
            Start workout
          </Link>
        }
      />
    );
  }

  const progress = await getExerciseProgress(user.id, selectedExercise);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Progress"
        description="Pick an exercise and inspect the latest and best weight over time."
      />

      <Card className="p-5">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-2">
            <span className="text-sm font-medium text-zinc-700">Exercise</span>
            <select
              name="exercise"
              defaultValue={selectedExercise}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[15px] text-zinc-950 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            >
              {exerciseNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Show progress
          </button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Latest weight"
          value={formatWeight(progress.latestWeight)}
          hint="Most recent top set"
        />
        <StatCard
          label="Best weight"
          value={formatWeight(progress.bestWeight)}
          hint="Highest logged weight"
        />
        <StatCard
          label="Sessions"
          value={progress.points.length.toString()}
          hint="Times this movement appears"
        />
      </div>

      <ProgressChart points={progress.points} />
    </div>
  );
}
