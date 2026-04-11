import { sql } from "@/lib/db/client";
import { ok } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  await sql`select 1`;

  return ok({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
