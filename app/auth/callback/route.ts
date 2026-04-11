import { getServerEnv } from "@/lib/env";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function buildAppUrl(path: string) {
  return new URL(path, getServerEnv().APP_URL);
}

export async function GET(request: Request) {
  return NextResponse.redirect(
    buildAppUrl(
      "/login?error=This+link+belongs+to+the+old+auth+flow.+Please+request+a+new+email.",
    ),
  );
}
