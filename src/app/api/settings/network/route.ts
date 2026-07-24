import { NextResponse } from "next/server";

import { requireMaintainerSession } from "@/lib/api-auth";
import { recordAuditLog } from "@/lib/audit";
import { getNetworkConfig } from "@/lib/network-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Maintainer-only view of the resolved Horizon/Soroban network
 * configuration. Records an audit entry when a mismatch is detected so
 * there is a durable trail even if nobody happens to be looking at the
 * dashboard when a misconfiguration ships.
 */
export async function GET() {
  const session = await requireMaintainerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = getNetworkConfig();

  if (config.mismatched) {
    await recordAuditLog({
      action: "network_config_mismatch_detected",
      actorId: session.user.id,
      actorLogin: session.user.githubUsername ?? null,
      targetLabel: "network-config",
      metadata: {
        horizonNetwork: config.horizonNetwork,
        sorobanNetwork: config.sorobanNetwork,
        horizonUrl: config.horizonUrl,
        sorobanUrl: config.sorobanUrl,
      },
    });
  }

  return NextResponse.json(config);
}
