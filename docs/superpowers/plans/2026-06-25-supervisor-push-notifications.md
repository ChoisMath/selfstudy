# 감독일 푸시 알림 + PWA 현대화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 감독 배정일 당일 아침 7시(KST)에 해당 감독교사에게 Web Push 알림을 자동 발송하고, PWA 설정을 Next.js 16 규약에 맞게 정리한다.

**Architecture:** 자체 VAPID 키 기반 Web Push(`web-push` 라이브러리). 구독 정보는 자체 PostgreSQL에 저장. 발송은 메인 앱의 보안 cron 엔드포인트가 담당하고, Railway Cron 서비스가 매일 07:00 KST에 이를 호출한다. 순수 로직(메시지 생성·dedupe·발송 계획)은 테스트 가능한 모듈로 분리한다.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7 + PostgreSQL, NextAuth v5, `web-push`, 기존 수동 Service Worker(`public/sw.js`).

## Global Constraints

- 날짜는 `@/lib/calendar`의 KST 안전 유틸 사용. `toISOString()` 사용 금지(KST 새벽 전날 반환 버그).
- 감독배정/리마인더의 DB `date`는 `new Date("YYYY-MM-DD" + "T00:00:00.000Z")`(UTC 자정)로 저장/조회 — 기존 `supervisor-assignments` 라우트와 동일.
- API 라우트 인가는 `withAuth(["teacher"])` 래퍼 사용. 교사 id는 `user.userId`.
- 입력 검증은 기존 라우트(`attendance/toggle`)와 동일한 수동 파싱 방식 — `zod` 신규 도입 금지(미설치, 범위 외).
- 메시지 문구(정확히): `{이름}선생님, {YYYY-MM-DD}({요일}) 에 {학년}학년 자율학습 감독교사 이십니다. 잘 부탁드립니다.`
- 테스트는 `node:assert/strict` 순수 스크립트 + 소스 contract 검사 방식. 실행: `npx tsx tests/<파일>`.
- 반응형 규칙: 터치 타겟 `min-h-11 min-w-11`, 라벨 `whitespace-nowrap`, `100dvh`.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- 작업 브랜치: `feat/supervisor-push-notifications` (이미 생성됨, 스펙 커밋 포함).

---

## File Structure

**신규**
- `src/lib/push/reminder-logic.ts` — 순수 로직: 메시지 빌더, dedupe, 발송 계획
- `src/lib/push/send.ts` — `web-push` 래퍼, 교사별 발송 + 만료 구독 정리
- `src/lib/push/client.ts` — 브라우저 구독/해제 헬퍼 + VAPID base64 변환
- `src/app/api/push/subscribe/route.ts` — 구독 저장
- `src/app/api/push/unsubscribe/route.ts` — 구독 해제
- `src/app/api/cron/supervisor-reminders/route.ts` — 발송 트리거(보안)
- `src/components/notifications/NotificationBell.tsx` — 공통 네비 알림 벨
- `scripts/trigger-supervisor-reminders.mjs` — Railway Cron 서비스용 호출 스크립트
- 테스트: `tests/reminder-logic.test.ts`, `tests/push-send.test.ts`, `tests/push-api.test.ts`, `tests/cron-supervisor-reminders.test.ts`, `tests/service-worker-push.test.ts`, `tests/notification-bell.test.ts`

**수정**
- `prisma/schema.prisma` — 모델 2개 + Teacher 역참조
- `src/lib/calendar.ts` — `formatDateWithWeekday`
- `src/app/layout.tsx` — `viewport` export
- `public/sw.js` — `push`/`notificationclick` + `CACHE_NAME` v2
- `src/app/attendance/layout.tsx`, `src/app/homeroom/layout.tsx`, `src/components/admin-shared/AdminNav.tsx`, `src/app/grade-admin/[grade]/layout.tsx` — 벨 배치
- `package.json` — `web-push`, `@types/web-push`
- `.claude/PROJECT_MAP.md` — 변경 반영

---

## Task 1: PWA 메타데이터 현대화 (viewport export)

독립적이고 작은 작업. `themeColor`를 `metadata`에서 분리한다.

**Files:**
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (빌드 경고 제거만)

- [ ] **Step 1: `viewport` export 추가 및 `themeColor` 이동**

`src/app/layout.tsx` 상단 import 수정:
```tsx
import type { Metadata, Viewport } from "next";
```

`metadata` 객체에서 `themeColor: "#1e40af",` 줄을 **삭제**하고, `metadata` export 바로 아래에 추가:
```tsx
export const viewport: Viewport = {
  themeColor: "#1e40af",
};
```

