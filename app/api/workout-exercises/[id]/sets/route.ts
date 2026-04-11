import { requireApiUser } from "@/lib/auth";
import { createSetRecord } from "@/lib/db/mutations";
import { jsonError, ok, parseJson } from "@/lib/http";
import { createSetSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const input = await parseJson(request, createSetSchema);
    const set = await createSetRecord(user.id, id, input);

    return ok({ set });
  } catch (error) {
    return jsonError(error);
  }
}
