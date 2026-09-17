import type { CorridorSide } from "@/lib/seats/classroom-config";
import { classroomTitle, roomPrefix } from "@/lib/seats/print-groups";
import type { SeatSessionType } from "@/lib/sessions";

export type StudentSeatRoomInput = {
  id: number;
  name: string;
  cols: number;
  rows: number;
  sortOrder: number;
  classroomId: number | null;
  classroom?: { classNumber: number; corridorSide: CorridorSide } | null;
};

export type SeatGroupKind = "classroom" | "room";

export type SeatGroupSelection<T extends StudentSeatRoomInput> = {
  kind: SeatGroupKind;
  title: string;
  corridorSide: CorridorSide | null;
  rooms: T[];
};

// 학급 교실이면 그 Classroom 의 분단 전부, 아니면 같은 이름 접두사의 방 묶음(인쇄 그룹과 같은 규칙)
export function selectSeatGroupRooms<T extends StudentSeatRoomInput>(
  myRoom: StudentSeatRoomInput,
  sessionRooms: T[],
  grade: number
): SeatGroupSelection<T> {
  const byOrder = (a: T, b: T) => a.sortOrder - b.sortOrder || a.id - b.id;

  if (myRoom.classroomId != null) {
    const rooms = sessionRooms.filter((r) => r.classroomId === myRoom.classroomId).sort(byOrder);
    const meta = myRoom.classroom;
    return {
      kind: "classroom",
      title: meta ? classroomTitle(grade, meta.classNumber) : roomPrefix(myRoom.name),
      corridorSide: meta?.corridorSide ?? null,
      rooms,
    };
  }

  const prefix = roomPrefix(myRoom.name);
  const rooms = sessionRooms
    .filter((r) => r.classroomId == null && roomPrefix(r.name) === prefix)
    .sort(byOrder);
  return { kind: "room", title: prefix, corridorSide: null, rooms };
}

export type StudentSeatStudent = { id: number; name: string; classNumber: number; studentNumber: number };
export type StudentSeatCell = { rowIndex: number; colIndex: number; student: StudentSeatStudent | null };
export type StudentSeatRoom = {
  id: number;
  name: string;
  cols: number;
  rows: number;
  sortOrder: number;
  seats: StudentSeatCell[];
};
export type StudentSeatGroup = {
  title: string;
  kind: SeatGroupKind;
  corridorSide: CorridorSide | null;
  rooms: StudentSeatRoom[];
  mySeat: { roomId: number; rowIndex: number; colIndex: number };
};
export type StudentSeatsResponse = Record<SeatSessionType, StudentSeatGroup | null>;
