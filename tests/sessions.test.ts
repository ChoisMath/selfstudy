import assert from "node:assert/strict";
import {
  SESSION_TYPES,
  SEAT_SESSION_TYPES,
  SESSION_META,
  SEAT_SESSION_META,
  REPRESENTATIVE_SESSION_TYPE,
  isSessionType,
  isSeatSessionType,
  seatSessionOf,
  sessionTypesOfSeat,
  attendanceMinutes,
  emptySessionRecord,
} from "../src/lib/sessions";
import { REASON_LABELS, reasonLabel } from "../src/lib/absence-reasons";

assert.deepEqual([...SESSION_TYPES], ["afternoon1", "afternoon2", "night"]);
assert.deepEqual([...SEAT_SESSION_TYPES], ["afternoon", "night"]);

assert.equal(SESSION_META.afternoon1.label, "오후1 자습");
assert.equal(SESSION_META.afternoon2.label, "오후2 자습");
assert.equal(SESSION_META.night.label, "야간자습");
assert.equal(SESSION_META.afternoon1.shortLabel, "오후1");
assert.equal(SESSION_META.night.shortLabel, "야간");
assert.equal(SEAT_SESSION_META.afternoon.label, "오후자습");
assert.equal(SEAT_SESSION_META.night.label, "야간자습");

assert.equal(SESSION_META.afternoon1.defaultMinutes, 50);
assert.equal(SESSION_META.afternoon2.defaultMinutes, 50);
assert.equal(SESSION_META.night.defaultMinutes, 100);

assert.equal(REPRESENTATIVE_SESSION_TYPE, "afternoon1");
assert.ok(isSessionType(REPRESENTATIVE_SESSION_TYPE));

assert.equal(seatSessionOf("afternoon1"), "afternoon");
assert.equal(seatSessionOf("afternoon2"), "afternoon");
assert.equal(seatSessionOf("night"), "night");
assert.deepEqual(sessionTypesOfSeat("afternoon"), ["afternoon1", "afternoon2"]);
assert.deepEqual(sessionTypesOfSeat("night"), ["night"]);
// 왕복: 모든 블록은 자기 좌석 세션의 블록 목록에 포함
for (const t of SESSION_TYPES) {
  assert.ok(sessionTypesOfSeat(seatSessionOf(t)).includes(t));
}

assert.equal(isSessionType("afternoon1"), true);
assert.equal(isSessionType("night"), true);
assert.equal(isSessionType("afternoon"), false); // 옛 값은 블록이 아니다
assert.equal(isSessionType(undefined), false);
assert.equal(isSessionType(1), false);
assert.equal(isSeatSessionType("afternoon"), true);
assert.equal(isSeatSessionType("afternoon1"), false);

assert.equal(attendanceMinutes({ sessionType: "afternoon1", durationMinutes: null }), 50);
assert.equal(attendanceMinutes({ sessionType: "night", durationMinutes: null }), 100);
assert.equal(attendanceMinutes({ sessionType: "night", durationMinutes: 30 }), 30);

const rec = emptySessionRecord((t) => t.length);
assert.deepEqual(rec, { afternoon1: 10, afternoon2: 10, night: 5 });

assert.equal(REASON_LABELS.academy, "학원");
assert.equal(REASON_LABELS.afterschool, "방과후");
assert.equal(REASON_LABELS.illness, "질병");
assert.equal(REASON_LABELS.custom, "기타");
assert.equal(reasonLabel("illness"), "질병");
assert.equal(reasonLabel("unknown-type"), "unknown-type");

console.log("sessions checks passed");
