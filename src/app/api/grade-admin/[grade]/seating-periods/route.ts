import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET: 학년별 좌석 배치 기간 목록
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
    const periods = await prisma.seatingPeriod.findMany({
      where: { grade },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({ periods });
  })(req);
}

// POST: 좌석 배치 기간 생성
export async function POST(
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
    const { name, startDate, endDate } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "이름, 시작일, 종료일은 필수 항목입니다." },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "올바른 날짜 형식이 아닙니다." },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { error: "시작일이 종료일보다 늦을 수 없습니다." },
        { status: 400 }
      );
    }

    const period = await prisma.seatingPeriod.create({
      data: {
        name: name.trim(),
        startDate: start,
        endDate: end,
        grade,
        isActive: true,
      },
    });

    return NextResponse.json({ period }, { status: 201 });
  })(req);
}
