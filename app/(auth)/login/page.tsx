import { LoginForm } from "@/components/login-form";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  const resolvedSearchParams = searchParams ? await searchParams : {};

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section className="space-y-6">
          <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white/75 px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm backdrop-blur">
            Minimal workout logging for lifters
          </div>

          <div className="space-y-4">
            <h1 className="max-w-xl font-display text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Log workouts faster than Notes or spreadsheets.
            </h1>
            <p className="max-w-xl text-base leading-7 text-zinc-600">
              A focused mobile-first logger for weights, reps, progress, templates,
              and repeat sessions. Built to remove friction from the actual gym flow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              "Quick set entry",
              "Workout history",
              "Progress tracking",
            ].map((item) => (
              <Card key={item} className="p-4">
                <p className="text-sm font-medium text-zinc-950">{item}</p>
              </Card>
            ))}
          </div>
        </section>

        <div className="lg:justify-self-end lg:w-full lg:max-w-md">
          <Card className="p-5 sm:p-6">
            <LoginForm
              initialNotice={resolvedSearchParams.notice ?? null}
              initialError={resolvedSearchParams.error ?? null}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}
