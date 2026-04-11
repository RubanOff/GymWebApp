import { resetPassword } from "@/lib/auth";
import { jsonError, ok, parseJson } from "@/lib/http";
import { resetPasswordSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { token, password } = await parseJson(request, resetPasswordSchema);
    await resetPassword(token, password);

    return ok({ notice: "Password updated. You can sign in now." });
  } catch (error) {
    return jsonError(error);
  }
}
