import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bellFiles = [
  "../src/app/attendance/layout.tsx",
  "../src/app/homeroom/layout.tsx",
  "../src/components/admin-shared/AdminNav.tsx",
];

for (const rel of bellFiles) {
  const src = readFileSync(new URL(rel, import.meta.url), "utf8");
  assert.match(src, /NotificationBell/, `${rel} 에 NotificationBell 누락`);
}

// grade-admin 레이아웃은 AdminNav 를 통해 벨을 상속받는다
const gradeAdmin = readFileSync(
  new URL("../src/app/grade-admin/[grade]/layout.tsx", import.meta.url),
  "utf8"
);
assert.match(gradeAdmin, /AdminNav/, "grade-admin layout 이 AdminNav 를 렌더하지 않음");

console.log("notification-bell-placement checks passed");
