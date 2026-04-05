import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import type { SessionType } from "@/generated/prisma/client";

// GET /api/attendance?date=2026-04-05&session=afternoon&grade=2
export const GET = withAuth(
  ["teacher"],
  async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const session = searchParams.get("session") as SessionType;
    const grade = searchParams.get("grade");

    if (!date || !session || !grade) {
      return NextResponse.json({ error: "date, session, grade 파라미터가 필요합니다." }, { status: 400 });
    }

    const gradeNum = parseInt(grade);
    const dateObj = new Date(date + "T00:00:00Z");

    // 해당 학년 + 세션의 교실(Room) 목록
    const studySession = await prisma.studySession.findUnique({
      where: { type_grade: { type: session, grade: gradeNum } },
      include: {
        rooms: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!studySession) {
      return NextResponse.json({ rooms: [], attendances: {} });
    }

    // 좌석 배치 조회 (SeatingPeriod 없이 직접 조회)
    const seatLayouts = await prisma.seatLayout.findMany({
      where: {
        roomId: { in: studySession.rooms.map((r) => r.id) },
      },
      include: {
        student: {
          include: {
            participationDays: {
              where: { sessionType: session },
            },
          },
        },
      },
      orderBy: [{ rowIndex: "asc" }, { colIndex: "asc" }],
    });

    // 독립 쿼리 3개 병렬 실행
    const [attendances, supervisorAssignment, approvedAbsences] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          date: dateObj,
          sessionType: session,
          student: { grade: gradeNum },
        },
        include: { absenceReason: true },
      }),
      prisma.supervisorAssignment.findUnique({
        where: {
          date_grade_sessionType: { date: dateObj, grade: gradeNum, sessionType: session },
        },
        include: { teacher: { select: { id: true, name: true } } },
      }),
      prisma.absenceRequest.findMany({
        where: {
          date: dateObj,
          sessionType: session,
          status: "approved",
          student: { grade: gradeNum },
        },
        select: { studentId: true },
      }),
    ]);

    const attendanceMap: Record<number, { id: number; status: string; absenceReason?: { reasonType: string; detail: string | null } }> = {};
    for (const a of attendances) {
      attendanceMap[a.studentId] = {
        id: a.id,
        status: a.status,
        absenceReason: a.absenceReason
          ? { reasonType: a.absenceReason.reasonType, detail: a.absenceReason.detail }
          : undefined,
      };
    }

    const approvedStudentIds = new Set(approvedAbsences.map((a) => a.studentId));

    // Room별 좌석 그룹핑
    const seatsByRoom = new Map<number, typeof seatLayouts>();
    for (const seat of seatLayouts) {
      const arr = seatsByRoom.get(seat.roomId) || [];
      arr.push(seat);
      seatsByRoom.set(seat.roomId, arr);
    }

    return NextResponse.json({
      rooms: studySession.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        cols: room.cols,
        rows: room.rows,
        sortOrder: room.sortOrder,
        seats: (seatsByRoom.get(room.id) || []).map((seat) => ({
          rowIndex: seat.rowIndex,
          colIndex: seat.colIndex,
          student: seat.student
            ? {
                id: seat.student.id,
                name: seat.student.name,
                classNumber: seat.student.classNumber,
                studentNumber: seat.student.studentNumber,
                isParticipating: seat.student.participationDays[0]?.isParticipating ?? false,
                isApprovedAbsence: approvedStudentIds.has(seat.student.id),
              }
            : null,
        })),
      })),
      attendances: attendanceMap,
      supervisor: supervisorAssignment?.teacher || null,
    });
  }
);
