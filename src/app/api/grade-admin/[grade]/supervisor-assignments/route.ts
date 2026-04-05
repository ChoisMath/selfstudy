import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET: 학년별 감독교사 배정 목록 조회
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
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "from, to 파라미터는 필수입니다." },
        { status: 400 }
      );
    }

    const fromDate = new Date(from + "T00:00:00.000Z");
    const toDate = new Date(to + "T00:00:00.000Z");

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: "유효하지 않은 날짜 형식입니다." },
        { status: 400 }
      );
    }

    const assignments = await prisma.supervisorAssignment.findMany({
      where: {
        grade,
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ date: "asc" }, { sessionType: "asc" }],
    });

    return NextResponse.json({ assignments });
  })(req);
}

// POST: 감독교사 배정 (upsert)
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
    const { teacherId, date } = body;

    if (!teacherId || !date) {
      return NextResponse.json(
        { error: "teacherId, date는 필수 항목입니다." },
        { status: 400 }
      );
    }

    const parsedDate = new Date(date + "T00:00:00.000Z");
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "유효하지 않은 날짜 형식입니다." },
        { status: 400 }
      );
    }

    const tid = parseInt(teacherId, 10);
    if (isNaN(tid)) {
      return NextResponse.json(
        { error: "유효하지 않은 교사 ID입니다." },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: tid },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "교사를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 오후 + 야간 동시 배정 (upsert)
    const [afternoon, night] = await Promise.all(
      (["afternoon", "night"] as const).map((sessionType) =>
        prisma.supervisorAssignment.upsert({
          where: {
            date_grade_sessionType: { date: parsedDate, grade, sessionType },
          },
          update: { teacherId: tid },
          create: { teacherId: tid, date: parsedDate, grade, sessionType },
          include: { teacher: { select: { id: true, name: true } } },
        })
      )
    );

    return NextResponse.json({ assignment: afternoon, assignments: [afternoon, night] }, { status: 200 });
  })(req);
}
