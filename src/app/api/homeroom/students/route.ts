import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/homeroom/students - 자기 반 학생 + 이번 주 출석 데이터
export const GET = withAuth(["homeroom", "admin"], async (req: Request, user) => {
  const assignments = user.homeroomAssignments;
  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ error: "담임 배정이 없습니다." }, { status: 403 });
  }

  // 이번 주 월요일~금요일 계산
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  // 모든 담임 반의 학생 조회
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
          date: {
            gte: monday,
            lte: friday,
          },
        },
      },
      participationDays: true,
    },
  });

  const result = students.map((student) => ({
    id: student.id,
    name: student.name,
    grade: student.grade,
    classNumber: student.classNumber,
    studentNumber: student.studentNumber,
    attendances: student.attendances.map((a) => ({
      date: a.date.toISOString().split("T")[0],
      sessionType: a.sessionType,
      status: a.status,
    })),
    participationDays: student.participationDays.map((p) => ({
      sessionType: p.sessionType,
      isParticipating: p.isParticipating,
      mon: p.mon,
      tue: p.tue,
      wed: p.wed,
      thu: p.thu,
      fri: p.fri,
    })),
  }));

  return NextResponse.json({
    students: result,
    weekStart: monday.toISOString().split("T")[0],
    weekEnd: friday.toISOString().split("T")[0],
    assignments,
  });
});
