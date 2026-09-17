import { weekdayOf } from "@/lib/calendar";
import { SESSION_TYPES, type SessionType } from "@/lib/sessions";

export const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금",
};

// `/api/student/participation-days` 응답의 participationDays[sessionType] 과 같은 형태
export type DaySettings = { isParticipating: boolean } & Record<WeekdayKey, boolean>;

export type ParticipationDaysMap = Partial<Record<SessionType, DaySettings>>;

export function weekdayKeyOf(date: string): WeekdayKey | null {
  // getDay() 는 일=0 이므로 월~금은 1~5
  const index = weekdayOf(date) - 1;
  return index >= 0 && index < WEEKDAY_KEYS.length ? WEEKDAY_KEYS[index] : null;
}

// 레코드가 없으면 비활성으로 본다 — 학생 화면의 회색 표시와 같은 규칙(출석 API 의 "기본 참여" 와 다름)
export function isActiveOn(settings: DaySettings | undefined, key: WeekdayKey): boolean {
  return !!settings && settings.isParticipating && settings[key];
}

export function activeSessionTypesOn(days: ParticipationDaysMap, date: string): SessionType[] {
  const key = weekdayKeyOf(date);
  if (!key) return [];
  return SESSION_TYPES.filter((sessionType) => isActiveOn(days[sessionType], key));
}

export function activeDayCount(settings: DaySettings | undefined): number {
  if (!settings?.isParticipating) return 0;
  return WEEKDAY_KEYS.filter((key) => settings[key]).length;
}
