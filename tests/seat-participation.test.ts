import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { participatesInSeatSession } from "../src/lib/seats/seat-participation";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// --- 규칙: 좌석 세션(오후/야간)에 배정 대상인지 여부 ---
// 오후 좌석은 오후1·오후2 블록이 공유하므로 둘 중 하나라도 참여하면 자리가 필요하다.

assert.equal(
  participatesInSeatSession(
    [
      { sessionType: "afternoon1", isParticipating: true },
      { sessionType: "afternoon2", isParticipating: true },
    ],
    "afternoon"
  ),
  true,
  "오후1·오후2 모두 참여 → 오후 좌석 대상"
);

assert.equal(
  participatesInSeatSession(
    [
      { sessionType: "afternoon1", isParticipating: false },
      { sessionType: "afternoon2", isParticipating: false },
      { sessionType: "night", isParticipating: true },
    ],
    "afternoon"
  ),
  false,
  "오후1·오후2 모두 비참여 → 오후 좌석 대상 아님 (야간 참여 여부와 무관)"
);

assert.equal(
  participatesInSeatSession(
    [
      { sessionType: "afternoon1", isParticipating: true },
      { sessionType: "afternoon2", isParticipating: false },
    ],
    "afternoon"
  ),
  true,
  "오후1만 참여 → 오후 좌석 대상 (한 블록이라도 참여하면 자리 필요)"
);

assert.equal(
  participatesInSeatSession([], "afternoon"),
  true,
  "참여설정 레코드 없음 → 기본 참여"
);

assert.equal(
  participatesInSeatSession(undefined, "afternoon"),
  true,
  "participationDays 가 undefined 여도 기본 참여"
);

assert.equal(
  participatesInSeatSession(
    [
      { sessionType: "afternoon1", isParticipating: true },
      { sessionType: "afternoon2", isParticipating: true },
      { sessionType: "night", isParticipating: false },
    ],
    "night"
  ),
  false,
  "야간 비참여 → 야간 좌석 대상 아님 (오후 참여 여부와 무관)"
);

assert.equal(
  participatesInSeatSession(
    [
      { sessionType: "afternoon1", isParticipating: false },
      { sessionType: "afternoon2", isParticipating: false },
    ],
    "night"
  ),
  true,
  "야간 레코드 없음 → 야간은 기본 참여"
);

// --- 배선: SeatingEditor 가 좌석 세션 타입으로 ParticipationDay 를 직접 찾지 않는다 ---
// "afternoon" 은 ParticipationDay.sessionType 에 존재하지 않으므로 직접 비교하면 항상 기본 참여로 떨어져
// 전체 학생이 미배정 목록에 나타난다 (2026-08-26 오후 분리 이후 회귀).
const seatingEditor = read("../src/components/seats/SeatingEditor.tsx");
assert.match(
  seatingEditor,
  /participatesInSeatSession\(/,
  "SeatingEditor 가 participatesInSeatSession 을 사용하지 않음"
);
assert.doesNotMatch(
  seatingEditor,
  /p\.sessionType === sessionType/,
  "SeatingEditor 가 좌석 세션 타입으로 ParticipationDay 를 직접 비교함"
);

console.log("seat-participation checks passed");
