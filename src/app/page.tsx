import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Shield,
  Wallet,
  Zap,
} from "lucide-react";

import { GitHubIcon } from "@/components/icons/GitHubIcon";

import { WaveReadinessBar } from "@/components/WaveReadinessBar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getDashboardStats } from "@/lib/registrations";

export const dynamic = "force-dynamic";

async function loadStats() {
  try {
    return await getDashboardStats();
  } catch {
    return { totalContributors: 0, readyCount: 0, readyPercent: 0 };
  }
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const stats = await loadStats();

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-stellar-purple/20 blur-3xl" />
        <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-stellar-cyan/15 blur-3xl" />
      </div>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex items-center rounded-full border border-stellar-cyan/30 bg-stellar-cyan/10 px-3 py-1 text-xs font-medium text-stellar-cyan">
            Open source · Stellar · GitHub OAuth
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Bridge open-source work to{" "}
            <span className="bg-stellar-gradient bg-clip-text text-transparent">
              Stellar payouts
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            TrustBridge solves the{" "}
            <strong className="text-foreground">PAYMENT_NO_TRUST</strong>{" "}
            problem: maintainers need a verified mapping from GitHub contributors
            to funded Stellar accounts with the correct USDC trustline before a
            Wave payout can succeed.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {session ? (
              <Button asChild size="lg" variant="stellar">
                <Link href="/register">
                  Register your Stellar address
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" variant="stellar">
                <Link href="/api/auth/signin?callbackUrl=/register">
                  <GitHubIcon className="h-4 w-4" />
                  Register your Stellar address
                </Link>
              </Button>
            )}
            {session?.user?.isMaintainer && (
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard">Maintainer dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:grid-cols-3 sm:px-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Registered contributors</CardDescription>
              <CardTitle className="text-3xl">{stats.totalContributors}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ready for payout</CardDescription>
              <CardTitle className="text-3xl">{stats.readyPercent}%</CardTitle>
            </CardHeader>
            <CardContent>
              <WaveReadinessBar
                readyCount={stats.readyCount}
                totalCount={stats.totalContributors}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Validation</CardDescription>
              <CardTitle className="text-lg">Live Horizon checks</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Trustline, funding, and XLM reserve verified on every registration.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold">How TrustBridge works</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          A lightweight registry plus Horizon validation so Wave maintainers never
          send USDC to accounts that cannot receive it.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Code2,
              title: "Sign in with GitHub",
              body: "Contributors authenticate with GitHub OAuth. Your handle is the payout identity.",
            },
            {
              icon: Wallet,
              title: "Register G-address",
              body: "Submit your Stellar public key. We validate format and query Horizon in real time.",
            },
            {
              icon: Shield,
              title: "Trustline readiness",
              body: "We confirm USDC trustline, account funding, and minimum XLM reserve.",
            },
            {
              icon: Zap,
              title: "Wave-ready export",
              body: "Maintainers batch re-check accounts and export CSV for payout preparation.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title} className="border-stellar-purple/10">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-stellar-purple/10 text-stellar-purple">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <CheckCircle2 className="mx-auto h-10 w-10 text-stellar-cyan" />
          <h2 className="mt-4 text-2xl font-bold">Ready to join the Wave?</h2>
          <p className="mt-2 text-muted-foreground">
            Registration takes less than two minutes once your Stellar wallet is
            funded and your USDC trustline is active.
          </p>
          <Button asChild className="mt-6" variant="stellar" size="lg">
            <Link href={session ? "/register" : "/api/auth/signin?callbackUrl=/register"}>
              Get started
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
