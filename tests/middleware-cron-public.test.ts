import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/middleware.ts", import.meta.url), "utf8");

// /api/cron 은 세션 미들웨어를 우회해야 한다 (라우트 핸들러가 CRON_SECRET Bearer 인증 담당)
assert.match(src, /pathname\.startsWith\("\/api\/cron"\)/);

// 우회 분기가 토큰 검사 호출(await getToken)보다 먼저 와야 한다 (그렇지 않으면 /login 으로 307)
const cronIdx = src.indexOf('pathname.startsWith("/api/cron")');
const getTokenCallIdx = src.indexOf("await getToken");
assert.ok(cronIdx !== -1 && getTokenCallIdx !== -1, "필수 토큰: /api/cron, await getToken");
assert.ok(cronIdx < getTokenCallIdx, "/api/cron 공개 분기가 getToken 호출보다 앞에 있어야 함");

console.log("middleware-cron-public checks passed");
