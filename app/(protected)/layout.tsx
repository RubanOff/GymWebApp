import { AppShell } from "@/components/app-shell";
import type { ReactNode } from "react";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
