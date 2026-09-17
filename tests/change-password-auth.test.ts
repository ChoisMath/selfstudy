import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const route = readFileSync(join(process.cwd(), "src/app/api/auth/change-password/route.ts"), "utf8");

// 관리자 화면·Excel 로 등록한 교사는 역할이 비어 있어 역할 목록으로 막으면 비담임 교사가 비밀번호를 못 바꾼다.
assert.match(route, /withAuth\(\s*\["teacher"\]/, "change-password: 모든 교사(teacher 의사역할) 허용");
assert.doesNotMatch(route, /"supervisor"/, "change-password: 역할 목록으로 제한하지 않음");
assert.match(route, /user\.userType !== "teacher"/, "change-password: 학생 차단 검사 유지");

console.log("change-password-auth checks passed");
