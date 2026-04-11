"use client";

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export async function apiRequest<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "same-origin",
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new ApiError(payload.error ?? "Request failed.");
  }

  return payload;
}
