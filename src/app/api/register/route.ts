import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { recordAuditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { DEFAULT_ASSET } from "@/lib/constants";
import { assertSameOrigin } from "@/lib/csrf";
import { checkStellarAddress } from "@/lib/horizon";
import { prisma } from "@/lib/prisma";
import { isValidStellarAddress } from "@/lib/stellar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { stellarAddress?: string };
    const stellarAddress = body.stellarAddress?.trim();

    if (!stellarAddress) {
      return NextResponse.json(
        { error: "Stellar address is required" },
        { status: 400 }
      );
    }

    if (!isValidStellarAddress(stellarAddress)) {
      return NextResponse.json(
        { error: "Invalid Stellar G-address" },
        { status: 400 }
      );
    }

    const existing = await prisma.registration.findUnique({
      where: { stellarAddress },
    });

    if (existing && existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: "This Stellar address is already registered to another user" },
        { status: 409 }
      );
    }

    const horizonResult = await checkStellarAddress(
      stellarAddress,
      DEFAULT_ASSET.code,
      DEFAULT_ASSET.issuer
    );

    const registration = await prisma.registration.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        stellarAddress,
        funded: horizonResult.funded,
        trustlineReady: horizonResult.trustline,
        trustlineAuthorized: horizonResult.trustline_authorized,
        xlmBalance: horizonResult.xlm_balance,
        lastCheckedAt: new Date(),
      },
      update: {
        stellarAddress,
        funded: horizonResult.funded,
        trustlineReady: horizonResult.trustline,
        trustlineAuthorized: horizonResult.trustline_authorized,
        xlmBalance: horizonResult.xlm_balance,
        lastCheckedAt: new Date(),
      },
    });

    await recordAuditLog({
      action: existing ? "registration.update" : "registration.create",
      actorId: session.user.id,
      actorLogin: session.user.githubUsername ?? null,
      targetId: registration.id,
      targetLabel: registration.stellarAddress,
      metadata: { readiness: horizonResult.readiness },
    });

    return NextResponse.json({
      success: true,
      registration: {
        id: registration.id,
        stellarAddress: registration.stellarAddress,
        readiness: horizonResult.readiness,
        funded: registration.funded,
        trustline: registration.trustlineReady,
        trustline_authorized: registration.trustlineAuthorized,
        verified: horizonResult.verified,
        xlm_balance: registration.xlmBalance,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to save registration" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const registration = await prisma.registration.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ registration });
}
