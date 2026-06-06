import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const isMaintainer = req.nextauth.token?.isMaintainer;

    if (req.nextUrl.pathname.startsWith("/dashboard") && !isMaintainer) {
      return NextResponse.redirect(new URL("/register?error=maintainer", req.url));
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
  matcher: ["/dashboard/:path*", "/register/:path*"],
};
