import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/registrations", () => ({
  refreshAllContributors: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  recordAuditLog: vi.fn(),
}));

import { recordAuditLog } from "@/lib/audit";
import { refreshAllContributors } from "@/lib/registrations";
import {
  getContractSyncHealth,
  resetContractSyncState,
  syncContractToPostgres,
} from "@/lib/contract-sync";

const successSummary = {
  refreshed: 10,
  changed: 2,
  diffs: [],
  errors: [],
};

describe("contract-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetContractSyncState();
    delete process.env.CONTRACT_SYNC_MIN_INTERVAL_MS;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs a sync, records an audit log, and updates health on success", async () => {
    vi.mocked(refreshAllContributors).mockResolvedValue(successSummary);

    const result = await syncContractToPostgres();

    expect(result.status).toBe("ok");
    expect(result.summary).toEqual(successSummary);
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "contract.sync" })
    );
    expect(getContractSyncHealth()).toEqual(result);
  });

  it("never throws when refreshAllContributors fails, and records the error", async () => {
    vi.mocked(refreshAllContributors).mockRejectedValue(
      new Error("Horizon RPC outage")
    );

    const result = await syncContractToPostgres();

    expect(result.status).toBe("error");
    expect(result.error).toBe("Horizon RPC outage");
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "contract.sync",
        metadata: { error: "Horizon RPC outage" },
      })
    );
    expect(getContractSyncHealth()?.status).toBe("error");
  });

  it("rate-limits back-to-back triggers instead of re-hitting Horizon", async () => {
    process.env.CONTRACT_SYNC_MIN_INTERVAL_MS = "60000";
    vi.mocked(refreshAllContributors).mockResolvedValue(successSummary);

    const first = await syncContractToPostgres();
    const second = await syncContractToPostgres();

    expect(first.status).toBe("ok");
    expect(second.status).toBe("skipped");
    expect(refreshAllContributors).toHaveBeenCalledTimes(1);
  });
});
