import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withGradeAuth } from "@/lib/api-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseInt(gradeStr, 10);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req, user) => {
    const url = new URL(req.url);
    const monthStr = url.searchParams.get("month");

    let year: number, monthIdx: number;
    if (monthStr) {
      [year, monthIdx] = monthStr.split("-").map(Number);
      monthIdx -= 1;
    } else {
      const now = new Date();
      year = now.getFullYear();
      monthIdx = now.getMonth();
    }

    const startDate = new Date(year, monthIdx, 1);
    const endDate = new Date(year, monthIdx + 1, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const dates: string[] = [];
    const d = new Date(startDate);
    while (d <= endDate) {
      if (d.getDay() >= 1 && d.getDay() <= 5) {
        dates.push(d.toISOString().split("T")[0]);
      }
      d.setDate(d.getDate() + 1);
    }

    const students = await prisma.student.findMany({
      where: { grade, isActive: true },
      orderBy: [{ classNumber: "asc" }, { studentNumber: "asc" }],
      include: {
        attendances: {
          where: { date: { gte: startDate, lte: endDate } },
          include: { absenceReason: { select: { reasonType: true } } },
        },
        participationDays: true,
      },
    });

    const result = students.map((student) => {
      const attMap = new Map<string, typeof student.attendances[0]>();
      for (const a of student.attendances) {
        attMap.set(`${a.date.toISOString().split("T")[0]}-${a.sessionType}`, a);
      }

      const dateMap: Record<string, {
        afternoon?: string;
        night?: string;
        afternoonReason?: string;
        nightReason?: string;
      }> = {};

      for (const date of dates) {
        const afternoon = attMap.get(`${date}-afternoon`);
        const night = attMap.get(`${date}-night`);
        dateMap[date] = {
          afternoon: afternoon?.status,
          night: night?.status,
          afternoonReason: afternoon?.absenceReason?.reasonType,
          nightReason: night?.absenceReason?.reasonType,
        };
      }

      const totalMinutes = student.attendances
        .filter((a) => a.status === "present")
        .reduce((sum, a) => sum + (a.durationMinutes ?? 100), 0);
      const studyHours = Math.round((totalMinutes / 60) * 10) / 10;

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
          mon: p.mon, tue: p.tue, wed: p.wed, thu: p.thu, fri: p.fri,
          afterSchoolMon: p.afterSchoolMon, afterSchoolTue: p.afterSchoolTue,
          afterSchoolWed: p.afterSchoolWed, afterSchoolThu: p.afterSchoolThu,
          afterSchoolFri: p.afterSchoolFri,
        })),
        studyHours,
      };
    });

    return NextResponse.json({ students: result, dates });
  })(req);
}
