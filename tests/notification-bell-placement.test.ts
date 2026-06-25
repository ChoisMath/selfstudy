import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = [
  "../src/app/attendance/layout.tsx",
  "../src/app/homeroom/layout.tsx",
  "../src/components/admin-shared/AdminNav.tsx",
  "../src/app/grade-admin/[grade]/layout.tsx",
];

for (const rel of files) {
  const src = readFileSync(new URL(rel, import.meta.url), "utf8");
  assert.match(src, /NotificationBell/, `${rel} 에 NotificationBell 누락`);
}

console.log("notification-bell-placement checks passed");
