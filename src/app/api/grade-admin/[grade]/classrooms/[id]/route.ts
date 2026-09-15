import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  isGeometryChanged,
  parseClassroomConfig,
  planClassroomRooms,
} from "@/lib/seats/classroom-config";

type RouteParams = { params: Promise<{ grade: string; id: string }> };

function parseIds(gradeStr: string, idStr: string): { grade: number; id: number } | null {
  const grade = parseInt(gradeStr, 10);
  const id = parseInt(idStr, 10);
  if (isNaN(grade) || grade < 1 || grade > 3 || isNaN(id)) return null;
  return { grade, id };
}

async function findOwnedClassroom(id: number, grade: number) {
  const classroom = await prisma.classroom.findUnique({
    where: { id },
    include: { session: true, rooms: { orderBy: { sortOrder: "asc" } } },
  });
  if (!classroom || classroom.session.grade !== grade) return null;
  return classroom;
}

export async function PUT(req: Request, { params }: RouteParams) {
  const { grade: gradeStr, id: idStr } = await params;
  const ids = parseIds(gradeStr, idStr);
  if (!ids) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { grade, id } = ids;

  return withGradeAuth(grade, async (req) => {
    const parsed = parseClassroomConfig(await req.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const config = parsed.config;

    const classroom = await findOwnedClassroom(id, grade);
    if (!classroom) {
      return NextResponse.json({ error: "교실을 찾을 수 없습니다." }, { status: 404 });
    }

    if (config.classNumber !== classroom.classNumber) {
      const duplicate = await prisma.classroom.findUnique({
        where: { sessionId_classNumber: { sessionId: classroom.sessionId, classNumber: config.classNumber } },
      });
      if (duplicate) {
        return NextResponse.json({ error: "이미 있는 반 번호입니다." }, { status: 409 });
      }
    }

    const reset = isGeometryChanged(classroom.rooms, config);
    const plannedRooms = planClassroomRooms(grade, config);

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.classroom.update({
        where: { id },
        data: {
          classNumber: config.classNumber,
          corridorSide: config.corridorSide,
          layoutType: config.layoutType,
          sortOrder: config.classNumber,
        },
      });

      if (reset) {
        const roomIds = classroom.rooms.map((room) => room.id);
        await tx.seatLayout.deleteMany({ where: { roomId: { in: roomIds } } });
        await tx.room.deleteMany({ where: { id: { in: roomIds } } });
        await tx.room.createMany({
          data: plannedRooms.map((room) => ({ ...room, sessionId: classroom.sessionId, classroomId: id })),
        });
      } else if (config.classNumber !== classroom.classNumber) {
        // 기하가 같으면 Room 순서도 같다 — 이름만 새 반 번호로 바꾼다
        for (const [index, room] of classroom.rooms.entries()) {
          await tx.room.update({ where: { id: room.id }, data: { name: plannedRooms[index].name } });
        }
      }

      return next;
    });

    return NextResponse.json({ classroom: updated, reset });
  })(req);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { grade: gradeStr, id: idStr } = await params;
  const ids = parseIds(gradeStr, idStr);
  if (!ids) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { grade, id } = ids;

  return withGradeAuth(grade, async () => {
    const classroom = await findOwnedClassroom(id, grade);
    if (!classroom) {
      return NextResponse.json({ error: "교실을 찾을 수 없습니다." }, { status: 404 });
    }

    const roomIds = classroom.rooms.map((room) => room.id);
    await prisma.$transaction(async (tx) => {
      await tx.seatLayout.deleteMany({ where: { roomId: { in: roomIds } } });
      await tx.room.deleteMany({ where: { id: { in: roomIds } } });
      await tx.classroom.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  })(req);
}
