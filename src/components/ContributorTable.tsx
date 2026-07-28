"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Download, Loader2, RefreshCw, Search, SlidersHorizontal } from "lucide-react";

import { TrustlineStatusBadge } from "@/components/TrustlineStatusBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SlaCountdown } from "@/components/SlaCountdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CONTRIBUTOR_COLUMNS,
  defaultVisibleColumns,
  filterContributors,
  searchContributors,
  sortContributors,
  type ContributorColumnKey,
  type ContributorFilter,
  type ContributorSortKey,
} from "@/lib/contributors";
import { buildCsv, buildCsvFilename, buildJson, buildJsonFilename, downloadCsv, downloadJson } from "@/lib/csv";
import { buildStalenessSummary, filterContributorsByDateRange } from "@/lib/stale-export";
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
  const [search, setSearch] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Set<ContributorColumnKey>>(
    defaultVisibleColumns
  );
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const staleSummary = useMemo(
    () => buildStalenessSummary(contributors),
    [contributors]
  );

  const filtered = useMemo(() => {
    const byFilter = filterContributors(contributors, filter);
    const bySearch = searchContributors(byFilter, search);
    return sortContributors(bySearch, sortKey, sortAsc);
  }, [contributors, filter, search, sortAsc, sortKey]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function toggleColumn(key: ContributorColumnKey) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const isVisible = (key: ContributorColumnKey) => visibleColumns.has(key);

  /** Total number of rendered data columns (not counting the Actions column). */
  const visibleCount = visibleColumns.size;

  function SortHeader({ sortable, label }: { sortable: SortKey; label: string }) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-stellar-cyan"
        onClick={() => toggleSort(sortable)}
      >
        {label}
        <ArrowUpDown className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search by username or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["ready", "✅ Ready"],
              ["low_reserve", "⚠️ Low reserve"],
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

        {/* Column picker trigger */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowColumnPicker((v) => !v)}
          aria-pressed={showColumnPicker}
          title="Toggle column visibility"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Columns
        </Button>

        {/* Export */}
        {onExport && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={staleSummary.stale ? "destructive" : "outline"}
              onClick={onExport}
              title={staleSummary.warning}
            >
              <Download className="h-4 w-4" />
              {staleSummary.stale ? "Export CSV (stale)" : "Export CSV"}
            </Button>
            <Button
              size="sm"
              variant={staleSummary.stale ? "destructive" : "outline"}
              onClick={() => exportContributorsJson(contributors, staleSummary.stale)}
              title={staleSummary.warning}
            >
              <Download className="h-4 w-4" />
              {staleSummary.stale ? "Export JSON (stale)" : "Export JSON"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Column picker panel ─────────────────────────────────── */}
      {showColumnPicker && (
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Toggle columns
          </p>
          <div className="flex flex-wrap gap-2">
            {CONTRIBUTOR_COLUMNS.map((col) => (
              <button
                key={col.key}
                type="button"
                onClick={() => toggleColumn(col.key)}
                className={cn(
                  "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
                  visibleColumns.has(col.key)
                    ? "border-stellar-purple bg-stellar-purple/10 text-stellar-purple"
                    : "border-muted bg-muted/30 text-muted-foreground"
                )}
              >
                {col.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Stale data warning ───────────────────────────────────── */}
      {staleSummary.stale && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-medium">⚠️ Stale data detected</p>
          <p className="mt-1">{staleSummary.warning}</p>
        </div>
      )}

      {/* ── Result summary ───────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground">
        {filtered.length === contributors.length
          ? `${contributors.length} contributor${contributors.length !== 1 ? "s" : ""}`
          : `${filtered.length} of ${contributors.length} contributors`}
        {search && ` matching "${search}"`}
      </p>

      {/* ── Table ────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[540px] text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              {isVisible("githubUsername") && (
                <th className="px-4 py-3 font-medium">
                  <SortHeader sortable="githubUsername" label="GitHub" />
                </th>
              )}
              {isVisible("stellarAddress") && (
                <th className="px-4 py-3 font-medium">Stellar address</th>
              )}
              {isVisible("readiness") && (
                <th className="px-4 py-3 font-medium">
                  <SortHeader sortable="readiness" label="Status" />
                </th>
              )}
              {isVisible("verified") && (
                <th className="px-4 py-3 font-medium">Verified</th>
              )}
              {isVisible("xlmBalance") && (
                <th className="px-4 py-3 font-medium">
                  <SortHeader sortable="xlmBalance" label="XLM" />
                </th>
              )}
              {isVisible("spendableXlmBalance") && (
                <th className="px-4 py-3 font-medium">Spendable XLM</th>
              )}
              {isVisible("lastCheckedAt") && (
                <th className="px-4 py-3 font-medium">
                  <SortHeader sortable="lastCheckedAt" label="Last checked" />
                </th>
              )}
              {onRecheck && (
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleCount + (onRecheck ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {search
                    ? `No contributors match "${search}".`
                    : "No contributors match this filter."}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className={cn("border-t bg-card/50", getRowAccent(row.readiness))}
                >
                  {isVisible("githubUsername") && (
                    <td className="px-4 py-3 font-medium">
                      {formatGithubHandle(row.githubUsername)}
                    </td>
                  )}
                  {isVisible("stellarAddress") && (
                    <td
                      className="px-4 py-3 font-mono text-xs"
                      title={row.stellarAddress}
                    >
                      {shortenAddress(row.stellarAddress)}
                    </td>
                  )}
                  {isVisible("readiness") && (
                    <td className="px-4 py-3">
                      <TrustlineStatusBadge status={row.readiness} />
                    </td>
                  )}
                  {isVisible("verified") && (
                    <td className="px-4 py-3">
                      <VerifiedBadge verified={row.verified} />
                    </td>
                  )}
                  {isVisible("xlmBalance") && (
                    <td className="px-4 py-3">{formatXlmBalance(row.xlmBalance)}</td>
                  )}
                  {isVisible("spendableXlmBalance") && (
                    <td className="px-4 py-3">
                      {formatXlmBalance(row.spendableXlmBalance)}
                    </td>
                  )}
                  {isVisible("lastCheckedAt") && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatRelativeTime(row.lastCheckedAt)}
                    </td>
                  )}
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

export function exportContributorsCsv(contributors: ContributorRow[], force = false, filterStale = false): boolean {
  const toExport = filterStale ? contributors.filter((c) => c.lastCheckedAt !== null && c.lastCheckedAt !== "") : contributors;
  const summary = buildStalenessSummary(contributors);

  if (summary.stale && !force && !filterStale) {
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
    "spendable_xlm_balance",
    "usdc_balance",
    "last_checked_at",
    "horizon_latency_ms",
  ];

  const rows = toExport.map((row) => [
    row.githubUsername,
    row.stellarAddress,
    row.readiness,
    row.funded,
    row.trustlineReady,
    row.trustlineAuthorized,
    row.verified,
    row.xlmBalance,
    row.spendableXlmBalance,
    row.usdcBalance,
    row.lastCheckedAt ?? "",
    row.horizonLatencyMs ?? "",
  ]);

  const csv = buildCsv(headers, rows);
  downloadCsv(buildCsvFilename("trustbridge-wave"), csv);
  return true;
}

export function exportContributorsJson(contributors: ContributorRow[], force = false, filterStale = false): boolean {
  const toExport = filterStale ? contributors.filter((c) => c.lastCheckedAt !== null && c.lastCheckedAt !== "") : contributors;
  const summary = buildStalenessSummary(contributors);

  if (summary.stale && !force && !filterStale) {
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
    "spendable_xlm_balance",
    "usdc_balance",
    "last_checked_at",
    "horizon_latency_ms",
  ];

  const rows = toExport.map((row) => [
    row.githubUsername,
    row.stellarAddress,
    row.readiness,
    row.funded,
    row.trustlineReady,
    row.trustlineAuthorized,
    row.verified,
    row.xlmBalance,
    row.spendableXlmBalance,
    row.usdcBalance,
    row.lastCheckedAt ?? "",
    row.horizonLatencyMs ?? "",
  ]);

  const json = buildJson(headers, rows);
  downloadJson(buildJsonFilename("trustbridge-wave"), json);
  return true;
}
