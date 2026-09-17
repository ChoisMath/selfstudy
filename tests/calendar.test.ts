import assert from "node:assert/strict";
import {
  getKstTodayString,
  formatDateValue,
  parseDateValue,
  formatDateLabel,
  shiftMonth,
  buildMonthCells,
  weekdayOf,
  addDays,
  nextDateForWeekday,
  mondayOf,
} from "../src/lib/calendar";

// formatDateValue: 1-base month/day, zero-padded
assert.equal(formatDateValue(2026, 6, 8), "2026-06-08");
assert.equal(formatDateValue(2026, 12, 25), "2026-12-25");

// parseDateValue
assert.deepEqual(parseDateValue("2026-06-08"), { year: 2026, month: 6, day: 8 });

// formatDateLabel: 2026-06-18 은 목요일, 2026-06-21 은 일요일
assert.equal(formatDateLabel("2026-06-18"), "2026.6.18 (목)");
assert.equal(formatDateLabel("2026-06-21"), "2026.6.21 (일)");

// shiftMonth: 연 경계 처리
assert.deepEqual(shiftMonth(2026, 6, 1), { year: 2026, month: 7 });
assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
assert.deepEqual(shiftMonth(2026, 6, -8), { year: 2025, month: 10 });

// buildMonthCells: 2026-06-01 은 월요일 → 선행 null 1개, 30일
const cells = buildMonthCells(2026, 6);
assert.equal(cells.length, 31); // 1 padding + 30 days
assert.equal(cells[0], null);
assert.equal(cells[1], "2026-06-01");
assert.equal(cells[cells.length - 1], "2026-06-30");

// getKstTodayString: YYYY-MM-DD 형식
assert.match(getKstTodayString(), /^\d{4}-\d{2}-\d{2}$/);

// weekdayOf: 2026-09-17 은 목요일(4), 2026-09-20 은 일요일(0)
assert.equal(weekdayOf("2026-09-17"), 4);
assert.equal(weekdayOf("2026-09-20"), 0);

// addDays: 월/연 경계
assert.equal(addDays("2026-09-30", 1), "2026-10-01");
assert.equal(addDays("2026-12-31", 1), "2027-01-01");
assert.equal(addDays("2026-03-01", -1), "2026-02-28");
assert.equal(addDays("2026-09-17", 0), "2026-09-17");

// nextDateForWeekday: 당일 포함 가장 가까운 해당 요일 (getDay 기준 월=1 … 금=5)
assert.equal(nextDateForWeekday("2026-09-17", 4), "2026-09-17"); // 목요일에 목 → 당일
assert.equal(nextDateForWeekday("2026-09-17", 5), "2026-09-18"); // 아직 안 지난 금 → 이번 주
assert.equal(nextDateForWeekday("2026-09-17", 1), "2026-09-21"); // 지난 월 → 다음 주
assert.equal(nextDateForWeekday("2026-09-19", 1), "2026-09-21"); // 토요일 → 다음 주 월
assert.equal(nextDateForWeekday("2026-09-20", 5), "2026-09-25"); // 일요일 → 다음 주 금

// mondayOf: 2026-09-14 은 월요일. 목·토·일 모두 같은 주의 월요일로
assert.equal(mondayOf("2026-09-14"), "2026-09-14");
assert.equal(mondayOf("2026-09-17"), "2026-09-14");
assert.equal(mondayOf("2026-09-19"), "2026-09-14");
assert.equal(mondayOf("2026-09-20"), "2026-09-14");

console.log("calendar util checks passed");
