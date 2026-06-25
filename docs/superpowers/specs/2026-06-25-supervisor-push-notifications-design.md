# 감독일 푸시 알림 + PWA 현대화 설계

> 작성일: 2026-06-25
> 상태: 승인됨 (사용자 검토 대기)
> 관련 기능: PWA Web Push, 감독교사 리마인더

## 1. 배경 & 목적

자율학습 출석부 시스템은 라이브러리 없이 수동으로 구성된 PWA로 배포되고 있다
(`public/manifest.webmanifest`, `public/sw.js`, `src/components/ServiceWorkerRegistrar.tsx`).
기본 PWA 동작은 양호하나, **앱이 닫혀 있어도 도착하는 알림(Web Push)** 인프라가 전혀 없다.

이 작업의 목적:

1. **감독일 리마인더**: 감독 배정일 **당일 아침 7시(KST)**, 해당 감독교사에게 푸시 알림 발송.
   - 메시지: `{이름}선생님, {YYYY-MM-DD}({요일}) 에 {학년}학년 자율학습 감독교사 이십니다. 잘 부탁드립니다.`
2. **PWA 현대화**: Next.js 16 기준 deprecation 정리 (`themeColor` → `viewport` export).
3. **재사용 가능한 푸시 인프라**: 추후 추가될 다른 알림에 재활용할 수 있도록 구독/발송/SW 계층을 일반화.

## 2. 범위

### 포함
- Web Push 구독 저장/해제 (자체 VAPID, 자체 DB)
- 공통 네비의 알림 벨 UI (구독 토글 + iOS 설치 안내)
- 서비스 워커 `push` / `notificationclick` 핸들러
- 감독일 리마인더 발송 로직 + 중복 방지 로그
- Railway Cron 서비스로 매일 07:00 KST 트리거
- `themeColor` viewport 분리

### 제외 (YAGNI)
- 감독교체(swap) 발생 시 재알림 — 7시 시점 배정 기준만 사용
- 학생/담임 대상 알림 — 인프라는 재사용 가능하나 이번 미구현
- serwist/next-pwa 등 SW 프레임워크 도입 — 현재 sw.js 규모에 과함
- 알림 히스토리 조회 화면, 알림 설정 세분화

## 3. 결정 사항 (브레인스토밍 합의)

| 항목 | 결정 |
|---|---|
| 푸시 구현 | `web-push` 라이브러리 + 기존 `sw.js` 확장 (외부 서비스 미사용) |
| 대상 기기 | iPhone + Android 혼재. iOS는 Safari "홈 화면에 추가" 설치 전제(사용자가 이미 교사들에게 안내함) |
| 구독 UI 위치 | 공통 헤더/네비에 벨 아이콘 |
| 다중 학년 감독 | 학년별로 각각 발송 |
| 감독교체(swap) | 이번 범위 제외 |
| 스케줄링 | Railway Cron 서비스 → 메인 앱 보안 엔드포인트 호출 |

## 4. 데이터 모델 (Prisma)

`prisma/schema.prisma`에 모델 2개 추가.

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

`Teacher` 모델에 역참조 관계 추가:
```prisma
  pushSubscriptions PushSubscription[]
  reminderLogs      SupervisorReminderLog[]
```

- `SupervisorReminderLog`의 `@@unique([teacherId, grade, date])`로 **하루 1회만 발송**(재실행/중복 호출 안전).
- `onDelete: Cascade`로 교사 삭제 시 구독/로그 정리.
- 마이그레이션은 `prisma-migration-guardian`로 사전 검수 (신규 테이블 추가이므로 기존 데이터 영향 없음, NOT NULL 신규 컬럼을 기존 테이블에 추가하지 않음).

## 5. 환경변수 (신규)

| 변수 | 용도 | 노출 |
|---|---|---|
| `VAPID_PUBLIC_KEY` | VAPID 공개키 (서버 발송용) | 서버 |
| `VAPID_PRIVATE_KEY` | VAPID 비밀키 | 서버 |
| `VAPID_SUBJECT` | `mailto:` 연락처 (web-push 필수) | 서버 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 클라이언트 구독용 공개키 | 클라이언트 |
| `CRON_SECRET` | cron 엔드포인트 인증 Bearer | 서버 + Cron 서비스 |

