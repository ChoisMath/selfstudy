import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/supervisor-assignments/my-today - 오늘 감독 배정 확인
export const GET = withAuth(["teacher"], async (req: Request, user) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
