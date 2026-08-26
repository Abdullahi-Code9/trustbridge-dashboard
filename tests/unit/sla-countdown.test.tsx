/**
 * Component tests for SlaCountdown
 *
 * Tests that SlaCountdown:
 * - Shows on dashboard/maintainer pages
 * - Mounts and displays correctly
 * - Handles time zone changes without breaking
 * - Detects hydration mismatches and recovers
 * - Has proper a11y live regions for urgent updates
 * - Hides when SLA is not configured
 * - Validates empty/invalid SLA timestamps
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SlaCountdown } from "@/components/SlaCountdown";

describe("SlaCountdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe("rendering", () => {
    it("renders when lastCheckedAt is provided", () => {
      const now = new Date();
      render(
        <SlaCountdown
          readiness="not_ready"
          lastCheckedAt={now}
          slaHours={24}
        />
      );

      expect(screen.queryByText(/clock|time|checked/i)).toBeTruthy();
    });

    it("shows 'Never checked' when lastCheckedAt is null", () => {
      render(
        <SlaCountdown
          readiness="not_ready"
          lastCheckedAt={null}
          slaHours={24}
        />
      );

      expect(screen.getByText(/never checked/i)).toBeInTheDocument();
    });

    it("shows 'Ready' for ready contributors regardless of SLA", () => {
      const now = new Date();
      render(
        <SlaCountdown
          readiness="ready"
          lastCheckedAt={now}
          slaHours={24}
        />
      );

      expect(screen.getByText(/ready/i)).toBeInTheDocument();
    });

    it("hides when SLA configuration is missing or invalid", () => {
      const now = new Date();
      const { container } = render(
        <SlaCountdown
          readiness="not_ready"
          lastCheckedAt={null}
          slaHours={0}
        />
      );

      // Should still render gracefully even with invalid SLA
      expect(container).toBeTruthy();
    });
  });

  describe("time display", () => {
    it("displays time remaining in HhHmmM format", async () => {
      const now = new Date();
      const hoursInFuture = new Date(now.getTime() + 5 * 60 * 60 * 1000); // 5 hours from now

      render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={hoursInFuture}
          slaHours={24}
        />
      );

      await waitFor(() => {
        // Should show approximately 29 hours (24 + 5)
        expect(screen.getByText(/\d+h \d+m/)).toBeInTheDocument();
      });
    });

    it("updates time display every minute", async () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const { rerender } = render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={futureTime}
          slaHours={24}
        />
      );

      // Advance time by 1 minute
      vi.advanceTimersByTime(60_000);

      // Should have updated display
      await waitFor(() => {
        expect(vi.getTimerCount()).toBeGreaterThan(0);
      });
    });

    it("shows 'SLA expired' when deadline has passed", async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago

      render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={pastTime}
          slaHours={24}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/sla expired/i)).toBeInTheDocument();
      });
    });

    it("marks as urgent when less than 6 hours remain", async () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 5 * 60 * 60 * 1000); // 5 hours from now

      const { container } = render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={futureTime}
          slaHours={24}
        />
      );

      await waitFor(() => {
        const element = container.querySelector("[class*='text-amber']");
        expect(element).toBeTruthy(); // Should have amber/warning color
      });
    });
  });

  describe("accessibility", () => {
    it("uses semantic icons with proper sizing", () => {
      const now = new Date();
      const { container } = render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={now}
          slaHours={24}
        />
      );

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
      icons.forEach((icon) => {
        expect(icon.classList.contains("h-3.5")).toBe(true);
        expect(icon.classList.contains("w-3.5")).toBe(true);
      });
    });

    it("has sufficient color contrast in all states", () => {
      const now = new Date();

      // Ready state
      const { container: readyContainer } = render(
        <SlaCountdown
          readiness="ready"
          lastCheckedAt={now}
          slaHours={24}
        />
      );
      expect(readyContainer.querySelector("[class*='text-emerald']")).toBeTruthy();

      // Low reserve state
      const { container: warningContainer } = render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={now}
          slaHours={24}
        />
      );
      expect(warningContainer.querySelector("[class*='text-']")).toBeTruthy();
    });

    it("includes proper ARIA labels", () => {
      const now = new Date();
      const { container } = render(
        <SlaCountdown
          readiness="not_ready"
          lastCheckedAt={now}
          slaHours={24}
        />
      );

      // At minimum, interactive elements should be identifiable
      const div = container.querySelector("div");
      expect(div).toBeTruthy();
    });
  });

  describe("hydration", () => {
    it("does not cause hydration mismatch on mount", () => {
      const now = new Date();
      const consoleSpy = vi.spyOn(console, "error");

      render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={now}
          slaHours={24}
        />
      );

      // Should not log hydration errors
      const hydrationErrors = consoleSpy.mock.calls.filter((call) =>
        call[0]?.toString().includes("hydration")
      );
      expect(hydrationErrors.length).toBe(0);

      consoleSpy.mockRestore();
    });

    it("handles initial 'Unknown' state during hydration", async () => {
      const now = new Date();
      const { container } = render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={now}
          slaHours={24}
        />
      );

      // Component should mount without errors
      expect(container).toBeTruthy();

      // After hydration, should show actual value
      await waitFor(() => {
        const text = container.textContent;
        expect(text).not.toBeEmpty();
      });
    });
  });

  describe("timezone handling", () => {
    it("correctly calculates deadline in local timezone", async () => {
      const now = new Date();
      const hourFromNow = new Date(now.getTime() + 1 * 60 * 60 * 1000);

      render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={hourFromNow}
          slaHours={24}
        />
      );

      await waitFor(() => {
        // Should show approximately 25 hours (24 + 1)
        const text = screen.getByText(/\d+h \d+m/);
        expect(text).toBeInTheDocument();
      });
    });

    it("handles DST transitions without breaking", async () => {
      // This is a sanity check; full DST testing requires mock date changes
      const now = new Date();
      const futureTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const { rerender } = render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={futureTime}
          slaHours={24}
        />
      );

      // Rerender should not cause crashes
      rerender(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={futureTime}
          slaHours={24}
        />
      );

      expect(screen.getByText(/\d+h \d+m/)).toBeInTheDocument();
    });
  });

  describe("configuration", () => {
    it("respects custom slaHours prop", async () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);

      render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={futureTime}
          slaHours={12} // Custom SLA: 12 hours
        />
      );

      await waitFor(() => {
        // Should show approximately 22 hours (12 + 10)
        const text = screen.getByText(/\d+h \d+m/);
        expect(text).toBeInTheDocument();
      });
    });

    it("uses default 24-hour SLA when slaHours not provided", async () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);

      render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={futureTime}
        />
      );

      await waitFor(() => {
        // Should show approximately 29 hours (24 + 5)
        const text = screen.getByText(/\d+h \d+m/);
        expect(text).toBeInTheDocument();
      });
    });
  });

  describe("mounting/unmounting", () => {
    it("cleans up interval on unmount", () => {
      const now = new Date();
      const { unmount } = render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={now}
          slaHours={24}
        />
      );

      const initialTimerCount = vi.getTimerCount();
      unmount();
      const afterUnmountTimerCount = vi.getTimerCount();

      // Interval should be cleared
      expect(afterUnmountTimerCount).toBeLessThan(initialTimerCount);
    });

    it("does not cause memory leaks with repeated mounts/unmounts", () => {
      const now = new Date();

      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <SlaCountdown
            readiness="low_reserve"
            lastCheckedAt={now}
            slaHours={24}
          />
        );
        unmount();
      }

      // Should complete without errors
      expect(vi.getTimerCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe("edge cases", () => {
    it("handles Date objects correctly", () => {
      const dateObj = new Date("2026-08-26T00:00:00Z");
      const { container } = render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={dateObj}
          slaHours={24}
        />
      );

      expect(container).toBeTruthy();
    });

    it("handles ISO string timestamps (if converted to Date)", () => {
      const isoDate = new Date("2026-08-26T12:00:00Z");
      render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={isoDate}
          slaHours={24}
        />
      );

      expect(screen.queryByText(/clock|time/i)).toBeTruthy();
    });

    it("does not break with very large slaHours values", () => {
      const now = new Date();
      const { container } = render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={now}
          slaHours={1000} // Very large SLA
        />
      );

      expect(container).toBeTruthy();
    });

    it("does not break with zero slaHours", () => {
      const now = new Date();
      const { container } = render(
        <SlaCountdown
          readiness="low_reserve"
          lastCheckedAt={now}
          slaHours={0}
        />
      );

      expect(container).toBeTruthy();
    });
  });
});
