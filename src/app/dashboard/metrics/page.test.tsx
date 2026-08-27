import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import MetricsPage from "@/app/dashboard/metrics/page";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    data: {
      contributors: {
        total: 3,
        ready: 1,
        readyPercent: 33,
        byStatus: { ready: 1, low_reserve: 1, not_ready: 1 },
      },
      audit: { recentEntries: 0, byAction: {}, latestAt: null },
      config: {
        rateLimitWindowMs: 60000,
        rateLimitMaxRequests: 100,
        circuitBreakerFailureThreshold: 5,
        circuitBreakerRecoveryMs: 30000,
        staleCsvMaxAgeMs: 86400000,
        horizonUrl: "https://horizon.stellar.org",
        sorobanContractConfigured: false,
      },
    },
  }),
}));

describe("MetricsPage layout", () => {
  it("renders the metrics page with a mobile-first stacked readiness grid", () => {
    const { container } = render(<MetricsPage />);

    expect(screen.getByTestId("metrics-page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /admin metrics/i })).toBeInTheDocument();

    const readinessGrid = container.querySelector(
      ".grid.grid-cols-1.sm\\:grid-cols-3"
    );
    expect(readinessGrid).toBeTruthy();
    expect(screen.getByRole("button", { name: /refresh/i })).toHaveClass("min-h-11");
  });
});
