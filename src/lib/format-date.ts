/**
 * 화면용 날짜 포맷 — Intl.DateTimeFormat(ko-KR, Asia/Seoul) 기반.
 * "YYYY-MM-DD" 문자열은 반드시 KST 정오로 해석한다(`new Date("YYYY-MM-DD")`는 UTC 자정이라 날짜가 밀릴 수 있음).
 */
const KST = "Asia/Seoul";

export function parseKstDate(date: string | Date): Date {
  return date instanceof Date ? date : new Date(`${date}T12:00:00+09:00`);
}

const monthDayWeekday = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, month: "numeric", day: "numeric", weekday: "short" });
const yearMonth = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, year: "numeric", month: "long" });
const fullDate = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, year: "numeric", month: "long", day: "numeric", weekday: "long" });
const monthDayDots = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, month: "2-digit", day: "2-digit" });

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/** "10/21(화)" — 목록·칩처럼 좁은 곳 */
export function formatMonthDay(date: string | Date, withWeekday = true): string {
  const parts = monthDayWeekday.formatToParts(parseKstDate(date));
  const md = `${part(parts, "month")}/${part(parts, "day")}`;
  return withWeekday ? `${md}(${part(parts, "weekday")})` : md;
}

/** "10.21" — 표 머리글처럼 아주 좁은 곳 */
export function formatMonthDayDots(date: string | Date): string {
  const parts = monthDayDots.formatToParts(parseKstDate(date));
  return `${part(parts, "month")}.${part(parts, "day")}`;
}

/** "2026년 10월" */
export function formatYearMonth(year: number, month: number): string {
  return yearMonth.format(new Date(Date.UTC(year, month - 1, 15, 3)));
}

/** "2026년 10월 21일 화요일" */
export function formatFullDate(date: string | Date): string {
  return fullDate.format(parseKstDate(date));
}

/** "10월 3주차" (해당 월 안에서 7일 단위) */
export function formatWeekOfMonth(date: string | Date): string {
  const d = parseKstDate(date);
  const parts = monthDayWeekday.formatToParts(d);
  const day = Number(part(parts, "day"));
  return `${part(parts, "month")}월 ${Math.ceil(day / 7)}주차`;
}
