import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/csv", async () => {
  const actual = await vi.importActual<typeof import("@/lib/csv")>(
    "@/lib/csv"
  );

  return {
    ...actual,
    buildCsvFilename: vi.fn(() => "trustbridge-wave-2026-07-26.csv"),
    downloadCsv: vi.fn(),
  };
});

import {
  ContributorTable,
  exportContributorsCsv,
} from "@/components/ContributorTable";
import { downloadCsv } from "@/lib/csv";
import type { ContributorRow } from "@/types";

describe("ContributorTable", () => {
  const contributors: ContributorRow[] = [
    {
      id: "row-1",
      githubUsername: "alice",
      stellarAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      funded: true,
      trustlineReady: true,
      trustlineAuthorized: true,
      verified: true,
      xlmBalance: "10",
      spendableXlmBalance: "8",
      readiness: "ready",
      lastCheckedAt: "2026-07-26T09:00:00.000Z",
    },
    {
      id: "row-2",
      githubUsername: "bob",
      stellarAddress: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      funded: true,
      trustlineReady: false,
      trustlineAuthorized: false,
      verified: false,
      xlmBalance: "2",
      spendableXlmBalance: "0.2",
      readiness: "not_ready",
      lastCheckedAt: "2026-07-26T09:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders accessible table controls and row diagnostics", () => {
    render(<ContributorTable contributors={contributors} />);

    expect(
      screen.getByLabelText(/Search contributors by GitHub username or Stellar address/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Contributor payout readiness table with per-row Horizon debug details/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText("Horizon debug").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("columnheader", { name: /GitHub/i })
    ).toHaveAttribute("aria-sort", "ascending");
  });

  it("exports derived proof and horizon debug details", () => {
    const exported = exportContributorsCsv(contributors, true);

    expect(exported).toBe(true);
    expect(downloadCsv).toHaveBeenCalledTimes(1);
    expect(vi.mocked(downloadCsv).mock.calls[0][1]).toContain(
      "TrustBridge Freighter ownership proof"
    );
    expect(vi.mocked(downloadCsv).mock.calls[0][1]).toContain(
      "Required USDC trustline is missing."
    );
  });
});
