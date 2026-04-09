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

  // 월간 참여시간 계산
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  monthStart.setHours(0, 0, 0, 0);
  monthEnd.setHours(23, 59, 59, 999);

  // 연간 참여시간 계산 (학년도: 3월~)
  const yearStart = now.getMonth() >= 2
    ? new Date(now.getFullYear(), 2, 1)
    : new Date(now.getFullYear() - 1, 2, 1);
  yearStart.setHours(0, 0, 0, 0);

  const [monthlyAttendances, yearlyAttendances] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        studentId,
        status: "present",
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { durationMinutes: true },
    }),
    prisma.attendance.findMany({
      where: {
        studentId,
        status: "present",
        date: { gte: yearStart, lte: monthEnd },
      },
      select: { durationMinutes: true },
    }),
  ]);

  const monthlyMinutes = monthlyAttendances.reduce(
    (sum, a) => sum + (a.durationMinutes ?? 100), 0
  );
  const yearlyMinutes = yearlyAttendances.reduce(
    (sum, a) => sum + (a.durationMinutes ?? 100), 0
  );
  const monthlyStudyHours = Math.round((monthlyMinutes / 60) * 10) / 10;
  const yearlyStudyHours = Math.round((yearlyMinutes / 60) * 10) / 10;

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

  return NextResponse.json({
    participationDays: result,
    monthlyStudyHours,
    yearlyStudyHours,
  });
});
