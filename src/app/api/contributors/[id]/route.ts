import { NextResponse } from "next/server";

import { requireMaintainerSession } from "@/lib/api-auth";
import { recordAuditLog } from "@/lib/audit";
import { refreshContributor } from "@/lib/registrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

/**
 * Re-check a single contributor's Stellar readiness via Horizon.
 * Maintainer-only. Records an audit entry on success.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const session = await requireMaintainerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = params.id?.trim();
  if (!id) {
    return NextResponse.json(
      { error: "Contributor id is required" },
      { status: 400 }
    );
  }

  const contributor = await refreshContributor(id);
  if (!contributor) {
    return NextResponse.json(
      { error: "Contributor not found" },
      { status: 404 }
    );
  }

  await recordAuditLog({
    action: "recheck.single",
    actorId: session.user.id,
    actorLogin: session.user.githubUsername ?? null,
    targetId: contributor.id,
    targetLabel: contributor.githubUsername,
    metadata: { readiness: contributor.readiness, verified: contributor.verified },
  });

  return NextResponse.json({ contributor });
}
