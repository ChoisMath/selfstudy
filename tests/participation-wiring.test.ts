import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

for (const rel of [
  "../src/app/api/grade-admin/[grade]/participation-days/route.ts",
  "../src/app/api/homeroom/participation-days/route.ts",
]) {
  const src = read(rel);
  assert.match(src, /sessions: emptySessionRecord/, `${rel}: sessions Record 를 만들지 않음`);
  assert.match(src, /isSessionType\(sessionType\)/, `${rel}: PUT 검증이 없음`);
  assert.doesNotMatch(src, /=== "afternoon"/, `${rel}: 옛 afternoon 비교가 남아 있음`);
  assert.doesNotMatch(src, /night: night/, `${rel}: 옛 night 키가 남아 있음`);
}

for (const rel of [
  "../src/components/admin-shared/ParticipationManagement.tsx",
  "../src/app/grade-admin/[grade]/participation/page.tsx",
  "../src/app/homeroom/participation/page.tsx",
]) {
  const src = read(rel);
  assert.match(src, /sessions: Record<SessionType, DaySettings>/, `${rel}: 학생 타입이 sessions Record 가 아님`);
  assert.match(src, /SESSION_TYPES\.map/, `${rel}: 열을 SESSION_TYPES 로 그리지 않음`);
  assert.doesNotMatch(src, /\["afternoon", "night"\] as const/, `${rel}: 옛 세션 튜플이 남아 있음`);
  assert.doesNotMatch(src, /student\.afternoon|student\.night|s\.afternoon|s\.night/, `${rel}: 옛 세션 키 접근이 남아 있음`);
  assert.match(src, /colSpan=\{21\}/, `${rel}: 로딩/빈 행 colSpan 이 21(3+18) 이 아님`);
}

const studentPage = read("../src/app/student/page.tsx");
assert.match(studentPage, /SESSION_TYPES\.map\(\(t\) => renderSession/, "학생 참여일정이 3세션을 그리지 않음");
assert.doesNotMatch(studentPage, /participationDays\?\.afternoon/, "옛 afternoon 키 접근이 남아 있음");

console.log("participation-wiring checks passed");
