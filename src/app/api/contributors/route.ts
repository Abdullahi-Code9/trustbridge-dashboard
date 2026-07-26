import { NextRequest, NextResponse } from "next/server";

import { requireMaintainerSession } from "@/lib/api-auth";
import { recordAuditLog } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/csrf";
import { getContributors, refreshAllContributors } from "@/lib/registrations";
import type { ReadinessStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await refreshMaintainerSession())) {
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

  const { refreshed, changed, diffs } = await refreshAllContributors();
  const contributors = await getContributors();

  await recordAuditLog({
    action: "recheck.batch",
    actorId: session.user.id,
    actorLogin: session.user.githubUsername ?? null,
    metadata: {
      refreshed,
      changed,
      diffs: diffs.filter((diff) => diff.changed),
    },
  });

  return NextResponse.json({ refreshed, contributors });
}
