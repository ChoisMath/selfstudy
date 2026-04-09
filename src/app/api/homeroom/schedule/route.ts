import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/homeroom/schedule - 전체 감독 배정표 조회
export const GET = withAuth(["teacher"], async (req: Request, user) => {
  const url = new URL(req.url);
  const monthStr = url.searchParams.get("month"); // YYYY-MM 형식

  let startDate: Date;
  let endDate: Date;

  if (monthStr) {
    const [year, month] = monthStr.split("-").map(Number);
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0);
  } else {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  // 전체 학년 감독 배정 조회
  const assignments = await prisma.supervisorAssignment.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      teacher: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "asc" }, { grade: "asc" }, { sessionType: "asc" }],
  });

  // 교체 가능한 교사 목록 (본인 포함)
  const teachers = await prisma.teacher.findMany({
    select: {
      id: true,
      name: true,
      primaryGrade: true,
      homeroomAssignments: {
        select: { grade: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // 오후/야간이 동일 감독이므로 afternoon만 반환 (중복 제거)
  const uniqueAssignments = assignments.filter((a) => a.sessionType === "afternoon");

  return NextResponse.json({
    currentUserId: user.userId,
    assignments: uniqueAssignments.map((a) => ({
      id: a.id,
      date: a.date.toISOString().split("T")[0],
      grade: a.grade,
      sessionType: a.sessionType,
      teacherId: a.teacher.id,
      teacherName: a.teacher.name,
    })),
    teachers: teachers.map((t) => ({
      id: t.id,
      name: t.name,
      primaryGrade: t.primaryGrade,
      grades: t.homeroomAssignments.map((h) => h.grade),
    })),
  });
});
