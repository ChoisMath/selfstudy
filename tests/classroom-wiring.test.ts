import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// --- API: 목록/생성 ---
const listRoute = read("../src/app/api/grade-admin/[grade]/classrooms/route.ts");
assert.match(listRoute, /withGradeAuth\(grade/, "classrooms GET/POST 가 withGradeAuth 를 쓰지 않음");
assert.match(listRoute, /export async function GET/);
assert.match(listRoute, /export async function POST/);
assert.match(listRoute, /parseClassroomConfig\(/, "POST 가 parseClassroomConfig 로 검증하지 않음");
assert.match(listRoute, /planClassroomRooms\(/, "POST 가 planClassroomRooms 로 Room 을 만들지 않음");
assert.match(listRoute, /\$transaction/, "POST 가 트랜잭션을 쓰지 않음");
assert.match(listRoute, /status: 409/, "중복 반 번호 409 없음");
assert.match(listRoute, /assignedCount/, "GET 응답에 assignedCount 없음");

// --- API: 수정/삭제 ---
const itemRoute = read("../src/app/api/grade-admin/[grade]/classrooms/[id]/route.ts");
assert.match(itemRoute, /withGradeAuth\(grade/);
assert.match(itemRoute, /export async function PUT/);
assert.match(itemRoute, /export async function DELETE/);
assert.match(itemRoute, /parseClassroomConfig\(/);
assert.match(itemRoute, /isGeometryChanged\(/, "PUT 이 isGeometryChanged 로 초기화 여부를 판정하지 않음");
assert.match(itemRoute, /planClassroomRooms\(/);
assert.match(itemRoute, /\$transaction/);
// 삭제 순서: SeatLayout → Room → Classroom (cascade 없음)
const deleteOrder = /seatLayout\.deleteMany[\s\S]*?room\.deleteMany[\s\S]*?classroom\.delete\(/;
assert.match(itemRoute, deleteOrder, "DELETE 의 삭제 순서가 SeatLayout → Room → Classroom 이 아님");
assert.match(itemRoute, /session\.grade !== grade/, "다른 학년의 classroom id 접근을 막지 않음");
assert.match(itemRoute, /reset/, "PUT 응답에 reset 없음");

console.log("classroom-wiring checks passed");
