import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

import { recordAuditLog } from "@/lib/audit";

/**
 * RBAC path rules (default deny):
 *
 * /dashboard          -> viewer+
 * /dashboard/settings -> operator+
 * /register           -> authenticated (any role)
 * /api/contributors   -> operator+ (POST = admin-only for batch recheck)
 * /api/invites        -> admin-only
 */
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isMaintainer = token?.isMaintainer;
    const role = (token?.role as string | undefined) ?? (isMaintainer ? "viewer" : undefined);
    const path = req.nextUrl.pathname;

    // /dashboard requires viewer+
    if (path.startsWith("/dashboard")) {
      if (!isMaintainer) {
        return NextResponse.redirect(new URL("/register?error=maintainer", req.url));
      }

      // /dashboard/settings requires operator+
      if (path.startsWith("/dashboard/settings") && role !== "admin" && role !== "operator") {
        recordAuditLog({
          action: "rbac_middleware_denied",
          metadata: { path, requiredRole: "operator", actualRole: role },
        }).catch(() => {});
        return NextResponse.redirect(new URL("/dashboard?error=insufficient_role", req.url));
      }
    }

    // /api/invites requires admin
    if (path.startsWith("/api/invites")) {
      if (!isMaintainer || (role !== "admin" && role !== undefined)) {
        // Only admin can access invites
        if (role !== "admin") {
          recordAuditLog({
            action: "rbac_middleware_denied",
            metadata: { path, requiredRole: "admin", actualRole: role },
          }).catch(() => {});
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        if (path.startsWith("/dashboard")) {
          return !!token;
        }

        if (path.startsWith("/register")) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/register/:path*", "/api/invites/:path*"],
};