- [ ] **Step 2: 타입체크로 검증**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (또는 기존과 동일한 unrelated 에러만)

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "Move themeColor to viewport export (Next 16)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 순수 리마인더 로직 (메시지·dedupe·계획)

날짜 헬퍼와 발송 계획 순수 함수를 TDD로 작성. 이후 cron이 이걸 조립한다.

**Files:**
- Modify: `src/lib/calendar.ts`
- Create: `src/lib/push/reminder-logic.ts`
- Test: `tests/reminder-logic.test.ts`

**Interfaces:**
- Consumes: `parseDateValue` (calendar.ts)
- Produces:
  - `formatDateWithWeekday(date: string): string` — `"2026-06-25"` → `"2026-06-25(목)"`
  - `type ReminderAssignment = { teacherId: number; grade: number; teacherName: string }`
  - `type PlannedReminder = { teacherId: number; grade: number; message: string }`
  - `reminderKey(teacherId: number, grade: number): string`
  - `buildReminderMessage(name: string, date: string, grade: number): string`
  - `planReminders(assignments: ReminderAssignment[], date: string, alreadySent: Set<string>): PlannedReminder[]`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/reminder-logic.test.ts`:
```ts
import assert from "node:assert/strict";
import { formatDateWithWeekday } from "../src/lib/calendar";
import {
  reminderKey,
  buildReminderMessage,
  planReminders,
  type ReminderAssignment,
} from "../src/lib/push/reminder-logic";

// formatDateWithWeekday: 2026-06-25 는 목요일, 2026-06-21 은 일요일
assert.equal(formatDateWithWeekday("2026-06-25"), "2026-06-25(목)");
assert.equal(formatDateWithWeekday("2026-06-21"), "2026-06-21(일)");

// buildReminderMessage: 정확한 문구
assert.equal(
  buildReminderMessage("김교사", "2026-06-25", 2),
  "김교사선생님, 2026-06-25(목) 에 2학년 자율학습 감독교사 이십니다. 잘 부탁드립니다."
);

// reminderKey
assert.equal(reminderKey(7, 2), "7-2");

// planReminders: 오후+야간 중복 → 1건으로 dedupe
const sameTeacherTwoSessions: ReminderAssignment[] = [
  { teacherId: 7, grade: 2, teacherName: "김교사" },
  { teacherId: 7, grade: 2, teacherName: "김교사" },
];
const r1 = planReminders(sameTeacherTwoSessions, "2026-06-25", new Set());
assert.equal(r1.length, 1);
assert.equal(r1[0].teacherId, 7);
assert.equal(r1[0].grade, 2);

// planReminders: 한 교사 2개 학년 → 학년별 각각
const twoGrades: ReminderAssignment[] = [
  { teacherId: 7, grade: 1, teacherName: "김교사" },
  { teacherId: 7, grade: 2, teacherName: "김교사" },
];
assert.equal(planReminders(twoGrades, "2026-06-25", new Set()).length, 2);

// planReminders: 이미 발송 로그 있으면 스킵
const alreadySent = new Set([reminderKey(7, 2)]);
const r2 = planReminders(twoGrades, "2026-06-25", alreadySent);
assert.equal(r2.length, 1);
assert.equal(r2[0].grade, 1);

console.log("reminder-logic checks passed");
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx tsx tests/reminder-logic.test.ts`
Expected: FAIL — `formatDateWithWeekday` / `reminder-logic` 모듈 미존재로 import 에러

- [ ] **Step 3: calendar 헬퍼 추가**

`src/lib/calendar.ts` 끝에 추가:
```ts
export function formatDateWithWeekday(date: string): string {
  const { year, month, day } = parseDateValue(date);
  const weekday = new Date(year, month - 1, day).getDay();
  return `${date}(${WEEKDAYS[weekday]})`;
}
```

- [ ] **Step 4: reminder-logic 모듈 작성**

`src/lib/push/reminder-logic.ts`:
```ts
import { formatDateWithWeekday } from "@/lib/calendar";

export type ReminderAssignment = {
  teacherId: number;
  grade: number;
  teacherName: string;
};

export type PlannedReminder = {
  teacherId: number;
  grade: number;
  message: string;
};

export function reminderKey(teacherId: number, grade: number): string {
  return `${teacherId}-${grade}`;
}

export function buildReminderMessage(name: string, date: string, grade: number): string {
  return `${name}선생님, ${formatDateWithWeekday(date)} 에 ${grade}학년 자율학습 감독교사 이십니다. 잘 부탁드립니다.`;
}

