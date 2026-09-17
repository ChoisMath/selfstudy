// 학년관리자 안내 영상 전용 가상 데이터. app-mocks/data.ts(교사 편)의 명단·오늘 출결·감독 배정을 읽어 파생한다(그 파일은 수정 금지).
import {
  AFTERNOON1_BASE,
  AFTERNOON1_RESULT,
  AFTERNOON_CLASSROOMS,
  HOMEROOM_MONTH,
  HOMEROOM_PARTICIPATION,
  ME as TEACHER_ME,
  NIGHT_ROOMS,
  STUDENTS,
  SUPERVISOR_SEPT,
  TODAY,
  homeroomMonthCell,
  homeroomMonthHours,
  type AbsenceSession,
  type AfternoonClassroom,
  type HomeroomCellValue,
  type HomeroomParticipation,
  type NightRoom,
  type Session,
  type Student,
  type SupervisorDay,
} from "../app-mocks/data";

export const GRADE = 1;
// 박지훈 — app-mocks/data.ts ME 그대로(1-2 담임). 이 편에서는 학년관리자 겸직.
export const ME = TEACHER_ME;

const pad2 = (n: number) => String(n).padStart(2, "0");

// login/StudentAdd 학번 형식: 학년(1) + 반(2) + 번호(2).
export const studentCode = (s: Pick<Student, "grade" | "classNumber" | "number">): string =>
  `${s.grade}${pad2(s.classNumber)}${pad2(s.number)}`;

// ---------------------------------------------------------------------------
// 오늘출결(Today) — 오후1은 AFTERNOON1_BASE·AFTERNOON1_RESULT(교사 편)에서 그대로 집계한다.
// 오후2·야간은 교사 편에 대응하는 표가 없어 이 편이 직접 정한다. 둘 다 오늘(TODAY) 날짜의
// ABSENCE_REQUESTS 항목과 모순되지 않는다: 오후2엔 302번(배지안) 대기중 요청 하나뿐이라
// 결석으로 세지 않았고, 야간엔 오늘 날짜의 요청이 아예 없어 임의로 배정 가능하다.
// ---------------------------------------------------------------------------

export type SessionStats = {
  supervisor: string;
  present: number;
  absent: number;
  excused: number;
  afterSchool: number;
  total: number;
};

// 감독은 하루 단위 배정이라(SupervisorAssign 내레이션) 오후1·오후2·야간 모두 같은 선생님.
const SUPERVISOR_TODAY = SUPERVISOR_SEPT[TODAY][GRADE];

// 참여 34명(36명 - 참가 아님 2명: 1-1 11번, 1-2 3번) 중 사유결석 3(1-1 4번·1-2 5번·1-3 5번),
// 결석 1(1-1 2번), 방과후 2(1-1 7번·1-2 8번), 나머지 28명 출석.
const afternoon1Stats = (): SessionStats => {
  const participating = STUDENTS.filter((s) => AFTERNOON1_BASE[s.id].participating);
  const excusedIds = new Set<number>();
  participating.forEach((s) => {
    if (AFTERNOON1_BASE[s.id].approvedAbsence) excusedIds.add(s.id);
  });
  let absent = 0;
  Object.entries(AFTERNOON1_RESULT).forEach(([id, result]) => {
    if (result.status !== "absent") return;
    if (result.reasonLabel) excusedIds.add(Number(id));
    else absent += 1;
  });
  const afterSchool = participating.filter((s) => AFTERNOON1_BASE[s.id].afterSchool).length;
  const total = participating.length;
  return {
    supervisor: SUPERVISOR_TODAY,
    present: total - absent - excusedIds.size - afterSchool,
    absent,
    excused: excusedIds.size,
    afterSchool,
    total,
  };
};

export const TODAY_STATS: Record<AbsenceSession, SessionStats> = {
  afternoon1: afternoon1Stats(),
  // 오후1과 같은 참여 34명 기준. 사유결석 2명은 오후1의 승인결석(1-1 4번·1-3 5번)이 오후까지 이어진 것으로 둔다.
  afternoon2: { supervisor: SUPERVISOR_TODAY, present: 30, absent: 1, excused: 2, afterSchool: 1, total: 34 },
  // NIGHT_ROOMS는 1·2반만 참가(3반 12명 제외) → 참여 24명.
  night: { supervisor: SUPERVISOR_TODAY, present: 23, absent: 1, excused: 0, afterSchool: 0, total: 24 },
};

// ---------------------------------------------------------------------------
// 학생 관리(StudentsList)
// ---------------------------------------------------------------------------

export type StudentStatus = "active" | "inactive";
export type StudentRow = { student: Student; code: string; status: StudentStatus; isHelper: boolean };

