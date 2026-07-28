import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { SlaCountdown } from "@/components/SlaCountdown";

describe("SlaCountdown component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows ready status for ready readiness", () => {
    const now = new Date();
    render(
      <SlaCountdown readiness="ready" lastCheckedAt={now} slaHours={24} />
    );

    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("shows never checked when lastCheckedAt is null", () => {
    render(
      <SlaCountdown readiness="not_ready" lastCheckedAt={null} slaHours={24} />
    );

    expect(screen.getByText("Never checked")).toBeInTheDocument();
  });

  it("displays countdown for not-ready status", () => {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    render(
      <SlaCountdown readiness="not_ready" lastCheckedAt={hourAgo} slaHours={24} />
    );

    // Should display approximately 23 hours remaining
    const text = screen.getByText(/\d+h \d+m/);
    expect(text).toBeInTheDocument();
  });

  it("shows SLA expired message when deadline passed", () => {
    const now = new Date();
    const past = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago

    render(
      <SlaCountdown readiness="not_ready" lastCheckedAt={past} slaHours={24} />
    );

    expect(screen.getByText("SLA expired")).toBeInTheDocument();
  });

  it("shows urgent styling for less than 6 hours remaining", () => {
    const now = new Date();
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);

    render(
      <SlaCountdown
        readiness="not_ready"
        lastCheckedAt={fiveHoursAgo}
        slaHours={24}
      />
    );

    const text = screen.getByText(/\d+h \d+m/);
    expect(text.parentElement).toHaveClass("font-medium");
  });

  it("uses custom slaHours prop", () => {
    const now = new Date();
    const quarterHourAgo = new Date(now.getTime() - 15 * 60 * 1000);

    render(
      <SlaCountdown
        readiness="low_reserve"
        lastCheckedAt={quarterHourAgo}
        slaHours={1}
      />
    );

    // With 1 hour SLA and 15 minutes elapsed, should have ~45 minutes left
    const text = screen.getByText(/\d+h \d+m/);
    expect(text).toBeInTheDocument();
  });
});
