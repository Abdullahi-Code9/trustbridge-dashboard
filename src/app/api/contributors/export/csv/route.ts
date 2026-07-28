import { NextResponse } from "next/server";

import { requireMaintainerSession } from "@/lib/api-auth";
import { recordAuditLog } from "@/lib/audit";
import {
  getContributors,
  refreshAllContributors,
} from "@/lib/registrations";
import {
  buildContributorsCsv,
  getContributorsCsvFilename,
} from "@/lib/csv-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireMaintainerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { contributors, total } = await getContributors();

    if (contributors.length === 0) {
      return NextResponse.json(
        { error: "No contributors to export" },
        { status: 400 }
      );
    }

    const csv = buildContributorsCsv(contributors);
    const filename = getContributorsCsvFilename();

    await recordAuditLog({
      action: "export.csv",
      actorId: session.user.id,
      actorLogin: session.user.githubUsername ?? null,
      metadata: {
        contributorCount: total,
        filename,
      },
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await recordAuditLog({
      action: "export.csv.failed",
      actorId: session.user.id,
      actorLogin: session.user.githubUsername ?? null,
      metadata: { error: message },
    });

    return NextResponse.json(
      { error: "Failed to export CSV", details: message },
      { status: 500 }
    );
  }
}
