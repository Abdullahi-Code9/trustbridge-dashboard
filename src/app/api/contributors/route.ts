import { NextRequest, NextResponse } from "next/server";

import { requireMaintainerSession } from "@/lib/api-auth";
import { recordAuditLog } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/csrf";
import { getContributors } from "@/lib/registrations";
import { backgroundQueue } from "@/lib/queue-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireMaintainerSession())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contributors = await getContributors();
  return NextResponse.json({ contributors });
}

export async function POST(request: NextRequest) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await requireMaintainerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const jobId = backgroundQueue.enqueue("recheck.batch", {
    actorId: session.user.id,
    actorLogin: session.user.githubUsername ?? null,
  });

  await recordAuditLog({
    action: "recheck.batch.queued",
    actorId: session.user.id,
    actorLogin: session.user.githubUsername ?? null,
    metadata: { jobId },
  });

  const contributors = await getContributors();

  return NextResponse.json({ jobId, contributors });
}
