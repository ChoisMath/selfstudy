export const CORRIDOR_SIDES = ["left", "right"] as const;
export type CorridorSide = (typeof CORRIDOR_SIDES)[number];

export const LAYOUT_TYPES = ["division", "single"] as const;
export type ClassroomLayoutType = (typeof LAYOUT_TYPES)[number];

export const CORRIDOR_SIDE_LABELS: Record<CorridorSide, string> = { left: "왼쪽", right: "오른쪽" };
export const LAYOUT_TYPE_LABELS: Record<ClassroomLayoutType, string> = { division: "분단형", single: "단독형" };

export const COLS_BY_LAYOUT: Record<ClassroomLayoutType, number> = { division: 2, single: 1 };

export const CLASSROOM_LIMITS = {
  classNumber: { min: 1, max: 20 },
  divisions: { min: 1, max: 6 },
  rows: { min: 1, max: 10 },
} as const;

export type ClassroomConfig = {
  classNumber: number;
  corridorSide: CorridorSide;
  layoutType: ClassroomLayoutType;
  rowsPerDivision: number[];
};

export type PlannedRoom = { name: string; cols: number; rows: number; sortOrder: number };

export function planClassroomRooms(grade: number, config: ClassroomConfig): PlannedRoom[] {
  const cols = COLS_BY_LAYOUT[config.layoutType];
  const prefix = `${grade}-${config.classNumber}반`;
  return config.rowsPerDivision.map((rows, index) => {
    const ordinal = index + 1;
    const label = config.layoutType === "division" ? `분단${ordinal}` : `${ordinal}열`;
    return { name: `${prefix} ${label}`, cols, rows, sortOrder: ordinal };
  });
}

export function isGeometryChanged(
  existingRooms: { cols: number; rows: number; sortOrder: number }[],
  config: ClassroomConfig
): boolean {
  if (existingRooms.length !== config.rowsPerDivision.length) return true;
  const cols = COLS_BY_LAYOUT[config.layoutType];
  const sorted = [...existingRooms].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted.some((room, index) => room.cols !== cols || room.rows !== config.rowsPerDivision[index]);
}

export function seatCountOf(config: ClassroomConfig): number {
  const cols = COLS_BY_LAYOUT[config.layoutType];
  return config.rowsPerDivision.reduce((sum, rows) => sum + rows, 0) * cols;
}

export function corridorLabels(side: CorridorSide): { left: string; right: string } {
  return side === "left" ? { left: "복도", right: "창문" } : { left: "창문", right: "복도" };
}

export type ParseClassroomConfigResult =
  | { ok: true; config: ClassroomConfig }
  | { ok: false; error: string };

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

export function parseClassroomConfig(input: unknown): ParseClassroomConfigResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "요청 본문이 올바르지 않습니다." };
  }
  const body = input as Record<string, unknown>;

  // 폼 input 은 문자열을 보낼 수 있어 숫자 문자열만 허용한다
  const classNumber = typeof body.classNumber === "string" && body.classNumber.trim() !== ""
    ? Number(body.classNumber)
    : body.classNumber;
  const { min: classMin, max: classMax } = CLASSROOM_LIMITS.classNumber;
  if (!isIntegerInRange(classNumber, classMin, classMax)) {
    return { ok: false, error: `반 번호는 ${classMin}~${classMax} 사이의 정수여야 합니다.` };
  }

  const corridorSide = body.corridorSide;
  if (!CORRIDOR_SIDES.includes(corridorSide as CorridorSide)) {
    return { ok: false, error: "복도 위치는 왼쪽 또는 오른쪽이어야 합니다." };
  }

  const layoutType = body.layoutType;
  if (!LAYOUT_TYPES.includes(layoutType as ClassroomLayoutType)) {
    return { ok: false, error: "배치 유형은 분단형 또는 단독형이어야 합니다." };
  }

  const rowsPerDivision = body.rowsPerDivision;
  const { min: divMin, max: divMax } = CLASSROOM_LIMITS.divisions;
  if (!Array.isArray(rowsPerDivision) || rowsPerDivision.length < divMin || rowsPerDivision.length > divMax) {
    return { ok: false, error: `분단(열) 개수는 ${divMin}~${divMax}개여야 합니다.` };
  }
  const { min: rowMin, max: rowMax } = CLASSROOM_LIMITS.rows;
  if (!rowsPerDivision.every((rows) => isIntegerInRange(rows, rowMin, rowMax))) {
    return { ok: false, error: `분단별 행 수는 ${rowMin}~${rowMax} 사이의 정수여야 합니다.` };
  }

  return {
    ok: true,
    config: {
      classNumber,
      corridorSide: corridorSide as CorridorSide,
      layoutType: layoutType as ClassroomLayoutType,
      rowsPerDivision: rowsPerDivision as number[],
    },
  };
}
