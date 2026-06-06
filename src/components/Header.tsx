"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { LayoutDashboard, Moon, Sun, UserPlus } from "lucide-react";
import { useTheme } from "next-themes";

import { GitHubIcon } from "@/components/icons/GitHubIcon";

import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-stellar-purple to-stellar-cyan text-sm text-white">
            TB
          </span>
          <span>TrustBridge</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <Link
            href="/register"
            className="text-muted-foreground hover:text-foreground"
          >
            Register
          </Link>
          {session?.user?.isMaintainer && (
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {session ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                @{session.user.githubUsername}
              </span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          ) : (
            <Button
              variant="stellar"
              size="sm"
              onClick={() => signIn("github", { callbackUrl: "/register" })}
            >
              <GitHubIcon className="h-4 w-4" />
              Sign in with GitHub
            </Button>
          )}

          {session && (
            <Button asChild variant="cyan" size="sm" className="hidden sm:inline-flex">
              <Link href="/register">
                <UserPlus className="h-4 w-4" />
                Register
              </Link>
            </Button>
          )}

          {session?.user?.isMaintainer && (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
