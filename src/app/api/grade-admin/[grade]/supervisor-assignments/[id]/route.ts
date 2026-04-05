import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// DELETE: 감독 배정 해제
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ grade: string; id: string }> }
) {
  const { grade: gradeStr, id: idStr } = await params;
  const grade = parseInt(gradeStr, 10);
  const id = parseInt(idStr, 10);

  if (isNaN(grade) || isNaN(id)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req, user) => {
    const assignment = await prisma.supervisorAssignment.findFirst({
      where: { id, grade },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "배정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 같은 날짜, 같은 학년의 오후+야간 모두 삭제 (교체이력 먼저 정리)
    await prisma.$transaction(async (tx) => {
      await tx.supervisorSwapHistory.deleteMany({
        where: { assignment: { grade, date: assignment.date } },
      });
      await tx.supervisorAssignment.deleteMany({
        where: { grade, date: assignment.date },
      });
    });

    return NextResponse.json({ success: true });
  })(req);
}
