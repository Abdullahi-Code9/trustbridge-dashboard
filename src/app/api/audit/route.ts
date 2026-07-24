import { NextRequest, NextResponse } from "next/server";

import { requireMaintainerSession } from "@/lib/api-auth";
import { getRecentAuditLog } from "@/lib/audit";
import { summarizeAuditLog } from "@/lib/audit-format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Maintainer-only view of recent maintainer actions. */
export async function GET(request: NextRequest) {
  if (!(await requireMaintainerSession())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50;

  const entries = await getRecentAuditLog(limit);
  return NextResponse.json({
    entries,
    summary: summarizeAuditLog(entries),
  });
}
