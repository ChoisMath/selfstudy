// 교사 편 안내 영상 목업 전용 가상 데이터. 실존 인물 이름 사용 금지 — 여기 명단만 쓴다.
export const TODAY = "2026-09-17";
export const TODAY_LABEL = "2026.9.17 (목)";
export const GRADE = 1;
export const APP_URL = "https://self.posan.kr";
export const APP_HOST = "self.posan.kr";

export type Teacher = { id: number; name: string; primaryGrade: 1 | 2 | 3 };

export const TEACHERS: Teacher[] = [
  { id: 1, name: "박지훈", primaryGrade: 1 },
  { id: 2, name: "이수민", primaryGrade: 1 },
  { id: 3, name: "김하늘", primaryGrade: 1 },
  { id: 4, name: "최영호", primaryGrade: 1 },
  { id: 5, name: "윤서진", primaryGrade: 1 },
  { id: 6, name: "한도윤", primaryGrade: 2 },
  { id: 7, name: "오세린", primaryGrade: 2 },
  { id: 8, name: "장민혁", primaryGrade: 2 },
  { id: 9, name: "서지원", primaryGrade: 3 },
  { id: 10, name: "문태호", primaryGrade: 3 },
  { id: 11, name: "신유나", primaryGrade: 3 },
];

export const ME = { id: 1, name: "박지훈", homeroom: { grade: 1, classNumber: 2 }, loginId: "parkjh01" } as const;

export type Student = { id: number; grade: 1; classNumber: number; number: number; name: string };

// classNumber*100 + number. 예: 1-2반 5번 → 205.
const CLASS_STUDENT_NAMES: Record<number, string[]> = {
  1: ["김도현", "이서윤", "박지민", "최준우", "정하은", "강민재", "조예린", "윤시우", "장서아", "임건우", "한지유", "오승민"],
  2: ["서하준", "신예은", "권도윤", "황수아", "안지호", "송채원", "류현우", "전가은", "홍유찬", "고나윤", "문서진", "양태윤"],
  3: ["손하람", "배지안", "백승현", "허다인", "남궁민", "노은서", "하준서", "곽유나", "성민준", "차소율", "주원빈", "우채아"],
};

export const STUDENTS: Student[] = Object.entries(CLASS_STUDENT_NAMES).flatMap(([classNumberKey, names]) => {
  const classNumber = Number(classNumberKey);
  return names.map((name, i) => ({
    id: classNumber * 100 + (i + 1),
    grade: 1 as const,
    classNumber,
    number: i + 1,
    name,
  }));
});

export const studentById = (id: number): Student => {
  const student = STUDENTS.find((s) => s.id === id);
  if (!student) throw new Error(`student not found: ${id}`);
  return student;
};

export const studentLabel = (id: number): string => {
  const s = studentById(id);
  return `${s.grade}-${s.classNumber} ${s.number}번 ${s.name}`;
};

export type AfternoonClassroom = {
  classNumber: number;
  corridorSide: "right";
  divisions: number;
  rowsPerDivision: number;
  colsPerDivision: number;
};

// 좌석은 분단1→분단3, 분단 안에서 행→열 순으로 번호 1~12 배정.
export const AFTERNOON_CLASSROOMS: AfternoonClassroom[] = [1, 2, 3].map((classNumber) => ({
  classNumber,
  corridorSide: "right",
  divisions: 3,
  rowsPerDivision: 2,
  colsPerDivision: 2,
}));

export type NightRoom = { name: string; rows: number; cols: number };

// 1반·2반 학생 번호순 배정(3반은 야간 미참가).
export const NIGHT_ROOMS: NightRoom[] = [
  { name: "자율관 야간실", rows: 3, cols: 4 },
  { name: "자율관 야간실2", rows: 3, cols: 4 },
];

export type SeatBase = { participating: boolean; afterSchool: boolean; approvedAbsence: boolean; pendingRequest: boolean };

const AFTERNOON1_BASE_EXCEPTIONS: Record<number, Partial<SeatBase>> = {
  104: { approvedAbsence: true }, // 1-1 4번
  107: { afterSchool: true }, // 1-1 7번
  109: { pendingRequest: true }, // 1-1 9번
  111: { participating: false }, // 1-1 11번
  203: { participating: false }, // 1-2 3번
  208: { afterSchool: true }, // 1-2 8번
  305: { approvedAbsence: true }, // 1-3 5번
  302: { pendingRequest: true }, // 1-3 2번
};

