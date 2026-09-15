import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// --- schema.prisma ---
const schema = read("../prisma/schema.prisma");
assert.match(schema, /enum CorridorSide \{\s*left\s*right\s*\}/, "CorridorSide enum 없음");
assert.match(schema, /enum ClassroomLayoutType \{\s*division\s*single\s*\}/, "ClassroomLayoutType enum 없음");
assert.match(schema, /model Classroom \{[\s\S]*?@@unique\(\[sessionId, classNumber\]\)[\s\S]*?@@map\("classrooms"\)/, "Classroom 모델 계약 위반");
assert.match(schema, /model Classroom \{[\s\S]*?sortOrder\s+Int\s+@default\(0\)/, "Classroom.sortOrder 없음");
assert.match(schema, /model Room \{[\s\S]*?classroomId\s+Int\?\s+@map\("classroom_id"\)/, "Room.classroomId 가 nullable 이 아님");
assert.match(schema, /model Room \{[\s\S]*?classroom\s+Classroom\?/, "Room.classroom 관계 없음");
assert.match(schema, /model StudySession \{[\s\S]*?classrooms\s+Classroom\[\]/, "StudySession.classrooms 없음");
// 삭제 순서는 트랜잭션이 보장한다 — cascade 로 조용히 지우지 않는다
assert.doesNotMatch(schema, /model Room \{[\s\S]*?classroom\s+Classroom\?[^\n]*onDelete: Cascade/, "Room.classroom 에 Cascade 사용");

// --- migration.sql ---
const sql = read("../prisma/migrations/20260915000000_add_classrooms/migration.sql");
assert.match(sql, /CREATE TYPE "CorridorSide" AS ENUM \('left', 'right'\)/);
assert.match(sql, /CREATE TYPE "ClassroomLayoutType" AS ENUM \('division', 'single'\)/);
assert.match(sql, /CREATE TABLE "classrooms"/);
assert.match(sql, /"corridor_side" "CorridorSide" NOT NULL DEFAULT 'right'/);
assert.match(sql, /"layout_type" "ClassroomLayoutType" NOT NULL DEFAULT 'division'/);
assert.match(sql, /CREATE UNIQUE INDEX "classrooms_session_id_class_number_key" ON "classrooms"\("session_id", "class_number"\)/);
assert.match(sql, /ALTER TABLE "rooms" ADD COLUMN "classroom_id" INTEGER/);
assert.match(sql, /ALTER TABLE "rooms" ADD CONSTRAINT "rooms_classroom_id_fkey" FOREIGN KEY \("classroom_id"\) REFERENCES "classrooms"\("id"\) ON DELETE SET NULL/);
// 백필: 기존 "N-M반 분단K" 오후 Room 을 학급에 연결하고 좌석 배정은 보존한다
const ROOM_NAME_PATTERN = "\\^\\[0-9\\]\\+-\\(\\[0-9\\]\\+\\)반 분단\\[0-9\\]\\+\\$";
assert.match(sql, new RegExp(`INSERT INTO "classrooms" \\("session_id", "class_number", "sort_order"\\)[\\s\\S]*?${ROOM_NAME_PATTERN}`), "classrooms 백필 INSERT 없음");
assert.match(sql, /s\."type" = 'afternoon'/, "백필이 오후 세션으로 한정되지 않음");
assert.match(sql, /UPDATE "rooms" r SET "classroom_id" = c\."id"/, "rooms.classroom_id 백필 UPDATE 없음");
assert.doesNotMatch(sql, /seat_layouts/, "마이그레이션이 좌석 배정을 건드림");

// --- seed.ts ---
const seed = read("../prisma/seed.ts");
assert.match(seed, /TRUNCATE TABLE[\s\S]*?classrooms/, "시드 TRUNCATE 목록에 classrooms 없음");
assert.match(seed, /prisma\.classroom\.create/, "시드가 Classroom 을 만들지 않음");
assert.match(seed, /classroomId: classroom\.id/, "시드 Room 이 classroomId 를 연결하지 않음");

console.log("classroom-migration checks passed");
