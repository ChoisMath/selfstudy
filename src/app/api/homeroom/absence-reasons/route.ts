import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { ReasonType } from "@/generated/prisma/client";

const VALID_REASON_TYPES: ReasonType[] = ["academy", "afterschool", "illness", "custom"];

// POST /api/homeroom/absence-reasons - 불참사유 등록
export const POST = withAuth(["homeroom", "admin"], async (req: Request, user) => {
  const assignments = user.homeroomAssignments;
  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ error: "담임 배정이 없습니다." }, { status: 403 });
  }

  const body = await req.json();
  const { studentId, date, sessionType, reasonType, detail } = body;

  if (!studentId || !date || !sessionType || !reasonType) {
    return NextResponse.json(
      { error: "studentId, date, sessionType, reasonType은 필수입니다." },
      { status: 400 }
    );
  }

  if (sessionType !== "afternoon" && sessionType !== "night") {
    return NextResponse.json(
      { error: "sessionType은 afternoon 또는 night이어야 합니다." },
      { status: 400 }
    );
  }

  if (!VALID_REASON_TYPES.includes(reasonType)) {
    return NextResponse.json(
      { error: "올바른 사유 유형을 선택하세요." },
      { status: 400 }
    );
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

  const targetDate = new Date(date + "T00:00:00.000Z");

  // 트랜잭션: Attendance upsert(absent) + AbsenceReason create
  const result = await prisma.$transaction(async (tx) => {
    const attendance = await tx.attendance.upsert({
      where: {
        studentId_sessionType_date: {
          studentId,
          sessionType,
          date: targetDate,
        },
      },
      update: {
        status: "absent",
        checkedBy: user.userId,
      },
      create: {
        studentId,
        sessionType,
        date: targetDate,
        status: "absent",
        checkedBy: user.userId,
      },
    });

    // 기존 사유가 있으면 업데이트, 없으면 생성
    const existingReason = await tx.absenceReason.findUnique({
      where: { attendanceId: attendance.id },
    });

    let absenceReason;
    if (existingReason) {
      absenceReason = await tx.absenceReason.update({
        where: { id: existingReason.id },
        data: {
          reasonType,
          detail: detail || null,
          registeredBy: user.userId,
        },
      });
    } else {
      absenceReason = await tx.absenceReason.create({
        data: {
          attendanceId: attendance.id,
          reasonType,
          detail: detail || null,
          registeredBy: user.userId,
        },
      });
    }

    return { attendance, absenceReason };
  });

  return NextResponse.json({ success: true, ...result });
});
