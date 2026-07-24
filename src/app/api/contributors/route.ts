import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/csrf";
import { authOptions } from "@/lib/auth";
import { getContributors, refreshAllContributors } from "@/lib/registrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireMaintainer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMaintainer) {
    return null;
  }
  return session;
}

export async function GET() {
  if (!(await requireMaintainer())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contributors = await getContributors();
  return NextResponse.json({ contributors });
}

export async function POST(request: NextRequest) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  if (!(await requireMaintainer())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const count = await refreshAllContributors();
  const contributors = await getContributors();
  return NextResponse.json({ refreshed: count, contributors });
}
