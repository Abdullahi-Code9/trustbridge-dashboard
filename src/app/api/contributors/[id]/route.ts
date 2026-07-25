import { NextResponse } from "next/server";

import { requireMaintainerSession } from "@/lib/api-auth";
import { recordAuditLog } from "@/lib/audit";
import { backgroundQueue } from "@/lib/queue-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

/**
 * Queue a single contributor's Stellar readiness re-check via Horizon.
 * Maintainer-only. Returns the queued job ID and records an audit entry.
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

  const jobId = backgroundQueue.enqueue("recheck.single", {
    contributorId: id,
  });

  await recordAuditLog({
    action: "recheck.single.queued",
    actorId: session.user.id,
    actorLogin: session.user.githubUsername ?? null,
    targetId: id,
    metadata: { jobId },
  });

  return NextResponse.json({ jobId });
}