export const AFTERNOON1_BASE: Record<number, SeatBase> = Object.fromEntries(
  STUDENTS.map((s) => [
    s.id,
    {
      participating: true,
      afterSchool: false,
      approvedAbsence: false,
      pendingRequest: false,
      ...AFTERNOON1_BASE_EXCEPTIONS[s.id],
    },
  ]),
);

export type AttendanceStatus = "present" | "absent";
export type Afternoon1ResultEntry = { status: AttendanceStatus; reasonLabel?: string };

const AFTERNOON1_RESULT_OVERRIDES: Record<number, Afternoon1ResultEntry> = {
  102: { status: "absent" }, // 1-1 2번, 사유 없음
  205: { status: "absent", reasonLabel: "학원" }, // 1-2 5번, 사유결석 → 복사 제외
};

// 참여 중이고 불참승인되지 않은 학생 전원 present, 위 두 명만 override.
export const AFTERNOON1_RESULT: Record<number, Afternoon1ResultEntry> = Object.fromEntries(
  STUDENTS.filter((s) => AFTERNOON1_BASE[s.id].participating && !AFTERNOON1_BASE[s.id].approvedAbsence).map((s) => [
    s.id,
    AFTERNOON1_RESULT_OVERRIDES[s.id] ?? { status: "present" },
  ]),
);

export type AbsenceSession = "afternoon1" | "afternoon2" | "night";
export type AbsenceReasonType = "academy" | "afterschool" | "illness" | "custom";
export type AbsenceStatus = "pending" | "approved" | "rejected";

export type AbsenceRequest = {
  id: number;
  studentId: number;
  date: string;
  dateLabel: string;
  session: AbsenceSession;
  reason: AbsenceReasonType;
  detail?: string;
  status: AbsenceStatus;
  reviewer?: string;
};

export const ABSENCE_REQUESTS: AbsenceRequest[] = [
  { id: 1, studentId: 109, date: "2026-09-17", dateLabel: "9/17(목)", session: "afternoon1", reason: "academy", status: "pending" },
  { id: 2, studentId: 302, date: "2026-09-17", dateLabel: "9/17(목)", session: "afternoon1", reason: "illness", detail: "병원 진료", status: "pending" },
  { id: 3, studentId: 302, date: "2026-09-17", dateLabel: "9/17(목)", session: "afternoon2", reason: "illness", detail: "병원 진료", status: "pending" },
  { id: 4, studentId: 210, date: "2026-09-18", dateLabel: "9/18(금)", session: "night", reason: "custom", detail: "가족 행사", status: "pending" },
  { id: 5, studentId: 104, date: "2026-09-17", dateLabel: "9/17(목)", session: "afternoon1", reason: "academy", status: "approved", reviewer: "박지훈" },
  { id: 6, studentId: 305, date: "2026-09-17", dateLabel: "9/17(목)", session: "afternoon1", reason: "afterschool", status: "approved", reviewer: "이수민" },
  { id: 7, studentId: 206, date: "2026-09-16", dateLabel: "9/16(수)", session: "night", reason: "custom", detail: "개인 사정", status: "rejected", reviewer: "김하늘" },
];

