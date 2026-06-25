import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const client = readFileSync(
  new URL("../src/lib/push/client.ts", import.meta.url),
  "utf8"
);
const bell = readFileSync(
  new URL("../src/components/notifications/NotificationBell.tsx", import.meta.url),
  "utf8"
);

// client: VAPID 변환 + 구독/해제 + API 호출
assert.match(client, /urlBase64ToUint8Array/);
assert.match(client, /NEXT_PUBLIC_VAPID_PUBLIC_KEY/);
assert.match(client, /pushManager\.subscribe/);
assert.match(client, /\/api\/push\/subscribe/);
assert.match(client, /\/api\/push\/unsubscribe/);
assert.match(client, /isIosNonStandalone/);

// bell: 클라이언트 컴포넌트, 권한 요청, iOS 설치 안내, 터치 타겟
assert.match(bell, /"use client"/);
assert.match(bell, /requestPermission/);
assert.match(bell, /홈 화면에 추가/);
assert.match(bell, /min-h-11/);

console.log("notification-bell checks passed");
