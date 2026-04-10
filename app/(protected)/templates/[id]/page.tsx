import { requireUser } from "@/lib/auth";
import { getTemplateById } from "@/lib/data";
import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui";
import { StartFromTemplateButton } from "@/components/workout-ui";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const template = await getTemplateById(user.id, id);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title={template.title}
        description="Start a new workout from this template and fill weights quickly."
        action={<StartFromTemplateButton template={template} />}
      />

      <Card className="p-5">
        <div className="space-y-3">
          {template.exercises.length ? (
            template.exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
              >
                <div className="space-y-1">
                  <p className="font-medium text-zinc-950">{exercise.exercise_name}</p>
                  <p className="text-sm text-zinc-500">
                    {exercise.default_sets} sets · {exercise.default_reps} reps
                  </p>
                </div>
                <Badge>#{exercise.order_index + 1}</Badge>
              </div>
            ))
          ) : (
            <EmptyState
              title="Template is empty"
              description="Templates need at least one exercise to be useful."
            />
          )}
        </div>
      </Card>

      <div className="flex justify-start">
        <Link
          href="/templates"
          className="text-sm font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950 hover:decoration-zinc-950"
        >
          Back to templates
        </Link>
      </div>
    </div>
  );
}
