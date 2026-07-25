import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { recordAuditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { DEFAULT_ASSET } from "@/lib/constants";
import { assertSameOrigin } from "@/lib/csrf";
import { checkStellarAddress } from "@/lib/horizon";
import { prisma } from "@/lib/prisma";
import { validateRegistrationInput } from "@/lib/register-validation";
import { mirrorRegistrationToSoroban } from "@/lib/soroban-register";

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

    // Validate input
    const validationErrors = validateRegistrationInput(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: validationErrors[0].message,
          validationErrors,
        },
        { status: 400 }
      );
    }

    const stellarAddress = body.stellarAddress!.trim();

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
        spendableXlmBalance: horizonResult.spendable_xlm_balance,
        lastCheckedAt: new Date(),
      },
      update: {
        stellarAddress,
        funded: horizonResult.funded,
        trustlineReady: horizonResult.trustline,
        trustlineAuthorized: horizonResult.trustline_authorized,
        xlmBalance: horizonResult.xlm_balance,
        spendableXlmBalance: horizonResult.spendable_xlm_balance,
        lastCheckedAt: new Date(),
      },
    });

    // Mirror registration to Soroban contract (best-effort, non-blocking).
    // Fire-and-forget: don't await or let failures affect the response.
    mirrorRegistrationToSoroban(registration).catch((error) => {
      console.error("Soroban registration mirror failed:", error);
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
        spendable_xlm_balance: registration.spendableXlmBalance,
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
