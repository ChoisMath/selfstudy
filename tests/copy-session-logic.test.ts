import assert from "node:assert/strict";
import { planSessionCopy } from "../src/lib/attendance/copy-session";

const plan = planSessionCopy({
  seatedStudentIds: [1, 2, 3, 4, 5, 6, 7, 8],
  fromAttendance: new Map([
    [1, { status: "present", hasReason: false }],   // → present
    [2, { status: "absent", hasReason: false }],    // → absent (사유 없음)
    [3, { status: "absent", hasReason: true }],     // 사유 있는 결석 → 건너뜀
    [4, { status: "present", hasReason: false }],   // 오후2 이미 체크됨 → 건너뜀
    [5, { status: "present", hasReason: false }],   // 오후2 비참여 → 건너뜀
    [6, { status: "present", hasReason: false }],   // 오후2 불참신청 있음 → 건너뜀
    // 7: 오후1 미체크 → 건너뜀
    [8, { status: "unchecked", hasReason: false }], // → 건너뜀
  ]),
  toAttendanceStudentIds: new Set([4]),
  toParticipatingStudentIds: new Set([1, 2, 3, 4, 6, 7, 8]),
  toBlockedStudentIds: new Set([6]),
});

assert.deepEqual(plan.toCreate, [
  { studentId: 1, status: "present" },
  { studentId: 2, status: "absent" },
]);
assert.equal(plan.skipped, 6);

// 좌석에 없는 학생은 대상이 아니다
const none = planSessionCopy({
  seatedStudentIds: [],
  fromAttendance: new Map([[1, { status: "present", hasReason: false }]]),
  toAttendanceStudentIds: new Set(),
  toParticipatingStudentIds: new Set([1]),
  toBlockedStudentIds: new Set(),
});
assert.deepEqual(none, { toCreate: [], skipped: 0 });

console.log("copy-session-logic checks passed");