export function planReminders(
  assignments: ReminderAssignment[],
  date: string,
  alreadySent: Set<string>
): PlannedReminder[] {
  const seen = new Set<string>();
  const result: PlannedReminder[] = [];
  for (const a of assignments) {
    const key = reminderKey(a.teacherId, a.grade);
    if (seen.has(key)) continue; // 오후+야간 2행 → 1건
    seen.add(key);
    if (alreadySent.has(key)) continue; // 이미 발송됨
    result.push({
      teacherId: a.teacherId,
      grade: a.grade,
      message: buildReminderMessage(a.teacherName, date, a.grade),
    });
  }
  return result;
}
```

> 참고: 테스트는 `@/lib/calendar` 별칭을 쓴다. `npx tsx`가 `tsconfig.json`의 `paths`를 해석하지 못하면, 테스트 import만 상대경로(`../src/lib/...`)로 두고 모듈 내부는 별칭 유지. 기존 테스트(`tests/calendar.test.ts`)가 상대경로를 쓰므로 동일 패턴 준수.

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx tsx tests/reminder-logic.test.ts`
Expected: PASS — `reminder-logic checks passed`

- [ ] **Step 6: 기존 calendar 테스트 회귀 확인**

Run: `npx tsx tests/calendar.test.ts`
Expected: PASS — `calendar util checks passed`

- [ ] **Step 7: Commit**

```bash
git add src/lib/calendar.ts src/lib/push/reminder-logic.ts tests/reminder-logic.test.ts
git commit -m "Add reminder message + dedupe + planning logic

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Prisma 모델 (PushSubscription, SupervisorReminderLog)

**Files:**
- Modify: `prisma/schema.prisma`
- Test: 마이그레이션 적용 + `prisma validate`

**Interfaces:**
- Produces: `prisma.pushSubscription`, `prisma.supervisorReminderLog` 모델 + `Teacher.pushSubscriptions`/`Teacher.reminderLogs` 관계

- [ ] **Step 1: 모델 추가**

`prisma/schema.prisma`의 `Teacher` 모델 관계 목록(`createdNotes ...` 줄 아래)에 추가:
```prisma
  pushSubscriptions PushSubscription[]
  reminderLogs      SupervisorReminderLog[]
```

파일 끝(또는 다른 model 근처)에 추가:
```prisma
model PushSubscription {
  id        Int      @id @default(autoincrement())
  teacherId Int      @map("teacher_id")
  endpoint  String   @unique @db.Text
  p256dh    String   @db.Text
  auth      String   @db.Text
  userAgent String?  @map("user_agent") @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")

  teacher Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)

  @@index([teacherId])
  @@map("push_subscriptions")
}

model SupervisorReminderLog {
  id        Int      @id @default(autoincrement())
  teacherId Int      @map("teacher_id")
  grade     Int
  date      DateTime @db.Date
  sentAt    DateTime @default(now()) @map("sent_at")

  teacher Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)

  @@unique([teacherId, grade, date])
  @@map("supervisor_reminder_logs")
}
```

- [ ] **Step 2: prisma-migration-guardian 에이전트로 사전 검수**

`prisma-migration-guardian` 에이전트를 호출해 변경을 검수한다. 기대: 신규 테이블 추가만으로 기존 데이터 영향 없음(NOT NULL 컬럼을 기존 테이블에 추가하지 않음, rename/cascade 신규 위험 없음). 경고가 나오면 해결 후 진행.

- [ ] **Step 3: 마이그레이션 생성/적용 (로컬)**

로컬 `.env`/`.env.local`에 `DATABASE_URL`(또는 `DATABASE_PUBLIC_URL`)이 설정돼 있어야 함.
Run: `npx prisma migrate dev --name add_push_notifications`
Expected: 마이그레이션 생성 + 적용 성공, Prisma Client 재생성

- [ ] **Step 4: 스키마/클라이언트 검증**

Run: `npx prisma validate && npx prisma generate`
Expected: `The schema is valid` + Client 생성 성공

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Add PushSubscription and SupervisorReminderLog models

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 푸시 발송 라이브러리 (web-push 래퍼)

**Files:**
- Modify: `package.json`
- Create: `src/lib/push/send.ts`
- Test: `tests/push-send.test.ts`

**Interfaces:**
- Consumes: `prisma.pushSubscription` (Task 3)
- Produces:
  - `isExpiredSubscriptionError(statusCode: number): boolean`
  - `type PushPayload = { title: string; body: string; url: string }`
  - `sendToTeacher(teacherId: number, payload: PushPayload): Promise<number>` — 발송 성공 구독 수 반환

- [ ] **Step 1: 의존성 추가**

Run: `npm install web-push && npm install -D @types/web-push`
Expected: `package.json`에 `web-push`(dependencies), `@types/web-push`(devDependencies) 추가

- [ ] **Step 2: 실패하는 테스트 작성 (순수 함수 + contract)**

`tests/push-send.test.ts`:
```ts
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
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx tsx tests/push-send.test.ts`
Expected: FAIL — `send.ts` 미존재로 import 에러

- [ ] **Step 4: send.ts 작성**

`src/lib/push/send.ts`:
```ts
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export function isExpiredSubscriptionError(statusCode: number): boolean {
  return statusCode === 404 || statusCode === 410;
}

