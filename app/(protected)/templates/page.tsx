import { requireUser } from "@/lib/auth";
import { getTemplates } from "@/lib/data";
import { EmptyState, SectionHeader } from "@/components/ui";
import { TemplateCard } from "@/components/workout-ui";
import { SeedDemoDataButton } from "@/components/seed-demo-data-button";
import Link from "next/link";

export default async function TemplatesPage() {
  const user = await requireUser();
  const templates = await getTemplates(user.id);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Templates"
        description="Save a workout once, then launch the structure again in one tap."
        action={
          <Link
            href="/workouts/new"
            className="text-sm font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950 hover:decoration-zinc-950"
          >
            New workout
          </Link>
        }
      />

      {templates.length ? (
        <div className="grid gap-4">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No templates yet"
          description="Open a workout and save it as a template to reuse the setup later."
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href="/history"
                className="text-sm font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4"
              >
                Browse workouts
              </Link>
              {process.env.NODE_ENV !== "production" ? <SeedDemoDataButton /> : null}
            </div>
          }
        />
      )}
    </div>
  );
}