- VAPID 키는 `npx web-push generate-vapid-keys`로 1회 생성 후 Railway 환경변수에 등록.
- `VAPID_PUBLIC_KEY`와 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`는 동일 값(서버/클라 양쪽 필요).

## 6. 백엔드 구성

### 6.1 푸시 발송 라이브러리 (`src/lib/push/send.ts`)
- `web-push` 초기화: `webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)`.
- `sendToTeacher(teacherId, payload)`:
  - 해당 교사의 모든 `PushSubscription` 조회.
  - 각 구독에 `webpush.sendNotification(subscription, JSON.stringify(payload))`.
  - 응답 statusCode `404`/`410`이면 해당 구독 `delete` (만료 정리).
  - 그 외 에러는 `console.error`로 로깅하고 다음 구독 진행(부분 실패 허용).
- payload 형태: `{ title, body, url }`.

### 6.2 구독 API
- `POST /api/push/subscribe` — `withAuth(["teacher"])`
  - body: `{ endpoint, keys: { p256dh, auth } }` (브라우저 `PushSubscription.toJSON()` 형태) + `userAgent`.
  - `endpoint` 기준 upsert(이미 있으면 `teacherId` 갱신, 없으면 생성).
  - zod 스키마로 입력 검증.
- `POST /api/push/unsubscribe` — `withAuth(["teacher"])`
  - body: `{ endpoint }` → 해당 구독 삭제.
- 두 라우트 모두 Node 런타임(기본).

### 6.3 Cron 엔드포인트 (`POST /api/cron/supervisor-reminders`)
- 인증: `Authorization: Bearer ${CRON_SECRET}` 헤더 검증. 불일치 시 `401`.
- 로직:
  1. `getKstTodayString()`로 KST 오늘 날짜(`YYYY-MM-DD`) 계산.
  2. 그날의 `SupervisorAssignment` 조회 (`date = today`), `teacher` include.
  3. `(teacherId, grade)`로 dedupe — 오후+야간 2행이 1건으로 합쳐짐.
  4. 각 `(teacher, grade)`에 대해 `SupervisorReminderLog`에 `(teacherId, grade, date)`가 이미 있으면 스킵.
  5. 메시지 생성 후 `sendToTeacher` 호출.
  6. 성공 시 `SupervisorReminderLog` 생성(중복 방지). 발송할 구독이 없어도 로그를 남겨 재시도 시 무발송 처리.
  7. 응답: `{ processed, sent, skipped }` 요약(JSON).
- KST 계산 주의: Cron은 UTC 22:00에 실행되어 서버 `new Date()`는 UTC 기준이지만, `getKstTodayString()`이 `Asia/Seoul` 타임존으로 변환하므로 KST 당일 날짜가 정확히 계산됨. `toISOString()` 사용 금지.

### 6.4 메시지 포맷 헬퍼 (`src/lib/calendar.ts`)
- 신규 함수 `formatDateWithWeekday(date: string): string` → `"2026-06-25(목)"` (대시 형식, 공백 없음).
  - 기존 `formatDateLabel`은 `"2026.6.18 (목)"` 점 형식이라 메시지 템플릿과 다르므로 별도 함수 추가.
- 최종 메시지 빌더(`src/lib/push/messages.ts` 또는 cron 핸들러 내부):
  ```
  `${teacher.name}선생님, ${formatDateWithWeekday(date)} 에 ${grade}학년 자율학습 감독교사 이십니다. 잘 부탁드립니다.`
  ```
- payload: `{ title: "자율학습 감독 안내", body: <위 메시지>, url: "/attendance" }`.

## 7. 프론트엔드 구성

### 7.1 알림 벨 컴포넌트 (`src/components/notifications/NotificationBell.tsx`)
- `"use client"`. 공통 네비/헤더에서 사용.
- 상태 판별:
  - 브라우저 지원 여부 (`"serviceWorker" in navigator && "PushManager" in window`).
  - `Notification.permission` (`default` / `granted` / `denied`).
  - 현재 푸시 구독 존재 여부 (`registration.pushManager.getSubscription()`).
  - **iOS 비설치 감지**: iOS UA && `display-mode: standalone`/`navigator.standalone` 아님 → 설치 안내 모드.
- 동작:
  - 미구독 → 클릭 시 권한 요청 → `subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY) })` → `POST /api/push/subscribe`.
  - 구독됨 → 클릭 시 해제(`subscription.unsubscribe()` + `POST /api/push/unsubscribe`).
  - 권한 거부 → 브라우저 설정에서 허용 안내 문구.
  - iOS 미설치 → "Safari 공유 버튼 → 홈 화면에 추가" 안내(팝오버/모달).
- 헬퍼 `urlBase64ToUint8Array`는 표준 VAPID 변환 유틸(컴포넌트 또는 `src/lib/push/client.ts`).

### 7.2 배치 위치
- 모든 교사가 보는 레이아웃에 벨 노출:
  - `src/app/attendance/layout.tsx`
  - `src/app/homeroom/layout.tsx`
  - `src/app/admin/layout.tsx` (AdminNav)
  - `src/app/grade-admin/[grade]/layout.tsx`
- 학생 화면(`/student`)은 이번 범위 제외.
- 반응형 규칙 준수: 벨/버튼 터치 타겟 `min-h-11 min-w-11`, 라벨 `whitespace-nowrap`.

### 7.3 PWA 메타데이터 현대화 (`src/app/layout.tsx`)
- `metadata`에서 `themeColor` 제거 → 신규 `export const viewport: Viewport = { themeColor: "#1e40af" }`.
- Next.js 16 기준 정확한 시그니처는 구현 전 context7(`/vercel/next.js`)로 `viewport` export 규약 재확인.
- manifest/아이콘/`appleWebApp`은 유지(양호).

## 8. 서비스 워커 확장 (`public/sw.js`)
- 기존 `install`/`activate`/`fetch` 핸들러와 `CACHE_NAME`은 유지.
- 추가:
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
    const url = event.notification.data?.url ?? "/";
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        const existing = clients.find((c) => c.url.includes(url));
        if (existing) return existing.focus();
        return self.clients.openWindow(url);
      })
    );
  });
  ```
