import assert from "node:assert/strict";
import {
  getKstTodayString,
  formatDateValue,
  parseDateValue,
  formatDateLabel,
  shiftMonth,
  buildMonthCells,
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

console.log("calendar util checks passed");
