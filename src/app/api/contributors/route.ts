import { NextRequest, NextResponse } from "next/server";

import { requireMaintainerSession } from "@/lib/api-auth";
import { recordAuditLog } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/csrf";
import { getContributors, refreshAllContributors } from "@/lib/registrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await refreshMaintainerSession())) {
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
