import "server-only";

import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/token-crypto";
import { recordTokenAudit } from "@/lib/token-audit";

async function isOrgMember(accessToken: string, org: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.github.com/user/orgs?per_page=100", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) return false;

    const orgs = (await response.json()) as { login: string }[];
    return orgs.some(
      (entry) => entry.login.toLowerCase() === org.toLowerCase()
    );
  } catch {
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: "read:user user:email read:org",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "github" && profile) {
        const githubProfile = profile as {
          id?: string | number;
          login?: string;
          name?: string | null;
          email?: string | null;
          image?: string | null;
        };
        const githubId = githubProfile.id?.toString();
        const githubUsername = githubProfile.login;

        if (githubId && githubUsername) {
          // Access tokens are encrypted before they ever touch the database.
          // If TOKEN_ENCRYPTION_KEY is misconfigured we fail closed (store
          // nothing) rather than persist plaintext — see src/lib/token-crypto.ts.
          let encryptedAccessToken: string | null = null;
          if (account.access_token) {
            try {
              encryptedAccessToken = encryptToken(account.access_token);
            } catch (error) {
              console.error("Failed to encrypt GitHub access token", error);
            }
          }

          const user = await prisma.user.upsert({
            where: { githubId },
            create: {
              githubId,
              githubUsername,
              name: githubProfile.name ?? null,
              email: githubProfile.email ?? null,
              image: githubProfile.image ?? null,
              accessToken: encryptedAccessToken,
            },
            update: {
              githubUsername,
              name: githubProfile.name ?? null,
              email: githubProfile.email ?? null,
              image: githubProfile.image ?? null,
              accessToken: encryptedAccessToken,
            },
          });

          await recordTokenAudit(
            user.id,
            encryptedAccessToken
              ? "token_encrypted_at_signin"
              : "token_encryption_skipped",
            Boolean(encryptedAccessToken)
          );

          token.sub = user.id;
          token.githubUsername = githubUsername;

          // Intentionally not persisted on the JWT/session: the raw GitHub
          // access token must never reach the client. Server code that needs
          // it later should call getDecryptedGithubAccessToken(userId).
          const maintainerOrg = process.env.GITHUB_MAINTAINER_ORG?.trim();
          if (maintainerOrg && account.access_token) {
            token.isMaintainer = await isOrgMember(
              account.access_token,
              maintainerOrg
            );
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.githubUsername = token.githubUsername;
        session.user.isMaintainer = token.isMaintainer ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getSessionUserId(session: {
  user?: { id?: string };
}): Promise<string | null> {
  return session.user?.id ?? null;
}

/**
 * Decrypts a user's stored GitHub access token for server-side use only
 * (e.g. a future maintainer action that calls the GitHub API on the user's
 * behalf). Never call this from a route that returns data to the client.
 */
export async function getDecryptedGithubAccessToken(
  userId: string
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessToken: true },
  });

  if (!user?.accessToken) return null;

  try {
    const plaintext = decryptToken(user.accessToken);
    await recordTokenAudit(userId, "token_decrypted", true);
    return plaintext;
  } catch (error) {
    await recordTokenAudit(
      userId,
      "token_decrypt_failed",
      false,
      error instanceof Error ? error.message : "Unknown decrypt error"
    );
    return null;
  }
}
