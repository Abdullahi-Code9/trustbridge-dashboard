import "server-only";

import { rpc, scValToNative } from "stellar-sdk";

import type { SorobanEventRow, SorobanEventTimelineResponse } from "@/types";

const DEFAULT_SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
// ~7 hours of ledgers at a 5s close time — comfortably inside RPC event
// retention windows while still giving the timeline a meaningful range.
const DEFAULT_LEDGER_WINDOW = 5_000;
const DEFAULT_EVENT_LIMIT = 50;

function getSorobanRpcUrl(): string {
  return process.env.SOROBAN_RPC_URL?.trim() || DEFAULT_SOROBAN_RPC_URL;
}

function safeScValToNative(value: unknown): string {
  try {
    const native = scValToNative(value as never);
    return typeof native === "string" ? native : JSON.stringify(native);
  } catch {
    return "<undecodable>";
  }
}

/**
 * Fetches recent Soroban contract events for the configured registry
 * contract. Returns an empty, error-annotated result (never throws) so the
 * dashboard panel can render a clear message on outages, rate limits, or
 * missing configuration instead of crashing the page.
 */
export async function getSorobanEventTimeline(): Promise<SorobanEventTimelineResponse> {
  const contractId = process.env.SOROBAN_CONTRACT_ID?.trim();

  if (!contractId) {
    return {
      events: [],
      latestLedger: 0,
      errors: ["SOROBAN_CONTRACT_ID is not configured"],
    };
  }

  try {
    const server = new rpc.Server(getSorobanRpcUrl());
    const latest = await server.getLatestLedger();
    const startLedger = Math.max(
      latest.sequence - DEFAULT_LEDGER_WINDOW,
      1
    );

    const response = await server.getEvents({
      startLedger,
      filters: [{ type: undefined, contractIds: [contractId] }],
      limit: DEFAULT_EVENT_LIMIT,
    });

    const events: SorobanEventRow[] = response.events.map((event) => ({
      id: event.id,
      type: event.type,
      ledger: event.ledger,
      ledgerClosedAt: event.ledgerClosedAt,
      contractId: event.contractId?.contractId?.() ?? contractId,
      topic: event.topic.map(safeScValToNative),
      value: safeScValToNative(event.value),
      txHash: event.txHash,
    }));

    return { events, latestLedger: response.latestLedger, errors: [] };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Soroban RPC error";
    return {
      events: [],
      latestLedger: 0,
      errors: [`Soroban RPC error: ${message}`],
    };
  }
}
