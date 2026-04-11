import { requireApiUser } from "@/lib/auth";
import { duplicateWorkoutRecord } from "@/lib/db/mutations";
import { jsonError, ok } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const workoutId = await duplicateWorkoutRecord(user.id, id);

    return ok({ workoutId });
  } catch (error) {
    return jsonError(error);
  }
}
