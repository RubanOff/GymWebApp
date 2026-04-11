import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import type { ReactNode } from "react";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requireUser();

  return <AppShell>{children}</AppShell>;
}
