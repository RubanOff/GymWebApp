import { Card } from "@/components/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10">
      <Card className="space-y-4 p-6">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
            404
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Page not found
          </h1>
          <p className="text-sm leading-6 text-zinc-500">
            The workout or template you were looking for no longer exists.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Dashboard
          </Link>
          <Link
            href="/history"
            className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            History
          </Link>
        </div>
      </Card>
    </main>
  );
}
