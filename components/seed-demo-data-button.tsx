"use client";

import { Button } from "@/components/ui";
import { apiRequest } from "@/lib/client-api";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SeedDemoDataButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSeed() {
    setLoading(true);
    setStatus(null);

    try {
      const response = await apiRequest<{ notice: string }>("/api/dev/seed-demo", {
        method: "POST",
      });
      setStatus(response.notice);
      router.refresh();
    } catch (seedError) {
      setStatus(
        seedError instanceof Error ? seedError.message : "Could not load demo data",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full rounded-full sm:w-auto"
        onClick={handleSeed}
        disabled={loading}
      >
        {loading ? "Loading demo data..." : "Load demo data"}
      </Button>
      {status ? <p className="text-sm text-zinc-500">{status}</p> : null}
    </div>
  );
}
