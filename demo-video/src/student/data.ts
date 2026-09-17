// 학생 안내 영상 전용 가상 데이터. app-mocks/data.ts(교사 편)의 명단·교실 배치·오늘 날짜를 그대로 읽어 파생한다.
import {
  AFTERNOON_CLASSROOMS,
  HOMEROOM_PARTICIPATION,
  NIGHT_ROOMS,
  STUDENTS,
  TODAY,
  studentById,
  type AbsenceReasonType,
  type AbsenceRequest,
  type AbsenceSession,
  type AfternoonClassroom,
  type NightRoom,
  type Student,
} from "../app-mocks/data";

const pad2 = (n: number) => String(n).padStart(2, "0");

export const ME_STUDENT: Student = studentById(307);
// login/page.tsx 학번 형식: 학년(1) + 반(2) + 번호(2).
export const ME_STUDENT_CODE = `${ME_STUDENT.grade}${pad2(ME_STUDENT.classNumber)}${pad2(ME_STUDENT.number)}`;
export const ME_STUDENT_HEADER = `${ME_STUDENT.grade}-${ME_STUDENT.classNumber}-${pad2(ME_STUDENT.number)}`;

export const weekdayLabels = ["월", "화", "수", "목", "금"] as const;
export const sessionLabels: Record<AbsenceSession, string> = { afternoon1: "오후1", afternoon2: "오후2", night: "야간" };

// TODAY(2026-09-17)는 목요일 — 이번 주 표·일괄신청 "오늘" 계산의 기준.
const MONDAY_INDEXED_TODAY = 3;

export type ParticipationRow = { session: AbsenceSession; label: string; days: boolean[]; frequencyLabel: string };

// 오후1 주 5일, 오후2 수요일 제외 주 4일, 야간 화·목만 주 2일.
export const PARTICIPATION: ParticipationRow[] = [
  { session: "afternoon1", label: sessionLabels.afternoon1, days: [true, true, true, true, true], frequencyLabel: "주 5일" },
  { session: "afternoon2", label: sessionLabels.afternoon2, days: [true, true, false, true, true], frequencyLabel: "주 4일" },
  { session: "night", label: sessionLabels.night, days: [false, true, false, true, false], frequencyLabel: "주 2일" },
];

export const STUDY_HOURS = { month: 12.5, year: 86.7, rank: "12위 (상위 8%)" } as const;

export type AfternoonSeat = { title: string; division: number; row: number; col: number; label: string };
export type NightSeat = { title: string; row: number; col: number; label: string };

const afternoonClassroom = AFTERNOON_CLASSROOMS.find((c) => c.classNumber === ME_STUDENT.classNumber);
if (!afternoonClassroom) throw new Error(`AFTERNOON_CLASSROOMS에 ${ME_STUDENT.classNumber}반 없음`);

// app-mocks/data.ts 주석과 같은 규칙: 분단1→분단3, 분단 안에서 행→열 순으로 좌석번호(=학생 번호) 1~12 배정.
const afternoonSeatOf = (classroom: AfternoonClassroom, seatNumber: number): Omit<AfternoonSeat, "title"> => {
  const perDivision = classroom.rowsPerDivision * classroom.colsPerDivision;
  const division = Math.floor((seatNumber - 1) / perDivision) + 1;
  const indexInDivision = (seatNumber - 1) % perDivision;
  const row = Math.floor(indexInDivision / classroom.colsPerDivision) + 1;
  const col = (indexInDivision % classroom.colsPerDivision) + 1;
  return { division, row, col, label: `${row}행 ${col}열` };
};

const nightRoom: NightRoom = NIGHT_ROOMS[0];
// 1반·2반과 같은 번호순 배정을 그대로 적용(행 우선, rows×cols 그리드).
const nightSeatOf = (room: NightRoom, seatNumber: number): Omit<NightSeat, "title"> => {
  const row = Math.floor((seatNumber - 1) / room.cols) + 1;
  const col = ((seatNumber - 1) % room.cols) + 1;
  return { row, col, label: `${row}행 ${col}열` };
};

export const MY_SEAT: { afternoon: AfternoonSeat; night: NightSeat } = {
  afternoon: {
    title: `${ME_STUDENT.grade}-${ME_STUDENT.classNumber}반`,
    ...afternoonSeatOf(afternoonClassroom, ME_STUDENT.number),
  },
  night: { title: nightRoom.name, ...nightSeatOf(nightRoom, ME_STUDENT.number) },
};