export type PushPayload = { title: string; body: string; url: string };

export async function sendToTeacher(
  teacherId: number,
  payload: PushPayload
): Promise<number> {
  ensureConfigured();
  const subs = await prisma.pushSubscription.findMany({ where: { teacherId } });
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 0;
      if (isExpiredSubscriptionError(statusCode)) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      } else {
        console.error(
          `push send failed (teacher ${teacherId}, sub ${sub.id}):`,
          err
        );
      }
    }
  }
  return sent;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx tsx tests/push-send.test.ts`
Expected: PASS — `push-send checks passed`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/push/send.ts tests/push-send.test.ts
git commit -m "Add web-push send helper with stale subscription cleanup

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 구독/해제 API 라우트

**Files:**
- Create: `src/app/api/push/subscribe/route.ts`
- Create: `src/app/api/push/unsubscribe/route.ts`
- Test: `tests/push-api.test.ts`

**Interfaces:**
- Consumes: `withAuth` (`@/lib/api-auth`), `prisma.pushSubscription`
- Produces: `POST /api/push/subscribe`, `POST /api/push/unsubscribe`

- [ ] **Step 1: 실패하는 contract 테스트 작성**

`tests/push-api.test.ts`:
```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx tsx tests/push-api.test.ts`
Expected: FAIL — 라우트 파일 미존재로 read 에러

- [ ] **Step 3: subscribe 라우트 작성**

`src/app/api/push/subscribe/route.ts`:
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

export const POST = withAuth(["teacher"], async (req, user) => {
  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  const userAgent =
    typeof body?.userAgent === "string" ? body.userAgent.slice(0, 255) : null;

  if (
    typeof endpoint !== "string" ||
    typeof p256dh !== "string" ||
    typeof auth !== "string"
  ) {
    return NextResponse.json(
      { error: "잘못된 구독 정보입니다." },
      { status: 400 }
    );
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { teacherId: user.userId, p256dh, auth, userAgent },
    create: { teacherId: user.userId, endpoint, p256dh, auth, userAgent },
  });

  return NextResponse.json({ ok: true });
});
```

- [ ] **Step 4: unsubscribe 라우트 작성**

`src/app/api/push/unsubscribe/route.ts`:
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

export const POST = withAuth(["teacher"], async (req) => {
  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;

  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "endpoint가 필요합니다." }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
});
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx tsx tests/push-api.test.ts`
Expected: PASS — `push-api checks passed`

- [ ] **Step 6: Commit**

```bash
git add src/app/api/push tests/push-api.test.ts
git commit -m "Add push subscribe/unsubscribe API routes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Cron 엔드포인트 (감독 리마인더 발송)

**Files:**
- Create: `src/app/api/cron/supervisor-reminders/route.ts`
- Test: `tests/cron-supervisor-reminders.test.ts`

**Interfaces:**
- Consumes: `getKstTodayString`/`parseDateValue` (calendar), `planReminders`/`reminderKey`/`ReminderAssignment` (Task 2), `sendToTeacher` (Task 4), `prisma`
- Produces: `POST /api/cron/supervisor-reminders` — Bearer `CRON_SECRET` 인증, JSON 요약 반환

- [ ] **Step 1: 실패하는 contract 테스트 작성**

`tests/cron-supervisor-reminders.test.ts`:
```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx tsx tests/cron-supervisor-reminders.test.ts`
Expected: FAIL — 라우트 파일 미존재

- [ ] **Step 3: cron 라우트 작성**

