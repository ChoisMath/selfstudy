import { emptySessionRecord, type SessionType } from "@/lib/sessions";

export type ReasonInfo = { type: string; detail: string | null };

export type WeeklySessionCell = {
  status: string | null;
  reason: ReasonInfo | null;
  participating: boolean;
  afterSchool: boolean;
  note: string | null;
  isApprovedAbsence: boolean;
  approvedReason: ReasonInfo | null;
};

export type WeeklyDayRow = {
  date: string;
  dayOfWeek: string;
  sessions: Record<SessionType, WeeklySessionCell>;
};

export type WeeklyCellKind =
  | "not-participating"
  | "approved-absence"
  | "after-school"
  | "present"
  | "absent"
  | "unchecked";

// 좌석 그리드(SeatCell)와 같은 우선순위 — 승인된 불참은 출석 토글 결과보다 우선한다
export function summarizeWeeklyCell(cell: WeeklySessionCell): { kind: WeeklyCellKind; label: string } {
  if (!cell.participating) return { kind: "not-participating", label: "-" };
  if (cell.isApprovedAbsence) return { kind: "approved-absence", label: "불참승인" };
  if (cell.afterSchool && (!cell.status || cell.status === "unchecked")) return { kind: "after-school", label: "방과후" };
  if (cell.status === "present") return { kind: "present", label: "출석" };
  if (cell.status === "absent") return { kind: "absent", label: "결석" };
  return { kind: "unchecked", label: "-" };
}

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri";
type AfterSchoolKey = "afterSchoolMon" | "afterSchoolTue" | "afterSchoolWed" | "afterSchoolThu" | "afterSchoolFri";

const DAY_KEYS: (DayKey | null)[] = [null, "mon", "tue", "wed", "thu", "fri", null];
const AFTER_SCHOOL_KEYS: (AfterSchoolKey | null)[] = [
  null, "afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri", null,
];
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export type WeeklyParticipationInput = Record<DayKey, boolean> &
  Record<AfterSchoolKey, boolean> & { sessionType: SessionType; isParticipating: boolean };
export type WeeklyAttendanceInput = { date: string; sessionType: SessionType; status: string; reason: ReasonInfo | null };
export type WeeklyNoteInput = { date: string; sessionType: SessionType; note: string };
export type WeeklyApprovedInput = { date: string; sessionType: SessionType; reason: ReasonInfo };

export type WeeklyRowsInput = {
  weekDates: string[];
  participationDays: WeeklyParticipationInput[];
  attendances: WeeklyAttendanceInput[];
  notes: WeeklyNoteInput[];
  approvedRequests: WeeklyApprovedInput[];
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// 날짜 문자열을 UTC 자정으로 고정해 서버 타임존과 무관하게 요일을 계산한다
export function weekDatesOf(dateStr: string): string[] {
  const base = new Date(`${dateStr}T00:00:00Z`);
  const offsetToMonday = (base.getUTCDay() + 6) % 7;
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() - offsetToMonday);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return toIsoDate(d);
  });
}

export function buildWeeklyRows(input: WeeklyRowsInput): WeeklyDayRow[] {
  const participationBy = new Map(input.participationDays.map((p) => [p.sessionType, p]));
  const attendanceBy = new Map(input.attendances.map((a) => [`${a.date}-${a.sessionType}`, a]));
  const noteBy = new Map(input.notes.map((n) => [`${n.date}-${n.sessionType}`, n.note]));
  const approvedBy = new Map(input.approvedRequests.map((r) => [`${r.date}-${r.sessionType}`, r.reason]));

  return input.weekDates.map((date) => {
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    const dayKey = DAY_KEYS[dow];
    const afterSchoolKey = AFTER_SCHOOL_KEYS[dow];

    return {
      date,
      dayOfWeek: DAY_NAMES[dow],
      sessions: emptySessionRecord((sessionType) => {
        const part = participationBy.get(sessionType);
        const participating = part ? part.isParticipating && (dayKey ? part[dayKey] : false) : true;
        const afterSchool = part ? part.isParticipating && (afterSchoolKey ? part[afterSchoolKey] : false) : false;
        const att = attendanceBy.get(`${date}-${sessionType}`);
        const approvedReason = approvedBy.get(`${date}-${sessionType}`) ?? null;
        return {
          status: att?.status ?? null,
          reason: att?.reason ?? null,
          participating,
          afterSchool,
          note: noteBy.get(`${date}-${sessionType}`) ?? null,
          isApprovedAbsence: approvedReason !== null,
          approvedReason,
        };
      }),
    };
  });
}
