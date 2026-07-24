import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSorobanEventTimeline } from "@/lib/soroban";

const mockGetLatestLedger = vi.fn();
const mockGetEvents = vi.fn();

vi.mock("stellar-sdk", () => ({
  rpc: {
    Server: vi.fn().mockImplementation(function MockServer(this: {
      getLatestLedger: typeof mockGetLatestLedger;
      getEvents: typeof mockGetEvents;
    }) {
      this.getLatestLedger = mockGetLatestLedger;
      this.getEvents = mockGetEvents;
    }),
  },
  scValToNative: vi.fn((value: unknown) => value),
}));

const ORIGINAL_CONTRACT_ID = process.env.SOROBAN_CONTRACT_ID;
const ORIGINAL_RPC_URL = process.env.SOROBAN_RPC_URL;

describe("getSorobanEventTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SOROBAN_CONTRACT_ID = "CCONTRACT";
    delete process.env.SOROBAN_RPC_URL;
  });

  afterEach(() => {
    process.env.SOROBAN_CONTRACT_ID = ORIGINAL_CONTRACT_ID;
    process.env.SOROBAN_RPC_URL = ORIGINAL_RPC_URL;
  });

  it("returns mapped events and latest ledger on success", async () => {
    mockGetLatestLedger.mockResolvedValue({ sequence: 10_000 });
    mockGetEvents.mockResolvedValue({
      latestLedger: 10_000,
      events: [
        {
          id: "evt-1",
          type: "contract",
          ledger: 9_999,
          ledgerClosedAt: "2026-07-24T00:00:00Z",
          contractId: { contractId: () => "CCONTRACT" },
          topic: ["registered"],
          value: "hello",
          txHash: "tx-1",
        },
      ],
    });

    const result = await getSorobanEventTimeline();

    expect(result.errors).toEqual([]);
    expect(result.latestLedger).toBe(10_000);
    expect(result.events).toEqual([
      {
        id: "evt-1",
        type: "contract",
        ledger: 9_999,
        ledgerClosedAt: "2026-07-24T00:00:00Z",
        contractId: "CCONTRACT",
        topic: ["registered"],
        value: "hello",
        txHash: "tx-1",
      },
    ]);
  });

  it("returns an empty, error-annotated result when SOROBAN_CONTRACT_ID is unset (edge case: invalid env configuration)", async () => {
    delete process.env.SOROBAN_CONTRACT_ID;

    const result = await getSorobanEventTimeline();

    expect(result).toEqual({
      events: [],
      latestLedger: 0,
      errors: ["SOROBAN_CONTRACT_ID is not configured"],
    });
    expect(mockGetLatestLedger).not.toHaveBeenCalled();
  });

  it("never throws and returns an error entry when the RPC call fails (edge case: outage or rate limit)", async () => {
    mockGetLatestLedger.mockRejectedValue(new Error("503 Service Unavailable"));

    const result = await getSorobanEventTimeline();

    expect(result.events).toEqual([]);
    expect(result.latestLedger).toBe(0);
    expect(result.errors).toEqual([
      "Soroban RPC error: 503 Service Unavailable",
    ]);
  });
});
