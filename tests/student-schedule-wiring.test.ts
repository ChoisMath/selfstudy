import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// --- 좌석 API: 학생 전용, 내 userId 기준, 그룹 규칙은 lib, 출결/불참 정보 노출 없음 ---
const seatsApi = read("../src/app/api/student/seats/route.ts");
assert.match(seatsApi, /withAuth\(\["student"\]/, "seats API 가 학생 전용이 아님");
assert.match(seatsApi, /where: \{ studentId: user\.userId \}/, "내 좌석을 세션 userId 로 조회하지 않음");
assert.match(seatsApi, /selectSeatGroupRooms\(/, "그룹 규칙을 lib 헬퍼로 계산하지 않음");
assert.match(seatsApi, /SEAT_SESSION_TYPES\.map/, "오후/야간을 SEAT_SESSION_TYPES 로 돌지 않음");
assert.doesNotMatch(seatsApi, /prisma\.attendance|prisma\.absenceRequest/, "좌석 API 가 출결/불참 정보를 조회함");

console.log("student-schedule-wiring checks passed");
