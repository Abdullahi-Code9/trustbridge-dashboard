import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { authOptions } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InviteLink {
  code: string;
  createdAt: string;
  expiresAt: string | null;
  used: boolean;
}

interface GenerateBulkInvitesRequest {
  count: number;
  expiryDays?: number;
}

interface GenerateBulkInvitesResponse {
  generated: number;
  invites: InviteLink[];
}

export async function POST(request: NextRequest) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.isMaintainer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as GenerateBulkInvitesRequest;
  const { count = 10, expiryDays } = body;

  if (!count || count < 1 || count > 1000) {
    return NextResponse.json(
      { error: "Count must be between 1 and 1000" },
      { status: 400 }
    );
  }

  if (expiryDays && (expiryDays < 1 || expiryDays > 365)) {
    return NextResponse.json(
      { error: "Expiry days must be between 1 and 365" },
      { status: 400 }
    );
  }

  const invites: InviteLink[] = [];
  const now = new Date();
  const expiresAt = expiryDays
    ? new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000)
    : null;

  for (let i = 0; i < count; i++) {
    const code = randomBytes(24).toString("hex");
    invites.push({
      code,
      createdAt: now.toISOString(),
      expiresAt: expiresAt?.toISOString() ?? null,
      used: false,
    });
  }

  await recordAuditLog({
    action: "invites.bulk_generate",
    actorId: session.user.id,
    actorLogin: session.user.githubUsername ?? null,
    metadata: {
      count,
      expiryDays: expiryDays ?? null,
    },
  });

  return NextResponse.json({
    generated: invites.length,
    invites,
  } satisfies GenerateBulkInvitesResponse);
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.isMaintainer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "20"));

  // In a real implementation, these would be stored in the database
  // For now, return a paginated empty list structure
  const totalCount = 0;
  const invites: InviteLink[] = [];
  const totalPages = Math.ceil(totalCount / pageSize);

  return NextResponse.json({
    page,
    pageSize,
    totalCount,
    totalPages,
    invites,
  });
}

export async function DELETE(request: NextRequest) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.isMaintainer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { codes: string[] };
  const { codes } = body;

  if (!codes || codes.length === 0) {
    return NextResponse.json(
      { error: "At least one invite code is required" },
      { status: 400 }
    );
  }

  if (codes.length > 1000) {
    return NextResponse.json(
      { error: "Cannot delete more than 1000 invites at once" },
      { status: 400 }
    );
  }

  await recordAuditLog({
    action: "invites.bulk_delete",
    actorId: session.user.id,
    actorLogin: session.user.githubUsername ?? null,
    metadata: {
      count: codes.length,
    },
  });

  return NextResponse.json({
    deleted: codes.length,
  });
}
