import { NextResponse, type NextRequest } from "next/server";
import { createProxySupabaseClient } from "@/lib/supabase/proxy";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  const supabase = createProxySupabaseClient(request, response);
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return response;
}
