"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Download, Loader2, RefreshCw } from "lucide-react";

import { TrustlineStatusBadge } from "@/components/TrustlineStatusBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SlaCountdown } from "@/components/SlaCountdown";
import { Button } from "@/components/ui/button";
import {
  filterContributors,
  sortContributors,
  type ContributorFilter,
  type ContributorSortKey,
} from "@/lib/contributors";
import { buildCsv, buildCsvFilename, downloadCsv } from "@/lib/csv";
import { buildStalenessSummary } from "@/lib/stale-export";
import { getRowAccent } from "@/lib/readiness";
import { cn, formatGithubHandle, formatRelativeTime, formatXlmBalance, shortenAddress } from "@/lib/utils";
import type { ContributorRow } from "@/types";

type FilterOption = ContributorFilter;
type SortKey = ContributorSortKey;

interface ContributorTableProps {
  contributors: ContributorRow[];
  onExport?: () => void;
  /** Re-check a single contributor via Horizon (maintainer action). */
  onRecheck?: (id: string) => void;
  /** Id of the contributor currently being re-checked, if any. */
  recheckingId?: string | null;
  className?: string;
}

export function ContributorTable({
  contributors,
  onExport,
  onRecheck,
  recheckingId,
  className,
}: ContributorTableProps) {
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sortKey, setSortKey] = useState<SortKey>("githubUsername");
  const [sortAsc, setSortAsc] = useState(true);

  const staleSummary = useMemo(
    () => buildStalenessSummary(contributors),
    [contributors]
  );

  const filtered = useMemo(() => {
    const rows = filterContributors(contributors, filter);
    return sortContributors(rows, sortKey, sortAsc);
  }, [contributors, filter, sortAsc, sortKey]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["ready", "✅ Ready"],
              ["needs_attention", "❌ Needs attention"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? "stellar" : "outline"}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        {onExport && (
          <Button
            size="sm"
            variant={staleSummary.stale ? "destructive" : "outline"}
            onClick={onExport}
            title={staleSummary.warning}
          >
            <Download className="h-4 w-4" />
            {staleSummary.stale ? "Export CSV (stale)" : "Export CSV"}
          </Button>
        )}
      </div>

      {staleSummary.stale && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-medium">⚠️ Stale data detected</p>
          <p className="mt-1">{staleSummary.warning}</p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-stellar-cyan"
                  onClick={() => toggleSort("githubUsername")}
                >
                  GitHub
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="px-4 py-3 font-medium">Stellar address</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Verified</th>
              <th className="px-4 py-3 font-medium">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-stellar-cyan"
                  onClick={() => toggleSort("xlmBalance")}
                >
                  XLM
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="px-4 py-3 font-medium">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-stellar-cyan"
                  onClick={() => toggleSort("lastCheckedAt")}
                >
                  Last checked
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="px-4 py-3 font-medium">SLA countdown</th>
              {onRecheck && (
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={onRecheck ? 8 : 7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No contributors match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className={cn("border-t bg-card/50", getRowAccent(row.readiness))}
                >
                  <td className="px-4 py-3 font-medium">{formatGithubHandle(row.githubUsername)}</td>
                  <td className="px-4 py-3 font-mono text-xs" title={row.stellarAddress}>
                    {shortenAddress(row.stellarAddress)}
                  </td>
                  <td className="px-4 py-3">
                    <TrustlineStatusBadge status={row.readiness} />
                  </td>
                  <td className="px-4 py-3">
                    <VerifiedBadge verified={row.verified} />
                  </td>
                  <td className="px-4 py-3">{formatXlmBalance(row.xlmBalance)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatRelativeTime(row.lastCheckedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <SlaCountdown
                      readiness={row.readiness}
                      lastCheckedAt={row.lastCheckedAt ? new Date(row.lastCheckedAt) : null}
                      slaHours={24}
                    />
                  </td>
                  {onRecheck && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRecheck(row.id)}
                        disabled={recheckingId === row.id}
                        title="Re-check this contributor via Horizon"
                      >
                        {recheckingId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Re-check
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function exportContributorsCsv(contributors: ContributorRow[], force = false): boolean {
  const summary = buildStalenessSummary(contributors);

  if (summary.stale && !force) {
    const confirmed = window.confirm(
      `${summary.warning}\n\nDo you want to export anyway?`
    );
    if (!confirmed) return false;
  }

  const headers = [
    "github_username",
    "stellar_address",
    "readiness",
    "funded",
    "trustline",
    "trustline_authorized",
    "verified",
    "xlm_balance",
    "last_checked_at",
    "spendable_xlm_balance",
  ];

  const rows = contributors.map((row) => [
    row.githubUsername,
    row.stellarAddress,
    row.readiness,
    row.funded,
    row.trustlineReady,
    row.trustlineAuthorized,
    row.verified,
    row.xlmBalance,
    row.lastCheckedAt ?? "",
    row.spendableXlmBalance,
  ]);

  const csv = buildCsv(headers, rows);
  downloadCsv(buildCsvFilename("trustbridge-wave"), csv);
  return true;
}
