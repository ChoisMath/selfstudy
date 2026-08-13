export type PrintBaseRoom = {
  id: number;
  name: string;
  cols: number;
  rows: number;
  sortOrder: number;
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

export function buildPrintGroups<T extends PrintBaseRoom>(
  rooms: T[],
  sessionType: "afternoon" | "night",
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

  const groups: PrintGroup<T>[] = [];
  for (const currentRoom of sorted) {
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
