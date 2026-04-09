import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// PUT /api/supervisor-assignments/:id/swap
// 실제로는 /api/supervisor-assignments/[id] 에서 swap body를 처리
export const PUT = withAuth(["teacher"], async (req: Request, user) => {
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

  // 같은 날짜, 같은 학년의 오후+야간 배정 모두 찾기
  const pairAssignments = await prisma.supervisorAssignment.findMany({
    where: {
      grade: assignment.grade,
      date: assignment.date,
      teacherId: assignment.teacherId,
    },
  });

  // 트랜잭션으로 교체 처리 (오후+야간 모두)
  await prisma.$transaction([
    // 이력 기록 (대표 1건)
    prisma.supervisorSwapHistory.create({
      data: {
        assignmentId: assignment.id,
        originalTeacherId: assignment.teacherId,
        replacementTeacherId,
        reason,
        isCrossGrade,
      },
    }),
    // 같은 날 같은 학년 배정 모두 업데이트
    ...pairAssignments.map((a) =>
      prisma.supervisorAssignment.update({
        where: { id: a.id },
        data: { teacherId: replacementTeacherId },
      })
    ),
  ]);

  return NextResponse.json({ success: true, isCrossGrade });
});
