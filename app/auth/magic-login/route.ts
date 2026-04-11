import { signInWithMagicToken } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function buildAppUrl(path: string) {
  return new URL(path, getServerEnv().APP_URL);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(buildAppUrl("/login?error=Magic+link+is+missing."));
  }

  try {
    await signInWithMagicToken(token);
    return NextResponse.redirect(buildAppUrl("/dashboard"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Magic link could not be used.";
    return NextResponse.redirect(
      buildAppUrl(`/login?error=${encodeURIComponent(message)}`),
    );
  }
}