- SW 파일 변경 시 버전 갱신을 위해 `CACHE_NAME`을 `selfstudy-v2`로 올려 재설치 유도.

## 9. 스케줄링 (Railway Cron)

- Railway 프로젝트(`courageous-motivation`)에 **별도 Cron 서비스** 추가.
- 스케줄: `0 22 * * *` (UTC) = **07:00 KST**.
- 트리거 방식: Cron 서비스가 메인 앱의 `POST /api/cron/supervisor-reminders`를 `Authorization: Bearer ${CRON_SECRET}`로 호출.
  - 구현은 경량 스크립트(`scripts/trigger-supervisor-reminders.mjs`)가 `fetch(APP_URL + "/api/cron/supervisor-reminders", { method, headers })` 후 종료.
  - Cron 서비스 환경변수: `APP_URL`(예: `https://self.posan.kr`), `CRON_SECRET`(메인 앱과 동일 값).
- 모든 발송 로직은 메인 앱(Next/Prisma/web-push) 한 곳에 두어 코드 중복 없음.
- 배포 문서/`PROJECT_MAP.md`에 Cron 서비스 설정 절차 기록.

## 10. 테스트

- 단위 테스트(`tests/`):
  - `formatDateWithWeekday` 출력 형식.
  - cron 핸들러: 오후+야간 dedupe → `(teacher, grade)` 1건, 다중 학년 → 학년별 각각, 이미 로그 있으면 스킵, 메시지 문자열 정확성.
  - cron 인증: 시크릿 불일치 시 401.
- contract 테스트:
  - 구독/해제 API 인가(`withAuth(["teacher"])`).
  - `public/sw.js`에 `push`/`notificationclick` 리스너 존재.
- 발송은 `web-push`를 모킹해 호출 인자/구독 정리(404/410) 동작 검증.

## 11. 엣지 케이스 & 에러 처리

| 상황 | 처리 |
|---|---|
| 구독 0개 교사 | 발송 스킵, 로그만 기록(재시도 시 무발송) |
| 만료/무효 구독(404/410) | 발송 중 해당 구독 자동 삭제 |
| 권한 거부 | 벨 UI에서 브라우저 설정 안내, 발송 대상 자연 제외 |
| iOS Safari 탭(미설치) | 구독 불가 → 설치 안내 노출 |
| cron 중복 호출 | `SupervisorReminderLog` unique로 중복 발송 차단 |
| 같은 날 다중 학년 | 학년별 각각 발송/로그 |

## 12. 영향 파일 요약

**신규**
- `prisma/schema.prisma` (모델 2개 + Teacher 역참조)
- `src/lib/push/send.ts`, `src/lib/push/client.ts`(VAPID 변환), 메시지 빌더
- `src/app/api/push/subscribe/route.ts`, `src/app/api/push/unsubscribe/route.ts`
- `src/app/api/cron/supervisor-reminders/route.ts`
- `src/components/notifications/NotificationBell.tsx`
- `scripts/trigger-supervisor-reminders.mjs`
- 테스트 파일들

**수정**
- `src/app/layout.tsx` (viewport export)
- `public/sw.js` (push/notificationclick, CACHE_NAME v2)
- `src/lib/calendar.ts` (`formatDateWithWeekday`)
- 교사 레이아웃 4곳 (벨 배치)
- `package.json` (`web-push`, `@types/web-push`)
- `.env` 예시 / 배포 문서 / `PROJECT_MAP.md`

## 13. 후속(이번 범위 밖, 참고)
- 다른 알림(불참신청 도착, 출결 미체크 리마인더 등)은 동일 인프라(`sendToTeacher`, SW push)로 확장 가능.
- 감독교체 즉시 알림은 별도 트리거 지점 추가로 후속 작업 가능.