const HELPER_STUDENT_ID = 307; // 1-3 7번 하준서 — 학생 편 ME_STUDENT와 동일 인물.

// 삭제(비활성) 예시 — 실제 36명 명단 밖의 가상 전출 학생. STUDENTS에 없으므로 참여 설정·좌석·월간출결에는 나오지 않는다.
const INACTIVE_EXAMPLE_STUDENT: Student = { id: 9999, grade: 1, classNumber: 1, number: 13, name: "박서준" };

// 앱 API 는 orderBy classNumber asc, studentNumber asc 로 내려준다(src/app/api/grade-admin/[grade]/students/route.ts) —
// 비활성 학생도 이 정렬에 섞여 1-1 13번 자리(1-1 12번 다음, 1-2 시작 전)에 온다. 맨 끝에 붙이지 않는다.
export const STUDENT_ROWS: StudentRow[] = [
  ...STUDENTS.map((s) => ({ student: s, code: studentCode(s), status: "active" as const, isHelper: s.id === HELPER_STUDENT_ID })),
  { student: INACTIVE_EXAMPLE_STUDENT, code: studentCode(INACTIVE_EXAMPLE_STUDENT), status: "inactive" as const, isHelper: false },
].sort((a, b) => a.student.classNumber - b.student.classNumber || a.student.number - b.student.number);

// ---------------------------------------------------------------------------
// 학생 추가(StudentAdd)
// ---------------------------------------------------------------------------

export const NEW_STUDENT = { classNumber: 2, number: 13, name: "정다온" } as const;
export const NEW_STUDENT_CODE = `${GRADE}${pad2(NEW_STUDENT.classNumber)}${pad2(NEW_STUDENT.number)}`; // "10213"

// ---------------------------------------------------------------------------
// Excel 업로드(StudentExcel)
// ---------------------------------------------------------------------------

export type ExcelFailedRow = { row: number; reason: string };
export const EXCEL_RESULT: { success: number; failed: number; rows: ExcelFailedRow[] } = {
  success: 34,
  failed: 2,
  rows: [
    { row: 12, reason: "번호 중복" },
    { row: 27, reason: "이름 없음" },
  ],
};

// ---------------------------------------------------------------------------
// 참여 설정(Participation·ParticipationBulk)
// ---------------------------------------------------------------------------

export type ParticipationRow = { student: Student; sessions: HomeroomParticipation };

// HOMEROOM_PARTICIPATION은 학생 번호(1~12) 기준 범용 패턴 — 담임(1-2)뿐 아니라 학년 전체 3개 반에 그대로 적용된다.
export const PARTICIPATION_ROWS: ParticipationRow[] = STUDENTS.map((s) => ({
  student: s,
  sessions: HOMEROOM_PARTICIPATION[s.number],
}));

// ---------------------------------------------------------------------------
// 교실 구조 설정 예시(ClassroomConfig)
// ---------------------------------------------------------------------------

export type ClassroomLayoutType = "division" | "single";
export type ClassroomConfigExample = {
  classNumber: number;
  corridorSide: "left" | "right";
  layoutType: ClassroomLayoutType;
  divisions: number;
  rowsPerDivision: number[];
  seatCount: number;
};

// 분단형(2인 1조) 3분단 × 각 3행 = 18석.
export const CLASSROOM_CONFIG_EXAMPLE: ClassroomConfigExample = {
  classNumber: 7,
  corridorSide: "right",
  layoutType: "division",
  divisions: 3,
  rowsPerDivision: [3, 3, 3],
  seatCount: 18,
};

// ---------------------------------------------------------------------------
// 좌석 배치(SeatsTour·SeatAssign·SeatEdit)
// ---------------------------------------------------------------------------

export type AfternoonSeatSlot = { division: number; row: number; col: number };
export type AfternoonSeatAssignment = { student: Student; seat: AfternoonSeatSlot };
export type AfternoonSeatClass = { classNumber: number; config: AfternoonClassroom; assignments: AfternoonSeatAssignment[] };

// AFTERNOON_CLASSROOMS 주석과 같은 규칙: 분단1→분단3, 분단 안에서 행→열 순으로 좌석번호(=학생 번호) 배정.
const afternoonSeatSlot = (classroom: AfternoonClassroom, seatNumber: number): AfternoonSeatSlot => {
  const perDivision = classroom.rowsPerDivision * classroom.colsPerDivision;
  const division = Math.floor((seatNumber - 1) / perDivision) + 1;
  const indexInDivision = (seatNumber - 1) % perDivision;
  const row = Math.floor(indexInDivision / classroom.colsPerDivision) + 1;
  const col = (indexInDivision % classroom.colsPerDivision) + 1;
  return { division, row, col };
};

