import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET: 학년별 학생 참여설정 목록 조회
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
    const students = await prisma.student.findMany({
      where: { grade, isActive: true },
      orderBy: [{ classNumber: "asc" }, { studentNumber: "asc" }],
      include: {
        participationDays: true,
      },
    });

    const result = students.map((student) => {
      const afternoon = student.participationDays.find(
        (p) => p.sessionType === "afternoon"
      );
      const night = student.participationDays.find(
        (p) => p.sessionType === "night"
      );

      return {
        id: student.id,
        name: student.name,
        classNumber: student.classNumber,
        studentNumber: student.studentNumber,
        afternoon: afternoon
          ? {
              isParticipating: afternoon.isParticipating,
              mon: afternoon.mon,
              tue: afternoon.tue,
              wed: afternoon.wed,
              thu: afternoon.thu,
              fri: afternoon.fri,
            }
          : {
              isParticipating: true,
              mon: true,
              tue: true,
              wed: true,
              thu: true,
              fri: true,
            },
        night: night
          ? {
              isParticipating: night.isParticipating,
              mon: night.mon,
              tue: night.tue,
              wed: night.wed,
              thu: night.thu,
              fri: night.fri,
            }
          : {
              isParticipating: true,
              mon: true,
              tue: true,
              wed: true,
              thu: true,
              fri: true,
            },
      };
    });

    return NextResponse.json({ students: result });
  })(req);
}

// PUT: 학생 참여설정 수정 (upsert)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseInt(gradeStr, 10);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req, user) => {
    const body = await req.json();
    const { sessionType, isParticipating } = body;

    if (sessionType !== "afternoon" && sessionType !== "night") {
      return NextResponse.json(
        { error: "sessionType은 afternoon 또는 night이어야 합니다." },
        { status: 400 }
      );
    }

    // 일괄 업데이트: studentIds 배열이 있으면 bulk 처리
    if (body.studentIds && Array.isArray(body.studentIds)) {
      const studentIds: number[] = body.studentIds;
      const updates = studentIds.map((sid) =>
        prisma.participationDay.upsert({
          where: { studentId_sessionType: { studentId: sid, sessionType } },
          update: { isParticipating: isParticipating ?? true },
          create: { studentId: sid, sessionType, isParticipating: isParticipating ?? true },
        })
      );
      await prisma.$transaction(updates);
      return NextResponse.json({ count: studentIds.length });
    }

    const { studentId, mon, tue, wed, thu, fri } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId는 필수입니다." },
        { status: 400 }
      );
    }

    // 해당 학년 학생인지 확인
    const student = await prisma.student.findFirst({
      where: { id: studentId, grade },
    });

    if (!student) {
      return NextResponse.json(
        { error: "해당 학년의 학생을 찾을 수 없습니다." },
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
      },
    });

    return NextResponse.json({ participationDay });
  })(req);
}
