import assert from "node:assert/strict";
import { formatDateWithWeekday } from "../src/lib/calendar";
import {
  reminderKey,
  buildReminderMessage,
  planReminders,
  type ReminderAssignment,
} from "../src/lib/push/reminder-logic";

// formatDateWithWeekday: 2026-06-25 는 목요일, 2026-06-21 은 일요일
assert.equal(formatDateWithWeekday("2026-06-25"), "2026-06-25(목)");
assert.equal(formatDateWithWeekday("2026-06-21"), "2026-06-21(일)");

// buildReminderMessage: 정확한 문구
assert.equal(
  buildReminderMessage("김교사", "2026-06-25", 2),
  "김교사선생님, 2026-06-25(목) 에 2학년 자율학습 감독교사 이십니다. 잘 부탁드립니다."
);

// reminderKey
assert.equal(reminderKey(7, 2), "7-2");

// planReminders: 오후+야간 중복 → 1건으로 dedupe
const sameTeacherTwoSessions: ReminderAssignment[] = [
  { teacherId: 7, grade: 2, teacherName: "김교사" },
  { teacherId: 7, grade: 2, teacherName: "김교사" },
];
const r1 = planReminders(sameTeacherTwoSessions, "2026-06-25", new Set());
assert.equal(r1.length, 1);
assert.equal(r1[0].teacherId, 7);
assert.equal(r1[0].grade, 2);

// planReminders: 한 교사 2개 학년 → 학년별 각각
const twoGrades: ReminderAssignment[] = [
  { teacherId: 7, grade: 1, teacherName: "김교사" },
  { teacherId: 7, grade: 2, teacherName: "김교사" },
];
assert.equal(planReminders(twoGrades, "2026-06-25", new Set()).length, 2);

// planReminders: 이미 발송 로그 있으면 스킵
const alreadySent = new Set([reminderKey(7, 2)]);
const r2 = planReminders(twoGrades, "2026-06-25", alreadySent);
assert.equal(r2.length, 1);
assert.equal(r2[0].grade, 1);

console.log("reminder-logic checks passed");
