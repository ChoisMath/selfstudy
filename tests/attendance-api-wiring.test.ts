import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

const attendance = read("../src/app/api/attendance/route.ts");
assert.match(attendance, /seatSessionOf\(session\)/, "좌석 세션을 seatSessionOf 로 결정하지 않음");
assert.match(attendance, /isSessionType\(session\)/, "session 파라미터 검증이 없음");
assert.doesNotMatch(attendance, /as SessionType/, "검증 없는 타입 단언이 남아 있음");

const toggle = read("../src/app/api/attendance/toggle/route.ts");
assert.match(toggle, /isSessionType\(sessionType\)/, "toggle 에 sessionType 검증이 없음");

const byId = read("../src/app/api/attendance/[id]/route.ts");
assert.match(byId, /isSessionType\(sessionType\)/, "[id] 토글에 sessionType 검증이 없음");

const notes = read("../src/app/api/attendance/notes/route.ts");
assert.match(notes, /isSessionType\(sessionType\)/, "notes PUT 에 sessionType 검증이 없음");
assert.doesNotMatch(notes, /afternoon\?:/, "notes GET 응답이 아직 afternoon/night 키 쌍");
assert.match(notes, /Partial<Record<SessionType, string>>/, "notes GET 응답이 Record<SessionType,…> 가 아님");

const supervisorRoute = read("../src/app/api/attendance/supervisor/route.ts");
assert.match(supervisorRoute, /withAuth\(\["teacher"\]/, "감독교사가 조회할 수 없는 권한 설정");
assert.match(supervisorRoute, /REPRESENTATIVE_SESSION_TYPE/, "학년-날짜 대표 세션 상수를 쓰지 않음");
assert.match(supervisorRoute, /supervisor: assignment\?\.teacher \?\? null/, "supervisor 키로 응답하지 않음");

console.log("attendance-api-wiring checks passed");
