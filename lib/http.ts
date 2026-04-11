import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export function ok<T extends Record<string, unknown>>(payload: T, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}

export function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid request payload." },
      { status: 400 },
    );
  }

  if (error instanceof AuthError) {
    const status =
      error.code === "UNAUTHORIZED"
        ? 401
        : error.code === "INVALID_CREDENTIALS" || error.code === "INVALID_TOKEN"
        ? 401
        : error.code === "EXPIRED_TOKEN"
          ? 410
          : error.code === "EMAIL_ALREADY_IN_USE"
            ? 409
            : 400;

    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}

export async function parseJson<T>(request: Request, schema: { parse: (value: unknown) => T }) {
  const body = await request.json();
  return schema.parse(body);
}
