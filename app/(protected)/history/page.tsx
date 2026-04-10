import { requireUser } from "@/lib/auth";
import { getWorkoutGraph } from "@/lib/data";
import { EmptyState, SectionHeader } from "@/components/ui";
import { WorkoutCard } from "@/components/workout-ui";
import { SeedDemoDataButton } from "@/components/seed-demo-data-button";
import Link from "next/link";

export default async function HistoryPage() {
  const user = await requireUser();
  const workouts = await getWorkoutGraph(user.id);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="History"
        description="Browse every workout and repeat old sessions when you want a shortcut."
        action={
          <Link
            href="/workouts/new"
            className="text-sm font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950 hover:decoration-zinc-950"
          >
            New workout
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
          title="Nothing here yet"
          description="Your workout history will appear once you log the first session."
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href="/workouts/new"
                className="text-sm font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4"
              >
                Start workout
              </Link>
              {process.env.NODE_ENV !== "production" ? <SeedDemoDataButton /> : null}
            </div>
          }
        />
      )}
    </div>
  );
}
