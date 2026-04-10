import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/homeroom/schedule/summary - 학년도 기준 교사별 월별 감독횟수 집계
export const GET = withAuth(["teacher"], async (_req: Request, user) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based

  // 학년도: 3월~익년 2월
  const schoolYearStart =
    currentMonth >= 3
      ? new Date(currentYear, 2, 1) // 3월 1일
      : new Date(currentYear - 1, 2, 1);
  const schoolYearEnd =
    currentMonth >= 3
      ? new Date(currentYear + 1, 1, 28, 23, 59, 59, 999) // 익년 2월 28일
      : new Date(currentYear, 1, 28, 23, 59, 59, 999);

  // 오후+야간 동일 감독이므로 afternoon만 카운트
  const assignments = await prisma.supervisorAssignment.findMany({
    where: {
      date: { gte: schoolYearStart, lte: schoolYearEnd },
      sessionType: "afternoon",
    },
    select: {
      date: true,
      teacherId: true,
    },
    orderBy: { date: "asc" },
  });

  // 교사 목록 (담당학년 포함)
  const teachers = await prisma.teacher.findMany({
    select: {
      id: true,
      name: true,
      primaryGrade: true,
    },
    orderBy: { name: "asc" },
  });

  // 교사별 월별 집계
  const teacherMap = new Map<
    number,
    { monthlyCounts: Record<string, number>; total: number }
  >();

  for (const t of teachers) {
    teacherMap.set(t.id, { monthlyCounts: {}, total: 0 });
  }

  const monthSet = new Set<string>();

  for (const a of assignments) {
    const d = new Date(a.date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthSet.add(monthKey);

    let entry = teacherMap.get(a.teacherId);
    if (!entry) {
      entry = { monthlyCounts: {}, total: 0 };
      teacherMap.set(a.teacherId, entry);
    }
    entry.monthlyCounts[monthKey] = (entry.monthlyCounts[monthKey] || 0) + 1;
    entry.total += 1;
  }

  // 월 정렬
  const months = Array.from(monthSet).sort();

  return NextResponse.json({
    currentUserId: user.userId,
    months,
    teachers: teachers.map((t) => ({
      id: t.id,
      name: t.name,
      primaryGrade: t.primaryGrade,
      monthlyCounts: teacherMap.get(t.id)?.monthlyCounts ?? {},
      total: teacherMap.get(t.id)?.total ?? 0,
    })),
  });
});
