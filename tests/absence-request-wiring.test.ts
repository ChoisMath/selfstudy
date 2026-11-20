import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

const studentApi = read("../src/app/api/student/absence-requests/route.ts");
assert.match(studentApi, /sessionTypes/, "학생 신청 API 가 sessionTypes 배열을 받지 않음");
assert.match(studentApi, /skipDuplicates: true/, "중복 신청을 skipDuplicates 로 처리하지 않음");
assert.match(studentApi, /isSessionType/, "sessionTypes 원소 검증이 없음");
assert.doesNotMatch(studentApi, /\["afternoon", "night"\]/, "옛 세션 리스트가 남아 있음");

const studentForm = read("../src/components/student/AbsenceRequestForm.tsx");
assert.match(studentForm, /SESSION_TYPES\.map/, "세션 버튼을 SESSION_TYPES 로 그리지 않음");
assert.match(studentForm, /activeSessionTypesOn\(participationDays, date\)/, "[전체] 가 그 날짜의 활성 세션 목록을 쓰지 않음");
assert.doesNotMatch(studentForm, /오후 전체|sessionTypesOfSeat/, "옛 오후 전체 편의 버튼이 남아 있음");
assert.match(studentForm, /sessionTypes,/, "전송 바디가 sessionTypes 가 아님");

const batchApi = read("../src/app/api/student/batch-absence/route.ts");
assert.match(batchApi, /participating: emptySessionRecord/, "도우미 GET 이 Record<SessionType,boolean> 을 만들지 않음");
assert.doesNotMatch(batchApi, /validSessionTypes = \[/, "옛 validSessionTypes 배열이 남아 있음");

const batchPage = read("../src/app/student/batch-absence/page.tsx");
assert.match(batchPage, /selected: Record<SessionType, boolean>/, "행 상태가 Record<SessionType,boolean> 이 아님");
assert.doesNotMatch(batchPage, /afternoonSelected|nightSelected/, "옛 행 상태 필드가 남아 있음");

// 담임의 '불참사유등록' 탭은 없앴다 — 불참신청 탭의 + 버튼(추가 창)이 승인된 신청으로 등록한다 (2026-11-20 사용자 결정)
assert.ok(!existsSync(new URL("../src/app/homeroom/absence-reasons/page.tsx", import.meta.url)), "불참사유등록 페이지가 남아 있음");
assert.ok(!existsSync(new URL("../src/app/api/homeroom/absence-reasons/route.ts", import.meta.url)), "불참사유등록 API 가 남아 있음");
assert.doesNotMatch(read("../src/app/homeroom/layout.tsx"), /absence-reasons|불참사유등록/, "담임 탭에 불참사유등록이 남아 있음");

const homeroomRequestsApi = read("../src/app/api/homeroom/absence-requests/route.ts");
assert.match(homeroomRequestsApi, /export const POST = withAuth\(\["homeroom", "admin"\]/, "담임용 신청 등록 POST 없음");
assert.match(homeroomRequestsApi, /isSessionType\(value\)/, "POST 가 sessionTypes 원소를 검증하지 않음");
assert.match(homeroomRequestsApi, /isReasonType\(reasonType\)/, "POST 가 사유 유형을 검증하지 않음");
assert.match(homeroomRequestsApi, /OR: assignments\.map/, "POST 가 자기 반 학생으로 제한하지 않음");
assert.match(homeroomRequestsApi, /existing\?\.status === "approved"[\s\S]{0,80}skipped \+= 1/, "이미 승인된 건을 건너뛰지 않음");
assert.match(homeroomRequestsApi, /status: "approved" as const, reviewedBy: user\.userId/, "추가한 신청이 승인 상태가 아님");
// 승인과 같은 처리: 결석 기록 + 사유
assert.match(homeroomRequestsApi, /tx\.attendance\.upsert\([\s\S]*?status: "absent"[\s\S]*?tx\.absenceReason\.upsert\(/, "POST 가 결석·사유를 함께 기록하지 않음");

const addModal = read("../src/components/homeroom/AbsenceRequestAddModal.tsx");
assert.match(addModal, /role="dialog"[\s\S]{0,60}aria-modal="true"/, "추가 창이 dialog 가 아님");
assert.match(addModal, /e\.key === "Escape"/, "추가 창이 Escape 로 닫히지 않음");
assert.match(addModal, /SESSION_TYPES\.map/, "추가 창이 3블록을 그리지 않음");
assert.match(addModal, /type="checkbox"/, "자습 시간을 여러 개 고를 수 없음");
assert.match(addModal, /JSON\.stringify\(\{ studentId, date, sessionTypes, reasonType, detail \}\)/, "전송 바디가 sessionTypes 배열이 아님");

const homeroomList = read("../src/app/homeroom/absence-requests/page.tsx");
assert.match(homeroomList, /aria-label="불참신청 추가"/, "불참신청 탭에 + 버튼 없음");
assert.match(homeroomList, /<AbsenceRequestAddModal/, "불참신청 탭이 추가 창을 띄우지 않음");
assert.match(homeroomList, /SESSION_META\[req\.sessionType\]\.shortLabel/);
assert.doesNotMatch(homeroomList, /const SESSION_LABELS/);

const swapHistory = read("../src/app/admin/swap-history/page.tsx");
assert.doesNotMatch(swapHistory, /=== "afternoon" \? "오후" : "야간"/);

console.log("absence-request-wiring checks passed");
