import { describe, expect, it } from "vitest";

import { filterSorobanEvents, sortSorobanEventsByLedger } from "@/lib/soroban-events";
import type { SorobanEventRow } from "@/types";

function makeEvent(overrides: Partial<SorobanEventRow>): SorobanEventRow {
  return {
    id: "1",
    type: "contract",
    ledger: 100,
    ledgerClosedAt: "2026-07-24T00:00:00Z",
    contractId: "CCONTRACT",
    topic: ["registered"],
    value: "hello",
    txHash: "abc",
    ...overrides,
  };
}

describe("filterSorobanEvents", () => {
  const events = [
    makeEvent({ id: "1", type: "contract" }),
    makeEvent({ id: "2", type: "system" }),
    makeEvent({ id: "3", type: "diagnostic" }),
  ];

  it("returns every event for the 'all' filter (success path)", () => {
    expect(filterSorobanEvents(events, "all")).toHaveLength(3);
  });

  it("returns only matching events for a specific type", () => {
    const filtered = filterSorobanEvents(events, "system");
    expect(filtered.map((e) => e.id)).toEqual(["2"]);
  });

  it("returns an empty array when nothing matches (failure path)", () => {
    const filtered = filterSorobanEvents(
      [makeEvent({ id: "1", type: "contract" })],
      "diagnostic"
    );
    expect(filtered).toEqual([]);
  });
});

describe("sortSorobanEventsByLedger", () => {
  const events = [
    makeEvent({ id: "old", ledger: 10 }),
    makeEvent({ id: "new", ledger: 30 }),
    makeEvent({ id: "mid", ledger: 20 }),
  ];

  it("sorts newest ledger first by default", () => {
    expect(sortSorobanEventsByLedger(events).map((e) => e.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("sorts oldest ledger first when ascending", () => {
    expect(
      sortSorobanEventsByLedger(events, true).map((e) => e.id)
    ).toEqual(["old", "mid", "new"]);
  });
});
