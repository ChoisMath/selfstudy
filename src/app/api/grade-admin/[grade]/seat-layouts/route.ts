import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET: 특정 기간 + 학년의 좌석 배치 조회
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
    const periodId = searchParams.get("periodId");
    const sessionType = searchParams.get("sessionType");

    if (!periodId) {
      return NextResponse.json(
        { error: "periodId는 필수입니다." },
        { status: 400 }
      );
    }

    const pid = parseInt(periodId, 10);
    if (isNaN(pid)) {
      return NextResponse.json(
        { error: "올바른 periodId가 아닙니다." },
        { status: 400 }
      );
    }

    // 해당 학년의 기간인지 확인
    const period = await prisma.seatingPeriod.findFirst({
      where: { id: pid, grade },
    });

    if (!period) {
      return NextResponse.json(
        { error: "배치 기간을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 학년 + 세션타입별 Room 조회
    const sessionWhere: { grade: number; type?: "afternoon" | "night" } = { grade };
    if (sessionType === "afternoon" || sessionType === "night") {
      sessionWhere.type = sessionType;
    }

    const sessions = await prisma.studySession.findMany({
      where: sessionWhere,
      include: {
        rooms: {
          orderBy: { sortOrder: "asc" },
          include: {
            seatLayouts: {
              where: { periodId: pid },
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    grade: true,
                    classNumber: true,
                    studentNumber: true,
                  },
                },
              },
              orderBy: [{ rowIndex: "asc" }, { colIndex: "asc" }],
            },
          },
        },
      },
    });

    return NextResponse.json({ sessions });
  })(req);
}

// POST: 좌석 배치 저장 (전체 교체 방식)
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
    const { periodId, roomId, layouts } = body;

    if (!periodId || !roomId || !Array.isArray(layouts)) {
      return NextResponse.json(
        { error: "periodId, roomId, layouts는 필수입니다." },
        { status: 400 }
      );
    }

    const pid = parseInt(periodId, 10);
    const rid = parseInt(roomId, 10);

    // 기간이 해당 학년에 속하는지 확인
    const period = await prisma.seatingPeriod.findFirst({
      where: { id: pid, grade },
    });

    if (!period) {
      return NextResponse.json(
        { error: "배치 기간을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Room이 해당 학년 세션에 속하는지 확인
    const room = await prisma.room.findFirst({
      where: {
        id: rid,
        session: { grade },
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "교실을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 트랜잭션: 기존 삭제 -> 새로 생성
    await prisma.$transaction(async (tx) => {
      // 해당 기간 + 교실의 기존 레이아웃 삭제
      await tx.seatLayout.deleteMany({
        where: { periodId: pid, roomId: rid },
      });

      // 새 레이아웃 생성
      if (layouts.length > 0) {
        await tx.seatLayout.createMany({
          data: layouts.map(
            (l: { rowIndex: number; colIndex: number; studentId?: number | null }) => ({
              periodId: pid,
              roomId: rid,
              rowIndex: l.rowIndex,
              colIndex: l.colIndex,
              studentId: l.studentId ?? null,
            })
          ),
        });
      }
    });

    return NextResponse.json({ success: true });
  })(req);
}
