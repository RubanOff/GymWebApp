import { requireUser } from "@/lib/auth";
import { getWorkoutById } from "@/lib/data";
import { WorkoutEditor } from "@/components/workout-ui";
import { SectionHeader } from "@/components/ui";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const workout = await getWorkoutById(user.id, id);

  if (!workout) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Workout"
        description="Add exercises, edit sets, and keep logging as little friction as possible."
        action={
          <Link
            href="/history"
            className="text-sm font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950 hover:decoration-zinc-950"
          >
            Back to history
          </Link>
        }
      />

      <WorkoutEditor workout={workout} />
    </div>
  );
}
