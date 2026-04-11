import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return NextResponse.redirect(
    new URL(
      "/login?error=This+link+belongs+to+the+old+auth+flow.+Please+request+a+new+email.",
      request.url,
    ),
  );
}
