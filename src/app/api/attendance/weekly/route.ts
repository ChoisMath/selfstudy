import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { computeGradeStudyRanking } from "@/lib/academic-year";
import { attendanceMinutes } from "@/lib/sessions";
import { buildWeeklyRows, weekDatesOf } from "@/lib/attendance/weekly-summary";

// GET /api/attendance/weekly?studentId=1&date=2026-04-05
export const GET = withAuth(
  ["teacher", "student"],
  async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const studentId = parseInt(searchParams.get("studentId") || "");
    const dateStr = searchParams.get("date");

    if (!studentId || !dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: "studentId와 date(YYYY-MM-DD)가 필요합니다." }, { status: 400 });
    }

    const weekDates = weekDatesOf(dateStr);
    const startDate = new Date(`${weekDates[0]}T00:00:00Z`);
    const endDate = new Date(`${weekDates[4]}T00:00:00Z`);

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const [attendances, participationDays, attendanceNotes, approvedRequests, student, monthlyAttendances] =
      await Promise.all([
        prisma.attendance.findMany({
          where: { studentId, date: { gte: startDate, lte: endDate } },
          include: { absenceReason: true },
        }),
        prisma.participationDay.findMany({ where: { studentId } }),
        prisma.attendanceNote.findMany({
          where: { studentId, date: { gte: startDate, lte: endDate } },
        }),
        prisma.absenceRequest.findMany({
          where: { studentId, status: "approved", date: { gte: startDate, lte: endDate } },
          select: { date: true, sessionType: true, reasonType: true, detail: true },
        }),
        prisma.student.findUnique({ where: { id: studentId }, select: { grade: true } }),
        prisma.attendance.findMany({
          where: { studentId, status: "present", date: { gte: monthStart, lte: monthEnd } },
          select: { sessionType: true, durationMinutes: true },
        }),
      ]);

    const isoDate = (d: Date) => d.toISOString().slice(0, 10);

    const weekly = buildWeeklyRows({
      weekDates,
      participationDays,
      attendances: attendances.map((a) => ({
        date: isoDate(a.date),
        sessionType: a.sessionType,
        status: a.status,
        reason: a.absenceReason ? { type: a.absenceReason.reasonType, detail: a.absenceReason.detail } : null,
      })),
      notes: attendanceNotes.map((n) => ({ date: isoDate(n.date), sessionType: n.sessionType, note: n.note })),
      approvedRequests: approvedRequests.map((r) => ({
        date: isoDate(r.date),
        sessionType: r.sessionType,
        reason: { type: r.reasonType, detail: r.detail },
      })),
    });

    const ranking = student?.grade
      ? await computeGradeStudyRanking(student.grade, studentId, now)
      : null;

    const monthlyMinutes = monthlyAttendances.reduce((sum, a) => sum + attendanceMinutes(a), 0);
    // 학년도 누계는 랭킹 계산 시 이미 집계됨 — 중복 쿼리 제거
    const yearlyMinutes = ranking?.minutes ?? 0;
    const monthlyHours = Math.round((monthlyMinutes / 60) * 10) / 10;
    const academicYearHours = Math.round((yearlyMinutes / 60) * 10) / 10;

    return NextResponse.json({
      weekly,
      totals: {
        monthlyMinutes,
        monthlyHours,
        academicYearMinutes: yearlyMinutes,
        academicYearHours,
      },
      ranking: ranking
        ? { rank: ranking.rank, totalRanked: ranking.totalRanked, topPercent: ranking.topPercent }
        : null,
    });
  }
);
