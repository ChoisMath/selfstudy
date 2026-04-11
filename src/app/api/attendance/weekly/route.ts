import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { getAcademicYearRange, computeGradeStudyRanking } from "@/lib/academic-year";

// GET /api/attendance/weekly?studentId=1&date=2026-04-05
export const GET = withAuth(
  ["teacher", "student"],
  async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const studentId = parseInt(searchParams.get("studentId") || "");
    const dateStr = searchParams.get("date");

    if (!studentId || !dateStr) {
      return NextResponse.json({ error: "studentId와 date가 필요합니다." }, { status: 400 });
    }

    // 해당 주의 월~금 계산
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const weekDates: Date[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(d);
    }

    const startDate = weekDates[0];
    const endDate = weekDates[4];

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    const { start: yearStart, end: yearEnd } = getAcademicYearRange(now);

    const [attendances, participationDays, attendanceNotes, student, monthlyAttendances, yearlyAttendances] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          studentId,
          date: { gte: startDate, lte: endDate },
        },
        include: { absenceReason: true },
        orderBy: { date: "asc" },
      }),
      prisma.participationDay.findMany({
        where: { studentId },
      }),
      prisma.attendanceNote.findMany({
        where: { studentId, date: { gte: startDate, lte: endDate } },
      }),
      prisma.student.findUnique({
        where: { id: studentId },
        select: { grade: true },
      }),
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
          date: { gte: yearStart, lt: yearEnd },
        },
        select: { durationMinutes: true },
      }),
    ]);

    // 참여설정을 세션별로 매핑
    const dayKeys = ["", "mon", "tue", "wed", "thu", "fri"] as const;
    const participationMap: Record<string, Record<string, boolean>> = {};
    for (const pd of participationDays) {
      participationMap[pd.sessionType] = {
        isParticipating: pd.isParticipating,
        mon: pd.mon, tue: pd.tue, wed: pd.wed, thu: pd.thu, fri: pd.fri,
      };
    }

    const afterSchoolMap: Record<string, Record<string, boolean>> = {};
    for (const pd of participationDays) {
      afterSchoolMap[pd.sessionType] = {
        mon: pd.afterSchoolMon, tue: pd.afterSchoolTue, wed: pd.afterSchoolWed,
        thu: pd.afterSchoolThu, fri: pd.afterSchoolFri,
      };
    }

    const noteMap = new Map<string, string>();
    for (const n of attendanceNotes) {
      noteMap.set(`${n.date.toISOString().split("T")[0]}-${n.sessionType}`, n.note);
    }

    // O(1) 룩업을 위한 Map 변환
    const attMap = new Map<string, typeof attendances[0]>();
    for (const a of attendances) {
      attMap.set(`${a.date.toISOString().split("T")[0]}-${a.sessionType}`, a);
    }

    const weekly = weekDates.map((d) => {
      const dateStr = d.toISOString().split("T")[0];
      const dayOfWeekIdx = d.getDay(); // 1=월 ~ 5=금
      const dayKey = dayKeys[dayOfWeekIdx] || "";

      const afternoon = attMap.get(`${dateStr}-afternoon`);
      const night = attMap.get(`${dateStr}-night`);

      const afternoonPart = participationMap["afternoon"];
      const nightPart = participationMap["night"];

      // 해당 요일에 참여하는지 여부
      const afternoonParticipating = afternoonPart
        ? (afternoonPart.isParticipating && (dayKey ? afternoonPart[dayKey] : false))
        : true;
      const nightParticipating = nightPart
        ? (nightPart.isParticipating && (dayKey ? nightPart[dayKey] : false))
        : true;

      return {
        date: dateStr,
        dayOfWeek: ["일", "월", "화", "수", "목", "금", "토"][d.getDay()],
        afternoon: afternoon
          ? {
              status: afternoon.status,
              reason: afternoon.absenceReason
                ? { type: afternoon.absenceReason.reasonType, detail: afternoon.absenceReason.detail }
                : null,
            }
          : null,
        night: night
          ? {
              status: night.status,
              reason: night.absenceReason
                ? { type: night.absenceReason.reasonType, detail: night.absenceReason.detail }
                : null,
            }
          : null,
        afternoonParticipating,
        nightParticipating,
        afternoonNote: noteMap.get(`${dateStr}-afternoon`) || null,
        nightNote: noteMap.get(`${dateStr}-night`) || null,
        afternoonAfterSchool: (() => {
          const as = afterSchoolMap["afternoon"];
          return as ? (participationMap["afternoon"]?.isParticipating && (dayKey ? as[dayKey] : false)) : false;
        })(),
        nightAfterSchool: (() => {
          const as = afterSchoolMap["night"];
          return as ? (participationMap["night"]?.isParticipating && (dayKey ? as[dayKey] : false)) : false;
        })(),
      };
    });

    const ranking = student?.grade
      ? await computeGradeStudyRanking(student.grade, studentId, now)
      : null;

    const monthlyMinutes = monthlyAttendances.reduce(
      (sum, a) => sum + (a.durationMinutes ?? 100),
      0,
    );
    const yearlyMinutes = yearlyAttendances.reduce(
      (sum, a) => sum + (a.durationMinutes ?? 100),
      0,
    );
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
        ? {
            rank: ranking.rank,
            totalRanked: ranking.totalRanked,
            topPercent: ranking.topPercent,
          }
        : null,
    });
  }
);
