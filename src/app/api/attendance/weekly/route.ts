import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/attendance/weekly?studentId=1&date=2026-04-05
export const GET = withAuth(
  ["supervisor", "admin", "homeroom", "student"],
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

    const [attendances, participationDays] = await Promise.all([
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

    const weekly = weekDates.map((d) => {
      const dateStr = d.toISOString().split("T")[0];
      const dayOfWeekIdx = d.getDay(); // 1=월 ~ 5=금
      const dayKey = dayKeys[dayOfWeekIdx] || "";

      const afternoon = attendances.find(
        (a) => a.date.toISOString().split("T")[0] === dateStr && a.sessionType === "afternoon"
      );
      const night = attendances.find(
        (a) => a.date.toISOString().split("T")[0] === dateStr && a.sessionType === "night"
      );

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
      };
    });

    return NextResponse.json({ weekly });
  }
);
