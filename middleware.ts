import { NextResponse, type NextRequest } from "next/server";

// `/shifts` is intentionally public so visitors can see real opportunities
// before signing up. Applying still requires an authenticated account, which is
// enforced server-side on the apply route.
const protectedPrefixes = [
  "/dashboard",
  "/applications",
  "/my-shifts",
  "/assignments",
  "/earnings",
  "/profile",
  "/organizer",
  "/settings",
  "/onboarding",
];

export function middleware(request: NextRequest) {
  if (process.env.DEMO_AUTH === "true" || process.env.NEXT_PUBLIC_DEMO_AUTH === "true") {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const hasSession = Boolean(request.cookies.get("eventcrew_session")?.value);

  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix));

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/applications/:path*",
    "/my-shifts/:path*",
    "/assignments/:path*",
    "/earnings/:path*",
    "/onboarding/:path*",
    "/profile/:path*",
    "/organizer/:path*",
    "/settings/:path*",
  ],
};
