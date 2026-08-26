import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { emptySessionRecord, isSessionType } from "@/lib/sessions";

// GET /api/homeroom/participation-days - 자기 반 참여설정 조회
export const GET = withAuth(["homeroom", "admin"], async (req: Request, user) => {
  const assignments = user.homeroomAssignments;
  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ error: "담임 배정이 없습니다." }, { status: 403 });
  }

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
      participationDays: true,
    },
  });

  const DEFAULT_DAYS = {
    isParticipating: true,
    mon: true, tue: true, wed: true, thu: true, fri: true,
    afterSchoolMon: false, afterSchoolTue: false, afterSchoolWed: false,
    afterSchoolThu: false, afterSchoolFri: false,
  };

  const result = students.map((student) => {
    const byType = new Map(student.participationDays.map((p) => [p.sessionType, p]));
    return {
      id: student.id,
      name: student.name,
      grade: student.grade,
      classNumber: student.classNumber,
      studentNumber: student.studentNumber,
      sessions: emptySessionRecord((t) => {
        const p = byType.get(t);
        return p
          ? {
              isParticipating: p.isParticipating,
              mon: p.mon, tue: p.tue, wed: p.wed, thu: p.thu, fri: p.fri,
              afterSchoolMon: p.afterSchoolMon, afterSchoolTue: p.afterSchoolTue,
              afterSchoolWed: p.afterSchoolWed, afterSchoolThu: p.afterSchoolThu,
              afterSchoolFri: p.afterSchoolFri,
            }
          : { ...DEFAULT_DAYS };
      }),
    };
  });

  return NextResponse.json({ students: result });
});

// PUT /api/homeroom/participation-days - 참여설정 수정
export const PUT = withAuth(["homeroom", "admin"], async (req: Request, user) => {
  const assignments = user.homeroomAssignments;
  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ error: "담임 배정이 없습니다." }, { status: 403 });
  }

  const body = await req.json();
  const { studentId, sessionType, isParticipating, mon, tue, wed, thu, fri,
          afterSchoolMon, afterSchoolTue, afterSchoolWed, afterSchoolThu, afterSchoolFri } = body;

  if (!studentId || !sessionType) {
    return NextResponse.json(
      { error: "studentId와 sessionType은 필수입니다." },
      { status: 400 }
    );
  }

  if (!isSessionType(sessionType)) {
    return NextResponse.json({ error: "유효하지 않은 sessionType 입니다." }, { status: 400 });
  }

  // 자기 반 학생인지 확인
  const classConditions = assignments.map((a) => ({
    grade: a.grade,
    classNumber: a.classNumber,
  }));

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      isActive: true,
      OR: classConditions,
    },
  });

  if (!student) {
    return NextResponse.json(
      { error: "자기 반 학생을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const participationDay = await prisma.participationDay.upsert({
    where: {
      studentId_sessionType: {
        studentId,
        sessionType,
      },
    },
    update: {
      isParticipating: isParticipating ?? true,
      mon: mon ?? true,
      tue: tue ?? true,
      wed: wed ?? true,
      thu: thu ?? true,
      fri: fri ?? true,
      afterSchoolMon: afterSchoolMon ?? false,
      afterSchoolTue: afterSchoolTue ?? false,
      afterSchoolWed: afterSchoolWed ?? false,
      afterSchoolThu: afterSchoolThu ?? false,
      afterSchoolFri: afterSchoolFri ?? false,
    },
    create: {
      studentId,
      sessionType,
      isParticipating: isParticipating ?? true,
      mon: mon ?? true,
      tue: tue ?? true,
      wed: wed ?? true,
      thu: thu ?? true,
      fri: fri ?? true,
      afterSchoolMon: afterSchoolMon ?? false,
      afterSchoolTue: afterSchoolTue ?? false,
      afterSchoolWed: afterSchoolWed ?? false,
      afterSchoolThu: afterSchoolThu ?? false,
      afterSchoolFri: afterSchoolFri ?? false,
    },
  });

  return NextResponse.json({ participationDay });
});
