import { getResetTokenStatus } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/login-form";
import { Card } from "@/components/ui";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string; error?: string }>;
}) {
  const resolved = searchParams ? await searchParams : {};
  const token = resolved.token ?? "";
  const tokenStatus = token ? await getResetTokenStatus(token) : "invalid";
  const initialError =
    resolved.error ??
    (tokenStatus === "invalid" ? "Reset link is invalid or has expired." : null);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
        <section className="space-y-4">
          <p className="inline-flex items-center rounded-full border border-zinc-200 bg-white/75 px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm backdrop-blur">
            Password recovery
          </p>
          <div className="space-y-3">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-950">
              Set a new password.
            </h1>
            <p className="max-w-lg text-base leading-7 text-zinc-600">
              Use the secure link from your email and choose a new password for your account.
            </p>
          </div>
        </section>

        <Card className="p-5 sm:p-6">
          <ResetPasswordForm token={tokenStatus === "valid" ? token : ""} initialError={initialError} />
        </Card>
      </div>
    </main>
  );
}
