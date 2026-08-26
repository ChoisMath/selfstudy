import assert from "node:assert/strict";
import {
  summarizeWeeklyCell,
  buildWeeklyRows,
  weekDatesOf,
  type WeeklySessionCell,
} from "../src/lib/attendance/weekly-summary";

const base: WeeklySessionCell = {
  status: null, reason: null, participating: true, afterSchool: false,
  note: null, isApprovedAbsence: false, approvedReason: null,
};

// 우선순위: 비참여 > 불참승인 > 방과후(미체크) > 출석 > 결석 > 미체크
assert.deepEqual(summarizeWeeklyCell({ ...base, participating: false, status: "present" }), { kind: "not-participating", label: "-" });
assert.deepEqual(summarizeWeeklyCell({ ...base, isApprovedAbsence: true, status: "present" }), { kind: "approved-absence", label: "불참승인" });
assert.deepEqual(summarizeWeeklyCell({ ...base, isApprovedAbsence: true, status: null }), { kind: "approved-absence", label: "불참승인" });
assert.deepEqual(summarizeWeeklyCell({ ...base, afterSchool: true, status: null }), { kind: "after-school", label: "방과후" });
assert.deepEqual(summarizeWeeklyCell({ ...base, afterSchool: true, status: "unchecked" }), { kind: "after-school", label: "방과후" });
assert.deepEqual(summarizeWeeklyCell({ ...base, afterSchool: true, status: "present" }), { kind: "present", label: "출석" });
assert.deepEqual(summarizeWeeklyCell({ ...base, status: "present" }), { kind: "present", label: "출석" });
assert.deepEqual(summarizeWeeklyCell({ ...base, status: "absent" }), { kind: "absent", label: "결석" });
assert.deepEqual(summarizeWeeklyCell({ ...base, status: "unchecked" }), { kind: "unchecked", label: "-" });
assert.deepEqual(summarizeWeeklyCell(base), { kind: "unchecked", label: "-" });

// weekDatesOf: 2026-08-26(수) → 08-24(월) ~ 08-28(금); 일요일은 직전 월요일 주
assert.deepEqual(weekDatesOf("2026-08-26"), ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28"]);
assert.deepEqual(weekDatesOf("2026-08-30"), ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28"]);
assert.equal(weekDatesOf("2026-08-24")[0], "2026-08-24");

// buildWeeklyRows: 참여설정 없으면 참여(true)·방과후(false), 승인 불참은 Attendance 와 무관하게 표시
const rows = buildWeeklyRows({
  weekDates: weekDatesOf("2026-08-26"),
  participationDays: [
    { sessionType: "afternoon2", isParticipating: true, mon: true, tue: false, wed: true, thu: true, fri: true,
      afterSchoolMon: false, afterSchoolTue: false, afterSchoolWed: true, afterSchoolThu: false, afterSchoolFri: false },
    { sessionType: "night", isParticipating: false, mon: true, tue: true, wed: true, thu: true, fri: true,
      afterSchoolMon: false, afterSchoolTue: false, afterSchoolWed: false, afterSchoolThu: false, afterSchoolFri: false },
  ],
  attendances: [
    { date: "2026-08-24", sessionType: "afternoon1", status: "present", reason: null },
    { date: "2026-08-24", sessionType: "afternoon2", status: "absent", reason: { type: "illness", detail: "감기" } },
  ],
  notes: [{ date: "2026-08-25", sessionType: "afternoon1", note: "조퇴" }],
  approvedRequests: [{ date: "2026-08-27", sessionType: "afternoon1", reason: { type: "academy", detail: null } }],
});

assert.equal(rows.length, 5);
assert.equal(rows[0].date, "2026-08-24");
assert.equal(rows[0].dayOfWeek, "월");
assert.equal(rows[2].dayOfWeek, "수");

const mon = rows[0].sessions;
assert.equal(mon.afternoon1.status, "present");
assert.equal(mon.afternoon1.participating, true);   // 설정 없음 → 참여
assert.equal(mon.afternoon2.status, "absent");
assert.deepEqual(mon.afternoon2.reason, { type: "illness", detail: "감기" });
assert.equal(mon.night.participating, false);        // isParticipating=false
assert.equal(mon.night.status, null);

const tue = rows[1].sessions;
assert.equal(tue.afternoon2.participating, false);   // 화요일 꺼짐
assert.equal(tue.afternoon1.note, "조퇴");
assert.equal(tue.afternoon2.note, null);

const wed = rows[2].sessions;
assert.equal(wed.afternoon2.afterSchool, true);
assert.equal(wed.afternoon1.afterSchool, false);

const thu = rows[3].sessions;
assert.equal(thu.afternoon1.isApprovedAbsence, true);
assert.deepEqual(thu.afternoon1.approvedReason, { type: "academy", detail: null });
assert.equal(thu.afternoon1.status, null);           // Attendance 없어도 승인 표시
assert.equal(thu.afternoon2.isApprovedAbsence, false);

console.log("weekly-summary checks passed");
