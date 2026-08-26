import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// "afternoon" 리터럴은 좌석 세션 컨텍스트에서만 유효하다. 출석·불참·참여·감독 코드에 남으면
// 타입은 통과해도 런타임 enum 오류 또는 빈 결과로 조용히 실패한다.
const SEAT_CONTEXT_ALLOWLIST = new Set([
  "lib/sessions.ts",
  "lib/seats/print-groups.ts",
  "components/seats/SeatingEditor.tsx",
  "app/grade-admin/[grade]/seats/print/page.tsx",
  "app/grade-admin/[grade]/seats/page.tsx",
  "app/grade-admin/[grade]/page.tsx",
  "app/admin/seats/page.tsx",
  "app/api/grade-admin/[grade]/seat-layouts/route.ts",
  // 좌석 세션 분기(seatSession === "afternoon") 와 "오후 전체" 편의 선택(sessionTypesOfSeat("afternoon"))
  "app/attendance/[grade]/page.tsx",
  "app/student/absence-requests/page.tsx",
]);

const SKIPPED_DIRS = new Set(["generated", "node_modules"]);
const srcDir = fileURLToPath(new URL("../src/", import.meta.url));

function collect(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) out.push(...collect(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = collect(srcDir);
assert.ok(files.length > 50, `src 스캔이 비정상적으로 적게 잡힘 (${files.length}개)`);

const afternoonLiteral = /["']afternoon["']/;
const legacyMinutes = /\?\? 100\b/;
const legacyCoalesce = /COALESCE\([^)]*duration_minutes,\s*100\)/;

const offenders: string[] = [];
for (const file of files) {
  const rel = path.relative(srcDir, file).replace(/\\/g, "/");
  const src = readFileSync(file, "utf8");
  if (afternoonLiteral.test(src) && !SEAT_CONTEXT_ALLOWLIST.has(rel)) offenders.push(`${rel}: "afternoon" 리터럴`);
  if (legacyMinutes.test(src)) offenders.push(`${rel}: ?? 100`);
  if (legacyCoalesce.test(src)) offenders.push(`${rel}: COALESCE(duration_minutes, 100)`);
}

assert.deepEqual(offenders, [], "세션 리터럴/기본 분 상수가 진실 공급원 밖에 남아 있음");

console.log("session-literal-guard checks passed");