export const ABSENCE_FORM_EXAMPLE: {
  weekday: string;
  date: string;
  dateLabel: string;
  nextWeek: boolean;
  sessions: AbsenceSession[];
  reason: AbsenceReasonType;
} = {
  weekday: "월",
  date: "2026-09-21",
  dateLabel: "9/21(월)",
  nextWeek: true,
  sessions: ["afternoon1"],
  reason: "academy",
};

// 최신순.
export const MY_REQUESTS: AbsenceRequest[] = [
  { id: 1, studentId: ME_STUDENT.id, date: "2026-09-21", dateLabel: "9/21(월)", session: "afternoon1", reason: "academy", status: "pending" },
  { id: 2, studentId: ME_STUDENT.id, date: "2026-09-17", dateLabel: "9/17(목)", session: "afternoon2", reason: "illness", status: "approved" },
  {
    id: 3,
    studentId: ME_STUDENT.id,
    date: "2026-09-12",
    dateLabel: "9/12(금)",
    session: "night",
    reason: "custom",
    detail: "가족 행사",
    status: "rejected",
  },
];

export type WeekAttendanceCell = "O" | "X" | "-";
export type MonthDot = { date: string; session: AbsenceSession; status: "present" | "absent" };

// 이번 주(9/14~9/18)의 유일한 결석 — 이번 달 달력에도 같은 날짜가 그대로 반영된다.
const WEEK_ABSENCES: { dateLabel: string; session: AbsenceSession; label: string }[] = [
  { dateLabel: "9/15", session: "afternoon1", label: "학원" },
];
const MONTH_ABSENCE_DATES: Partial<Record<string, AbsenceSession[]>> = { "2026-09-15": ["afternoon1"] };

// 2026년 9월 평일 중 TODAY(9/17)까지.
const monthWeekdaysUpToToday = (): string[] => {
  const days: string[] = [];
  for (let d = 1; d <= 30; d += 1) {
    const date = `2026-09-${pad2(d)}`;
    if (date > TODAY) break;
    const dow = new Date(Date.UTC(2026, 8, d)).getUTCDay();
    if (dow !== 0 && dow !== 6) days.push(date);
  }
  return days;
};

const mondayIndexedDay = (date: Date) => (date.getUTCDay() + 6) % 7;

export const MY_RECORD: {
  week: {
    range: string;
    days: readonly string[];
    todayIndex: number;
    cells: Record<AbsenceSession, WeekAttendanceCell[]>;
    reasons: { dateLabel: string; session: AbsenceSession; label: string }[];
  };
  month: MonthDot[];
} = {
  week: {
    range: "9/14 ~ 9/18",
    days: weekdayLabels,
    todayIndex: MONDAY_INDEXED_TODAY,
    cells: {
      afternoon1: ["O", "X", "O", "O", "-"],
      afternoon2: ["O", "O", "-", "O", "-"],
      night: ["-", "O", "-", "O", "-"],
    },
    reasons: WEEK_ABSENCES,
  },
  month: monthWeekdaysUpToToday().flatMap((date) => {
    const dayIndex = mondayIndexedDay(new Date(`${date}T00:00:00Z`));
    return PARTICIPATION.filter((row) => row.days[dayIndex]).map((row) => ({
      date,
      session: row.session,
      status: MONTH_ABSENCE_DATES[date]?.includes(row.session) ? "absent" : ("present" as const),
    }));
  }),
};

export type BatchClassmate = { student: Student; participation: Record<AbsenceSession, boolean>; alreadyRequested: boolean };

// HOMEROOM_PARTICIPATION은 학생 번호(1~12) 기준 범용 패턴 — 1-3반 오늘(목) 참여 여부 파생에 그대로 재사용.
const classmateParticipation = (student: Student): Record<AbsenceSession, boolean> => {
  const setting = HOMEROOM_PARTICIPATION[student.number];
  return {
    afternoon1: setting.afternoon1.participating && setting.afternoon1.days[MONDAY_INDEXED_TODAY],
    afternoon2: setting.afternoon2.participating && setting.afternoon2.days[MONDAY_INDEXED_TODAY],
    night: setting.night.participating && setting.night.days[MONDAY_INDEXED_TODAY],
  };
};

// 배지안(302)·노은서(306) — 이미 신청됨 예시 2명.
const ALREADY_REQUESTED_IDS = new Set([302, 306]);

export const BATCH_CLASSMATES: BatchClassmate[] = STUDENTS.filter((s) => s.classNumber === ME_STUDENT.classNumber).map((s) => ({
  student: s,
  participation: classmateParticipation(s),
  alreadyRequested: ALREADY_REQUESTED_IDS.has(s.id),
}));
