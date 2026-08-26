import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

for (const rel of [
  "../src/app/api/grade-admin/[grade]/monthly-attendance/route.ts",
  "../src/app/api/homeroom/monthly-attendance/route.ts",
  "../src/app/api/admin/statistics/route.ts",
]) {
  const src = read(rel);
  assert.match(src, /Partial<Record<SessionType, \{ status: string; reason\?: string \}>>/, `${rel}: 셀 타입이 일반화되지 않음`);
  assert.match(src, /for \(const t of SESSION_TYPES\)/, `${rel}: 세션 루프가 없음`);
  assert.doesNotMatch(src, /afternoonReason|nightReason/, `${rel}: 옛 사유 키가 남아 있음`);
}

for (const rel of [
  "../src/components/grade-admin/GradeMonthlyAttendance.tsx",
  "../src/app/homeroom/attendance/page.tsx",
]) {
  const src = read(rel);
  assert.match(src, /colSpan=\{3\}/, `${rel}: 날짜 헤더 colSpan 이 3 이 아님`);
  assert.match(src, /SESSION_META\[t\]\.shortLabel/, `${rel}: 서브 헤더 라벨이 SESSION_META 가 아님`);
  assert.match(src, /SESSION_TYPES\.map\(\(t/, `${rel}: 셀을 SESSION_TYPES 로 그리지 않음`);
  assert.doesNotMatch(src, /afternoonPart|nightPart|att\.afternoon|att\.night/, `${rel}: 옛 세션 변수가 남아 있음`);
}

const stats = read("../src/app/admin/statistics/page.tsx");
assert.match(stats, /colSpan=\{3\}/);
assert.match(stats, /SESSION_TYPES\.map/);
assert.doesNotMatch(stats, /data\.afternoon|data\.night/);

for (const rel of [
  "../src/app/api/grade-admin/[grade]/export-attendance/route.ts",
  "../src/app/api/homeroom/export-attendance/route.ts",
  "../src/app/api/admin/export-excel/route.ts",
]) {
  const src = read(rel);
  assert.match(src, /headerRow2\.push\(\.\.\.SESSION_TYPES\.map\(\(t\) => SESSION_META\[t\]\.shortLabel\)\)/, `${rel}: 2행 헤더가 3블록이 아님`);
  assert.match(src, /i \* SESSION_TYPES\.length/, `${rel}: 날짜당 열 수가 SESSION_TYPES.length 가 아님`);
  assert.match(src, /mergeCells\(1, col, 1, col \+ SESSION_TYPES\.length - 1\)/, `${rel}: 병합 폭이 3칸이 아님`);
  assert.doesNotMatch(src, /headerRow2\.push\("오후", "야간"\)/, `${rel}: 옛 2칸 헤더가 남아 있음`);
  assert.doesNotMatch(src, /statusSymbol\(afternoon\), statusSymbol\(night\)/, `${rel}: 옛 2칸 값 push 가 남아 있음`);
}

console.log("monthly-attendance-wiring checks passed");
