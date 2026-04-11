import { requireApiUser } from "@/lib/auth";
import { updateWorkoutRecord } from "@/lib/db/mutations";
import { jsonError, ok, parseJson } from "@/lib/http";
import { updateWorkoutSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const input = await parseJson(request, updateWorkoutSchema);

    await updateWorkoutRecord(user.id, id, input);

    return ok({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
