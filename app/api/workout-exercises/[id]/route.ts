import { requireApiUser } from "@/lib/auth";
import { deleteExerciseRecord, updateExerciseRecord } from "@/lib/db/mutations";
import { jsonError, ok, parseJson } from "@/lib/http";
import { updateExerciseSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const input = await parseJson(request, updateExerciseSchema);

    await updateExerciseRecord(user.id, id, input);

    return ok({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    await deleteExerciseRecord(user.id, id);

    return ok({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
