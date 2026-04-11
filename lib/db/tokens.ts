import "server-only";

import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { getServerEnv } from "@/lib/env";

function hashWithSecret(value: string) {
  return createHmac("sha256", getServerEnv().SESSION_SECRET)
    .update(value)
    .digest("hex");
}

export function createId() {
  return randomUUID();
}

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return hashWithSecret(token);
}

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
