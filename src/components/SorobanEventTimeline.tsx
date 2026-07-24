"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildCsv, buildCsvFilename, downloadCsv } from "@/lib/csv";
import {
  filterSorobanEvents,
  sortSorobanEventsByLedger,
  SOROBAN_EVENT_FILTERS,
  type SorobanEventFilter,
} from "@/lib/soroban-events";
import { cn, formatRelativeTime, shortenAddress } from "@/lib/utils";
import type { SorobanEventRow } from "@/types";

interface SorobanEventTimelineProps {
  events: SorobanEventRow[];
  errors?: string[];
  className?: string;
}

const FILTER_LABELS: Record<SorobanEventFilter, string> = {
  all: "All",
  contract: "Contract",
  system: "System",
  diagnostic: "Diagnostic",
};

const TYPE_BADGE_VARIANT: Record<
  SorobanEventRow["type"],
  "ready" | "warning" | "secondary"
> = {
  contract: "ready",
  system: "secondary",
  diagnostic: "warning",
};

export function SorobanEventTimeline({
  events,
  errors = [],
  className,
}: SorobanEventTimelineProps) {
  const [filter, setFilter] = useState<SorobanEventFilter>("all");

  const filtered = useMemo(() => {
    const rows = filterSorobanEvents(events, filter);
    return sortSorobanEventsByLedger(rows);
  }, [events, filter]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {SOROBAN_EVENT_FILTERS.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? "stellar" : "outline"}
              onClick={() => setFilter(value)}
            >
              {FILTER_LABELS[value]}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={filtered.length === 0}
          onClick={() => exportSorobanEventsCsv(filtered)}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {errors.length > 0 && (
        <ul className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errors.map((error) => (
            <li key={error}>• {error}</li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Ledger</th>
              <th className="px-4 py-3 font-medium">Contract</th>
              <th className="px-4 py-3 font-medium">Topic</th>
              <th className="px-4 py-3 font-medium">Closed</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {errors.length > 0
                    ? "No events available."
                    : "No Soroban events match this filter."}
                </td>
              </tr>
            ) : (
              filtered.map((event) => (
                <tr key={event.id} className="border-t bg-card/50">
                  <td className="px-4 py-3">
                    <Badge variant={TYPE_BADGE_VARIANT[event.type]}>
                      {event.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{event.ledger}</td>
                  <td
                    className="px-4 py-3 font-mono text-xs"
                    title={event.contractId}
                  >
                    {shortenAddress(event.contractId)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {event.topic.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatRelativeTime(event.ledgerClosedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function exportSorobanEventsCsv(events: SorobanEventRow[]): void {
  const headers = [
    "id",
    "type",
    "ledger",
    "ledger_closed_at",
    "contract_id",
    "topic",
    "value",
    "tx_hash",
  ];

  const rows = events.map((event) => [
    event.id,
    event.type,
    event.ledger,
    event.ledgerClosedAt,
    event.contractId,
    event.topic.join(" | "),
    event.value,
    event.txHash,
  ]);

  const csv = buildCsv(headers, rows);
  downloadCsv(buildCsvFilename("trustbridge-soroban-events"), csv);
}
