import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SHARED_SEAT_SESSION_LABEL,
  effectiveSeatSession,
  seatSessionLabel,
} from "../src/lib/sessions";
import { participatesInSeatSession, participatesInSharedSeatLayout } from "../src/lib/seats/seat-participation";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// --- 순수 로직: 공유 중이면 오후도 야간 배치를 읽는다 ---
assert.equal(effectiveSeatSession("afternoon", false), "afternoon");
assert.equal(effectiveSeatSession("night", false), "night");
assert.equal(effectiveSeatSession("afternoon", true), "night");
assert.equal(effectiveSeatSession("night", true), "night");

assert.equal(seatSessionLabel("afternoon", false), "오후자습");
assert.equal(seatSessionLabel("night", false), "야간자습");
assert.equal(seatSessionLabel("night", true), SHARED_SEAT_SESSION_LABEL);
assert.equal(SHARED_SEAT_SESSION_LABEL, "오후·야간자습");

// --- 공유 배치의 미배정 대상: 세 블록 중 하나라도 참여하면 자리가 필요하다 ---
const days = (afternoon1: boolean, afternoon2: boolean, night: boolean) => [
  { sessionType: "afternoon1", isParticipating: afternoon1 },
  { sessionType: "afternoon2", isParticipating: afternoon2 },
  { sessionType: "night", isParticipating: night },
];
assert.equal(participatesInSharedSeatLayout(days(true, false, false)), true, "오후1만 참여");
assert.equal(participatesInSharedSeatLayout(days(false, true, false)), true, "오후2만 참여");
assert.equal(participatesInSharedSeatLayout(days(false, false, true)), true, "야간만 참여");
assert.equal(participatesInSharedSeatLayout(days(false, false, false)), false, "전부 불참");
assert.equal(participatesInSharedSeatLayout(undefined), true, "레코드 없으면 기본 참여");
// 공유하지 않을 때의 기준은 그대로다
assert.equal(participatesInSeatSession(days(true, false, false), "night"), false);

// --- 스키마·마이그레이션 ---
const schema = read("../prisma/schema.prisma");
assert.match(
  schema,
  /model StudySession \{[\s\S]*?sharesNightLayout\s+Boolean\s+@default\(false\)\s+@map\("shares_night_layout"\)[\s\S]*?\n\}/,
  "StudySession.sharesNightLayout 필드 없음"
);
const migration = read("../prisma/migrations/20261120000000_add_shares_night_layout/migration.sql");
assert.match(
  migration,
  /ALTER TABLE "study_sessions" ADD COLUMN "shares_night_layout" BOOLEAN NOT NULL DEFAULT false/,
  "마이그레이션이 기본값 false 의 NOT NULL 컬럼을 추가하지 않음"
);
assert.doesNotMatch(migration, /DROP|DELETE|UPDATE/i, "공유 설정 마이그레이션은 기존 데이터를 건드리지 않아야 함");