`src/app/api/cron/supervisor-reminders/route.ts`:
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getKstTodayString } from "@/lib/calendar";
import {
  planReminders,
  reminderKey,
  type ReminderAssignment,
} from "@/lib/push/reminder-logic";
import { sendToTeacher } from "@/lib/push/send";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getKstTodayString();
  const dateObj = new Date(today + "T00:00:00.000Z");

  const assignments = await prisma.supervisorAssignment.findMany({
    where: { date: dateObj },
    include: { teacher: { select: { id: true, name: true } } },
  });

  const reminderAssignments: ReminderAssignment[] = assignments.map((a) => ({
    teacherId: a.teacherId,
    grade: a.grade,
    teacherName: a.teacher.name,
  }));

  const existingLogs = await prisma.supervisorReminderLog.findMany({
    where: { date: dateObj },
    select: { teacherId: true, grade: true },
  });
  const alreadySent = new Set(
    existingLogs.map((l) => reminderKey(l.teacherId, l.grade))
  );

  const planned = planReminders(reminderAssignments, today, alreadySent);

  let sent = 0;
  for (const p of planned) {
    await sendToTeacher(p.teacherId, {
      title: "자율학습 감독 안내",
      body: p.message,
      url: "/attendance",
    });
    await prisma.supervisorReminderLog.create({
      data: { teacherId: p.teacherId, grade: p.grade, date: dateObj },
    });
    sent++;
  }

  return NextResponse.json({
    processed: reminderAssignments.length,
    planned: planned.length,
    sent,
  });
}
```

> 멱등성: 발송 직후 `SupervisorReminderLog`를 생성하므로 같은 날 재호출 시 `alreadySent`로 스킵된다. 구독이 0개여도 로그를 남겨 재호출 시 무발송 처리된다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx tsx tests/cron-supervisor-reminders.test.ts`
Expected: PASS — `cron-supervisor-reminders checks passed`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron tests/cron-supervisor-reminders.test.ts
git commit -m "Add secured cron endpoint for supervisor reminders

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 서비스 워커 push 핸들러

**Files:**
- Modify: `public/sw.js`
- Test: `tests/service-worker-push.test.ts`

**Interfaces:**
- Produces: SW `push` / `notificationclick` 이벤트 처리

- [ ] **Step 1: 실패하는 contract 테스트 작성**

`tests/service-worker-push.test.ts`:
```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx tsx tests/service-worker-push.test.ts`
Expected: FAIL — 핸들러/`selfstudy-v2` 미존재

- [ ] **Step 3: sw.js 수정**

`public/sw.js`의 첫 줄 `CACHE_NAME`을 변경:
```js
const CACHE_NAME = "selfstudy-v2";
```

파일 끝(기존 `fetch` 리스너 아래)에 추가:
```js
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "자율학습", {
      body: data.body ?? "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: { url: data.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => c.url.includes(url));
        if (existing) return existing.focus();
        return self.clients.openWindow(url);
      })
  );
});
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx tsx tests/service-worker-push.test.ts`
Expected: PASS — `service-worker-push checks passed`

- [ ] **Step 5: Commit**

```bash
git add public/sw.js tests/service-worker-push.test.ts
git commit -m "Add push and notificationclick handlers to service worker

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 클라이언트 구독 헬퍼 + 알림 벨 컴포넌트

**Files:**
- Create: `src/lib/push/client.ts`
- Create: `src/components/notifications/NotificationBell.tsx`
- Test: `tests/notification-bell.test.ts`

**Interfaces:**
- Consumes: `POST /api/push/subscribe`, `POST /api/push/unsubscribe`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Produces:
  - `urlBase64ToUint8Array(base64: string): Uint8Array`
  - `subscribeToPush(): Promise<void>`
  - `unsubscribeFromPush(): Promise<void>`
  - `isIosNonStandalone(): boolean`
  - `NotificationBell` 컴포넌트 (default/named export)

- [ ] **Step 1: 실패하는 contract 테스트 작성**

`tests/notification-bell.test.ts`:
```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx tsx tests/notification-bell.test.ts`
Expected: FAIL — 파일 미존재

- [ ] **Step 3: client 헬퍼 작성**

`src/lib/push/client.ts`:
```ts
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isIosNonStandalone(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIos && !standalone;
}

export async function subscribeToPush(): Promise<void> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) throw new Error("VAPID 공개키가 설정되지 않았습니다.");

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...subscription.toJSON(), userAgent: navigator.userAgent }),
  });
  if (!res.ok) throw new Error("구독 저장에 실패했습니다.");
}

