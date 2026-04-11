import { signOut } from "@/lib/auth";
import { ok } from "@/lib/http";

export const runtime = "nodejs";

export async function POST() {
  await signOut();
  return ok({ success: true });
}
