import { requireApiUser } from "@/lib/auth";
import { createExerciseRecord } from "@/lib/db/mutations";
import { jsonError, ok, parseJson } from "@/lib/http";
import { createExerciseSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const { name } = await parseJson(request, createExerciseSchema);
    const exercise = await createExerciseRecord(user.id, id, name);

    return ok({ exercise });
  } catch (error) {
    return jsonError(error);
  }
}