// 앱 attendance/[grade]/page.tsx 불참신청 카드 기준 사유 라벨·색.
export const ABSENCE_REASON_META: Record<AbsenceReasonType, { label: string; color: string }> = {
  academy: { label: "학원", color: "#f59e0b" },
  afterschool: { label: "방과후", color: "#8b5cf6" },
  illness: { label: "질병", color: "#ef4444" },
  custom: { label: "기타", color: "#6b7280" },
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const isWeekday = (date: Date) => date.getUTCDay() !== 0 && date.getUTCDay() !== 6;

// 월요일=0 ~ 일요일=6 로 재배치한 요일 인덱스.
const mondayIndexedDay = (date: Date) => (date.getUTCDay() + 6) % 7;

// 2026년 9월 평일 전체 (YYYY-MM-DD), 오름차순.
const septWeekdays2026 = (): string[] => {
  const days: string[] = [];
  for (let d = 1; d <= 30; d += 1) {
    const date = new Date(Date.UTC(2026, 8, d));
    if (isWeekday(date)) {
      days.push(`2026-09-${pad2(d)}`);
    }
  }
  return days;
};

const GRADE1_ROTATION = ["박지훈", "이수민", "김하늘", "최영호", "윤서진"];
const GRADE2_ROTATION = ["한도윤", "오세린", "장민혁"];
const GRADE3_ROTATION = ["서지원", "문태호", "신유나"];

// 순환상 다른 이름이 나오더라도 이 날짜들은 박지훈으로 고정.
const SUPERVISOR_GRADE1_FORCED: Record<string, string> = {
  "2026-09-03": "박지훈",
  "2026-09-17": "박지훈",
  "2026-09-24": "박지훈",
};

export type SupervisorDay = { 1: string; 2: string; 3: string };

const buildSupervisorSept = (): Record<string, SupervisorDay> => {
  const table: Record<string, SupervisorDay> = {};
  septWeekdays2026().forEach((date, i) => {
    table[date] = {
      1: SUPERVISOR_GRADE1_FORCED[date] ?? GRADE1_ROTATION[i % GRADE1_ROTATION.length],
      2: GRADE2_ROTATION[i % GRADE2_ROTATION.length],
      3: GRADE3_ROTATION[i % GRADE3_ROTATION.length],
    };
  });
  return table;
};

export const SUPERVISOR_SEPT: Record<string, SupervisorDay> = buildSupervisorSept();

export const SWAP_EXAMPLE = { date: "2026-09-24", grade: 1, from: "박지훈", to: "이수민", reason: "출장" } as const;

export type SupervisorSummaryRow = { name: string; primaryGrade: number; counts: number[]; total: number };

// SUPERVISOR_SEPT의 1학년 열에서 교사별 9월 평일 배정 수를 세고, SWAP_EXAMPLE 교체를 반영한다.
const septSupervisorCounts = (): Record<string, number> => {
  const counts: Record<string, number> = {};
  Object.entries(SUPERVISOR_SEPT).forEach(([date, day]) => {
    const assigned = day[SWAP_EXAMPLE.grade];
    const name = date === SWAP_EXAMPLE.date && assigned === SWAP_EXAMPLE.from ? SWAP_EXAMPLE.to : assigned;
    counts[name] = (counts[name] ?? 0) + 1;
  });
  return counts;
};

const SUPERVISOR_SEPT_COUNTS = septSupervisorCounts();

// 3~7월 값은 고정, 9월과 total만 SUPERVISOR_SEPT_COUNTS에서 계산.
const SUPERVISOR_SUMMARY_MAR_JUL: { name: string; primaryGrade: number; counts: number[] }[] = [
  { name: "박지훈", primaryGrade: 1, counts: [2, 2, 3, 2, 1] },
  { name: "이수민", primaryGrade: 1, counts: [2, 2, 2, 2, 2] },
  { name: "김하늘", primaryGrade: 1, counts: [2, 2, 3, 2, 2] },
  { name: "최영호", primaryGrade: 1, counts: [1, 2, 2, 2, 2] },
  { name: "윤서진", primaryGrade: 1, counts: [2, 3, 2, 2, 2] },
];

export const SUPERVISOR_SUMMARY: { months: string[]; rows: SupervisorSummaryRow[] } = {
  months: ["3월", "4월", "5월", "6월", "7월", "9월"],
  rows: SUPERVISOR_SUMMARY_MAR_JUL.map(({ name, primaryGrade, counts }) => {
    const fullCounts = [...counts, SUPERVISOR_SEPT_COUNTS[name] ?? 0];
    return { name, primaryGrade, counts: fullCounts, total: fullCounts.reduce((a, b) => a + b, 0) };
  }),
};

export const WEEKLY_INFO = {
  studentId: 101,
  weekLabel: "9월 3주차",
  days: ["월", "화", "수", "목", "금"],
  todayIndex: 3,
  afternoon1: ["출석", "출석", "방과후", "출석", "-"],
  afternoon2: ["출석", "결석", "방과후", "출석", "-"],
  remarks: { 화: "조퇴 후 복귀" } as Partial<Record<string, string>>,
  monthlyHours: "12.5h",
  yearHours: "86.7h",
  rank: "12위 (상위 8%)",
} as const;

export type Session = AbsenceSession;
export type HomeroomCellValue = "O" | "X" | "△" | "방" | "gray" | "-";

const HOMEROOM_WEEK_DETAIL: Record<string, string> = {
  "5-0-afternoon1": "학원: 수학",
};
const HOMEROOM_WEEK_REMARK: Record<string, string> = {
  "6-2-night": "늦게 입실",
};

// 담임 주간표 셀 값. dayIndex: 0=월 ~ 4=금. 3번은 목요일 전체 미참가, 그 외 예외는 표에 적힌 대로.
export const homeroomWeekCell = (studentNo: number, dayIndex: number, session: Session): HomeroomCellValue => {
  if (studentNo === 3 && dayIndex === 3) return "gray";
  if (dayIndex === 4) return "-";
  if (dayIndex === 3 && session === "night") return "-";
  if (studentNo === 5 && dayIndex === 0 && session === "afternoon1") return "△";
  if (studentNo === 8 && dayIndex === 3 && (session === "afternoon1" || session === "afternoon2")) return "방";
  if (studentNo === 12 && dayIndex === 1 && session === "night") return "X";
  return "O";
};

export const homeroomWeekDetail = (studentNo: number, dayIndex: number, session: Session): string | undefined =>
  HOMEROOM_WEEK_DETAIL[`${studentNo}-${dayIndex}-${session}`];

export const homeroomWeekRemark = (studentNo: number, dayIndex: number, session: Session): string | undefined =>
  HOMEROOM_WEEK_REMARK[`${studentNo}-${dayIndex}-${session}`];

export const HOMEROOM_WEEK = {
  classLabel: "1-2",
  range: "9/14 ~ 9/18",
  days: ["월", "화", "수", "목", "금"] as const,
  studentCount: 12,
  cell: homeroomWeekCell,
  detail: homeroomWeekDetail,
  remark: homeroomWeekRemark,
};

// 2026년 9월 1~17일 평일 13일.
const HOMEROOM_MONTH_DATES = septWeekdays2026().filter((date) => date <= "2026-09-17");

const SESSION_MINUTES: Record<Session, number> = { afternoon1: 50, afternoon2: 50, night: 100 };

// O 셀 한 칸당 오후 50분·야간 100분, 합계를 시간 단위 소수 1자리로.
export const homeroomMonthHours = (studentNo: number): string => {
  let minutes = 0;
  for (const date of HOMEROOM_MONTH_DATES) {
    const dayIndex = mondayIndexedDay(new Date(`${date}T00:00:00Z`));
    (["afternoon1", "afternoon2", "night"] as Session[]).forEach((session) => {
      if (homeroomWeekCell(studentNo, dayIndex, session) === "O") {
        minutes += SESSION_MINUTES[session];
      }
    });
  }
  return (minutes / 60).toFixed(1);
};

export const homeroomMonthCell = (studentNo: number, date: string, session: Session): HomeroomCellValue =>
  homeroomWeekCell(studentNo, mondayIndexedDay(new Date(`${date}T00:00:00Z`)), session);

export const HOMEROOM_MONTH = {
  classLabel: "1-2",
  year: 2026,
  month: 9,
  dates: HOMEROOM_MONTH_DATES,
  studentCount: 12,
  cell: homeroomMonthCell,
  hours: homeroomMonthHours,
};

export type ParticipationSetting = {
  participating: boolean;
  days: boolean[]; // 월~금
  afterSchool: boolean[]; // 월~금
};

export type HomeroomParticipation = Record<Session, ParticipationSetting>;

const defaultParticipationSetting = (): ParticipationSetting => ({
  participating: true,
  days: [true, true, true, true, true],
  afterSchool: [false, false, false, false, false],
});

const PARTICIPATION_OVERRIDES: Record<number, Partial<Record<Session, Partial<ParticipationSetting>>>> = {
  3: {
    afternoon1: { days: [true, true, true, false, true] },
    afternoon2: { days: [true, true, true, false, true] },
  },
  8: {
    afternoon1: { afterSchool: [false, false, false, true, false] },
    afternoon2: { afterSchool: [false, false, false, true, false] },
  },
  11: {
    night: { participating: false },
  },
};

export const HOMEROOM_PARTICIPATION: Record<number, HomeroomParticipation> = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => i + 1).map((studentNo) => {
    const sessions: HomeroomParticipation = {
      afternoon1: defaultParticipationSetting(),
      afternoon2: defaultParticipationSetting(),
      night: defaultParticipationSetting(),
    };
    const overrides = PARTICIPATION_OVERRIDES[studentNo];
    if (overrides) {
      (Object.keys(overrides) as Session[]).forEach((session) => {
        sessions[session] = { ...sessions[session], ...overrides[session] };
      });
    }
    return [studentNo, sessions];
  }),
);

export const ABSENCE_REASON_EXAMPLE = {
  student: "1-2 5번 안지호",
  date: "2026-09-17",
  session: "afternoon1",
  reason: "academy",
  detail: "수학 학원",
} as const;
