import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// PUT /api/homeroom/absence-requests/[id] - 승인/반려
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "잘못된 ID입니다." }, { status: 400 });
  }

  return withAuth(["homeroom", "admin"], async (req: Request, user) => {
    const isAdmin = user.roles?.includes("admin");
    const assignments = user.homeroomAssignments;
    if (!isAdmin && (!assignments || assignments.length === 0)) {
      return NextResponse.json({ error: "담임 배정이 없습니다." }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body; // "approved" | "rejected"

    if (action !== "approved" && action !== "rejected") {
      return NextResponse.json(
        { error: "action은 approved 또는 rejected이어야 합니다." },
        { status: 400 }
      );
    }

    // 신청 조회
    const request = await prisma.absenceRequest.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, grade: true, classNumber: true },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
    }

    // 자기 반 학생인지 확인 (admin은 전체 접근 가능)
    const isMyStudent = isAdmin || assignments?.some(
      (a) =>
        a.grade === request.student.grade &&
        a.classNumber === request.student.classNumber
    );

    if (!isMyStudent) {
      return NextResponse.json(
        { error: "자기 반 학생의 신청만 처리할 수 있습니다." },
        { status: 403 }
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 신청입니다." },
        { status: 400 }
      );
    }

    if (action === "approved") {
      // 승인 트랜잭션: AbsenceRequest.status -> approved + Attendance upsert(absent) + AbsenceReason create
      const result = await prisma.$transaction(async (tx) => {
        const updatedRequest = await tx.absenceRequest.update({
          where: { id },
          data: {
            status: "approved",
            reviewedBy: user.userId,
            reviewedAt: new Date(),
          },
        });

        const attendance = await tx.attendance.upsert({
          where: {
            studentId_sessionType_date: {
              studentId: request.studentId,
              sessionType: request.sessionType,
              date: request.date,
            },
          },
          update: {
            status: "absent",
            checkedBy: user.userId,
          },
          create: {
            studentId: request.studentId,
            sessionType: request.sessionType,
            date: request.date,
            status: "absent",
            checkedBy: user.userId,
          },
        });

        // 기존 사유가 있으면 업데이트, 없으면 생성
        const existingReason = await tx.absenceReason.findUnique({
          where: { attendanceId: attendance.id },
        });

        if (existingReason) {
          await tx.absenceReason.update({
            where: { id: existingReason.id },
            data: {
              reasonType: request.reasonType,
              detail: request.detail,
              registeredBy: user.userId,
            },
          });
        } else {
          await tx.absenceReason.create({
            data: {
              attendanceId: attendance.id,
              reasonType: request.reasonType,
              detail: request.detail,
              registeredBy: user.userId,
            },
          });
        }

        return updatedRequest;
      });

      return NextResponse.json({ success: true, request: result });
    } else {
      // 반려: status만 변경
      const updatedRequest = await prisma.absenceRequest.update({
        where: { id },
        data: {
          status: "rejected",
          reviewedBy: user.userId,
          reviewedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, request: updatedRequest });
    }
  })(req);
}
