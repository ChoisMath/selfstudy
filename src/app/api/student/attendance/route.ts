import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/student/attendance?type=weekly&date=2026-04-05
// GET /api/student/attendance?type=monthly&month=2026-04
export const GET = withAuth(["student"], async (req: Request, user) => {
  const studentId = user.userId;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "weekly") {
    const dateStr = searchParams.get("date");
    if (!dateStr) {
      return NextResponse.json(
        { error: "date 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    // 해당 날짜가 속한 주의 월~금 계산
    const target = new Date(dateStr + "T00:00:00Z");
    const day = target.getUTCDay(); // 0=일, 1=월, ..., 6=토
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(target);
    monday.setUTCDate(monday.getUTCDate() + mondayOffset);

    const friday = new Date(monday);
    friday.setUTCDate(friday.getUTCDate() + 4);

    const attendances = await prisma.attendance.findMany({
      where: {
        studentId,
        date: { gte: monday, lte: friday },
      },
      include: { absenceReason: true },
      orderBy: [{ date: "asc" }, { sessionType: "asc" }],
    });

    // 참여 설정 조회
    const participationDays = await prisma.participationDay.findMany({
      where: { studentId },
    });

    const participationMap: Record<
      string,
      { isParticipating: boolean; mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean }
    > = {};
    for (const p of participationDays) {
      participationMap[p.sessionType] = {
        isParticipating: p.isParticipating,
        mon: p.mon,
        tue: p.tue,
        wed: p.wed,
        thu: p.thu,
        fri: p.fri,
      };
    }

    const weekDates: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setUTCDate(d.getUTCDate() + i);
      weekDates.push(d.toISOString().split("T")[0]);
    }

    return NextResponse.json({
      weekDates,
      attendances: attendances.map((a) => ({
        date: a.date.toISOString().split("T")[0],
        sessionType: a.sessionType,
        status: a.status,
        absenceReason: a.absenceReason
          ? { reasonType: a.absenceReason.reasonType, detail: a.absenceReason.detail }
          : null,
      })),
      participationDays: participationMap,
    });
  }

  if (type === "monthly") {
    const monthStr = searchParams.get("month");
    if (!monthStr) {
      return NextResponse.json(
        { error: "month 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const [year, month] = monthStr.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0)); // 해당 월 마지막 날

    const attendances = await prisma.attendance.findMany({
      where: {
        studentId,
        date: { gte: startDate, lte: endDate },
      },
      include: { absenceReason: true },
      orderBy: [{ date: "asc" }, { sessionType: "asc" }],
    });

    return NextResponse.json({
      month: monthStr,
      attendances: attendances.map((a) => ({
        date: a.date.toISOString().split("T")[0],
        sessionType: a.sessionType,
        status: a.status,
        absenceReason: a.absenceReason
          ? { reasonType: a.absenceReason.reasonType, detail: a.absenceReason.detail }
          : null,
      })),
    });
  }

  return NextResponse.json(
    { error: "type 파라미터가 필요합니다. (weekly 또는 monthly)" },
    { status: 400 }
  );
});