export async function unsubscribeFromPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
```

> `subscription.toJSON()`은 `{ endpoint, keys: { p256dh, auth }, expirationTime }`를 반환 → subscribe 라우트의 파싱(`body.endpoint`, `body.keys.p256dh/auth`)과 일치.

- [ ] **Step 4: NotificationBell 컴포넌트 작성**

`src/components/notifications/NotificationBell.tsx`:
```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  subscribeToPush,
  unsubscribeFromPush,
  isIosNonStandalone,
} from "@/lib/push/client";

type BellState =
  | "unsupported"
  | "ios-install"
  | "default"
  | "subscribed"
  | "denied";

export function NotificationBell() {
  const [state, setState] = useState<BellState>("default");
  const [showGuide, setShowGuide] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState(isIosNonStandalone() ? "ios-install" : "unsupported");
      return;
    }
    if (isIosNonStandalone()) {
      setState("ios-install");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setState(sub ? "subscribed" : "default");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleClick = async () => {
    if (state === "ios-install" || state === "unsupported" || state === "denied") {
      setShowGuide((v) => !v);
      return;
    }
    setBusy(true);
    try {
      if (state === "subscribed") {
        await unsubscribeFromPush();
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "default");
          return;
        }
        await subscribeToPush();
      }
      await refresh();
    } catch (err) {
      console.error("notification toggle failed:", err);
    } finally {
      setBusy(false);
    }
  };

  const label =
    state === "subscribed"
      ? "알림 켜짐"
      : state === "denied"
        ? "알림 차단됨"
        : state === "ios-install"
          ? "알림 설치 안내"
          : state === "unsupported"
            ? "알림 미지원"
            : "알림 켜기";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-label={label}
        title={label}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-sm whitespace-nowrap disabled:opacity-50"
      >
        <span aria-hidden>{state === "subscribed" ? "🔔" : "🔕"}</span>
        <span className="hidden sm:inline whitespace-nowrap">{label}</span>
      </button>

      {showGuide && (
        <div className="absolute right-0 z-[120] mt-1 w-64 rounded-md border border-gray-200 bg-white p-3 text-sm shadow-lg">
          {state === "ios-install" ? (
            <p className="leading-relaxed">
              iPhone에서는 Safari 하단 <b>공유</b> 버튼 → <b>홈 화면에 추가</b>로
              앱을 설치한 뒤 다시 열어 알림을 켜 주세요.
            </p>
          ) : state === "denied" ? (
            <p className="leading-relaxed">
              브라우저 설정에서 이 사이트의 알림 권한을 <b>허용</b>으로 변경해
              주세요.
            </p>
          ) : (
            <p className="leading-relaxed">
              이 브라우저는 웹 푸시 알림을 지원하지 않습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx tsx tests/notification-bell.test.ts`
Expected: PASS — `notification-bell checks passed`

- [ ] **Step 6: 타입체크**

Run: `npx tsc --noEmit`
Expected: 신규 파일 관련 에러 없음

- [ ] **Step 7: Commit**

```bash
git add src/lib/push/client.ts src/components/notifications/NotificationBell.tsx tests/notification-bell.test.ts
git commit -m "Add push client helpers and NotificationBell component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 알림 벨을 교사 레이아웃에 배치

모든 교사가 접근하는 네비 4곳에 벨을 노출한다. 각 파일의 기존 네비/헤더 구조에 맞춰 `<NotificationBell />`을 삽입한다.

**Files:**
- Modify: `src/app/attendance/layout.tsx`
- Modify: `src/app/homeroom/layout.tsx`
- Modify: `src/components/admin-shared/AdminNav.tsx`
- Modify: `src/app/grade-admin/[grade]/layout.tsx`
- Test: `tests/notification-bell-placement.test.ts`

**Interfaces:**
- Consumes: `NotificationBell` (Task 8)

- [ ] **Step 1: 실패하는 contract 테스트 작성**

`tests/notification-bell-placement.test.ts`:
```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx tsx tests/notification-bell-placement.test.ts`
Expected: FAIL — 4개 파일에 `NotificationBell` 없음

- [ ] **Step 3: 각 레이아웃에 벨 삽입**

각 파일 상단에 import 추가:
```tsx
import { NotificationBell } from "@/components/notifications/NotificationBell";
```

그리고 각 파일의 네비/헤더 컨테이너(버튼들이 모여 있는 행)의 마지막 항목으로 `<NotificationBell />`를 추가한다. 기존 네비 요소들이 `flex` 행에 있을 것이므로, 우측 끝에 배치하려면 벨 앞 요소에 `ml-auto` 또는 래퍼 정렬을 활용한다.

- `src/components/admin-shared/AdminNav.tsx`: 메뉴 링크들이 들어있는 네비 컨테이너의 끝에 `<NotificationBell />` 추가.
- `src/app/attendance/layout.tsx`: 상단 이동 버튼(담임/감독일정/학년관리) 행의 끝에 추가.
- `src/app/homeroom/layout.tsx`: 담임 탭 네비 행의 끝에 추가.
- `src/app/grade-admin/[grade]/layout.tsx`: `AdminNav`를 포함한다면 AdminNav 변경으로 충분할 수 있으나, 별도 헤더가 있으면 거기에 추가. 테스트가 `grade-admin/[grade]/layout.tsx` 파일 자체에서 `NotificationBell` 문자열을 찾으므로, 이 파일에서 직접 import+렌더하거나 명시적으로 사용하는 컴포넌트를 거치도록 한다.

> 구현자는 각 파일의 실제 JSX 구조를 읽고 기존 정렬(`flex items-center gap-*`)을 깨지 않게 삽입할 것. 라벨은 `sm:` 이상에서만 보이므로 모바일 네비 폭을 침범하지 않는다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx tsx tests/notification-bell-placement.test.ts`
Expected: PASS — `notification-bell-placement checks passed`

- [ ] **Step 5: responsive-ui-reviewer 에이전트로 검수**

변경된 레이아웃 4곳에 대해 `responsive-ui-reviewer` 에이전트를 호출. 줄바꿈/터치타겟/정렬 위반이 없는지 확인하고 지적사항 반영.

- [ ] **Step 6: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 7: Commit**

```bash
git add src/app/attendance/layout.tsx src/app/homeroom/layout.tsx src/components/admin-shared/AdminNav.tsx "src/app/grade-admin/[grade]/layout.tsx" tests/notification-bell-placement.test.ts
git commit -m "Place NotificationBell in teacher navigation layouts

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Railway Cron 트리거 스크립트 + 배포 설정 + 문서

**Files:**
- Create: `scripts/trigger-supervisor-reminders.mjs`
- Modify: `.claude/PROJECT_MAP.md`
- Test: `tests/trigger-script.test.ts`

**Interfaces:**
- Consumes: 메인 앱 `POST /api/cron/supervisor-reminders`, env `APP_URL`/`CRON_SECRET`

- [ ] **Step 1: 실패하는 contract 테스트 작성**

`tests/trigger-script.test.ts`:
```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx tsx tests/trigger-script.test.ts`
Expected: FAIL — 스크립트 미존재

- [ ] **Step 3: 트리거 스크립트 작성**

`scripts/trigger-supervisor-reminders.mjs`:
```js
const appUrl = process.env.APP_URL;
const cronSecret = process.env.CRON_SECRET;

if (!appUrl || !cronSecret) {
  console.error("APP_URL, CRON_SECRET 환경변수가 필요합니다.");
  process.exit(1);
}

const res = await fetch(`${appUrl}/api/cron/supervisor-reminders`, {
  method: "POST",
  headers: { Authorization: `Bearer ${cronSecret}` },
});

const text = await res.text();
console.log(`status=${res.status} body=${text}`);

if (!res.ok) {
  process.exit(1);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx tsx tests/trigger-script.test.ts`
Expected: PASS — `trigger-script checks passed`

- [ ] **Step 5: VAPID 키 생성 (운영 1회 작업)**

Run: `npx web-push generate-vapid-keys`
출력된 Public/Private Key를 Railway **메인 서비스** 환경변수에 등록:
- `VAPID_PUBLIC_KEY` = (public)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = (동일 public)
- `VAPID_PRIVATE_KEY` = (private)
- `VAPID_SUBJECT` = `mailto:<관리자 이메일>`
- `CRON_SECRET` = (임의 난수 문자열, 예: `openssl rand -hex 32`)

로컬 개발용 `.env.local`에도 동일 값 추가(클라이언트 빌드에 `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 필요).

- [ ] **Step 6: Railway Cron 서비스 구성 (운영 작업)**

Railway 프로젝트(`courageous-motivation`)에 **새 서비스**(같은 repo) 추가:
- Cron Schedule: `0 22 * * *` (UTC = 07:00 KST)
- Start Command: `node scripts/trigger-supervisor-reminders.mjs`
- 환경변수: `APP_URL` = `https://self.posan.kr`, `CRON_SECRET` = (메인 서비스와 동일 값)
- 빌드가 무거우면 `railway.json`의 Cron 서비스 watch path를 `scripts/`로 제한하는 방안 검토(선택).

> 운영 절차이므로 코드 자동화 대상이 아님 — 구현자는 이 단계를 사용자에게 안내하고 대시보드 설정을 확인받는다.

- [ ] **Step 7: PROJECT_MAP 갱신**

`project-map-updater` 에이전트를 호출해 다음을 반영:
- 신규 디렉토리 `src/lib/push/`, `src/components/notifications/`, `scripts/`
- 신규 API: `/api/push/subscribe`, `/api/push/unsubscribe`, `/api/cron/supervisor-reminders`
- 신규 모델: `PushSubscription`, `SupervisorReminderLog`
- 신규 env: `VAPID_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `CRON_SECRET`
- Railway Cron 서비스 설정

- [ ] **Step 8: Commit**

```bash
git add scripts/trigger-supervisor-reminders.mjs tests/trigger-script.test.ts .claude/PROJECT_MAP.md
git commit -m "Add Railway cron trigger script and update project map

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: 통합 검증 (빌드 + 전체 테스트)

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 단위/contract 테스트 실행**

Run:
```bash
for t in reminder-logic push-send push-api cron-supervisor-reminders service-worker-push notification-bell notification-bell-placement trigger-script calendar; do
  npx tsx tests/$t.test.ts || echo "FAILED: $t";
done
```
Expected: 모든 테스트 `... checks passed`, FAILED 출력 없음

- [ ] **Step 2: 프로덕션 빌드 검증**

Run: `npm run build`
Expected: 빌드 성공. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 미설정 시 클라이언트는 런타임에 경고만 내고 빌드는 성공해야 함(키 부재가 빌드를 막지 않음). 빌드 중 `themeColor` deprecation 경고가 사라졌는지 확인.

- [ ] **Step 3: 로컬 수동 스모크 (선택, 환경변수 있을 때)**

dev 서버에서 Chrome으로 `https`(또는 localhost) 접속 → 벨 클릭 → 권한 허용 → 구독 저장 확인(`prisma studio`로 `push_subscriptions` 행 확인). cron 수동 호출:
```bash
curl -X POST http://localhost:3000/api/cron/supervisor-reminders -H "Authorization: Bearer $CRON_SECRET"
```
Expected: JSON `{ processed, planned, sent }`. 오늘 감독 배정+구독이 있으면 알림 수신.

- [ ] **Step 4: 최종 상태 보고**

테스트/빌드 결과를 사용자에게 보고. 운영 단계(VAPID 등록, Railway Cron 서비스)는 사용자 확인 필요 항목으로 명시.

---

## Self-Review

**Spec coverage 확인:**
- 데이터 모델 2개 → Task 3 ✅
- 환경변수 → Task 10 Step 5 ✅
- 발송 라이브러리(만료 정리) → Task 4 ✅
- 구독/해제 API → Task 5 ✅
- cron 엔드포인트(KST, dedupe, 멱등, 메시지) → Task 2(로직) + Task 6(조립) ✅
- 메시지 포맷 헬퍼 → Task 2 ✅
- 알림 벨 UI + iOS 안내 → Task 8 ✅
- 벨 배치 4곳 → Task 9 ✅
- viewport 현대화 → Task 1 ✅
- SW push/notificationclick → Task 7 ✅
- Railway Cron → Task 10 ✅
- 테스트(단위+contract) → 각 Task + Task 11 ✅
- 엣지케이스(구독0/만료/거부/iOS/중복/다중학년) → Task 4·6·8 코드 + Task 2 테스트 ✅

**Placeholder scan:** 모든 스텝에 실제 코드/명령 포함. "TBD/적절히 처리" 없음. (Task 9 Step 3만 각 파일의 기존 JSX에 맞춰 삽입 위치를 서술 — 파일별 구조가 달라 정확 위치는 구현 시 확인 필요하나, 삽입 대상/방식/정렬 규칙은 명시함.)

**Type consistency 확인:**
- `ReminderAssignment`/`PlannedReminder`/`reminderKey`/`planReminders` — Task 2 정의 = Task 6 사용 일치 ✅
- `PushPayload`/`sendToTeacher(teacherId, payload)` — Task 4 정의 = Task 6 사용 일치 ✅
- subscribe 라우트 파싱(`body.endpoint`, `body.keys.p256dh/auth`) = client `subscription.toJSON()` 형태 일치 ✅
- cron DB date `new Date(today + "T00:00:00.000Z")` = 기존 supervisor-assignments 저장 규약 일치 ✅
- `formatDateWithWeekday` 시그니처 Task 2 정의 = 사용 일치 ✅
