import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SESSION_TYPES, SEAT_SESSION_TYPES } from "../src/lib/sessions";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// --- schema.prisma 의 enum 값 집합이 sessions.ts 와 동일해야 한다 (생성물 비의존) ---
const schema = read("../prisma/schema.prisma");
function enumValues(name: string): string[] {
  const m = schema.match(new RegExp(`enum\\s+${name}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `schema.prisma 에 enum ${name} 이 없음`);
  return m[1].split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//"));
}
assert.deepEqual(enumValues("SessionType"), [...SESSION_TYPES]);
assert.deepEqual(enumValues("SeatSessionType"), [...SEAT_SESSION_TYPES]);
assert.match(schema, /model StudySession \{[\s\S]*?type\s+SeatSessionType/, "StudySession.type 이 SeatSessionType 이 아님");
for (const model of ["SupervisorAssignment", "Attendance", "ParticipationDay", "AttendanceNote", "AbsenceRequest"]) {
  assert.match(
    schema,
    new RegExp(`model ${model} \\{[\\s\\S]*?sessionType\\s+SessionType`),
    `${model}.sessionType 이 SessionType 이 아님`
  );
}

// --- 마이그레이션 SQL 계약 ---
const sql = read("../prisma/migrations/20260826000000_split_afternoon_session/migration.sql");

assert.match(sql, /CREATE TYPE "SeatSessionType" AS ENUM \('afternoon', 'night'\)/);
assert.match(sql, /ALTER TABLE "study_sessions"\s+ALTER COLUMN "type" TYPE "SeatSessionType"/);

assert.match(sql, /CREATE TYPE "SessionType_new" AS ENUM \('afternoon1', 'afternoon2', 'night'\)/);
const TABLES = ["attendance", "absence_requests", "participation_days", "attendance_notes", "supervisor_assignments"];
for (const table of TABLES) {
  assert.match(
    sql,
    new RegExp(`ALTER TABLE "${table}" ALTER COLUMN "session_type" TYPE "SessionType_new"\\s+USING \\(CASE "session_type"::text WHEN 'afternoon' THEN 'afternoon1' ELSE "session_type"::text END\\)::"SessionType_new"`),
    `${table} 의 enum 전환 구문이 없음`
  );
}
assert.match(sql, /ALTER TYPE "SessionType" RENAME TO "SessionType_old"/);
assert.match(sql, /ALTER TYPE "SessionType_new" RENAME TO "SessionType"/);
assert.match(sql, /DROP TYPE "SessionType_old"/);

// 복제: 5개 테이블 + absence_reasons(attendance 1:1 조인)
for (const table of TABLES) {
  assert.match(sql, new RegExp(`INSERT INTO "${table}" \\([^)]*session_type[^)]*\\)\\s+SELECT [^;]*'afternoon2'[^;]*FROM "${table}" WHERE session_type = 'afternoon1'`), `${table} 복제 INSERT 가 없음`);
}
assert.match(sql, /INSERT INTO "absence_reasons"[\s\S]*?JOIN "attendance" a1 ON a1\.id = r\.attendance_id AND a1\.session_type = 'afternoon1'[\s\S]*?JOIN "attendance" a2 ON a2\.student_id = a1\.student_id AND a2\.date = a1\.date AND a2\.session_type = 'afternoon2'/);
// duration_minutes 반분: 복제 행은 나머지, 원본은 몫 → 합 보존
assert.match(sql, /CASE WHEN duration_minutes IS NULL THEN NULL ELSE duration_minutes - duration_minutes \/ 2 END/);
assert.match(sql, /UPDATE "attendance" SET duration_minutes = duration_minutes \/ 2\s+WHERE session_type = 'afternoon1' AND duration_minutes IS NOT NULL/);
// 전환(2단계)이 복제(3단계)보다 먼저
assert.ok(sql.indexOf('DROP TYPE "SessionType_old"') < sql.indexOf("INSERT INTO \"participation_days\""), "복제가 enum 전환보다 앞에 있음");
// 원본 반분 UPDATE 는 복제 INSERT 이후
assert.ok(sql.indexOf("INSERT INTO \"attendance\"") < sql.indexOf('UPDATE "attendance" SET duration_minutes'), "원본 반분이 복제보다 앞에 있음 — 복제 행이 1/4 가 된다");

console.log("session-split-migration checks passed");
