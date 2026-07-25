import { NextResponse } from "next/server";

import { requireMaintainerSession } from "@/lib/api-auth";
import { recordAuditLog } from "@/lib/audit";
import { getContributors } from "@/lib/registrations";
import { buildJson, buildJsonFilename } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireMaintainerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const contributors = await getContributors();

    if (contributors.length === 0) {
      return NextResponse.json(
        { error: "No contributors to export" },
        { status: 400 }
      );
    }

    const headers = [
      "id",
      "githubUsername",
      "stellarAddress",
      "funded",
      "trustlineReady",
      "trustlineAuthorized",
      "verified",
      "xlmBalance",
      "spendableXlmBalance",
      "readiness",
      "lastCheckedAt",
    ];

    const rows = contributors.map((c) => [
      c.id,
      c.githubUsername,
      c.stellarAddress,
      c.funded,
      c.trustlineReady,
      c.trustlineAuthorized,
      c.verified,
      c.xlmBalance,
      c.spendableXlmBalance,
      c.readiness,
      c.lastCheckedAt || "",
    ]);

    const json = buildJson(headers, rows);
    const filename = buildJsonFilename("contributors");

    await recordAuditLog({
      action: "export.json",
      actorId: session.user.id,
      actorLogin: session.user.githubUsername ?? null,
      metadata: {
        contributorCount: contributors.length,
        filename,
      },
    });

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await recordAuditLog({
      action: "export.json.failed",
      actorId: session.user.id,
      actorLogin: session.user.githubUsername ?? null,
      metadata: { error: message },
    });

    return NextResponse.json(
      { error: "Failed to export JSON", details: message },
      { status: 500 }
    );
  }
}
