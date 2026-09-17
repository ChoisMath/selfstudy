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

// --- 읽기 전용 좌석 격자: dnd 없음, 최소 셀 폭으로 가로 스크롤, 내 자리 aria-current ---
const seatGrid = read("../src/components/seats/StudentSeatGrid.tsx");
assert.doesNotMatch(seatGrid, /@dnd-kit/, "StudentSeatGrid 가 dnd-kit 에 의존함");
assert.match(seatGrid, /minmax\(\$\{MIN_SEAT_WIDTH\}px, 1fr\)/, "셀 최소 폭이 없음 — 좁은 화면에서 이름이 쪼개짐");
assert.match(seatGrid, /aria-current=\{isMine \? "true" : undefined\}/, "내 자리에 aria-current 가 없음");
assert.match(seatGrid, /min-h-11/, "좌석 셀 높이가 44px 미만");
assert.match(seatGrid, /whitespace-nowrap/, "이름 줄바꿈 방지가 없음");

console.log("student-schedule-wiring checks passed");
