import { sendForgotPasswordEmail } from "@/lib/auth";
import { jsonError, ok, parseJson } from "@/lib/http";
import { emailOnlySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email } = await parseJson(request, emailOnlySchema);
    await sendForgotPasswordEmail(email);

    return ok({
      notice: "If an account exists for this email, a reset link has been sent.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
