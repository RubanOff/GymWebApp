"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarClock,
  Dumbbell,
  LayoutDashboard,
  Plus,
  SquareStack,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: CalendarClock },
  { href: "/workouts/new", label: "Start", icon: Plus },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/templates", label: "Templates", icon: SquareStack },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl px-1 py-1 font-display text-lg font-semibold tracking-tight text-zinc-950"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              <Dumbbell className="h-4 w-4" />
            </span>
            Gym Journal
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                    active
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:pb-12">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-10px_40px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 text-[11px] font-medium transition",
                  active ? "bg-zinc-950 text-white" : "text-zinc-500",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
