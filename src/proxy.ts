import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE_NAME = "accessToken";
const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/password-reset/request",
  "/password-reset/new",
]);
const AUTH_HOME_REDIRECT_PATHS = new Set(["/", "/guest-start"]);
const PUBLIC_FILE = /\.(.*)$/;

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function isProxyExcludedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname === "/api" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/images/") ||
    PUBLIC_FILE.test(pathname)
  );
}

export function proxy(request: NextRequest) {
  const pathname = normalizePathname(request.nextUrl.pathname);

  if (isProxyExcludedPath(pathname)) {
    return NextResponse.next();
  }

  const hasAccessToken = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE_NAME));
  if (!hasAccessToken && !PUBLIC_PATHS.has(pathname) && !AUTH_HOME_REDIRECT_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|images).*)"],
};