// --- 좌석을 읽는 모든 서버 경로가 공유를 해석한다 (하나라도 빠지면 보관 중인 오후 좌석이 다시 보인다) ---
for (const rel of [
  "../src/app/api/grade-admin/[grade]/seat-layouts/route.ts",
  "../src/app/api/attendance/route.ts",
  "../src/app/api/attendance/copy-session/route.ts",
  "../src/app/api/student/seats/route.ts",
]) {
  const src = read(rel);
  assert.match(src, /isNightLayoutShared\(/, `${rel}: 공유 여부를 조회하지 않음`);
  assert.match(src, /effectiveSeatSession\(/, `${rel}: effectiveSeatSession 으로 좌석 세션을 정하지 않음`);
}
assert.match(read("../src/app/api/grade-admin/[grade]/seat-layouts/route.ts"), /sessions, sharesNightLayout/);
assert.match(read("../src/app/api/attendance/route.ts"), /\n\s+seatSession,\n\s+rooms:/, "출석 응답에 seatSession 없음");
assert.match(read("../src/app/api/student/seats/route.ts"), /sharesNightLayout \}/, "학생 좌석 응답에 sharesNightLayout 없음");

// --- 토글 API: 오후 세션의 설정만 바꾸고 좌석·교실은 지우지 않는다 ---
const toggle = read("../src/app/api/grade-admin/[grade]/seat-sharing/route.ts");
assert.match(toggle, /export async function PUT/);
assert.match(toggle, /withGradeAuth\(grade/, "토글이 withGradeAuth 를 쓰지 않음");
assert.match(toggle, /typeof sharesNightLayout !== "boolean"/, "본문 검증 없음");
assert.match(toggle, /studySession\.update\(/);
assert.doesNotMatch(toggle, /deleteMany|\.delete\(/, "토글이 데이터를 지움 — 오후 배치는 보관해야 한다");

// --- 보관 중에는 학급 교실 구조를 바꿀 수 없다 ---
const listRoute = read("../src/app/api/grade-admin/[grade]/classrooms/route.ts");
const itemRoute = read("../src/app/api/grade-admin/[grade]/classrooms/[id]/route.ts");
assert.match(listRoute, /sharesNightLayout: session\.sharesNightLayout/, "학급 목록 응답에 sharesNightLayout 없음");
assert.equal((listRoute.match(/SHARED_LAYOUT_LOCK_ERROR \}, \{ status: 409/g) ?? []).length, 1, "POST 잠금 없음");
assert.equal((itemRoute.match(/SHARED_LAYOUT_LOCK_ERROR \}, \{ status: 409/g) ?? []).length, 2, "PUT·DELETE 잠금 없음");

// --- 화면 ---
const modal = read("../src/components/seats/ClassroomConfigModal.tsx");
assert.match(modal, /type="checkbox"[\s\S]{0,500}야간자율학습 자리 배치와 동일하게 배치/, "모달에 체크박스 없음");
assert.match(modal, /\/seat-sharing`/, "모달이 토글 API 를 부르지 않음");
assert.match(modal, /disabled=\{shared\}/, "공유 중 학급 추가·수정이 막히지 않음");
assert.match(modal, /disabled=\{busy \|\| shared\}/, "공유 중 학급 삭제가 막히지 않음");

const editor = read("../src/components/seats/SeatingEditor.tsx");
assert.match(editor, /participatesInSharedSeatLayout\(/, "공유 중 미배정 목록이 세 블록 기준이 아님");
assert.match(editor, /grade === 2 && layoutSeat === "night"/, "미래홀 분기가 실제 배치(layoutSeat) 기준이 아님");
assert.match(editor, /print\?session=\$\{layoutSeat\}/, "인쇄가 실제 배치로 열리지 않음");

const panel = read("../src/components/seats/SeatSessionPanel.tsx");
assert.match(panel, /seatLayoutsUrl\(grade, sessionType\)/, "탭이 편집기와 같은 SWR 키를 쓰지 않음");
assert.match(panel, /shared \? \(\s*<span[^>]*>\{SHARED_SEAT_SESSION_LABEL\}<\/span>/, "공유 중 탭이 하나로 합쳐지지 않음");
for (const rel of ["../src/app/grade-admin/[grade]/page.tsx", "../src/app/grade-admin/[grade]/seats/page.tsx"]) {
  assert.match(read(rel), /<SeatSessionPanel grade=\{grade\}/, `${rel}: SeatSessionPanel 을 쓰지 않음`);
}

const card = read("../src/components/student/SeatCheckCard.tsx");
assert.match(card, /shared \? "night" : picked/, "학생 카드가 공유 중 야간 배치 하나로 고정되지 않음");
assert.match(card, /\{SHARED_SEAT_SESSION_LABEL\}/, "학생 카드에 합쳐진 이름 없음");

const printPage = read("../src/app/grade-admin/[grade]/seats/print/page.tsx");
assert.match(printPage, /seatSessionLabel\(sessionType, data\?\.sharesNightLayout \?\? false\)/, "인쇄 제목이 공유 이름을 쓰지 않음");

console.log("shared-night-layout checks passed");
