import type { SorobanEventRow, SorobanEventType } from "@/types";

/** Pure helpers — safe for client and server; no stellar-sdk. */

export type SorobanEventFilter = "all" | SorobanEventType;

export const SOROBAN_EVENT_FILTERS: readonly SorobanEventFilter[] = [
  "all",
  "contract",
  "system",
  "diagnostic",
];

export function filterSorobanEvents(
  events: SorobanEventRow[],
  filter: SorobanEventFilter
): SorobanEventRow[] {
  if (filter === "all") return [...events];
  return events.filter((event) => event.type === filter);
}

export function sortSorobanEventsByLedger(
  events: SorobanEventRow[],
  ascending = false
): SorobanEventRow[] {
  return [...events].sort((a, b) =>
    ascending ? a.ledger - b.ledger : b.ledger - a.ledger
  );
}
