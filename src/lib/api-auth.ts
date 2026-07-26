import "server-only";

import { getServerSession, type Session } from "next-auth";

import { authOptions } from "@/lib/auth";

/**
 * Return the current session only when the user is a maintainer, otherwise
 * `null`. Shared by every maintainer-only API route.
 */
export async function requireMaintainerSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMaintainer) {
    return null;
  }
  return session;
}

/**
 * Refresh the maintainer session. This re‑evaluates the current server session
 * and returns it if the user is still a maintainer. It can be used by UI
 * components or API routes that need to ensure the maintainer flag is up‑to‑date
 * without forcing the user to re‑login.
 */
export async function refreshMaintainerSession(): Promise<Session | null> {
  // Calling getServerSession triggers NextAuth's session validation, which
  // refreshes the JWT if it is close to expiry.
  const session = await getServerSession(authOptions);
  if (session?.user?.isMaintainer) {
    return session;
  }
  return null;
}
