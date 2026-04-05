import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET: 학년 + 세션타입의 좌석 배치 조회
export async function GET(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseInt(gradeStr, 10);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req) => {
    const { searchParams } = new URL(req.url);
    const sessionType = searchParams.get("sessionType");

    if (sessionType !== "afternoon" && sessionType !== "night") {
      return NextResponse.json(
        { error: "sessionType은 afternoon 또는 night이어야 합니다." },
        { status: 400 }
      );
    }

    const sessions = await prisma.studySession.findMany({
      where: { grade, type: sessionType },
      include: {
        rooms: {
          orderBy: { sortOrder: "asc" },
          include: {
            seatLayouts: {
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

  return withGradeAuth(grade, async (req) => {
    const body = await req.json();
    const { roomId, layouts } = body;

    if (!roomId || !Array.isArray(layouts)) {
      return NextResponse.json(
        { error: "roomId, layouts는 필수입니다." },
        { status: 400 }
      );
    }

    const rid = parseInt(roomId, 10);

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

    await prisma.$transaction(async (tx) => {
      await tx.seatLayout.deleteMany({
        where: { roomId: rid },
      });

      if (layouts.length > 0) {
        await tx.seatLayout.createMany({
          data: layouts.map(
            (l: { rowIndex: number; colIndex: number; studentId?: number | null }) => ({
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
