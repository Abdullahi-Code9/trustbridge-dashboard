import { NextResponse } from "next/server";

import { requireMaintainerSession } from "@/lib/api-auth";
import { recordAuditLog } from "@/lib/audit";
import {
  buildWalletProofInfo,
  buildHorizonDebugInfo,
} from "@/lib/registration-insights";
import { getContributors } from "@/lib/registrations";
import { buildJson, buildJsonFilename } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
      "horizonDebugSummary",
      "horizonNextAction",
      "freighterProofChallenge",
    ];

    const rows = contributors.map((contributor) => {
      const horizonDebug =
        contributor.horizonDebug ??
        buildHorizonDebugInfo({
          funded: contributor.funded,
          trustlineReady: contributor.trustlineReady,
          trustlineAuthorized: contributor.trustlineAuthorized,
          readiness: contributor.readiness,
          xlmBalance: contributor.xlmBalance,
          spendableXlmBalance: contributor.spendableXlmBalance,
          lastCheckedAt: contributor.lastCheckedAt,
        });
      const walletProof =
        contributor.walletProof ??
        buildWalletProofInfo(
          contributor.stellarAddress,
          contributor.githubUsername
        );

      return [
        contributor.id,
        contributor.githubUsername,
        contributor.stellarAddress,
        contributor.funded,
        contributor.trustlineReady,
        contributor.trustlineAuthorized,
        contributor.verified,
        contributor.xlmBalance,
        contributor.spendableXlmBalance,
        contributor.readiness,
        contributor.lastCheckedAt || "",
        horizonDebug.summary,
        horizonDebug.nextAction,
        walletProof.challenge,
      ];
    });

    const json = buildJson(headers, rows);
    const filename = buildJsonFilename("contributors");

    await recordAuditLog({
      action: "export.json",
      actorId: session.user.id,
      actorLogin: session.user.githubUsername ?? null,
      metadata: {
        contributorCount: total,
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
