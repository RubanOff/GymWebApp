"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-zinc-950 text-white shadow-soft hover:bg-zinc-800 active:bg-zinc-900",
  secondary:
    "border border-zinc-200 bg-white text-zinc-900 shadow-sm hover:bg-zinc-50",
  ghost: "text-zinc-700 hover:bg-zinc-100",
  danger: "bg-red-600 text-white hover:bg-red-500 active:bg-red-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-3 text-sm",
  md: "h-12 px-4 text-sm",
  lg: "h-14 px-5 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-3xl border border-zinc-200 bg-white/90 p-4 shadow-soft backdrop-blur", className)}>
      {children}
    </section>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[15px] text-zinc-950",
        "placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-950",
        "placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold tracking-tight text-zinc-950">
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-6 text-zinc-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="p-6 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-white">
          <ArrowRight className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold tracking-tight">
            {title}
          </h3>
          <p className="text-sm leading-6 text-zinc-500">{description}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </Card>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
        {label}
      </p>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-zinc-950">
        {value}
      </p>
      {hint ? <p className="mt-2 text-sm text-zinc-500">{hint}</p> : null}
    </Card>
  );
}

export function SkeletonCard() {
  return (
    <Card className="animate-pulse p-4">
      <div className="space-y-3">
        <div className="h-3 w-24 rounded-full bg-zinc-200" />
        <div className="h-6 w-2/3 rounded-full bg-zinc-200" />
        <div className="h-3 w-1/2 rounded-full bg-zinc-200" />
      </div>
    </Card>
  );
}

export function InlineLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-950"
    >
      {children}
    </Link>
  );
}
