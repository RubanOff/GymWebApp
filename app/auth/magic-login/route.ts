import { signInWithMagicToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=Magic+link+is+missing.", request.url));
  }

  try {
    await signInWithMagicToken(token);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Magic link could not be used.";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
