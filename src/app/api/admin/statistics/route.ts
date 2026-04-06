import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/admin/statistics?from=2026-04-01&to=2026-04-05&grade=2&class=1
export const GET = withAuth(["admin"], async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const grade = searchParams.get("grade");
  const cls = searchParams.get("class");

  if (!from || !to || !grade) {
    return NextResponse.json({ error: "from, to, grade 파라미터가 필요합니다." }, { status: 400 });
  }

  const gradeNum = parseInt(grade);
  const fromDate = new Date(from + "T00:00:00Z");
  const toDate = new Date(to + "T00:00:00Z");

  const studentWhere: Record<string, unknown> = { grade: gradeNum, isActive: true };
  if (cls) studentWhere.classNumber = parseInt(cls);

  const students = await prisma.student.findMany({
    where: studentWhere,
    orderBy: [{ classNumber: "asc" }, { studentNumber: "asc" }],
  });

  const attendances = await prisma.attendance.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      date: { gte: fromDate, lte: toDate },
    },
    include: { absenceReason: { select: { reasonType: true } } },
    orderBy: { date: "asc" },
  });

  // 학생별 출석 데이터 매핑
  const attendanceMap = new Map<number, typeof attendances>();
  for (const a of attendances) {
    const arr = attendanceMap.get(a.studentId) || [];
    arr.push(a);
    attendanceMap.set(a.studentId, arr);
  }

  // 날짜 범위 생성
  const dates: string[] = [];
  const d = new Date(fromDate);
  while (d <= toDate) {
    if (d.getDay() >= 1 && d.getDay() <= 5) {
      dates.push(d.toISOString().split("T")[0]);
    }
    d.setDate(d.getDate() + 1);
  }

  const result = students.map((s) => {
    const records = attendanceMap.get(s.id) || [];
    // O(1) 룩업을 위한 Map 변환
    const recordMap = new Map<string, typeof records[0]>();
    for (const r of records) {
      recordMap.set(`${r.date.toISOString().split("T")[0]}-${r.sessionType}`, r);
    }
    const byDate: Record<string, { afternoon?: string; night?: string; afternoonReason?: string; nightReason?: string }> = {};

    for (const date of dates) {
      const afternoon = recordMap.get(`${date}-afternoon`);
      const night = recordMap.get(`${date}-night`);

      byDate[date] = {
        afternoon: afternoon?.status || "unchecked",
        night: night?.status || "unchecked",
        afternoonReason: afternoon?.absenceReason?.reasonType,
        nightReason: night?.absenceReason?.reasonType,
      };
    }

    return {
      id: s.id,
      name: s.name,
      grade: s.grade,
      classNumber: s.classNumber,
      studentNumber: s.studentNumber,
      dates: byDate,
    };
  });

  return NextResponse.json({ students: result, dates });
});
