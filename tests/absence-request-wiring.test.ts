import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

const studentApi = read("../src/app/api/student/absence-requests/route.ts");
assert.match(studentApi, /sessionTypes/, "학생 신청 API 가 sessionTypes 배열을 받지 않음");
assert.match(studentApi, /skipDuplicates: true/, "중복 신청을 skipDuplicates 로 처리하지 않음");
assert.match(studentApi, /isSessionType/, "sessionTypes 원소 검증이 없음");
assert.doesNotMatch(studentApi, /\["afternoon", "night"\]/, "옛 세션 리스트가 남아 있음");

const studentPage = read("../src/app/student/absence-requests/page.tsx");
assert.match(studentPage, /SESSION_TYPES\.map/, "세션 버튼을 SESSION_TYPES 로 그리지 않음");
assert.match(studentPage, /오후 전체/, "오후 전체 편의 버튼이 없음");
assert.match(studentPage, /sessionTypesOfSeat\("afternoon"\)/, "오후 전체가 좌석 세션의 블록 목록을 쓰지 않음");
assert.match(studentPage, /sessionTypes,/, "전송 바디가 sessionTypes 가 아님");

const batchApi = read("../src/app/api/student/batch-absence/route.ts");
assert.match(batchApi, /participating: emptySessionRecord/, "도우미 GET 이 Record<SessionType,boolean> 을 만들지 않음");
assert.doesNotMatch(batchApi, /validSessionTypes = \[/, "옛 validSessionTypes 배열이 남아 있음");

const batchPage = read("../src/app/student/batch-absence/page.tsx");
assert.match(batchPage, /selected: Record<SessionType, boolean>/, "행 상태가 Record<SessionType,boolean> 이 아님");
assert.doesNotMatch(batchPage, /afternoonSelected|nightSelected/, "옛 행 상태 필드가 남아 있음");

const reasonsApi = read("../src/app/api/homeroom/absence-reasons/route.ts");
assert.match(reasonsApi, /isSessionType\(sessionType\)/);
const reasonsPage = read("../src/app/homeroom/absence-reasons/page.tsx");
assert.match(reasonsPage, /SESSION_TYPES\.map/);
assert.match(reasonsPage, /useState<SessionType>\("afternoon1"\)/);

const homeroomList = read("../src/app/homeroom/absence-requests/page.tsx");
assert.match(homeroomList, /SESSION_META\[req\.sessionType\]\.shortLabel/);
assert.doesNotMatch(homeroomList, /const SESSION_LABELS/);

const swapHistory = read("../src/app/admin/swap-history/page.tsx");
assert.doesNotMatch(swapHistory, /=== "afternoon" \? "오후" : "야간"/);

console.log("absence-request-wiring checks passed");
