import { NextRequest, NextResponse } from "next/server";

import { requireMaintainerSession } from "@/lib/api-auth";
import { recordAuditLog } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/csrf";
import { getContributors, refreshAllContributors } from "@/lib/registrations";
import type { ReadinessStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Valid values for the `?readiness=` query parameter.
 * Passing `low_reserve` returns only contributors whose spendable XLM balance
 * is below the configured minimum — a separate category that helps maintainers
 * triage accounts that would fail a Wave payout for reserve reasons only.
 */
const VALID_READINESS_FILTERS = new Set<ReadinessStatus>([
  "ready",
  "low_reserve",
  "not_ready",
]);

/**
 * GET /api/contributors[?readiness=<status>]
 *
 * Returns the contributor list, optionally filtered to a single readiness tier.
 *
 * Query params:
 *   `readiness` — one of `ready | low_reserve | not_ready`.
 *                 Omit to return all contributors.
 *
 * The `low_reserve` filter is the key addition for issue #34: it lets
 * maintainers identify accounts that are funded and have an authorized
 * trustline but don't yet carry enough spendable XLM to cover the minimum
 * reserve, so they can be addressed before a Wave disbursement.
 *
 * Auth: maintainer-only.
 */
export async function GET(request: NextRequest) {
  if (!(await requireMaintainerSession())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const readinessParam = request.nextUrl.searchParams.get("readiness");

  // Validate the filter if provided
  if (
    readinessParam !== null &&
    !VALID_READINESS_FILTERS.has(readinessParam as ReadinessStatus)
  ) {
    return NextResponse.json(
      {
        error: `Invalid readiness filter "${readinessParam}". Must be one of: ${Array.from(VALID_READINESS_FILTERS).join(", ")}`,
      },
      { status: 400 }
    );
  }

  const allContributors = await getContributors();

  const contributors =
    readinessParam !== null
      ? allContributors.filter((c) => c.readiness === readinessParam)
      : allContributors;

  return NextResponse.json({
    contributors,
    total: allContributors.length,
    filtered: contributors.length,
    ...(readinessParam !== null ? { readiness: readinessParam } : {}),
  });
}

export async function POST(request: NextRequest) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await requireMaintainerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const count = await refreshAllContributors();
  const contributors = await getContributors();

  await recordAuditLog({
    action: "recheck.batch",
    actorId: session.user.id,
    actorLogin: session.user.githubUsername ?? null,
    metadata: { refreshed: count },
  });

  return NextResponse.json({ refreshed: count, contributors });
}
