const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDateValue(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDateValue(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

export function getKstTodayString(): string {
  const kstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return formatDateValue(kstNow.getFullYear(), kstNow.getMonth() + 1, kstNow.getDate());
}

export function formatDateLabel(date: string): string {
  const { year, month, day } = parseDateValue(date);
  const weekday = new Date(year, month - 1, day).getDay();
  return `${year}.${month}.${day} (${WEEKDAYS[weekday]})`;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const zeroBased = month - 1 + delta;
  const newYear = year + Math.floor(zeroBased / 12);
  const newMonth = ((zeroBased % 12) + 12) % 12 + 1;
  return { year: newYear, month: newMonth };
}

export function buildMonthCells(year: number, month: number): (string | null)[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(formatDateValue(year, month, d));
  return cells;
}
