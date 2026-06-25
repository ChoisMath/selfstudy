import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(
  new URL("../scripts/trigger-supervisor-reminders.mjs", import.meta.url),
  "utf8"
);

assert.match(src, /APP_URL/);
assert.match(src, /CRON_SECRET/);
assert.match(src, /\/api\/cron\/supervisor-reminders/);
assert.match(src, /Bearer/);

console.log("trigger-script checks passed");
