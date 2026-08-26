import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/app/attendance/[grade]/page.tsx", import.meta.url), "utf8");

// 탭: SessionType 3개 + 불참신청
assert.match(page, /type Tab = SessionType \| "absence"/, "Tab 타입이 SessionType 기반이 아님");
assert.match(page, /useState<Tab>\("afternoon1"\)/, "기본 탭이 afternoon1 이 아님");
assert.match(page, /SESSION_TYPES\.map\(\(sessionType\) => \(/, "탭 버튼을 SESSION_TYPES 로 그리지 않음");
assert.doesNotMatch(page, /오후자습\s*<\/button>/, "옛 오후자습 탭 버튼이 남아 있음");

// 좌석 세션 분기
assert.match(page, /const seatSession = tab === "absence" \? null : seatSessionOf\(tab\)/, "seatSession 파생값이 없음");
assert.match(page, /grade === 2 && seatSession === "night"/, "미래홀 분기가 seatSession 기준이 아님");
assert.match(page, /buildPrintGroups\(rooms, seatSession, grade\)/, "그룹 분기가 seatSession 을 넘기지 않음");
assert.doesNotMatch(page, /tab === "afternoon"/, "옛 tab === \"afternoon\" 비교가 남아 있음");
assert.doesNotMatch(page, /tab === "night"/, "옛 tab === \"night\" 비교가 남아 있음");

// 주간 팝업
assert.match(page, /summarizeWeeklyCell/, "팝업이 공용 우선순위 함수를 쓰지 않음");
assert.match(page, /sessionTypesOfSeat\(seatSessionOf\(tab\)\)/, "팝업이 좌석 세션의 블록 목록을 쓰지 않음");
assert.match(page, /grid-cols-\[auto_repeat\(5,1fr\)\]/, "팝업 그리드가 라벨 열 + 5요일 구조가 아님");
assert.match(page, /reasonLabel\(/, "사유가 한글 라벨로 표시되지 않음");
assert.doesNotMatch(page, /interface WeeklyDay \{/, "옛 WeeklyDay 인터페이스가 남아 있음");
assert.doesNotMatch(page, /afternoonNote|nightNote|afternoonParticipating/, "옛 weekly 필드명이 남아 있음");
assert.doesNotMatch(page, /const reasonLabels: Record/, "로컬 사유 라벨 맵이 남아 있음");

// 복사 버튼
assert.match(page, /\/api\/attendance\/copy-session/, "복사 API 호출이 없음");
assert.match(page, /tab === COPY_TARGET/, "복사 버튼이 대상 블록 탭에만 보이도록 제한되지 않음");
assert.match(page, /오후1 결과 복사/, "복사 버튼 라벨이 없음");
assert.match(page, /confirm\("오후1 출석 결과를 오후2 미체크 학생에게 복사할까요\?"\)/, "복사 확인 다이얼로그가 없음");

// 라벨
assert.match(page, /SESSION_META\[r\.sessionType\]\.label/, "불참신청 목록 라벨이 SESSION_META 가 아님");
assert.match(page, /SESSION_META\[request\.sessionType\]\.label/, "일괄승인 모달 라벨이 SESSION_META 가 아님");
assert.doesNotMatch(page, /"오후자습" : "야간자습"/, "옛 세션 라벨 삼항이 남아 있음");

console.log("attendance-page-wiring checks passed");
