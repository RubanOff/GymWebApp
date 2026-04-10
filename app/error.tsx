"use client";

import { Button, Card } from "@/components/ui";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center">
          <Card className="space-y-4 p-6">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                Something broke
              </p>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                We hit an error.
              </h1>
              <p className="text-sm leading-6 text-zinc-500">{error.message}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={reset}>Try again</Button>
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Back to dashboard
              </Link>
            </div>
          </Card>
        </div>
      </body>
    </html>
  );
}
