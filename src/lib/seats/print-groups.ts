import { type SeatSessionType } from "@/lib/sessions";
import type { ClassroomLayoutType, CorridorSide } from "@/lib/seats/classroom-config";

export type ClassroomMeta = {
  id: number;
  classNumber: number;
  corridorSide: CorridorSide;
  layoutType: ClassroomLayoutType;
  sortOrder: number;
};

export type PrintBaseRoom = {
  id: number;
  name: string;
  cols: number;
  rows: number;
  sortOrder: number;
  classroom?: ClassroomMeta | null;
};

export type PrintGroupKind =
  | "divisions-row"
  | "divisions-column"
  | "hall"
  | "stack";

export type PrintGroup<T extends PrintBaseRoom = PrintBaseRoom> = {
  key: string;
  title: string;
  kind: PrintGroupKind;
  rooms: T[];
  classroom?: ClassroomMeta;
};

const MIRAE_AFTERNOON_PREFIX = "오후미래혜윰";
const NIGHT_GROUP_TITLE = "미래홀";
const HALL_LAYOUT_GRADE = 2;

export function roomPrefix(name: string): string {
  return name.split(" ")[0];
}

export function divisionLabel(name: string): string {
  const rest = name.slice(roomPrefix(name).length).trim();
  return rest.length > 0 ? rest : name;
}

export function classroomTitle(grade: number, classNumber: number): string {
  return `${grade}-${classNumber}반`;
}

function buildClassroomGroups<T extends PrintBaseRoom>(rooms: T[], grade: number): PrintGroup<T>[] {
  const byClassroom = new Map<number, PrintGroup<T>>();
  for (const currentRoom of rooms) {
    const meta = currentRoom.classroom;
    if (!meta) continue;
    let group = byClassroom.get(meta.id);
    if (!group) {
      const title = classroomTitle(grade, meta.classNumber);
      group = { key: title, title, kind: "divisions-row", rooms: [], classroom: meta };
      byClassroom.set(meta.id, group);
    }
    group.rooms.push(currentRoom);
  }
  return [...byClassroom.values()].sort(
    (a, b) => a.classroom!.sortOrder - b.classroom!.sortOrder || a.classroom!.id - b.classroom!.id
  );
}

function buildPrefixGroups<T extends PrintBaseRoom>(rooms: T[]): PrintGroup<T>[] {
  const groups: PrintGroup<T>[] = [];
  for (const currentRoom of rooms) {
    const prefix = roomPrefix(currentRoom.name);
    const last = groups[groups.length - 1];
    if (last && last.key === prefix) {
      last.rooms.push(currentRoom);
      continue;
    }
    groups.push({
      key: prefix,
      title: prefix,
      kind: prefix.startsWith(MIRAE_AFTERNOON_PREFIX) ? "divisions-column" : "divisions-row",
      rooms: [currentRoom],
    });
  }
  return groups;
}

export function buildPrintGroups<T extends PrintBaseRoom>(
  rooms: T[],
  sessionType: SeatSessionType,
  grade: number
): PrintGroup<T>[] {
  if (rooms.length === 0) return [];

  const sorted = [...rooms].sort((a, b) => a.sortOrder - b.sortOrder);

  if (sessionType === "night") {
    return [
      {
        key: "night",
        title: NIGHT_GROUP_TITLE,
        kind: grade === HALL_LAYOUT_GRADE ? "hall" : "stack",
        rooms: sorted,
      },
    ];
  }

  const classroomRooms = sorted.filter((r) => r.classroom);
  const prefixRooms = sorted.filter((r) => !r.classroom);
  return [...buildClassroomGroups(classroomRooms, grade), ...buildPrefixGroups(prefixRooms)];
}
