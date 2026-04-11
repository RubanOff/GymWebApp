"use client";

import { apiRequest } from "@/lib/client-api";
import { Button, Input } from "@/components/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type Mode = "signin" | "signup";

function getReadableAuthErrorMessage(error: Error) {
  if (error.message === "Invalid email or password.") {
    return "Invalid email or password. If the account was not created yet, use Create account or sign in with a magic link.";
  }

  return error.message;
}

export function LoginForm({
  initialNotice = null,
  initialError = null,
}: {
  initialNotice?: string | null;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [error, setError] = useState<string | null>(initialError);

  const primaryLabel = useMemo(
    () => (mode === "signin" ? "Sign in" : "Create account"),
    [mode],
  );

  async function handlePasswordAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === "signin") {
        await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        router.replace("/dashboard");
        router.refresh();
        return;
      }

      const response = await apiRequest<{ notice: string }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setNotice(response.notice);
      setMode("signin");
      setPassword("");
    } catch (authError) {
      setError(
        authError instanceof Error
          ? getReadableAuthErrorMessage(authError)
          : "Authentication failed",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Enter an email address first.");
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiRequest<{ notice: string }>("/api/auth/magic-link", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      setNotice(response.notice);
    } catch (magicError) {
      setError(
        magicError instanceof Error ? magicError.message : "Could not send link",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter an email address first.");
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiRequest<{ notice: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      setNotice(response.notice);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not send reset email",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
          Authentication
        </p>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-950">
          Get in, log workout, get out.
        </h2>
        <p className="text-sm leading-6 text-zinc-500">
          Use email/password or a magic link. New accounts need email confirmation
          before password sign-in.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handlePasswordAuth}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-700">Email</span>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-700">Password</span>
          <Input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {notice ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Working..." : primaryLabel}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={handleMagicLink}
          disabled={loading}
        >
          Send magic link
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={handleForgotPassword}
          disabled={loading}
        >
          Send password reset link
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "signin"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </Button>
      </form>
    </div>
  );
}

export function ResetPasswordForm({
  token,
  initialError = null,
}: {
  token: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiRequest<{ notice: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });

      setNotice(response.notice);
      setTimeout(() => {
        router.push("/login");
      }, 1_000);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Could not reset password",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">Reset token is missing or invalid.</p>
        <Link
          href="/login"
          className="inline-flex text-sm font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
          Reset password
        </p>
        <p className="text-sm leading-6 text-zinc-500">
          Choose a new password with at least 8 characters.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-zinc-700">New password</span>
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}
