import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(["admin"], async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.swappedAt = {};
    if (from) (where.swappedAt as Record<string, unknown>).gte = new Date(from);
    if (to) (where.swappedAt as Record<string, unknown>).lte = new Date(to + "T23:59:59Z");
  }

  const history = await prisma.supervisorSwapHistory.findMany({
    where,
    include: {
      assignment: true,
      originalTeacher: { select: { id: true, name: true } },
      replacementTeacher: { select: { id: true, name: true } },
    },
    orderBy: { swappedAt: "desc" },
  });

  return NextResponse.json({ history });
});
