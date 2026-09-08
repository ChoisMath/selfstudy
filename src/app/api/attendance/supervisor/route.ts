import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { REPRESENTATIVE_SESSION_TYPE } from "@/lib/sessions";

// GET /api/attendance/supervisor?date=2026-09-08&grade=1
// 감독 배정은 학년·날짜당 한 명이며 세 블록이 함께 생성/삭제되므로 대표 블록만 조회한다.
export const GET = withAuth(["teacher"], async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const grade = searchParams.get("grade");

  if (!date || !grade) {
    return NextResponse.json({ error: "date, grade 파라미터가 필요합니다." }, { status: 400 });
  }

  const gradeNum = parseInt(grade, 10);
  if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 3) {
    return NextResponse.json({ error: "유효하지 않은 학년입니다." }, { status: 400 });
  }

  const dateObj = new Date(date + "T00:00:00Z");
  if (isNaN(dateObj.getTime())) {
    return NextResponse.json({ error: "유효하지 않은 날짜 형식입니다." }, { status: 400 });
  }

  const assignment = await prisma.supervisorAssignment.findUnique({
    where: {
      date_grade_sessionType: {
        date: dateObj,
        grade: gradeNum,
        sessionType: REPRESENTATIVE_SESSION_TYPE,
      },
    },
    include: { teacher: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ supervisor: assignment?.teacher ?? null });
});
