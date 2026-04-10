import { getRecentWorkouts, getWorkoutStats } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { Card, EmptyState, SectionHeader, StatCard } from "@/components/ui";
import { WorkoutCard } from "@/components/workout-ui";
import { SeedDemoDataButton } from "@/components/seed-demo-data-button";
import Link from "next/link";

const ctaClass =
  "inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-medium transition";

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, workouts] = await Promise.all([
    getWorkoutStats(user.id),
    getRecentWorkouts(user.id, 5),
  ]);

  return (
    <div className="space-y-6">
      <Card className="!border-zinc-950 !bg-zinc-950 p-5 !text-white shadow-soft">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-400">
            Today
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Ready to train?
              </h1>
              <p className="max-w-xl text-sm leading-6 text-zinc-300">
                Start a session, log sets in seconds, and keep the data clean enough
                to reuse later.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/workouts/new"
                className={`${ctaClass} bg-white text-zinc-950 hover:bg-zinc-100`}
              >
                Start workout
              </Link>
              <Link
                href="/templates"
                className={`${ctaClass} border border-white/15 bg-white/5 text-white hover:bg-white/10`}
              >
                Templates
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Workouts"
          value={stats.workoutCount.toString()}
          hint="All logged sessions"
        />
        <StatCard
          label="Exercises"
          value={stats.exerciseCount.toString()}
          hint="Unique exercise entries"
        />
        <StatCard
          label="Sets"
          value={stats.setCount.toString()}
          hint="Total set rows"
        />
        <StatCard
          label="Volume"
          value={`${Math.round(stats.volume).toLocaleString("en-US")} kg`}
          hint="Weight x reps"
        />
      </div>

      <section className="space-y-4">
        <SectionHeader
          title="Recent workouts"
          description="Open a workout to add more sets or repeat it from here."
          action={
            <Link
              href="/history"
              className="text-sm font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950 hover:decoration-zinc-950"
            >
              View history
            </Link>
          }
        />

        {workouts.length ? (
          <div className="grid gap-4">
            {workouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No workouts yet"
            description="Create the first session and the dashboard will start showing progress."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/workouts/new"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Start workout
                </Link>
                {process.env.NODE_ENV !== "production" ? <SeedDemoDataButton /> : null}
              </div>
            }
          />
        )}
      </section>
    </div>
  );
}
