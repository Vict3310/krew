import { NextResponse, type NextRequest } from "next/server";

import { logoutCurrentUser } from "@/lib/auth";

/**
 * Sign the current session out.
 *
 * The rail signs out with a plain HTML form, so the response must be a
 * redirect: returning bare JSON would leave the browser showing the API body
 * on screen. Callers that explicitly ask for JSON still get it.
 */
export async function POST(request: NextRequest) {
  await logoutCurrentUser();

  const wantsJson = request.headers.get("accept")?.includes("application/json");
  if (wantsJson) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.redirect(new URL("/", request.url), 303);
}
