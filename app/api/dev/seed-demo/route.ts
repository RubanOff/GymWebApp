import { requireApiUser } from "@/lib/auth";
import { seedDemoDataRecord } from "@/lib/db/mutations";
import { ForbiddenError } from "@/lib/errors";
import { jsonError, ok } from "@/lib/http";

export const runtime = "nodejs";

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      throw new ForbiddenError("Demo seed is disabled in production.");
    }

    const user = await requireApiUser();
    await seedDemoDataRecord(user.id);

    return ok({ notice: "Demo data loaded." });
  } catch (error) {
    return jsonError(error);
  }
}
