import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Routes that do NOT require authentication.
 * All other routes under /dashboard, /api/vendors, /api/baas, /api/audit
 * are protected and require a valid session.
 */
const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/sign",
  "/api/health",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

function isProtectedPath(pathname: string): boolean {
  const protectedPrefixes = [
    "/dashboard",
    "/api/vendors",
    "/api/baas",
    "/api/audit",
    "/api/chat",
    "/api/tts",
  ];
  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Allow public routes through
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Only protect specific route prefixes
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      // For API routes, return 401 JSON
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }

      // For page routes, redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch {
    // If token validation fails, treat as unauthenticated
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/vendors/:path*",
    "/api/baas/:path*",
    "/api/audit/:path*",
    "/api/chat/:path*",
    "/api/tts/:path*",
  ],
};
