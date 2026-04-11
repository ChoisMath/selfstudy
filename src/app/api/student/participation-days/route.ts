import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { computeGradeStudyRanking } from "@/lib/academic-year";

// GET /api/student/participation-days
export const GET = withAuth(["student"], async (_req: Request, user) => {
  const studentId = user.userId;
  const grade = user.grade;

  // 월간 참여시간 (달력월, UTC 기준)
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const [participationDays, monthlyAttendances, ranking] = await Promise.all([
    prisma.participationDay.findMany({
      where: { studentId },
      orderBy: { sessionType: "asc" },
    }),
    prisma.attendance.findMany({
      where: {
        studentId,
        status: "present",
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { durationMinutes: true },
    }),
    grade ? computeGradeStudyRanking(grade, studentId, now) : Promise.resolve(null),
  ]);

  const monthlyMinutes = monthlyAttendances.reduce(
    (sum, a) => sum + (a.durationMinutes ?? 100),
    0,
  );
  // 학년도 누계는 랭킹 계산 시 이미 집계됨 — 중복 쿼리 제거
  const yearlyMinutes = ranking?.minutes ?? 0;
  const monthlyStudyHours = Math.round((monthlyMinutes / 60) * 10) / 10;
  const yearlyStudyHours = Math.round((yearlyMinutes / 60) * 10) / 10;

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
    ranking: ranking
      ? {
          rank: ranking.rank,
          totalRanked: ranking.totalRanked,
          topPercent: ranking.topPercent,
        }
      : null,
  });
});
