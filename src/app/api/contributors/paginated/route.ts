import { NextRequest, NextResponse } from "next/server";
import { requireMaintainerSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { toContributorRow } from "@/lib/registrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paginated contributors endpoint for infinite scroll.
 * Supports cursor-based pagination to efficiently handle large datasets.
 *
 * Query params:
 * - limit: number of items per page (default: 25, max: 100)
 * - cursor: cursor from previous page's response
 */
export async function GET(request: NextRequest) {
  const session = await requireMaintainerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const limitParam = searchParams.get("limit");
  const cursor = searchParams.get("cursor");

  let limit = 25;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      limit = parsed;
    }
  }

  const registrations = await prisma.registration.findMany({
    include: {
      user: {
        select: { githubUsername: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
  });

  const hasMore = registrations.length > limit;
  const items = hasMore ? registrations.slice(0, limit) : registrations;
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

  const contributors = items.map(toContributorRow);

  return NextResponse.json({
    contributors,
    total: await prisma.registration.count(),
    hasMore,
    nextCursor,
  });
}
