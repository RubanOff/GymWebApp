import { requireApiUser } from "@/lib/auth";
import { createWorkoutRecord } from "@/lib/db/mutations";
import { jsonError, ok, parseJson } from "@/lib/http";
import { createWorkoutSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = await parseJson(request, createWorkoutSchema);
    const workoutId = await createWorkoutRecord(user.id, input);

    return ok({ workoutId });
  } catch (error) {
    return jsonError(error);
  }
}
