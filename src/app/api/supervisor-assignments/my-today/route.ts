import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/supervisor-assignments/my-today - 오늘 감독 배정 확인
export const GET = withAuth(["teacher"], async (req: Request, user) => {
  // KST 기준 오늘 날짜 (서버가 UTC일 때도 정확)
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayStr = `${kstNow.getUTCFullYear()}-${String(kstNow.getUTCMonth() + 1).padStart(2, "0")}-${String(kstNow.getUTCDate()).padStart(2, "0")}`;
  const today = new Date(todayStr + "T00:00:00.000Z");

  const assignments = await prisma.supervisorAssignment.findMany({
    where: {
      teacherId: user.userId,
      date: today,
    },
    orderBy: { sessionType: "asc" },
  });

  if (assignments.length > 0) {
    return NextResponse.json({
      hasAssignment: true,
      grade: assignments[0].grade,
      assignments: assignments.map((a) => ({
        id: a.id,
        grade: a.grade,
        sessionType: a.sessionType,
      })),
    });
  }

  return NextResponse.json({ hasAssignment: false, grade: null, assignments: [] });
});
