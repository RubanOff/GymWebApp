import { requireApiUser } from "@/lib/auth";
import { jsonError, ok } from "@/lib/http";
import { saveTemplateFromWorkoutRecord } from "@/lib/db/mutations";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const templateId = await saveTemplateFromWorkoutRecord(user.id, id);

    return ok({ templateId });
  } catch (error) {
    return jsonError(error);
  }
}
