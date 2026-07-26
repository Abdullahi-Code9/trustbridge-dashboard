import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WavePrepWorkspace } from "./WavePrepWorkspace";
import type { ContributorRow } from "@/types";

describe("WavePrepWorkspace", () => {
  const mockContributors: ContributorRow[] = [
    {
      id: "1",
      githubUsername: "alice",
      stellarAddress: "GA1234567890ABCDEF",
      funded: true,
      trustlineReady: true,
      trustlineAuthorized: true,
      verified: true,
      xlmBalance: "100.5",
      spendableXlmBalance: "99.5",
      readiness: "ready",
      lastCheckedAt: "2026-07-25T10:00:00Z",
    },
    {
      id: "2",
      githubUsername: "bob",
      stellarAddress: "GB1234567890ABCDEF",
      funded: true,
      trustlineReady: true,
      trustlineAuthorized: true,
      verified: true,
      xlmBalance: "50.0",
      spendableXlmBalance: "1.0",
      readiness: "low_reserve",
      lastCheckedAt: "2026-07-24T10:00:00Z",
    },
    {
      id: "3",
      githubUsername: "charlie",
      stellarAddress: "GC1234567890ABCDEF",
      funded: false,
      trustlineReady: false,
      trustlineAuthorized: false,
      verified: false,
      xlmBalance: "0.0",
      spendableXlmBalance: "0.0",
      readiness: "not_ready",
      lastCheckedAt: null,
    },
  ];

  it("should render Wave prep workspace with title", () => {
    render(<WavePrepWorkspace contributors={mockContributors} />);
    expect(screen.getByText(/Wave Prep Workspace/i)).toBeInTheDocument();
  });

  it("should display correct stats", () => {
    render(<WavePrepWorkspace contributors={mockContributors} />);

    expect(screen.getByText("3")).toBeInTheDocument(); // total
    expect(screen.getByText(/Ready \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Low Reserve \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Not Ready \(1\)/i)).toBeInTheDocument();
  });

  it("should display wave number if provided", () => {
    render(
      <WavePrepWorkspace contributors={mockContributors} waveNumber={5} />
    );
    expect(screen.getByText("Wave 5 Prep Workspace")).toBeInTheDocument();
  });

  it("should filter contributors by readiness status", () => {
    render(<WavePrepWorkspace contributors={mockContributors} />);

    const lowReserveButton = screen.getByRole("button", {
      name: /Low Reserve/i,
    });

    fireEvent.click(lowReserveButton);

    // After clicking low reserve (toggle off), it should show fewer selected
    expect(screen.getByText(/Filtered: \d+ of 3/i)).toBeInTheDocument();
  });

  it("should call onExportCsv when export CSV is clicked", () => {
    const onExportCsv = vi.fn();
    render(
      <WavePrepWorkspace
        contributors={mockContributors}
        onExportCsv={onExportCsv}
      />
    );

    const csvButton = screen.getByRole("button", {
      name: /Export CSV/i,
    });

    fireEvent.click(csvButton);
    expect(onExportCsv).toHaveBeenCalled();
  });

  it("should call onExportJson when export JSON is clicked", () => {
    const onExportJson = vi.fn();
    render(
      <WavePrepWorkspace
        contributors={mockContributors}
        onExportJson={onExportJson}
      />
    );

    const jsonButton = screen.getByRole("button", {
      name: /Export JSON/i,
    });

    fireEvent.click(jsonButton);
    expect(onExportJson).toHaveBeenCalled();
  });

  it("should disable export buttons when isExporting is true", () => {
    render(
      <WavePrepWorkspace contributors={mockContributors} isExporting={true} />
    );

    const csvButton = screen.getByRole("button", {
      name: /Export CSV/i,
    }) as HTMLButtonElement;

    const jsonButton = screen.getByRole("button", {
      name: /Export JSON/i,
    }) as HTMLButtonElement;

    expect(csvButton.disabled).toBe(true);
    expect(jsonButton.disabled).toBe(true);
  });

  it("should disable export buttons when no contributors", () => {
    render(
      <WavePrepWorkspace contributors={[]} onExportCsv={() => {}} />
    );

    const csvButton = screen.getByRole("button", {
      name: /Export CSV/i,
    }) as HTMLButtonElement;

    expect(csvButton.disabled).toBe(true);
  });

  it("should show filtered count", () => {
    render(<WavePrepWorkspace contributors={mockContributors} />);
    expect(screen.getByText(/Filtered: 3 of 3/i)).toBeInTheDocument();
  });
});
