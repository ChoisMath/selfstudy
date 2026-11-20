import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { SEAT_SESSION_TYPES, effectiveSeatSession, type SeatSessionType } from "@/lib/sessions";
import { isNightLayoutShared } from "@/lib/seats/shared-layout";
import {
  selectSeatGroupRooms,
  type StudentSeatGroup,
  type StudentSeatsResponse,
} from "@/lib/seats/student-seat-group";

const CLASSROOM_SELECT = { select: { classNumber: true, corridorSide: true } } as const;

// GET /api/student/seats — 내 좌석이 속한 교실(학급 분단 전부 또는 같은 접두사의 방 묶음)을 좌석 세션별로 반환
export const GET = withAuth(["student"], async (_req: Request, user) => {
  const myLayouts = await prisma.seatLayout.findMany({
    where: { studentId: user.userId },
    include: {
      room: {
        include: {
          classroom: CLASSROOM_SELECT,
          session: { select: { type: true, grade: true } },
        },
      },
    },
    orderBy: [{ room: { sortOrder: "asc" } }, { rowIndex: "asc" }, { colIndex: "asc" }],
  });

  // 오후가 야간 배치를 함께 쓰는 학년이면 보관 중인 오후 학급 좌석은 무시하고 야간 좌석을 오후에도 돌려준다
  const student = await prisma.student.findUnique({ where: { id: user.userId }, select: { grade: true } });
  const sharesNightLayout = student ? await isNightLayoutShared(student.grade) : false;

  async function buildGroup(seatSession: SeatSessionType): Promise<StudentSeatGroup | null> {
    const mine = myLayouts.find((layout) => layout.room.session.type === seatSession);
    if (!mine) return null;

    const sessionRooms = await prisma.room.findMany({
      where: { sessionId: mine.room.sessionId },
      include: { classroom: CLASSROOM_SELECT },
    });
    const selection = selectSeatGroupRooms(mine.room, sessionRooms, mine.room.session.grade);

    const seats = await prisma.seatLayout.findMany({
      where: { roomId: { in: selection.rooms.map((room) => room.id) } },
      include: { student: { select: { id: true, name: true, classNumber: true, studentNumber: true } } },
      orderBy: [{ rowIndex: "asc" }, { colIndex: "asc" }],
    });

    return {
      title: selection.title,
      kind: selection.kind,
      corridorSide: selection.corridorSide,
      rooms: selection.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        cols: room.cols,
        rows: room.rows,
        sortOrder: room.sortOrder,
        seats: seats
          .filter((seat) => seat.roomId === room.id)
          .map((seat) => ({ rowIndex: seat.rowIndex, colIndex: seat.colIndex, student: seat.student })),
      })),
      mySeat: { roomId: mine.roomId, rowIndex: mine.rowIndex, colIndex: mine.colIndex },
    };
  }

  const entries = await Promise.all(
    SEAT_SESSION_TYPES.map(
      async (seatSession) =>
        [seatSession, await buildGroup(effectiveSeatSession(seatSession, sharesNightLayout))] as const
    )
  );
  const response = { ...Object.fromEntries(entries), sharesNightLayout } as StudentSeatsResponse;
  return NextResponse.json(response);
});
