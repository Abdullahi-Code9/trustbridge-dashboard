import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  registrationId: z.string().min(1),
  reason: z.string().trim().min(1).max(2_000),
  proofCid: z.string().trim().max(200).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const registrationId = request.nextUrl.searchParams.get("registrationId");
  const status = request.nextUrl.searchParams.get("status");
  const where = {
    ...(registrationId ? { registrationId } : {}),
    ...(status && ["OPEN", "VALIDATED", "REJECTED"].includes(status)
      ? { status: status as "OPEN" | "VALIDATED" | "REJECTED" }
      : {}),
    ...(session.user.isMaintainer ? {} : { registration: { userId: session.user.id } }),
  };
  const disputes = await prisma.disputeProof.findMany({
    where,
    select: {
      id: true,
      registrationId: true,
      reason: true,
      proofCid: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ disputes });
}

export async function POST(request: NextRequest) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid dispute details" }, { status: 400 });
  }

  const registration = await prisma.registration.findUnique({
    where: { id: parsed.data.registrationId },
    select: { id: true, userId: true },
  });
  if (!registration || (!session.user.isMaintainer && registration.userId !== session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.disputeProof.findUnique({
    where: { registrationId: registration.id },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "A dispute already exists for this registration" }, { status: 409 });
  }

  const dispute = await prisma.disputeProof.create({
    data: {
      registrationId: registration.id,
      reason: parsed.data.reason,
      proofCid: parsed.data.proofCid || null,
    },
    select: { id: true, registrationId: true, reason: true, proofCid: true, status: true, createdAt: true },
  });
  return NextResponse.json({ dispute }, { status: 201 });
}