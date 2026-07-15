import "server-only";

import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

import { prisma } from "@/lib/prisma";

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
          const user = await prisma.user.upsert({
            where: { githubId },
            create: {
              githubId,
              githubUsername,
              name: githubProfile.name ?? null,
              email: githubProfile.email ?? null,
              image: githubProfile.image ?? null,
              accessToken: account.access_token ?? null,
            },
            update: {
              githubUsername,
              name: githubProfile.name ?? null,
              email: githubProfile.email ?? null,
              image: githubProfile.image ?? null,
              accessToken: account.access_token ?? null,
            },
          });

          token.sub = user.id;
          token.githubUsername = githubUsername;
          token.accessToken = account.access_token ?? undefined;

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
      session.accessToken = token.accessToken;
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
