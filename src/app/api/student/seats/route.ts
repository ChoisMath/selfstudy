import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { SEAT_SESSION_TYPES, type SeatSessionType } from "@/lib/sessions";
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
    SEAT_SESSION_TYPES.map(async (seatSession) => [seatSession, await buildGroup(seatSession)] as const)
  );
  const response = Object.fromEntries(entries) as StudentSeatsResponse;
  return NextResponse.json(response);
});
