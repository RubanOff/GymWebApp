"use client";

import { apiRequest } from "@/lib/client-api";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-full px-3 text-zinc-500 hover:text-zinc-950"
    >
      {loading ? "Signing out" : "Sign out"}
    </Button>
  );
}
