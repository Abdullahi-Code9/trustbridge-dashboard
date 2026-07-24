import type { Session } from "next-auth";
import { describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/soroban/events/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// authOptions itself pulls in the Prisma-backed auth module; the route only
// forwards it to getServerSession (mocked below), so a stub is sufficient
// and keeps this test independent of a generated Prisma client.
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/soroban", () => ({
  getSorobanEventTimeline: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getSorobanEventTimeline } from "@/lib/soroban";

describe("GET /api/soroban/events", () => {
  it("returns 403 for a non-maintainer session", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", isMaintainer: false },
      expires: "2099-01-01T00:00:00.000Z",
    } satisfies Session);

    const res = await GET();
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Forbidden");
    expect(getSorobanEventTimeline).not.toHaveBeenCalled();
  });

  it("returns 403 when there is no session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(403);
    expect(getSorobanEventTimeline).not.toHaveBeenCalled();
  });

  it("returns 200 with the event timeline for a maintainer", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", isMaintainer: true },
      expires: "2099-01-01T00:00:00.000Z",
    } satisfies Session);
    vi.mocked(getSorobanEventTimeline).mockResolvedValue({
      events: [],
      latestLedger: 42,
      errors: [],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ events: [], latestLedger: 42, errors: [] });
  });
});
