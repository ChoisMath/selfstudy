import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(
  new URL("../src/app/api/cron/supervisor-reminders/route.ts", import.meta.url),
  "utf8"
);

// CRON_SECRET Bearer 검증 + 401
assert.match(src, /CRON_SECRET/);
assert.match(src, /Bearer/);
assert.match(src, /401/);

// KST 날짜 사용, toISOString 금지
assert.match(src, /getKstTodayString/);
assert.doesNotMatch(src, /toISOString/);

// UTC 자정 Date 구성 (기존 라우트와 동일 규약)
assert.match(src, /T00:00:00\.000Z/);

// 발송 계획 + 발송 + 로그 기록
assert.match(src, /planReminders/);
assert.match(src, /sendToTeacher/);
assert.match(src, /supervisorReminderLog\.create/);

console.log("cron-supervisor-reminders checks passed");
