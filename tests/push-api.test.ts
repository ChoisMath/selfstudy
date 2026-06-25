import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sub = readFileSync(
  new URL("../src/app/api/push/subscribe/route.ts", import.meta.url),
  "utf8"
);
const unsub = readFileSync(
  new URL("../src/app/api/push/unsubscribe/route.ts", import.meta.url),
  "utf8"
);

// 인가: 두 라우트 모두 teacher 권한
assert.match(sub, /withAuth\(\["teacher"\]/);
assert.match(unsub, /withAuth\(\["teacher"\]/);

// subscribe: endpoint 기준 upsert, 현재 교사 id 사용
assert.match(sub, /pushSubscription\.upsert/);
assert.match(sub, /user\.userId/);

// unsubscribe: endpoint로 삭제
assert.match(unsub, /pushSubscription\.deleteMany/);

console.log("push-api checks passed");
