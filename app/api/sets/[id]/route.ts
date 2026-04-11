import { requireApiUser } from "@/lib/auth";
import { deleteSetRecord, updateSetRecord } from "@/lib/db/mutations";
import { jsonError, ok, parseJson } from "@/lib/http";
import { updateSetSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const input = await parseJson(request, updateSetSchema);

    await updateSetRecord(user.id, id, input);

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
    await deleteSetRecord(user.id, id);

    return ok({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
