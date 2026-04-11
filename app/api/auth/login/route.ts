import { AuthError, resendVerificationIfNeeded, signIn } from "@/lib/auth";
import { jsonError, ok, parseJson } from "@/lib/http";
import { signInSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let email = "";

  try {
    const credentials = await parseJson(request, signInSchema);
    email = credentials.email;
    const { password } = credentials;
    await signIn(email, password);

    return ok({ success: true });
  } catch (error) {
    if (error instanceof AuthError && error.code === "EMAIL_NOT_VERIFIED") {
      await resendVerificationIfNeeded(email);
    }

    return jsonError(error);
  }
}