// 미배정 4명(참가 학생만) — 1반 2명(6번·12번), 2반 1명(12번), 3반 1명(12번).
const AFTERNOON_UNASSIGNED_NUMBERS: Record<number, number[]> = { 1: [6, 12], 2: [12], 3: [12] };

const afternoonClassSeats = (classroom: AfternoonClassroom): AfternoonSeatClass => {
  const unassignedNumbers = new Set(AFTERNOON_UNASSIGNED_NUMBERS[classroom.classNumber] ?? []);
  const assignments = STUDENTS.filter(
    (s) => s.classNumber === classroom.classNumber && AFTERNOON1_BASE[s.id].participating && !unassignedNumbers.has(s.number),
  ).map((s) => ({ student: s, seat: afternoonSeatSlot(classroom, s.number) }));
  return { classNumber: classroom.classNumber, config: classroom, assignments };
};

const afternoonUnassignedStudents = (): Student[] =>
  STUDENTS.filter(
    (s) => AFTERNOON1_BASE[s.id].participating && (AFTERNOON_UNASSIGNED_NUMBERS[s.classNumber] ?? []).includes(s.number),
  );

export type NightSeatSlot = { row: number; col: number };
export type NightSeatAssignment = { student: Student; seat: NightSeatSlot };
export type NightSeatRoom = { name: string; config: NightRoom; assignments: NightSeatAssignment[] };

const nightSeatSlot = (room: NightRoom, seatNumber: number): NightSeatSlot => {
  const row = Math.floor((seatNumber - 1) / room.cols) + 1;
  const col = ((seatNumber - 1) % room.cols) + 1;
  return { row, col };
};

// NIGHT_ROOMS 주석대로 1반→방0, 2반→방1, 3반은 야간 미참가. 두 방 모두 정원(12명)만큼 꽉 차 미배정 없음.
const nightRoomAssignments = (room: NightRoom, classNumber: number): NightSeatRoom => ({
  name: room.name,
  config: room,
  assignments: STUDENTS.filter((s) => s.classNumber === classNumber).map((s) => ({ student: s, seat: nightSeatSlot(room, s.number) })),
});

export const SEAT_EDITOR = {
  afternoon: { classes: AFTERNOON_CLASSROOMS.map(afternoonClassSeats), unassigned: afternoonUnassignedStudents() },
  night: { rooms: [nightRoomAssignments(NIGHT_ROOMS[0], 1), nightRoomAssignments(NIGHT_ROOMS[1], 2)], unassigned: [] as Student[] },
};

// ---------------------------------------------------------------------------
// 출력(SeatPrint)
// ---------------------------------------------------------------------------

export type PrintOrientation = "landscape" | "portrait";
export type PrintGroup = { classNumber: number; checked: boolean; orientation: PrintOrientation };

export const PRINT_GROUPS: PrintGroup[] = [
  { classNumber: 1, checked: true, orientation: "landscape" },
  { classNumber: 2, checked: true, orientation: "landscape" },
  { classNumber: 3, checked: false, orientation: "portrait" },
];

// ---------------------------------------------------------------------------
// 감독 배정(SupervisorAssign·SupervisorTotals)
// ---------------------------------------------------------------------------

// 교사 편과 같은 9월 달력을 그대로 재사용(수정 없음).
export const SUPERVISOR_MONTH: Record<string, SupervisorDay> = SUPERVISOR_SEPT;

// 9/28은 SUPERVISOR_MONTH 회전에서 이미 윤서진 — 배정 예시로 그대로 사용.
export const SUPERVISOR_ASSIGN_EXAMPLE = { date: "2026-09-28", dateLabel: "9/28", grade: GRADE, teacher: "윤서진" } as const;

// ---------------------------------------------------------------------------
// 월간출결(Monthly) — 학년 전체(36명), 반별로 이미 정렬된 STUDENTS 순서를 그대로 쓴다.
// ---------------------------------------------------------------------------

export const MONTHLY_DATES: string[] = HOMEROOM_MONTH.dates;

const MONTHLY_SESSIONS: Session[] = ["afternoon1", "afternoon2", "night"];

export type MonthlyRow = { student: Student; cells: Record<string, Record<Session, HomeroomCellValue>>; hours: string };

export const MONTHLY_ROWS: MonthlyRow[] = STUDENTS.map((s) => ({
  student: s,
  cells: Object.fromEntries(
    MONTHLY_DATES.map((date) => [
      date,
      Object.fromEntries(MONTHLY_SESSIONS.map((session) => [session, homeroomMonthCell(s.number, date, session)])) as Record<
        Session,
        HomeroomCellValue
      >,
    ]),
  ),
  hours: homeroomMonthHours(s.number),
}));
