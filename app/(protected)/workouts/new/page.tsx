import { requireUser } from "@/lib/auth";
import { getTemplates } from "@/lib/data";
import { NewWorkoutForm } from "@/components/workout-ui";
import { SectionHeader } from "@/components/ui";
import Link from "next/link";

export default async function NewWorkoutPage() {
  const user = await requireUser();
  const templates = await getTemplates(user.id);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="New workout"
        description="Create a blank workout or start from a saved template."
        action={
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950 hover:decoration-zinc-950"
          >
            Dashboard
          </Link>
        }
      />

      <NewWorkoutForm templates={templates} />
    </div>
  );
}
