import { signUp } from "@/lib/auth";
import { jsonError, ok, parseJson } from "@/lib/http";
import { signUpSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email, password } = await parseJson(request, signUpSchema);
    await signUp(email, password);

    return ok({
      notice:
        "Account created. Check your email and confirm the address before signing in.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
