import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// PUT /api/supervisor-assignments/:id/swap
// 실제로는 /api/supervisor-assignments/[id] 에서 swap body를 처리
export const PUT = withAuth(["supervisor", "homeroom"], async (req: Request, user) => {
  const url = new URL(req.url);
  const id = parseInt(url.pathname.split("/").slice(-1)[0]);
  const body = await req.json();
  const { replacementTeacherId, reason } = body;

  if (!replacementTeacherId) {
    return NextResponse.json({ error: "교체 대상 교사를 선택하세요." }, { status: 400 });
  }

  const assignment = await prisma.supervisorAssignment.findUnique({
    where: { id },
    include: { teacher: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: "배정을 찾을 수 없습니다." }, { status: 404 });
  }

  // 교체 대상 교사의 학년 확인 (타학년 교체 여부)
  const replacementTeacher = await prisma.teacher.findUnique({
    where: { id: replacementTeacherId },
    include: { homeroomAssignments: true },
  });

  const isCrossGrade =
    replacementTeacher?.homeroomAssignments.every(
      (h) => h.grade !== assignment.grade
    ) ?? true;

  // 트랜잭션으로 교체 처리
  await prisma.$transaction([
    // 이력 기록
    prisma.supervisorSwapHistory.create({
      data: {
        assignmentId: assignment.id,
        originalTeacherId: assignment.teacherId,
        replacementTeacherId,
        reason,
        isCrossGrade,
      },
    }),
    // 배정 업데이트
    prisma.supervisorAssignment.update({
      where: { id },
      data: { teacherId: replacementTeacherId },
    }),
  ]);

  return NextResponse.json({ success: true, isCrossGrade });
});
