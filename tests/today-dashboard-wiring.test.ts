import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

for (const rel of [
  "../src/app/api/grade-admin/[grade]/today-attendance/route.ts",
  "../src/app/api/admin/today-attendance/route.ts",
]) {
  const src = read(rel);
  assert.match(src, /sessions: emptySessionRecord/, `${rel}: sessions Record 를 만들지 않음`);
  assert.match(src, /sessionType: SessionType\)/, `${rel}: calcStats 가 SessionType 을 받지 않음`);
  assert.doesNotMatch(src, /afternoon: (emptyStats|calcStats)/, `${rel}: 옛 afternoon 키가 남아 있음`);
}

const dashboard = read("../src/components/grade-admin/TodayAttendanceDashboard.tsx");
assert.match(dashboard, /sessions: Record<SessionType, SessionStats>/);
assert.match(dashboard, /SESSION_TYPES\.map\(\(t\) => \(/);
assert.match(dashboard, /SESSION_META\[t\]\.icon/);

const adminPage = read("../src/app/admin/page.tsx");
assert.match(adminPage, /sessions: Record<SessionType, SessionStats>/);
assert.match(adminPage, /SESSION_TYPES\.map\(\(t\) => \(/);

const homeroom = read("../src/app/homeroom/page.tsx");
assert.match(homeroom, /colSpan=\{3\}/, "담임 주간표 날짜 헤더가 3칸이 아님");
assert.match(homeroom, /SESSION_TYPES\.map\(\(t/, "담임 주간표 셀을 SESSION_TYPES 로 그리지 않음");
assert.doesNotMatch(homeroom, /afternoonAtt|nightAtt|afternoonPart|nightPart/, "옛 세션 변수가 남아 있음");
assert.match(homeroom, /colSpan=\{18\}/, "로딩/빈 행 colSpan 이 18(3+15) 이 아님");

const student = read("../src/app/student/attendance/page.tsx");
assert.match(student, /SESSION_TYPES\.map\(\(sessionType\) => \(/, "학생 주간표 행이 3세션이 아님");
assert.match(student, /SESSION_META\[a\.sessionType\]\.shortLabel/, "결석 사유 라벨이 SESSION_META 가 아님");
assert.doesNotMatch(student, /getDayStatus\(day, "afternoon"\)/, "옛 월간 점 조회가 남아 있음");

console.log("today-dashboard-wiring checks passed");
