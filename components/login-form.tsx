"use client";

import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input } from "@/components/ui";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const supabase = createClient();

      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        router.replace("/dashboard");
        router.refresh();
        return;
      }

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
      } else {
        setNotice(
          "Account created. Check your inbox if email confirmation is enabled.",
        );
      }
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : "Authentication failed",
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
      const supabase = createClient();
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { error: magicError } = await supabase.auth.signInWithOtp({
        email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });

      if (magicError) {
        throw magicError;
      }

      setNotice("Magic link sent. Check your inbox.");
    } catch (magicError) {
      setError(
        magicError instanceof Error ? magicError.message : "Could not send link",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
          Authentication
        </p>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-950">
          Get in, log workout, get out.
        </h2>
        <p className="text-sm leading-6 text-zinc-500">
          Use email/password or a magic link. The flow is intentionally short and
          mobile-friendly.
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
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </Button>
      </form>
    </Card>
  );
}
