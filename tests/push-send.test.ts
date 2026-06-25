import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isExpiredSubscriptionError } from "../src/lib/push/send";

// 만료 판정: 404/410만 만료로 간주
assert.equal(isExpiredSubscriptionError(404), true);
assert.equal(isExpiredSubscriptionError(410), true);
assert.equal(isExpiredSubscriptionError(400), false);
assert.equal(isExpiredSubscriptionError(500), false);
assert.equal(isExpiredSubscriptionError(0), false);

// contract: send.ts가 만료 구독을 삭제하고 web-push를 사용하는지
const src = readFileSync(new URL("../src/lib/push/send.ts", import.meta.url), "utf8");
assert.match(src, /setVapidDetails/);
assert.match(src, /sendNotification/);
assert.match(src, /pushSubscription\.delete/);
assert.match(src, /isExpiredSubscriptionError/);

console.log("push-send checks passed");
