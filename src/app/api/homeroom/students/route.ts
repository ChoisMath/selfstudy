import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/homeroom/students - 자기 반 학생 + 이번 주 출석 데이터
export const GET = withAuth(["homeroom", "admin"], async (req: Request, user) => {
  const isAdmin = user.roles?.includes("admin");
  const assignments = user.homeroomAssignments;
  if (!isAdmin && (!assignments || assignments.length === 0)) {
    return NextResponse.json({ error: "담임 배정이 없습니다." }, { status: 403 });
  }

  // 주간 계산 (week 파라미터: YYYY-MM-DD 형식의 월요일 날짜, 없으면 이번 주)
  const url = new URL(req.url);
  const weekParam = url.searchParams.get("week");

  let monday: Date;
  if (weekParam) {
    monday = new Date(weekParam + "T00:00:00");
  } else {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
  }
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  // admin은 전체 학생, 담임은 자기 반 학생만 조회
  const classConditions = isAdmin && (!assignments || assignments.length === 0)
    ? undefined
    : assignments!.map((a) => ({
        grade: a.grade,
        classNumber: a.classNumber,
      }));

  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      ...(classConditions ? { OR: classConditions } : {}),
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
        include: { absenceReason: { select: { reasonType: true, detail: true } } },
      },
      participationDays: {
        select: {
          sessionType: true, isParticipating: true,
          mon: true, tue: true, wed: true, thu: true, fri: true,
          afterSchoolMon: true, afterSchoolTue: true, afterSchoolWed: true,
          afterSchoolThu: true, afterSchoolFri: true,
        },
      },
      attendanceNotes: {
        where: {
          date: { gte: monday, lte: friday },
        },
        select: { date: true, sessionType: true, note: true },
      },
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
      reasonType: a.absenceReason?.reasonType || null,
      reasonDetail: a.absenceReason?.detail || null,
    })),
    participationDays: student.participationDays.map((p) => ({
      sessionType: p.sessionType,
      isParticipating: p.isParticipating,
      mon: p.mon, tue: p.tue, wed: p.wed, thu: p.thu, fri: p.fri,
      afterSchoolMon: p.afterSchoolMon, afterSchoolTue: p.afterSchoolTue,
      afterSchoolWed: p.afterSchoolWed, afterSchoolThu: p.afterSchoolThu,
      afterSchoolFri: p.afterSchoolFri,
    })),
    attendanceNotes: student.attendanceNotes.map((n) => ({
      date: n.date.toISOString().split("T")[0],
      sessionType: n.sessionType,
      note: n.note,
    })),
  }));

  return NextResponse.json({
    students: result,
    weekStart: monday.toISOString().split("T")[0],
    weekEnd: friday.toISOString().split("T")[0],
    assignments,
  });
});
