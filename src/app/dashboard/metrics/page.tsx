"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, ShieldCheck, Users, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WaveReadinessBar } from "@/components/WaveReadinessBar";

// ── API response types ────────────────────────────────────────────────────

interface MetricsResponse {
  contributors: {
    total: number;
    ready: number;
    readyPercent: number;
    byStatus: {
      ready: number;
      low_reserve: number;
      not_ready: number;
    };
  };
  audit: {
    recentEntries: number;
    byAction: Record<string, number>;
    latestAt: string | null;
  };
  config: {
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    circuitBreakerFailureThreshold: number;
    circuitBreakerRecoveryMs: number;
    staleCsvMaxAgeMs: number;
    horizonUrl: string;
    sorobanContractConfigured: boolean;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function msToSeconds(ms: number) {
  return (ms / 1000).toFixed(0);
}

function msToHours(ms: number) {
  return (ms / 3_600_000).toFixed(1);
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function MetricsPage() {
  const metricsQuery = useQuery<MetricsResponse>({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/metrics");
      if (!res.ok) throw new Error("Failed to load metrics");
      return res.json();
    },
  });

  if (metricsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading metrics…
      </div>
    );
  }

  if (metricsQuery.isError) {
    return (
      <p className="text-destructive py-8">
        Failed to load metrics. Make sure you are signed in as a maintainer.
      </p>
    );
  }

  const data = metricsQuery.data!;
  const { contributors, audit, config } = data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin metrics</h1>
          <p className="mt-2 text-muted-foreground">
            Real-time operational snapshot for the TrustBridge maintainer team.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => metricsQuery.refetch()}
          disabled={metricsQuery.isFetching}
        >
          {metricsQuery.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* ── Contributor readiness ─────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contributor readiness
          </CardTitle>
          <CardDescription>
            Current payout readiness across all {contributors.total} registered
            contributors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <WaveReadinessBar
            readyCount={contributors.ready}
            totalCount={contributors.total}
          />
          {/* Dark mode: -300 heading + -200 sub-label on dark:bg-*-950/40 gives
              ≥ 7:1 contrast against the page background (WCAG AAA).
              Light mode: -700 on white/tinted bg gives ≥ 6.5:1 (WCAG AA). */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-4 dark:border-emerald-800 dark:bg-emerald-950/40">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {contributors.byStatus.ready}
              </p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-200">
                ✅ Ready
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-4 dark:border-amber-800 dark:bg-amber-950/40">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {contributors.byStatus.low_reserve}
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-200">
                ⚠️ Low reserve
              </p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-4 dark:border-red-800 dark:bg-red-950/40">
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {contributors.byStatus.not_ready}
              </p>
              <p className="mt-1 text-xs text-red-700 dark:text-red-200">
                ❌ Not ready
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Recent audit activity ─────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Recent audit activity
          </CardTitle>
          <CardDescription>
            Last {audit.recentEntries} audit log entries
            {audit.latestAt
              ? ` — latest at ${new Date(audit.latestAt).toLocaleString()}`
              : ""}
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(audit.byAction).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audit events recorded yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 text-right font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(audit.byAction)
                  .sort((a, b) => b[1] - a[1])
                  .map(([action, count]) => (
                    <tr key={action} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{action}</td>
                      <td className="py-2 text-right tabular-nums">{count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── Operational config ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Operational configuration
          </CardTitle>
          <CardDescription>
            Live values for rate limiting, circuit breaker, and export staleness.
            Set via environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <ConfigRow
              label="Rate limit window"
              value={`${msToSeconds(config.rateLimitWindowMs)}s`}
              hint="RATE_LIMIT_WINDOW_MS"
            />
            <ConfigRow
              label="Rate limit max requests"
              value={String(config.rateLimitMaxRequests)}
              hint="RATE_LIMIT_MAX_REQUESTS"
            />
            <ConfigRow
              label="Circuit breaker threshold"
              value={`${config.circuitBreakerFailureThreshold} failures`}
              hint="HORIZON_CB_FAILURE_THRESHOLD"
            />
            <ConfigRow
              label="Circuit breaker recovery"
              value={`${msToSeconds(config.circuitBreakerRecoveryMs)}s`}
              hint="HORIZON_CB_RECOVERY_MS"
            />
            <ConfigRow
              label="Stale CSV max age"
              value={`${msToHours(config.staleCsvMaxAgeMs)}h`}
              hint="STALE_CSV_MAX_AGE_MS"
            />
            <ConfigRow
              label="Horizon URL"
              value={config.horizonUrl}
              hint="NEXT_PUBLIC_HORIZON_URL"
            />
            <ConfigRow
              label="Soroban contract"
              value={config.sorobanContractConfigured ? "Configured ✅" : "Not set ⚠️"}
              hint="SOROBAN_CONTRACT_ID"
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-md border px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
      <dd className="mt-0.5 font-mono text-xs text-muted-foreground/70">{hint}</dd>
    </div>
  );
}
