import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/homeroom/monthly-attendance?month=2026-04
export const GET = withAuth(["homeroom", "admin"], async (req: Request, user) => {
  const assignments = user.homeroomAssignments;
  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ error: "담임 배정이 없습니다." }, { status: 403 });
  }

  const url = new URL(req.url);
  const monthStr = url.searchParams.get("month"); // YYYY-MM

  let year: number, monthIdx: number;
  if (monthStr) {
    [year, monthIdx] = monthStr.split("-").map(Number);
    monthIdx -= 1; // 0-based
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthIdx = now.getMonth();
  }

  const startDate = new Date(year, monthIdx, 1);
  const endDate = new Date(year, monthIdx + 1, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  // 평일 날짜 배열
  const dates: string[] = [];
  const d = new Date(startDate);
  while (d <= endDate) {
    if (d.getDay() >= 1 && d.getDay() <= 5) {
      dates.push(d.toISOString().split("T")[0]);
    }
    d.setDate(d.getDate() + 1);
  }

  // 담임 학급 학생 조회
  const classConditions = assignments.map((a) => ({
    grade: a.grade,
    classNumber: a.classNumber,
  }));

  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      OR: classConditions,
    },
    orderBy: [{ grade: "asc" }, { classNumber: "asc" }, { studentNumber: "asc" }],
    include: {
      attendances: {
        where: {
          date: { gte: startDate, lte: endDate },
        },
        include: { absenceReason: true },
      },
      participationDays: true,
    },
  });

  const result = students.map((student) => {
    const dateMap: Record<string, {
      afternoon?: string;
      night?: string;
      afternoonReason?: string;
      nightReason?: string;
    }> = {};

    for (const date of dates) {
      const afternoon = student.attendances.find(
        (a) => a.date.toISOString().split("T")[0] === date && a.sessionType === "afternoon"
      );
      const night = student.attendances.find(
        (a) => a.date.toISOString().split("T")[0] === date && a.sessionType === "night"
      );

      dateMap[date] = {
        afternoon: afternoon?.status,
        night: night?.status,
        afternoonReason: afternoon?.absenceReason?.reasonType,
        nightReason: night?.absenceReason?.reasonType,
      };
    }

    return {
      id: student.id,
      name: student.name,
      grade: student.grade,
      classNumber: student.classNumber,
      studentNumber: student.studentNumber,
      dates: dateMap,
      participationDays: student.participationDays.map((p) => ({
        sessionType: p.sessionType,
        isParticipating: p.isParticipating,
        mon: p.mon,
        tue: p.tue,
        wed: p.wed,
        thu: p.thu,
        fri: p.fri,
      })),
    };
  });

  return NextResponse.json({
    students: result,
    dates,
    assignments,
  });
});
