import "server-only";

import { recordAuditLog } from "@/lib/audit";
import { StructuredLogger } from "@/lib/logger";
import { refreshAllContributors, type RefreshAllSummary } from "@/lib/registrations";

const logger = new StructuredLogger("contract-sync");

export type ContractSyncStatus = "ok" | "error" | "skipped";

export interface ContractSyncResult {
  status: ContractSyncStatus;
  startedAt: string;
  durationMs: number;
  summary?: RefreshAllSummary;
  error?: string;
}

let lastRunAt: number | null = null;
let lastResult: ContractSyncResult | null = null;

function getMinIntervalMs(): number {
  const parsed = Number.parseInt(
    process.env.CONTRACT_SYNC_MIN_INTERVAL_MS ?? "60000",
    10
  );
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 60000;
}

/**
 * Re-syncs Postgres registration state against Horizon-verified
 * funded/trustline/balance state, so contributor data does not silently
 * drift stale between maintainer-triggered rechecks — intended to be
 * driven by a scheduler (e.g. Vercel Cron) rather than a person.
 *
 * Rate-limited (`CONTRACT_SYNC_MIN_INTERVAL_MS`) so an over-eager
 * scheduler or retry storm can't fan out into repeated full-table Horizon
 * sweeps. Never throws: Horizon/RPC outages and DB errors are caught and
 * returned as a result so a cron trigger never surfaces a 500.
 */
export async function syncContractToPostgres(): Promise<ContractSyncResult> {
  const now = Date.now();
  const minIntervalMs = getMinIntervalMs();

  if (lastRunAt !== null && now - lastRunAt < minIntervalMs) {
    logger.info("sync_skipped_rate_limited", {
      msSinceLastRun: now - lastRunAt,
      minIntervalMs,
    });
    return {
      status: "skipped",
      startedAt: new Date(now).toISOString(),
      durationMs: 0,
    };
  }

  lastRunAt = now;
  const startedAt = new Date(now).toISOString();
  logger.info("sync_started", { startedAt });

  try {
    const summary = await refreshAllContributors();
    const durationMs = Date.now() - now;

    logger.info("sync_completed", {
      refreshed: summary.refreshed,
      changed: summary.changed,
      errorCount: summary.errors.length,
      durationMs,
    });

    await recordAuditLog({
      action: "contract.sync",
      metadata: {
        refreshed: summary.refreshed,
        changed: summary.changed,
        errorCount: summary.errors.length,
      },
    });

    lastResult = { status: "ok", startedAt, durationMs, summary };
    return lastResult;
  } catch (error) {
    const durationMs = Date.now() - now;
    const message =
      error instanceof Error ? error.message : "Unknown sync error";

    logger.error("sync_failed", { error: message, durationMs });

    await recordAuditLog({
      action: "contract.sync",
      metadata: { error: message },
    });

    lastResult = { status: "error", startedAt, durationMs, error: message };
    return lastResult;
  }
}

/** Last sync outcome, for the health endpoint. Never triggers a new run. */
export function getContractSyncHealth(): ContractSyncResult | null {
  return lastResult;
}

/** Test-only: reset in-memory rate-limit/health state between test runs. */
export function resetContractSyncState(): void {
  lastRunAt = null;
  lastResult = null;
}
