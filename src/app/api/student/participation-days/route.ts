import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/student/participation-days
export const GET = withAuth(["student"], async (_req: Request, user) => {
  const studentId = user.userId;

  const participationDays = await prisma.participationDay.findMany({
    where: { studentId },
    orderBy: { sessionType: "asc" },
  });

  // 세션별로 정리
  const result: Record<
    string,
    {
      isParticipating: boolean;
      mon: boolean;
      tue: boolean;
      wed: boolean;
      thu: boolean;
      fri: boolean;
    }
  > = {};

  for (const p of participationDays) {
    result[p.sessionType] = {
      isParticipating: p.isParticipating,
      mon: p.mon,
      tue: p.tue,
      wed: p.wed,
      thu: p.thu,
      fri: p.fri,
    };
  }

  return NextResponse.json({ participationDays: result });
});
