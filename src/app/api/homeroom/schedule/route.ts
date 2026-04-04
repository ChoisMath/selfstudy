import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/homeroom/schedule - 내 감독 일정 조회
export const GET = withAuth(["homeroom", "admin"], async (req: Request, user) => {
  const url = new URL(req.url);
  const monthStr = url.searchParams.get("month"); // YYYY-MM 형식

  let startDate: Date;
  let endDate: Date;

  if (monthStr) {
    const [year, month] = monthStr.split("-").map(Number);
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0); // 해당 월의 마지막 날
  } else {
    // 기본: 이번 달
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const assignments = await prisma.supervisorAssignment.findMany({
    where: {
      teacherId: user.userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: [{ date: "asc" }, { sessionType: "asc" }],
  });

  // 교체 가능한 교사 목록 (같은 학교 교사 전체)
  const teachers = await prisma.teacher.findMany({
    where: {
      id: { not: user.userId },
    },
    select: {
      id: true,
      name: true,
      homeroomAssignments: {
        select: { grade: true, classNumber: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    assignments: assignments.map((a) => ({
      id: a.id,
      date: a.date.toISOString().split("T")[0],
      grade: a.grade,
      sessionType: a.sessionType,
    })),
    teachers: teachers.map((t) => ({
      id: t.id,
      name: t.name,
      grades: t.homeroomAssignments.map((h) => h.grade),
    })),
  });
});
