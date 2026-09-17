import assert from "node:assert/strict";
import {
  WEEKDAY_KEYS,
  WEEKDAY_LABELS,
  activeDayCount,
  activeSessionTypesOn,
  isActiveOn,
  weekdayKeyOf,
  type DaySettings,
} from "../src/lib/participation-days";

const settings = (isParticipating: boolean, days: Partial<Record<keyof DaySettings, boolean>> = {}): DaySettings => ({
  isParticipating,
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
  ...days,
});

assert.deepEqual([...WEEKDAY_KEYS], ["mon", "tue", "wed", "thu", "fri"]);
assert.equal(WEEKDAY_LABELS.mon, "월");
assert.equal(WEEKDAY_LABELS.fri, "금");

// weekdayKeyOf: 2026-09-17 목, 2026-09-19 토, 2026-09-20 일
assert.equal(weekdayKeyOf("2026-09-17"), "thu");
assert.equal(weekdayKeyOf("2026-09-14"), "mon");
assert.equal(weekdayKeyOf("2026-09-19"), null);
assert.equal(weekdayKeyOf("2026-09-20"), null);

// isActiveOn: 레코드 없음·미참가·요일 false 는 모두 비활성
assert.equal(isActiveOn(undefined, "mon"), false);
assert.equal(isActiveOn(settings(false), "mon"), false);
assert.equal(isActiveOn(settings(true, { mon: false }), "mon"), false);
assert.equal(isActiveOn(settings(true), "mon"), true);

// activeSessionTypesOn: 목요일 — 오후2 는 목 비참여, 야간은 미참가
const days = {
  afternoon1: settings(true),
  afternoon2: settings(true, { thu: false }),
  night: settings(false),
};
assert.deepEqual(activeSessionTypesOn(days, "2026-09-17"), ["afternoon1"]);
assert.deepEqual(activeSessionTypesOn(days, "2026-09-16"), ["afternoon1", "afternoon2"]);
assert.deepEqual(activeSessionTypesOn(days, "2026-09-19"), []);
assert.deepEqual(activeSessionTypesOn({}, "2026-09-16"), []);

// activeDayCount
assert.equal(activeDayCount(undefined), 0);
assert.equal(activeDayCount(settings(false)), 0);
assert.equal(activeDayCount(settings(true, { tue: false, thu: false })), 3);

console.log("participation-days checks passed");
