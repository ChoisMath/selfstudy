import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { parseClassroomConfig, planClassroomRooms } from "@/lib/seats/classroom-config";

function parseGrade(gradeStr: string): number | null {
  const grade = parseInt(gradeStr, 10);
  return isNaN(grade) || grade < 1 || grade > 3 ? null : grade;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseGrade(gradeStr);
  if (grade === null) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async () => {
    const session = await prisma.studySession.findUnique({
      where: { type_grade: { type: "afternoon", grade } },
      include: {
        classrooms: {
          orderBy: { sortOrder: "asc" },
          include: {
            rooms: {
              orderBy: { sortOrder: "asc" },
              include: {
                _count: { select: { seatLayouts: { where: { studentId: { not: null } } } } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ classrooms: [] });
    }

    const classrooms = session.classrooms.map((classroom) => ({
      id: classroom.id,
      classNumber: classroom.classNumber,
      corridorSide: classroom.corridorSide,
      layoutType: classroom.layoutType,
      sortOrder: classroom.sortOrder,
      rowsPerDivision: classroom.rooms.map((room) => room.rows),
      seatCount: classroom.rooms.reduce((sum, room) => sum + room.cols * room.rows, 0),
      assignedCount: classroom.rooms.reduce((sum, room) => sum + room._count.seatLayouts, 0),
    }));

    return NextResponse.json({ classrooms });
  })(req);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseGrade(gradeStr);
  if (grade === null) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req) => {
    const parsed = parseClassroomConfig(await req.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const config = parsed.config;

    const session = await prisma.studySession.findUnique({
      where: { type_grade: { type: "afternoon", grade } },
    });
    if (!session) {
      return NextResponse.json({ error: "오후 자율학습 세션이 없습니다." }, { status: 404 });
    }

    const duplicate = await prisma.classroom.findUnique({
      where: { sessionId_classNumber: { sessionId: session.id, classNumber: config.classNumber } },
    });
    if (duplicate) {
      return NextResponse.json({ error: "이미 있는 반 번호입니다." }, { status: 409 });
    }

    const classroom = await prisma.$transaction(async (tx) => {
      const created = await tx.classroom.create({
        data: {
          sessionId: session.id,
          classNumber: config.classNumber,
          corridorSide: config.corridorSide,
          layoutType: config.layoutType,
          sortOrder: config.classNumber,
        },
      });
      await tx.room.createMany({
        data: planClassroomRooms(grade, config).map((room) => ({
          ...room,
          sessionId: session.id,
          classroomId: created.id,
        })),
      });
      return created;
    });

    return NextResponse.json({ classroom }, { status: 201 });
  })(req);
}
