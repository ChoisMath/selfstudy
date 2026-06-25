import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

assert.match(sw, /addEventListener\("push"/);
assert.match(sw, /showNotification/);
assert.match(sw, /addEventListener\("notificationclick"/);
assert.match(sw, /clients\.openWindow/);
// 캐시 버전 갱신
assert.match(sw, /selfstudy-v2/);

console.log("service-worker-push checks passed");
