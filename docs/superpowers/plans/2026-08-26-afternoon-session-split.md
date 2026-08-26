# 오후자습 2블록 분리(오후1·오후2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 오후자습(100분)을 오후1·오후2(각 50분) 두 블록으로 분리해 출석·불참신청·참여설정·시간 계산을 블록 단위로 처리하고, 좌석 "i" 주간 팝업이 불참승인을 그리드와 같은 노란색·한글 사유로 표시하게 한다.

**Architecture:** `src/lib/sessions.ts` 한 곳이 세션 목록·라벨·기본 시간·좌석 세션 매핑의 진실 공급원이 된다. DB 는 `SeatSessionType { afternoon, night }`(좌석 전용)과 `SessionType { afternoon1, afternoon2, night }`(출석 블록) 두 enum 으로 분리하고, 수기 마이그레이션이 기존 `afternoon` 행을 `afternoon1` 으로 바꾼 뒤 `afternoon2` 로 복제한다. API 응답은 `afternoon`/`night` 키 쌍을 `Record<SessionType, …>` 로 일반화하고, 모든 화면은 `SESSION_TYPES.map(...)` 으로 3블록을 그린다. 좌석·인쇄 코드는 타입 이름만 바뀐다.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma 7 + PostgreSQL (Railway), Tailwind CSS 4, SWR, ExcelJS, `node:assert/strict` + `tsx` 테스트

**Spec:** `docs/superpowers/specs/2026-08-26-afternoon-session-split-design.md`

## Global Constraints

- 모든 코드 **TypeScript**, `any` 금지. 모호하면 `unknown` + 타입 가드.
- 주석은 "왜"가 비자명할 때만. "무엇" 주석 금지. 작업/이슈 번호 언급 금지.
- **`"afternoon"` 문자열 리터럴과 `100`(분) 상수는 `src/lib/sessions.ts` 와 좌석 컨텍스트 파일(Task 13 허용 목록) 밖에서 쓰지 않는다.** Task 15 의 가드 테스트가 이를 강제한다.
- API 응답에서 `afternoon`/`night` 를 **객체 키나 필드 접두사로 쓰지 않는다**. `Record<SessionType, …>` 또는 `sessionType` 필드를 가진 배열만.
- 입력 `sessionType` 은 `isSessionType()`(좌석 API 는 `isSeatSessionType()`) 으로 검증, 실패 시 400.
- UI 라벨은 `SESSION_META[t].label`("오후1 자습"/"오후2 자습"/"야간자습") 또는 `.shortLabel`("오후1"/"오후2"/"야간"), 좌석 라벨은 `SEAT_SESSION_META[s].label`("오후자습"/"야간자습").
- 표·버튼·배지 라벨 `whitespace-nowrap`, 표 래퍼 `overflow-x-auto`, 기존 sticky header/컬럼 유지. 새 버튼 터치 타겟 `min-h-11`.
- 테스트는 프로젝트 관행: 프레임워크 없이 `node:assert/strict`, 마지막 줄 `console.log("<이름> checks passed")`, 실행 `npx tsx tests/<파일>`.
- **타입 검사(`npm run build`)는 Task 15 에서만 통과가 요구된다.** Task 2 의 `prisma generate` 이후 옛 리터럴을 쓰는 파일은 의도적으로 컴파일이 깨진 상태이며, Task 3~14 가 순서대로 고친다. 중간 검증은 `npx tsx` 테스트 + `grep` 으로 한다.
- 로컬 DB 없음. 마이그레이션 SQL 은 수기 작성, 적용은 Railway `start`(`prisma migrate deploy`) 에서만.
- 커밋 메시지는 영문 한 줄 요약 + 필요 시 한글 본문. 단어 하나짜리 금지. 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/sessions.ts` (신규) | 세션 목록·메타·타입가드·좌석 매핑·기본 시간 (서버/클라 공용, prisma 비의존) |
| `src/lib/absence-reasons.ts` (신규) | 사유 타입 라벨 |
| `src/lib/attendance/weekly-summary.ts` (신규) | 주간 팝업 행 조립 + 셀 우선순위 (순수) |
| `src/lib/attendance/copy-session.ts` (신규) | 오후1→오후2 복사 계획 (순수) |
| `src/app/api/attendance/copy-session/route.ts` (신규) | 복사 API |
| `prisma/schema.prisma`, `prisma/migrations/20260826000000_split_afternoon_session/migration.sql` | enum 분리 + 데이터 복제 |
| `src/app/api/**` (25) | 응답 형태 일반화, 입력 검증, 대표행 필터 |
| `src/app/**/page.tsx`, `src/components/**` (26) | 3블록 렌더링, 탭 4개, 복사 버튼, 팝업 |
| `prisma/seed.ts`, `prisma/scripts/*.ts`, `src/app/help/content.mdx`, `src/components/help/HelpDemos.tsx` | 시드·문서 |
| `tests/*.test.ts` | 신규 6개 + 갱신 3개 |

---

### Task 1: 세션 진실 공급원 `src/lib/sessions.ts` + 사유 라벨

**Files:**
- Create: `src/lib/sessions.ts`
- Create: `src/lib/absence-reasons.ts`
- Test: `tests/sessions.test.ts`

**Interfaces:**
- Produces:
  - `SESSION_TYPES: readonly ["afternoon1","afternoon2","night"]`, `type SessionType`
  - `SEAT_SESSION_TYPES: readonly ["afternoon","night"]`, `type SeatSessionType`
  - `SESSION_META: Record<SessionType, { label; shortLabel; icon; seatSession; defaultMinutes }>`
  - `SEAT_SESSION_META: Record<SeatSessionType, { label }>`
  - `REPRESENTATIVE_SESSION_TYPE: SessionType` (= `"afternoon1"`)
  - `isSessionType(v: unknown): v is SessionType`, `isSeatSessionType(v: unknown): v is SeatSessionType`
  - `seatSessionOf(s: SessionType): SeatSessionType`, `sessionTypesOfSeat(seat: SeatSessionType): SessionType[]`
  - `attendanceMinutes(a: { sessionType: SessionType; durationMinutes: number | null }): number`
  - `emptySessionRecord<T>(make: (t: SessionType) => T): Record<SessionType, T>`
  - `REASON_TYPES`, `type ReasonType`, `REASON_LABELS`, `reasonLabel(type: string): string`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/sessions.test.ts`:

```ts
import assert from "node:assert/strict";
import {
  SESSION_TYPES,
  SEAT_SESSION_TYPES,
  SESSION_META,
  SEAT_SESSION_META,
  REPRESENTATIVE_SESSION_TYPE,
  isSessionType,
  isSeatSessionType,
  seatSessionOf,
  sessionTypesOfSeat,
  attendanceMinutes,
  emptySessionRecord,
} from "../src/lib/sessions";
import { REASON_LABELS, reasonLabel } from "../src/lib/absence-reasons";

assert.deepEqual([...SESSION_TYPES], ["afternoon1", "afternoon2", "night"]);
assert.deepEqual([...SEAT_SESSION_TYPES], ["afternoon", "night"]);

assert.equal(SESSION_META.afternoon1.label, "오후1 자습");
assert.equal(SESSION_META.afternoon2.label, "오후2 자습");
assert.equal(SESSION_META.night.label, "야간자습");
assert.equal(SESSION_META.afternoon1.shortLabel, "오후1");
assert.equal(SESSION_META.night.shortLabel, "야간");
assert.equal(SEAT_SESSION_META.afternoon.label, "오후자습");
assert.equal(SEAT_SESSION_META.night.label, "야간자습");

assert.equal(SESSION_META.afternoon1.defaultMinutes, 50);
assert.equal(SESSION_META.afternoon2.defaultMinutes, 50);
assert.equal(SESSION_META.night.defaultMinutes, 100);

assert.equal(REPRESENTATIVE_SESSION_TYPE, "afternoon1");
assert.ok(isSessionType(REPRESENTATIVE_SESSION_TYPE));

assert.equal(seatSessionOf("afternoon1"), "afternoon");
assert.equal(seatSessionOf("afternoon2"), "afternoon");
assert.equal(seatSessionOf("night"), "night");
assert.deepEqual(sessionTypesOfSeat("afternoon"), ["afternoon1", "afternoon2"]);
assert.deepEqual(sessionTypesOfSeat("night"), ["night"]);
// 왕복: 모든 블록은 자기 좌석 세션의 블록 목록에 포함
for (const t of SESSION_TYPES) {
  assert.ok(sessionTypesOfSeat(seatSessionOf(t)).includes(t));
}

assert.equal(isSessionType("afternoon1"), true);
assert.equal(isSessionType("night"), true);
assert.equal(isSessionType("afternoon"), false); // 옛 값은 블록이 아니다
assert.equal(isSessionType(undefined), false);
assert.equal(isSessionType(1), false);
assert.equal(isSeatSessionType("afternoon"), true);
assert.equal(isSeatSessionType("afternoon1"), false);

assert.equal(attendanceMinutes({ sessionType: "afternoon1", durationMinutes: null }), 50);
assert.equal(attendanceMinutes({ sessionType: "night", durationMinutes: null }), 100);
assert.equal(attendanceMinutes({ sessionType: "night", durationMinutes: 30 }), 30);

const rec = emptySessionRecord((t) => t.length);
assert.deepEqual(rec, { afternoon1: 10, afternoon2: 10, night: 5 });

assert.equal(REASON_LABELS.academy, "학원");
assert.equal(REASON_LABELS.afterschool, "방과후");
assert.equal(REASON_LABELS.illness, "질병");
assert.equal(REASON_LABELS.custom, "기타");
assert.equal(reasonLabel("illness"), "질병");
assert.equal(reasonLabel("unknown-type"), "unknown-type");

console.log("sessions checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/sessions.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/sessions'`

- [ ] **Step 3: 구현**

`src/lib/sessions.ts`:

```ts
export const SESSION_TYPES = ["afternoon1", "afternoon2", "night"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const SEAT_SESSION_TYPES = ["afternoon", "night"] as const;
export type SeatSessionType = (typeof SEAT_SESSION_TYPES)[number];

export type SessionMeta = {
  label: string;
  shortLabel: string;
  icon: string;
  seatSession: SeatSessionType;
  defaultMinutes: number;
};

export const SESSION_META: Record<SessionType, SessionMeta> = {
  afternoon1: { label: "오후1 자습", shortLabel: "오후1", icon: "☀️", seatSession: "afternoon", defaultMinutes: 50 },
  afternoon2: { label: "오후2 자습", shortLabel: "오후2", icon: "🌤️", seatSession: "afternoon", defaultMinutes: 50 },
  night: { label: "야간자습", shortLabel: "야간", icon: "🌙", seatSession: "night", defaultMinutes: 100 },
};

export const SEAT_SESSION_META: Record<SeatSessionType, { label: string }> = {
  afternoon: { label: "오후자습" },
  night: { label: "야간자습" },
};

// 감독배정은 (date, grade) 당 SESSION_TYPES 전부에 같은 교사로 생성된다.
// 달력·요약·Excel 처럼 "하루 1건"으로 봐야 하는 조회는 이 값으로 필터한다.
export const REPRESENTATIVE_SESSION_TYPE: SessionType = "afternoon1";

export function isSessionType(value: unknown): value is SessionType {
  return typeof value === "string" && (SESSION_TYPES as readonly string[]).includes(value);
}

export function isSeatSessionType(value: unknown): value is SeatSessionType {
  return typeof value === "string" && (SEAT_SESSION_TYPES as readonly string[]).includes(value);
}

export function seatSessionOf(sessionType: SessionType): SeatSessionType {
  return SESSION_META[sessionType].seatSession;
}

export function sessionTypesOfSeat(seat: SeatSessionType): SessionType[] {
  return SESSION_TYPES.filter((t) => SESSION_META[t].seatSession === seat);
}

export function attendanceMinutes(a: { sessionType: SessionType; durationMinutes: number | null }): number {
  return a.durationMinutes ?? SESSION_META[a.sessionType].defaultMinutes;
}

export function emptySessionRecord<T>(make: (sessionType: SessionType) => T): Record<SessionType, T> {
  return {
    afternoon1: make("afternoon1"),
    afternoon2: make("afternoon2"),
    night: make("night"),
  };
}
```

`src/lib/absence-reasons.ts`:

```ts
export const REASON_TYPES = ["academy", "afterschool", "illness", "custom"] as const;
export type ReasonType = (typeof REASON_TYPES)[number];

export const REASON_LABELS: Record<ReasonType, string> = {
  academy: "학원",
  afterschool: "방과후",
  illness: "질병",
  custom: "기타",
};

export function reasonLabel(type: string): string {
  return (REASON_LABELS as Record<string, string>)[type] ?? type;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx tsx tests/sessions.test.ts`
Expected: `sessions checks passed`

- [ ] **Step 5: 커밋**

```bash
git add src/lib/sessions.ts src/lib/absence-reasons.ts tests/sessions.test.ts
git commit -m "Add session type source of truth for afternoon split"
```

---

### Task 2: 스키마 enum 분리 + 마이그레이션 SQL

**Files:**
- Modify: `prisma/schema.prisma` (enum `SessionType` 정의부 + `StudySession.type`)
- Create: `prisma/migrations/20260826000000_split_afternoon_session/migration.sql`
- Test: `tests/session-split-migration.test.ts`

**Interfaces:**
- Consumes: `SESSION_TYPES`, `SEAT_SESSION_TYPES` (Task 1)
- Produces: Prisma 생성 타입 `SessionType = "afternoon1" | "afternoon2" | "night"`, `SeatSessionType = "afternoon" | "night"`; `StudySession.type: SeatSessionType`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/session-split-migration.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SESSION_TYPES, SEAT_SESSION_TYPES } from "../src/lib/sessions";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// --- schema.prisma 의 enum 값 집합이 sessions.ts 와 동일해야 한다 (생성물 비의존) ---
const schema = read("../prisma/schema.prisma");
function enumValues(name: string): string[] {
  const m = schema.match(new RegExp(`enum\\s+${name}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `schema.prisma 에 enum ${name} 이 없음`);
  return m[1].split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//"));
}
assert.deepEqual(enumValues("SessionType"), [...SESSION_TYPES]);
assert.deepEqual(enumValues("SeatSessionType"), [...SEAT_SESSION_TYPES]);
assert.match(schema, /model StudySession \{[\s\S]*?type\s+SeatSessionType/, "StudySession.type 이 SeatSessionType 이 아님");
for (const model of ["SupervisorAssignment", "Attendance", "ParticipationDay", "AttendanceNote", "AbsenceRequest"]) {
  assert.match(
    schema,
    new RegExp(`model ${model} \\{[\\s\\S]*?sessionType\\s+SessionType`),
    `${model}.sessionType 이 SessionType 이 아님`
  );
}

// --- 마이그레이션 SQL 계약 ---
const sql = read("../prisma/migrations/20260826000000_split_afternoon_session/migration.sql");

assert.match(sql, /CREATE TYPE "SeatSessionType" AS ENUM \('afternoon', 'night'\)/);
assert.match(sql, /ALTER TABLE "study_sessions"\s+ALTER COLUMN "type" TYPE "SeatSessionType"/);

assert.match(sql, /CREATE TYPE "SessionType_new" AS ENUM \('afternoon1', 'afternoon2', 'night'\)/);
const TABLES = ["attendance", "absence_requests", "participation_days", "attendance_notes", "supervisor_assignments"];
for (const table of TABLES) {
  assert.match(
    sql,
    new RegExp(`ALTER TABLE "${table}" ALTER COLUMN "session_type" TYPE "SessionType_new"\\s+USING \\(CASE "session_type"::text WHEN 'afternoon' THEN 'afternoon1' ELSE "session_type"::text END\\)::"SessionType_new"`),
    `${table} 의 enum 전환 구문이 없음`
  );
}
assert.match(sql, /ALTER TYPE "SessionType" RENAME TO "SessionType_old"/);
assert.match(sql, /ALTER TYPE "SessionType_new" RENAME TO "SessionType"/);
assert.match(sql, /DROP TYPE "SessionType_old"/);

// 복제: 5개 테이블 + absence_reasons(attendance 1:1 조인)
for (const table of TABLES) {
  assert.match(sql, new RegExp(`INSERT INTO "${table}" \\([^)]*session_type[^)]*\\)\\s+SELECT [^;]*'afternoon2'[^;]*FROM "${table}" WHERE session_type = 'afternoon1'`), `${table} 복제 INSERT 가 없음`);
}
assert.match(sql, /INSERT INTO "absence_reasons"[\s\S]*?JOIN "attendance" a1 ON a1\.id = r\.attendance_id AND a1\.session_type = 'afternoon1'[\s\S]*?JOIN "attendance" a2 ON a2\.student_id = a1\.student_id AND a2\.date = a1\.date AND a2\.session_type = 'afternoon2'/);
// duration_minutes 반분: 복제 행은 나머지, 원본은 몫 → 합 보존
assert.match(sql, /CASE WHEN duration_minutes IS NULL THEN NULL ELSE duration_minutes - duration_minutes \/ 2 END/);
assert.match(sql, /UPDATE "attendance" SET duration_minutes = duration_minutes \/ 2\s+WHERE session_type = 'afternoon1' AND duration_minutes IS NOT NULL/);
// 전환(2단계)이 복제(3단계)보다 먼저
assert.ok(sql.indexOf('DROP TYPE "SessionType_old"') < sql.indexOf("INSERT INTO \"participation_days\""), "복제가 enum 전환보다 앞에 있음");
// 원본 반분 UPDATE 는 복제 INSERT 이후
assert.ok(sql.indexOf("INSERT INTO \"attendance\"") < sql.indexOf('UPDATE "attendance" SET duration_minutes'), "원본 반분이 복제보다 앞에 있음 — 복제 행이 1/4 가 된다");

console.log("session-split-migration checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/session-split-migration.test.ts`
Expected: FAIL — `schema.prisma 에 enum SeatSessionType 이 없음`

- [ ] **Step 3: schema.prisma 수정**

`prisma/schema.prisma` 에서 기존 블록:

```prisma
enum SessionType {
  afternoon
  night
}
```

을 다음으로 교체:

```prisma
enum SeatSessionType {
  afternoon
  night
}

enum SessionType {
  afternoon1
  afternoon2
  night
}
```

`model StudySession` 의 `type      SessionType` 을 `type      SeatSessionType` 으로 변경. 나머지 5개 모델의 `sessionType SessionType` 은 그대로.

- [ ] **Step 4: 마이그레이션 SQL 작성**

`prisma/migrations/20260826000000_split_afternoon_session/migration.sql`:

```sql
-- 1. 좌석 전용 enum
CREATE TYPE "SeatSessionType" AS ENUM ('afternoon', 'night');
ALTER TABLE "study_sessions"
  ALTER COLUMN "type" TYPE "SeatSessionType" USING ("type"::text::"SeatSessionType");

-- 2. 출석 블록 enum 재생성 (afternoon → afternoon1)
CREATE TYPE "SessionType_new" AS ENUM ('afternoon1', 'afternoon2', 'night');
ALTER TABLE "attendance" ALTER COLUMN "session_type" TYPE "SessionType_new"
  USING (CASE "session_type"::text WHEN 'afternoon' THEN 'afternoon1' ELSE "session_type"::text END)::"SessionType_new";
ALTER TABLE "absence_requests" ALTER COLUMN "session_type" TYPE "SessionType_new"
  USING (CASE "session_type"::text WHEN 'afternoon' THEN 'afternoon1' ELSE "session_type"::text END)::"SessionType_new";
ALTER TABLE "participation_days" ALTER COLUMN "session_type" TYPE "SessionType_new"
  USING (CASE "session_type"::text WHEN 'afternoon' THEN 'afternoon1' ELSE "session_type"::text END)::"SessionType_new";
ALTER TABLE "attendance_notes" ALTER COLUMN "session_type" TYPE "SessionType_new"
  USING (CASE "session_type"::text WHEN 'afternoon' THEN 'afternoon1' ELSE "session_type"::text END)::"SessionType_new";
ALTER TABLE "supervisor_assignments" ALTER COLUMN "session_type" TYPE "SessionType_new"
  USING (CASE "session_type"::text WHEN 'afternoon' THEN 'afternoon1' ELSE "session_type"::text END)::"SessionType_new";
ALTER TYPE "SessionType" RENAME TO "SessionType_old";
ALTER TYPE "SessionType_new" RENAME TO "SessionType";
DROP TYPE "SessionType_old";

-- 3. afternoon1 → afternoon2 복제 (과거 오후 100분 = 50 + 50)
INSERT INTO "participation_days" (student_id, session_type, is_participating, mon, tue, wed, thu, fri,
  after_school_mon, after_school_tue, after_school_wed, after_school_thu, after_school_fri)
SELECT student_id, 'afternoon2', is_participating, mon, tue, wed, thu, fri,
  after_school_mon, after_school_tue, after_school_wed, after_school_thu, after_school_fri
FROM "participation_days" WHERE session_type = 'afternoon1';

-- duration_minutes: NULL 이면 NULL(→ 기본 50), 값이 있으면 반분해 합을 보존
INSERT INTO "attendance" (student_id, session_type, date, status, checked_by, created_at, updated_at,
  duration_minutes, duration_note)
SELECT student_id, 'afternoon2', date, status, checked_by, created_at, updated_at,
  CASE WHEN duration_minutes IS NULL THEN NULL ELSE duration_minutes - duration_minutes / 2 END, duration_note
FROM "attendance" WHERE session_type = 'afternoon1';
UPDATE "attendance" SET duration_minutes = duration_minutes / 2
WHERE session_type = 'afternoon1' AND duration_minutes IS NOT NULL;

-- absence_reasons 는 attendance 1:1 → 새 afternoon2 행에 맞춰 복제
INSERT INTO "absence_reasons" (attendance_id, reason_type, detail, registered_by, created_at)
SELECT a2.id, r.reason_type, r.detail, r.registered_by, r.created_at
FROM "absence_reasons" r
JOIN "attendance" a1 ON a1.id = r.attendance_id AND a1.session_type = 'afternoon1'
JOIN "attendance" a2 ON a2.student_id = a1.student_id AND a2.date = a1.date AND a2.session_type = 'afternoon2';

INSERT INTO "absence_requests" (student_id, session_type, date, reason_type, detail, status, reviewed_by, reviewed_at, created_at)
SELECT student_id, 'afternoon2', date, reason_type, detail, status, reviewed_by, reviewed_at, created_at
FROM "absence_requests" WHERE session_type = 'afternoon1';

INSERT INTO "attendance_notes" (student_id, session_type, date, note, created_by, created_at, updated_at)
SELECT student_id, 'afternoon2', date, note, created_by, created_at, updated_at
FROM "attendance_notes" WHERE session_type = 'afternoon1';

INSERT INTO "supervisor_assignments" (teacher_id, date, grade, session_type, created_at)
SELECT teacher_id, date, grade, 'afternoon2', created_at
FROM "supervisor_assignments" WHERE session_type = 'afternoon1';
-- supervisor_swap_history 는 기존(afternoon1) 행을 계속 참조한다.
```

- [ ] **Step 5: 테스트 통과 + Prisma 클라이언트 재생성**

Run: `npx tsx tests/session-split-migration.test.ts`
Expected: `session-split-migration checks passed`

Run: `npx prisma generate`
Expected: `Generated Prisma Client` (DB 연결 불필요). 이후 `src/generated/prisma/enums.ts` 에 `SeatSessionType`, `SessionType: { afternoon1, afternoon2, night }` 가 존재.

Run: `grep -c "afternoon1" src/generated/prisma/enums.ts`
Expected: `1` 이상

- [ ] **Step 6: 커밋**

```bash
git add prisma/schema.prisma prisma/migrations/20260826000000_split_afternoon_session/migration.sql tests/session-split-migration.test.ts
git commit -m "Split SessionType enum into seat and study block enums with data migration"
```

---

### Task 3: 시간 계산 통합 (50/100 기본값)

**Files:**
- Modify: `src/lib/academic-year.ts:80,89` (raw SQL 2곳)
- Modify: `src/app/api/attendance/weekly/route.ts:154`
- Modify: `src/app/api/homeroom/monthly-attendance/route.ts:90`
- Modify: `src/app/api/grade-admin/[grade]/monthly-attendance/route.ts:82`
- Modify: `src/app/api/student/participation-days/route.ts:33`

**Interfaces:**
- Consumes: `attendanceMinutes` (Task 1)

- [ ] **Step 1: raw SQL 교체**

`src/lib/academic-year.ts` 의 두 줄:

```sql
      SUM(COALESCE(a.duration_minutes, 100))::int AS minutes
```
→
```sql
      SUM(COALESCE(a.duration_minutes, CASE a.session_type WHEN 'night' THEN 100 ELSE 50 END))::int AS minutes
```
그리고
```sql
    HAVING SUM(COALESCE(a.duration_minutes, 100)) > 0
```
→
```sql
    HAVING SUM(COALESCE(a.duration_minutes, CASE a.session_type WHEN 'night' THEN 100 ELSE 50 END)) > 0
```

- [ ] **Step 2: TS 4곳 교체**

각 파일에 `import { attendanceMinutes } from "@/lib/sessions";` 추가 후:

`weekly/route.ts`: `select: { durationMinutes: true }` → `select: { sessionType: true, durationMinutes: true }`, 그리고
```ts
      (sum, a) => sum + (a.durationMinutes ?? 100),
```
→
```ts
      (sum, a) => sum + attendanceMinutes(a),
```

`student/participation-days/route.ts`: 동일하게 `select: { sessionType: true, durationMinutes: true }` + `attendanceMinutes(a)`.

`homeroom/monthly-attendance/route.ts` 와 `grade-admin/[grade]/monthly-attendance/route.ts`: `include` 로 전체 행을 가져오므로 select 변경 없이
```ts
      .reduce((sum, a) => sum + (a.durationMinutes ?? 100), 0);
```
→
```ts
      .reduce((sum, a) => sum + attendanceMinutes(a), 0);
```

- [ ] **Step 3: 확인**

Run: `grep -rn "?? 100" src --include='*.ts' --include='*.tsx' | grep -v generated`
Expected: 출력 없음

Run: `grep -n "CASE a.session_type" src/lib/academic-year.ts | wc -l`
Expected: `2`

- [ ] **Step 4: 커밋**

```bash
git add src/lib/academic-year.ts src/app/api/attendance/weekly/route.ts src/app/api/homeroom/monthly-attendance/route.ts 'src/app/api/grade-admin/[grade]/monthly-attendance/route.ts' src/app/api/student/participation-days/route.ts
git commit -m "Derive default study minutes from session type"
```

---

### Task 4: 출석 핵심 API 블록화 (`/api/attendance`, toggle, [id], notes)

**Files:**
- Modify: `src/app/api/attendance/route.ts`
- Modify: `src/app/api/attendance/toggle/route.ts`
- Modify: `src/app/api/attendance/[id]/route.ts`
- Modify: `src/app/api/attendance/notes/route.ts`
- Test: `tests/attendance-api-wiring.test.ts`

**Interfaces:**
- Consumes: `isSessionType`, `seatSessionOf`, `SESSION_TYPES`, `type SessionType` (Task 1)
- Produces: `GET /api/attendance?session=<SessionType>` (응답 형태 불변), `GET /api/attendance/notes` → `{ notes: Record<string, Partial<Record<SessionType, string>>> }`

- [ ] **Step 1: 실패하는 wiring 테스트 작성**

`tests/attendance-api-wiring.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

const attendance = read("../src/app/api/attendance/route.ts");
assert.match(attendance, /seatSessionOf\(session\)/, "좌석 세션을 seatSessionOf 로 결정하지 않음");
assert.match(attendance, /isSessionType\(session\)/, "session 파라미터 검증이 없음");
assert.doesNotMatch(attendance, /as SessionType/, "검증 없는 타입 단언이 남아 있음");

const toggle = read("../src/app/api/attendance/toggle/route.ts");
assert.match(toggle, /isSessionType\(sessionType\)/, "toggle 에 sessionType 검증이 없음");

const byId = read("../src/app/api/attendance/[id]/route.ts");
assert.match(byId, /isSessionType\(sessionType\)/, "[id] 토글에 sessionType 검증이 없음");

const notes = read("../src/app/api/attendance/notes/route.ts");
assert.match(notes, /isSessionType\(sessionType\)/, "notes PUT 에 sessionType 검증이 없음");
assert.doesNotMatch(notes, /afternoon\?:/, "notes GET 응답이 아직 afternoon/night 키 쌍");
assert.match(notes, /Partial<Record<SessionType, string>>/, "notes GET 응답이 Record<SessionType,…> 가 아님");

console.log("attendance-api-wiring checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/attendance-api-wiring.test.ts`
Expected: FAIL — `좌석 세션을 seatSessionOf 로 결정하지 않음`

- [ ] **Step 3: `GET /api/attendance` 수정**

`src/app/api/attendance/route.ts`:

```ts
import type { SessionType } from "@/generated/prisma/client";
```
→
```ts
import { isSessionType, seatSessionOf } from "@/lib/sessions";
```

```ts
    const session = searchParams.get("session") as SessionType;
    const grade = searchParams.get("grade");

    if (!date || !session || !grade) {
      return NextResponse.json({ error: "date, session, grade 파라미터가 필요합니다." }, { status: 400 });
    }
```
→
```ts
    const session = searchParams.get("session");
    const grade = searchParams.get("grade");

    if (!date || !session || !grade) {
      return NextResponse.json({ error: "date, session, grade 파라미터가 필요합니다." }, { status: 400 });
    }
    if (!isSessionType(session)) {
      return NextResponse.json({ error: "유효하지 않은 session 값입니다." }, { status: 400 });
    }
```

좌석은 블록이 아니라 좌석 세션으로 조회:
```ts
    const studySession = await prisma.studySession.findUnique({
      where: { type_grade: { type: session, grade: gradeNum } },
```
→
```ts
    const studySession = await prisma.studySession.findUnique({
      where: { type_grade: { type: seatSessionOf(session), grade: gradeNum } },
```

나머지(`participationDays: { where: { sessionType: session } }`, attendance/supervisorAssignment/absenceRequest 의 `sessionType: session`)는 블록 기준이므로 그대로.

- [ ] **Step 4: toggle / [id] / notes 검증 추가**

`src/app/api/attendance/toggle/route.ts` — import 추가 `import { isSessionType } from "@/lib/sessions";` 후 `const { studentId, sessionType, date, currentStatus } = body;` 바로 아래:

```ts
  if (!isSessionType(sessionType)) {
    return NextResponse.json({ error: "유효하지 않은 sessionType 입니다." }, { status: 400 });
  }
```

`src/app/api/attendance/[id]/route.ts` — 같은 import, `handleToggle` 안의 `const { studentId, sessionType, date, currentStatus } = body;` 아래에 동일한 검증 블록.

`src/app/api/attendance/notes/route.ts` — import `import { isSessionType, type SessionType } from "@/lib/sessions";`. GET 의 결과 조립:

```ts
    // { "2026-04-05": { afternoon: "...", night: "..." }, ... }
    const result: Record<string, { afternoon?: string; night?: string }> = {};
    for (const n of notes) {
      const key = n.date.toISOString().split("T")[0];
      if (!result[key]) result[key] = {};
      if (n.sessionType === "afternoon") {
        result[key].afternoon = n.note;
      } else if (n.sessionType === "night") {
        result[key].night = n.note;
      }
    }
```
→
```ts
    const result: Record<string, Partial<Record<SessionType, string>>> = {};
    for (const n of notes) {
      const key = n.date.toISOString().split("T")[0];
      if (!result[key]) result[key] = {};
      result[key][n.sessionType] = n.note;
    }
```

PUT 의 `if (!studentId || !sessionType || !date) {...}` 다음에:
```ts
    if (!isSessionType(sessionType)) {
      return NextResponse.json({ error: "유효하지 않은 sessionType 입니다." }, { status: 400 });
    }
```

- [ ] **Step 5: 통과 확인 + 커밋**

Run: `npx tsx tests/attendance-api-wiring.test.ts`
Expected: `attendance-api-wiring checks passed`

```bash
git add src/app/api/attendance/route.ts src/app/api/attendance/toggle/route.ts 'src/app/api/attendance/[id]/route.ts' src/app/api/attendance/notes/route.ts tests/attendance-api-wiring.test.ts
git commit -m "Resolve seat session from study block in attendance APIs"
```

---

### Task 5: 주간 요약 순수 함수 + `/api/attendance/weekly` 재작성

**Files:**
- Create: `src/lib/attendance/weekly-summary.ts`
- Modify: `src/app/api/attendance/weekly/route.ts` (전면 재작성)
- Test: `tests/weekly-summary.test.ts`

**Interfaces:**
- Consumes: `SESSION_TYPES`, `type SessionType`, `emptySessionRecord`, `attendanceMinutes` (Task 1)
- Produces:
  ```ts
  export type ReasonInfo = { type: string; detail: string | null };
  export type WeeklySessionCell = {
    status: string | null; reason: ReasonInfo | null; participating: boolean; afterSchool: boolean;
    note: string | null; isApprovedAbsence: boolean; approvedReason: ReasonInfo | null;
  };
  export type WeeklyDayRow = { date: string; dayOfWeek: string; sessions: Record<SessionType, WeeklySessionCell> };
  export type WeeklyCellKind = "not-participating" | "approved-absence" | "after-school" | "present" | "absent" | "unchecked";
  export function summarizeWeeklyCell(cell: WeeklySessionCell): { kind: WeeklyCellKind; label: string };
  export function buildWeeklyRows(input: WeeklyRowsInput): WeeklyDayRow[];
  export function weekDatesOf(dateStr: string): string[];  // 월~금 YYYY-MM-DD
  ```
  API: `GET /api/attendance/weekly?studentId&date` → `{ weekly: WeeklyDayRow[], totals, ranking }` (`totals`/`ranking` 형태 불변)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/weekly-summary.test.ts`:

```ts
import assert from "node:assert/strict";
import {
  summarizeWeeklyCell,
  buildWeeklyRows,
  weekDatesOf,
  type WeeklySessionCell,
} from "../src/lib/attendance/weekly-summary";

const base: WeeklySessionCell = {
  status: null, reason: null, participating: true, afterSchool: false,
  note: null, isApprovedAbsence: false, approvedReason: null,
};

// 우선순위: 비참여 > 불참승인 > 방과후(미체크) > 출석 > 결석 > 미체크
assert.deepEqual(summarizeWeeklyCell({ ...base, participating: false, status: "present" }), { kind: "not-participating", label: "-" });
assert.deepEqual(summarizeWeeklyCell({ ...base, isApprovedAbsence: true, status: "present" }), { kind: "approved-absence", label: "불참승인" });
assert.deepEqual(summarizeWeeklyCell({ ...base, isApprovedAbsence: true, status: null }), { kind: "approved-absence", label: "불참승인" });
assert.deepEqual(summarizeWeeklyCell({ ...base, afterSchool: true, status: null }), { kind: "after-school", label: "방과후" });
assert.deepEqual(summarizeWeeklyCell({ ...base, afterSchool: true, status: "unchecked" }), { kind: "after-school", label: "방과후" });
assert.deepEqual(summarizeWeeklyCell({ ...base, afterSchool: true, status: "present" }), { kind: "present", label: "출석" });
assert.deepEqual(summarizeWeeklyCell({ ...base, status: "present" }), { kind: "present", label: "출석" });
assert.deepEqual(summarizeWeeklyCell({ ...base, status: "absent" }), { kind: "absent", label: "결석" });
assert.deepEqual(summarizeWeeklyCell({ ...base, status: "unchecked" }), { kind: "unchecked", label: "-" });
assert.deepEqual(summarizeWeeklyCell(base), { kind: "unchecked", label: "-" });

// weekDatesOf: 2026-08-26(수) → 08-24(월) ~ 08-28(금); 일요일은 직전 월요일 주
assert.deepEqual(weekDatesOf("2026-08-26"), ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28"]);
assert.deepEqual(weekDatesOf("2026-08-30"), ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28"]);
assert.equal(weekDatesOf("2026-08-24")[0], "2026-08-24");

// buildWeeklyRows: 참여설정 없으면 참여(true)·방과후(false), 승인 불참은 Attendance 와 무관하게 표시
const rows = buildWeeklyRows({
  weekDates: weekDatesOf("2026-08-26"),
  participationDays: [
    { sessionType: "afternoon2", isParticipating: true, mon: true, tue: false, wed: true, thu: true, fri: true,
      afterSchoolMon: false, afterSchoolTue: false, afterSchoolWed: true, afterSchoolThu: false, afterSchoolFri: false },
    { sessionType: "night", isParticipating: false, mon: true, tue: true, wed: true, thu: true, fri: true,
      afterSchoolMon: false, afterSchoolTue: false, afterSchoolWed: false, afterSchoolThu: false, afterSchoolFri: false },
  ],
  attendances: [
    { date: "2026-08-24", sessionType: "afternoon1", status: "present", reason: null },
    { date: "2026-08-24", sessionType: "afternoon2", status: "absent", reason: { type: "illness", detail: "감기" } },
  ],
  notes: [{ date: "2026-08-25", sessionType: "afternoon1", note: "조퇴" }],
  approvedRequests: [{ date: "2026-08-27", sessionType: "afternoon1", reason: { type: "academy", detail: null } }],
});

assert.equal(rows.length, 5);
assert.equal(rows[0].date, "2026-08-24");
assert.equal(rows[0].dayOfWeek, "월");
assert.equal(rows[2].dayOfWeek, "수");

const mon = rows[0].sessions;
assert.equal(mon.afternoon1.status, "present");
assert.equal(mon.afternoon1.participating, true);   // 설정 없음 → 참여
assert.equal(mon.afternoon2.status, "absent");
assert.deepEqual(mon.afternoon2.reason, { type: "illness", detail: "감기" });
assert.equal(mon.night.participating, false);        // isParticipating=false
assert.equal(mon.night.status, null);

const tue = rows[1].sessions;
assert.equal(tue.afternoon2.participating, false);   // 화요일 꺼짐
assert.equal(tue.afternoon1.note, "조퇴");
assert.equal(tue.afternoon2.note, null);

const wed = rows[2].sessions;
assert.equal(wed.afternoon2.afterSchool, true);
assert.equal(wed.afternoon1.afterSchool, false);

const thu = rows[3].sessions;
assert.equal(thu.afternoon1.isApprovedAbsence, true);
assert.deepEqual(thu.afternoon1.approvedReason, { type: "academy", detail: null });
assert.equal(thu.afternoon1.status, null);           // Attendance 없어도 승인 표시
assert.equal(thu.afternoon2.isApprovedAbsence, false);

console.log("weekly-summary checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/weekly-summary.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/attendance/weekly-summary'`

- [ ] **Step 3: 순수 함수 구현**

`src/lib/attendance/weekly-summary.ts`:

```ts
import { emptySessionRecord, type SessionType } from "@/lib/sessions";

export type ReasonInfo = { type: string; detail: string | null };

export type WeeklySessionCell = {
  status: string | null;
  reason: ReasonInfo | null;
  participating: boolean;
  afterSchool: boolean;
  note: string | null;
  isApprovedAbsence: boolean;
  approvedReason: ReasonInfo | null;
};

export type WeeklyDayRow = {
  date: string;
  dayOfWeek: string;
  sessions: Record<SessionType, WeeklySessionCell>;
};

export type WeeklyCellKind =
  | "not-participating"
  | "approved-absence"
  | "after-school"
  | "present"
  | "absent"
  | "unchecked";

// 좌석 그리드(SeatCell)와 같은 우선순위 — 승인된 불참은 출석 토글 결과보다 우선한다
export function summarizeWeeklyCell(cell: WeeklySessionCell): { kind: WeeklyCellKind; label: string } {
  if (!cell.participating) return { kind: "not-participating", label: "-" };
  if (cell.isApprovedAbsence) return { kind: "approved-absence", label: "불참승인" };
  if (cell.afterSchool && (!cell.status || cell.status === "unchecked")) return { kind: "after-school", label: "방과후" };
  if (cell.status === "present") return { kind: "present", label: "출석" };
  if (cell.status === "absent") return { kind: "absent", label: "결석" };
  return { kind: "unchecked", label: "-" };
}

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri";
type AfterSchoolKey = "afterSchoolMon" | "afterSchoolTue" | "afterSchoolWed" | "afterSchoolThu" | "afterSchoolFri";

const DAY_KEYS: (DayKey | null)[] = [null, "mon", "tue", "wed", "thu", "fri", null];
const AFTER_SCHOOL_KEYS: (AfterSchoolKey | null)[] = [
  null, "afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri", null,
];
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export type WeeklyParticipationInput = Record<DayKey, boolean> &
  Record<AfterSchoolKey, boolean> & { sessionType: SessionType; isParticipating: boolean };
export type WeeklyAttendanceInput = { date: string; sessionType: SessionType; status: string; reason: ReasonInfo | null };
export type WeeklyNoteInput = { date: string; sessionType: SessionType; note: string };
export type WeeklyApprovedInput = { date: string; sessionType: SessionType; reason: ReasonInfo };

export type WeeklyRowsInput = {
  weekDates: string[];
  participationDays: WeeklyParticipationInput[];
  attendances: WeeklyAttendanceInput[];
  notes: WeeklyNoteInput[];
  approvedRequests: WeeklyApprovedInput[];
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// 날짜 문자열을 UTC 자정으로 고정해 서버 타임존과 무관하게 요일을 계산한다
export function weekDatesOf(dateStr: string): string[] {
  const base = new Date(`${dateStr}T00:00:00Z`);
  const offsetToMonday = (base.getUTCDay() + 6) % 7;
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() - offsetToMonday);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return toIsoDate(d);
  });
}

export function buildWeeklyRows(input: WeeklyRowsInput): WeeklyDayRow[] {
  const participationBy = new Map(input.participationDays.map((p) => [p.sessionType, p]));
  const attendanceBy = new Map(input.attendances.map((a) => [`${a.date}-${a.sessionType}`, a]));
  const noteBy = new Map(input.notes.map((n) => [`${n.date}-${n.sessionType}`, n.note]));
  const approvedBy = new Map(input.approvedRequests.map((r) => [`${r.date}-${r.sessionType}`, r.reason]));

  return input.weekDates.map((date) => {
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    const dayKey = DAY_KEYS[dow];
    const afterSchoolKey = AFTER_SCHOOL_KEYS[dow];

    return {
      date,
      dayOfWeek: DAY_NAMES[dow],
      sessions: emptySessionRecord((sessionType) => {
        const part = participationBy.get(sessionType);
        const participating = part ? part.isParticipating && (dayKey ? part[dayKey] : false) : true;
        const afterSchool = part ? part.isParticipating && (afterSchoolKey ? part[afterSchoolKey] : false) : false;
        const att = attendanceBy.get(`${date}-${sessionType}`);
        const approvedReason = approvedBy.get(`${date}-${sessionType}`) ?? null;
        return {
          status: att?.status ?? null,
          reason: att?.reason ?? null,
          participating,
          afterSchool,
          note: noteBy.get(`${date}-${sessionType}`) ?? null,
          isApprovedAbsence: approvedReason !== null,
          approvedReason,
        };
      }),
    };
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx tsx tests/weekly-summary.test.ts`
Expected: `weekly-summary checks passed`

- [ ] **Step 5: weekly API 재작성**

`src/app/api/attendance/weekly/route.ts` 전체를 다음으로 교체:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { computeGradeStudyRanking } from "@/lib/academic-year";
import { attendanceMinutes } from "@/lib/sessions";
import { buildWeeklyRows, weekDatesOf } from "@/lib/attendance/weekly-summary";

// GET /api/attendance/weekly?studentId=1&date=2026-04-05
export const GET = withAuth(
  ["teacher", "student"],
  async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const studentId = parseInt(searchParams.get("studentId") || "");
    const dateStr = searchParams.get("date");

    if (!studentId || !dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: "studentId와 date(YYYY-MM-DD)가 필요합니다." }, { status: 400 });
    }

    const weekDates = weekDatesOf(dateStr);
    const startDate = new Date(`${weekDates[0]}T00:00:00Z`);
    const endDate = new Date(`${weekDates[4]}T00:00:00Z`);

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const [attendances, participationDays, attendanceNotes, approvedRequests, student, monthlyAttendances] =
      await Promise.all([
        prisma.attendance.findMany({
          where: { studentId, date: { gte: startDate, lte: endDate } },
          include: { absenceReason: true },
        }),
        prisma.participationDay.findMany({ where: { studentId } }),
        prisma.attendanceNote.findMany({
          where: { studentId, date: { gte: startDate, lte: endDate } },
        }),
        prisma.absenceRequest.findMany({
          where: { studentId, status: "approved", date: { gte: startDate, lte: endDate } },
          select: { date: true, sessionType: true, reasonType: true, detail: true },
        }),
        prisma.student.findUnique({ where: { id: studentId }, select: { grade: true } }),
        prisma.attendance.findMany({
          where: { studentId, status: "present", date: { gte: monthStart, lte: monthEnd } },
          select: { sessionType: true, durationMinutes: true },
        }),
      ]);

    const isoDate = (d: Date) => d.toISOString().slice(0, 10);

    const weekly = buildWeeklyRows({
      weekDates,
      participationDays,
      attendances: attendances.map((a) => ({
        date: isoDate(a.date),
        sessionType: a.sessionType,
        status: a.status,
        reason: a.absenceReason ? { type: a.absenceReason.reasonType, detail: a.absenceReason.detail } : null,
      })),
      notes: attendanceNotes.map((n) => ({ date: isoDate(n.date), sessionType: n.sessionType, note: n.note })),
      approvedRequests: approvedRequests.map((r) => ({
        date: isoDate(r.date),
        sessionType: r.sessionType,
        reason: { type: r.reasonType, detail: r.detail },
      })),
    });

    const ranking = student?.grade
      ? await computeGradeStudyRanking(student.grade, studentId, now)
      : null;

    const monthlyMinutes = monthlyAttendances.reduce((sum, a) => sum + attendanceMinutes(a), 0);
    // 학년도 누계는 랭킹 계산 시 이미 집계됨 — 중복 쿼리 제거
    const yearlyMinutes = ranking?.minutes ?? 0;
    const monthlyHours = Math.round((monthlyMinutes / 60) * 10) / 10;
    const academicYearHours = Math.round((yearlyMinutes / 60) * 10) / 10;

    return NextResponse.json({
      weekly,
      totals: {
        monthlyMinutes,
        monthlyHours,
        academicYearMinutes: yearlyMinutes,
        academicYearHours,
      },
      ranking: ranking
        ? { rank: ranking.rank, totalRanked: ranking.totalRanked, topPercent: ranking.topPercent }
        : null,
    });
  }
);
```

- [ ] **Step 6: wiring 확인 + 커밋**

Run: `grep -n "afternoonNote\|nightParticipating\|afternoonAfterSchool" src/app/api/attendance/weekly/route.ts`
Expected: 출력 없음

Run: `grep -n "status: \"approved\"" src/app/api/attendance/weekly/route.ts`
Expected: 1줄

```bash
git add src/lib/attendance/weekly-summary.ts src/app/api/attendance/weekly/route.ts tests/weekly-summary.test.ts
git commit -m "Build weekly attendance rows per study block with approved absences"
```

---

### Task 6: 오후1 → 오후2 복사 (순수 계획 함수 + API)

**Files:**
- Create: `src/lib/attendance/copy-session.ts`
- Create: `src/app/api/attendance/copy-session/route.ts`
- Test: `tests/copy-session-logic.test.ts`

**Interfaces:**
- Consumes: `isSessionType`, `seatSessionOf`, `type SessionType` (Task 1)
- Produces:
  ```ts
  export type CopySourceStatus = { status: string; hasReason: boolean };
  export type CopyPlanInput = {
    seatedStudentIds: number[];
    fromAttendance: Map<number, CopySourceStatus>;
    toAttendanceStudentIds: Set<number>;
    toParticipatingStudentIds: Set<number>;
    toBlockedStudentIds: Set<number>;
  };
  export type CopyPlan = { toCreate: { studentId: number; status: "present" | "absent" }[]; skipped: number };
  export function planSessionCopy(input: CopyPlanInput): CopyPlan;
  ```
  API: `POST /api/attendance/copy-session` body `{ grade, date, from, to }` → `{ copied: number; skipped: number }`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/copy-session-logic.test.ts`:

```ts
import assert from "node:assert/strict";
import { planSessionCopy } from "../src/lib/attendance/copy-session";

const plan = planSessionCopy({
  seatedStudentIds: [1, 2, 3, 4, 5, 6, 7, 8],
  fromAttendance: new Map([
    [1, { status: "present", hasReason: false }],   // → present
    [2, { status: "absent", hasReason: false }],    // → absent (사유 없음)
    [3, { status: "absent", hasReason: true }],     // 사유 있는 결석 → 건너뜀
    [4, { status: "present", hasReason: false }],   // 오후2 이미 체크됨 → 건너뜀
    [5, { status: "present", hasReason: false }],   // 오후2 비참여 → 건너뜀
    [6, { status: "present", hasReason: false }],   // 오후2 불참신청 있음 → 건너뜀
    // 7: 오후1 미체크 → 건너뜀
    [8, { status: "unchecked", hasReason: false }], // → 건너뜀
  ]),
  toAttendanceStudentIds: new Set([4]),
  toParticipatingStudentIds: new Set([1, 2, 3, 4, 6, 7, 8]),
  toBlockedStudentIds: new Set([6]),
});

assert.deepEqual(plan.toCreate, [
  { studentId: 1, status: "present" },
  { studentId: 2, status: "absent" },
]);
assert.equal(plan.skipped, 6);

// 좌석에 없는 학생은 대상이 아니다
const none = planSessionCopy({
  seatedStudentIds: [],
  fromAttendance: new Map([[1, { status: "present", hasReason: false }]]),
  toAttendanceStudentIds: new Set(),
  toParticipatingStudentIds: new Set([1]),
  toBlockedStudentIds: new Set(),
});
assert.deepEqual(none, { toCreate: [], skipped: 0 });

console.log("copy-session-logic checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/copy-session-logic.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/attendance/copy-session'`

- [ ] **Step 3: 순수 함수 구현**

`src/lib/attendance/copy-session.ts`:

```ts
export type CopySourceStatus = { status: string; hasReason: boolean };

export type CopyPlanInput = {
  seatedStudentIds: number[];
  fromAttendance: Map<number, CopySourceStatus>;
  toAttendanceStudentIds: Set<number>;
  toParticipatingStudentIds: Set<number>;
  toBlockedStudentIds: Set<number>;
};

export type CopyPlan = {
  toCreate: { studentId: number; status: "present" | "absent" }[];
  skipped: number;
};

// 사유 있는 결석(불참승인·담임 등록)은 원래 블록 한정일 수 있으므로 복사하지 않는다.
// 이미 체크된 대상 블록은 어떤 경우에도 덮어쓰지 않는다.
export function planSessionCopy(input: CopyPlanInput): CopyPlan {
  const toCreate: CopyPlan["toCreate"] = [];
  let skipped = 0;

  for (const studentId of input.seatedStudentIds) {
    const source = input.fromAttendance.get(studentId);
    const eligible =
      !input.toAttendanceStudentIds.has(studentId) &&
      input.toParticipatingStudentIds.has(studentId) &&
      !input.toBlockedStudentIds.has(studentId);

    if (eligible && source?.status === "present") {
      toCreate.push({ studentId, status: "present" });
    } else if (eligible && source?.status === "absent" && !source.hasReason) {
      toCreate.push({ studentId, status: "absent" });
    } else {
      skipped++;
    }
  }

  return { toCreate, skipped };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx tsx tests/copy-session-logic.test.ts`
Expected: `copy-session-logic checks passed`

- [ ] **Step 5: API 라우트 구현**

`src/app/api/attendance/copy-session/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { isSessionType, seatSessionOf } from "@/lib/sessions";
import { planSessionCopy } from "@/lib/attendance/copy-session";

const DAY_FIELDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

// POST /api/attendance/copy-session
// Body: { grade, date: "YYYY-MM-DD", from: SessionType, to: SessionType }
export const POST = withAuth(["teacher"], async (req: Request, user) => {
  const body = await req.json();
  const { grade, date, from, to } = body;

  if (!Number.isInteger(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date 는 YYYY-MM-DD 형식이어야 합니다." }, { status: 400 });
  }
  if (!isSessionType(from) || !isSessionType(to) || from === to || seatSessionOf(from) !== seatSessionOf(to)) {
    return NextResponse.json({ error: "같은 좌석 세션의 서로 다른 블록만 복사할 수 있습니다." }, { status: 400 });
  }

  const dateObj = new Date(`${date}T00:00:00Z`);
  const dayIndex = new Date(`${date}T12:00:00+09:00`).getDay();
  const todayField = DAY_FIELDS[dayIndex] as "mon" | "tue" | "wed" | "thu" | "fri" | undefined;

  const studySession = await prisma.studySession.findUnique({
    where: { type_grade: { type: seatSessionOf(from), grade } },
    include: { rooms: { select: { id: true } } },
  });
  if (!studySession) {
    return NextResponse.json({ copied: 0, skipped: 0 });
  }

  const seatLayouts = await prisma.seatLayout.findMany({
    where: { roomId: { in: studySession.rooms.map((r) => r.id) }, studentId: { not: null } },
    select: { studentId: true },
  });
  const seatedStudentIds = seatLayouts.map((s) => s.studentId as number);

  const [fromRows, toRows, toParticipation, toRequests] = await Promise.all([
    prisma.attendance.findMany({
      where: { date: dateObj, sessionType: from, studentId: { in: seatedStudentIds } },
      select: { studentId: true, status: true, absenceReason: { select: { id: true } } },
    }),
    prisma.attendance.findMany({
      where: { date: dateObj, sessionType: to, studentId: { in: seatedStudentIds } },
      select: { studentId: true },
    }),
    prisma.participationDay.findMany({
      where: { sessionType: to, studentId: { in: seatedStudentIds } },
    }),
    prisma.absenceRequest.findMany({
      where: { date: dateObj, sessionType: to, status: { in: ["pending", "approved"] }, studentId: { in: seatedStudentIds } },
      select: { studentId: true },
    }),
  ]);

  const participationBy = new Map(toParticipation.map((p) => [p.studentId, p]));
  const toParticipatingStudentIds = new Set(
    seatedStudentIds.filter((id) => {
      const p = participationBy.get(id);
      if (!p) return true; // 참여설정 없으면 기본 참여 (출석 API 와 동일 규칙)
      if (!p.isParticipating) return false;
      return todayField && todayField in p ? p[todayField] : true;
    })
  );

  const plan = planSessionCopy({
    seatedStudentIds,
    fromAttendance: new Map(fromRows.map((r) => [r.studentId, { status: r.status, hasReason: r.absenceReason !== null }])),
    toAttendanceStudentIds: new Set(toRows.map((r) => r.studentId)),
    toParticipatingStudentIds,
    toBlockedStudentIds: new Set(toRequests.map((r) => r.studentId)),
  });

  if (plan.toCreate.length > 0) {
    await prisma.attendance.createMany({
      data: plan.toCreate.map((c) => ({
        studentId: c.studentId,
        sessionType: to,
        date: dateObj,
        status: c.status,
        checkedBy: user.userId,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ copied: plan.toCreate.length, skipped: plan.skipped });
});
```

- [ ] **Step 6: 커밋**

```bash
git add src/lib/attendance/copy-session.ts src/app/api/attendance/copy-session/route.ts tests/copy-session-logic.test.ts
git commit -m "Add copy-session API to seed afternoon2 from afternoon1 results"
```

---

### Task 7: 감독교사 출석체크 화면 — 탭 4개, 복사 버튼, 주간 팝업

**Files:**
- Modify: `src/app/attendance/[grade]/page.tsx`
- Test: `tests/attendance-page-wiring.test.ts`

**Interfaces:**
- Consumes: `SESSION_TYPES`, `SESSION_META`, `seatSessionOf`, `sessionTypesOfSeat`, `type SessionType` (Task 1); `reasonLabel` (Task 1); `summarizeWeeklyCell`, `type WeeklyDayRow`, `type WeeklyCellKind` (Task 5); `POST /api/attendance/copy-session` (Task 6); `buildPrintGroups(rooms, seatSession, grade)` (Task 13 에서 타입만 바뀜 — 지금은 `"afternoon" | "night"` 문자열 타입이라 `seatSession` 변수를 그대로 넘길 수 있다)

- [ ] **Step 1: 실패하는 wiring 테스트 작성**

`tests/attendance-page-wiring.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/app/attendance/[grade]/page.tsx", import.meta.url), "utf8");

// 탭: SessionType 3개 + 불참신청
assert.match(page, /type Tab = SessionType \| "absence"/, "Tab 타입이 SessionType 기반이 아님");
assert.match(page, /useState<Tab>\("afternoon1"\)/, "기본 탭이 afternoon1 이 아님");
assert.match(page, /SESSION_TYPES\.map\(\(sessionType\) => \(/, "탭 버튼을 SESSION_TYPES 로 그리지 않음");
assert.doesNotMatch(page, /오후자습\s*<\/button>/, "옛 오후자습 탭 버튼이 남아 있음");

// 좌석 세션 분기
assert.match(page, /const seatSession = tab === "absence" \? null : seatSessionOf\(tab\)/, "seatSession 파생값이 없음");
assert.match(page, /grade === 2 && seatSession === "night"/, "미래홀 분기가 seatSession 기준이 아님");
assert.match(page, /buildPrintGroups\(rooms, seatSession, grade\)/, "그룹 분기가 seatSession 을 넘기지 않음");
assert.doesNotMatch(page, /tab === "afternoon"/, "옛 tab === \"afternoon\" 비교가 남아 있음");
assert.doesNotMatch(page, /tab === "night"/, "옛 tab === \"night\" 비교가 남아 있음");

// 주간 팝업
assert.match(page, /summarizeWeeklyCell/, "팝업이 공용 우선순위 함수를 쓰지 않음");
assert.match(page, /sessionTypesOfSeat\(seatSessionOf\(tab\)\)/, "팝업이 좌석 세션의 블록 목록을 쓰지 않음");
assert.match(page, /grid-cols-\[auto_repeat\(5,1fr\)\]/, "팝업 그리드가 라벨 열 + 5요일 구조가 아님");
assert.match(page, /reasonLabel\(/, "사유가 한글 라벨로 표시되지 않음");
assert.doesNotMatch(page, /interface WeeklyDay \{/, "옛 WeeklyDay 인터페이스가 남아 있음");
assert.doesNotMatch(page, /afternoonNote|nightNote|afternoonParticipating/, "옛 weekly 필드명이 남아 있음");
assert.doesNotMatch(page, /const reasonLabels: Record/, "로컬 사유 라벨 맵이 남아 있음");

// 복사 버튼
assert.match(page, /\/api\/attendance\/copy-session/, "복사 API 호출이 없음");
assert.match(page, /tab === COPY_TARGET/, "복사 버튼이 대상 블록 탭에만 보이도록 제한되지 않음");
assert.match(page, /오후1 결과 복사/, "복사 버튼 라벨이 없음");
assert.match(page, /confirm\("오후1 출석 결과를 오후2 미체크 학생에게 복사할까요\?"\)/, "복사 확인 다이얼로그가 없음");

// 라벨
assert.match(page, /SESSION_META\[r\.sessionType\]\.label/, "불참신청 목록 라벨이 SESSION_META 가 아님");
assert.match(page, /SESSION_META\[request\.sessionType\]\.label/, "일괄승인 모달 라벨이 SESSION_META 가 아님");
assert.doesNotMatch(page, /"오후자습" : "야간자습"/, "옛 세션 라벨 삼항이 남아 있음");

console.log("attendance-page-wiring checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/attendance-page-wiring.test.ts`
Expected: FAIL — `Tab 타입이 SessionType 기반이 아님`

- [ ] **Step 3: import·타입 교체**

파일 상단:

```ts
import { useState, useRef, useCallback, useEffect, useMemo, memo } from "react";
```
→
```ts
import { Fragment, useState, useRef, useCallback, useEffect, useMemo, memo } from "react";
```

`import { buildPrintGroups } from "@/lib/seats/print-groups";` 아래에 추가:

```ts
import { SESSION_TYPES, SESSION_META, seatSessionOf, sessionTypesOfSeat, type SessionType } from "@/lib/sessions";
import { reasonLabel } from "@/lib/absence-reasons";
import { summarizeWeeklyCell, type WeeklyDayRow, type WeeklyCellKind } from "@/lib/attendance/weekly-summary";

const COPY_SOURCE: SessionType = "afternoon1";
const COPY_TARGET: SessionType = "afternoon2";
```

`interface WeeklyDay { ... }` 블록(`date` ~ `nightAfterSchool`) 전체 삭제.

```ts
type Tab = "afternoon" | "night" | "absence";
```
→
```ts
type Tab = SessionType | "absence";
```

`AbsenceRequestItem` 과 `TodaySupervisorAssignment` 의 `sessionType: "afternoon" | "night";` → `sessionType: SessionType;` (2곳).

- [ ] **Step 4: 상태·파생값 교체**

```ts
  const [tab, setTab] = useState<Tab>("afternoon");
```
→
```ts
  const [tab, setTab] = useState<Tab>("afternoon1");
  const [isCopying, setIsCopying] = useState(false);
```

`useState<WeeklyDay[]>([])` → `useState<WeeklyDayRow[]>([])`. `weeklyCacheRef` 의 제네릭 안 `weekly: WeeklyDay[]` → `weekly: WeeklyDayRow[]`.

`const rooms: Room[] = data?.rooms || [];` 바로 위에 추가:

```ts
  const seatSession = tab === "absence" ? null : seatSessionOf(tab);
```

- [ ] **Step 5: 주간 데이터 적용·비고 저장**

`applyWeeklyResult` 시그니처의 `weekly: WeeklyDay[]` → `weekly: WeeklyDayRow[]`, 본문:

```ts
    for (const d of weekly) {
      const noteVal = tab === "afternoon" ? d.afternoonNote : d.nightNote;
      if (noteVal) notes[d.date] = noteVal;
    }
```
→
```ts
    for (const d of weekly) {
      const noteVal = tab === "absence" ? null : d.sessions[tab].note;
      if (noteVal) notes[d.date] = noteVal;
    }
```

`handleInfoClick` 의 `const weekly = (result.weekly || []) as WeeklyDay[];` → `as WeeklyDayRow[]`.

- [ ] **Step 6: 복사 핸들러 추가**

`handleNoteSave` 함수 바로 아래에 추가:

```ts
  async function handleCopyFromSource() {
    if (!confirm("오후1 출석 결과를 오후2 미체크 학생에게 복사할까요?")) return;
    setIsCopying(true);
    try {
      const res = await fetch("/api/attendance/copy-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, date: selectedDate, from: COPY_SOURCE, to: COPY_TARGET }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || "복사에 실패했습니다.");
        return;
      }
      weeklyCacheRef.current.clear();
      mutate();
      alert(`${result.copied}명 복사, ${result.skipped}명 건너뜀`);
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsCopying(false);
    }
  }
```

- [ ] **Step 7: `renderWeeklyContent` 재작성**

기존 `function renderWeeklyContent(selectedInThisRow: Seat) { ... }` 전체를 다음으로 교체:

```tsx
  const weeklyCellStyle: Record<WeeklyCellKind, string> = {
    "not-participating": "bg-[#e5e7eb] text-[#9ca3af]",
    "approved-absence": "bg-[#fef9c3] text-[#ca8a04]",
    "after-school": "bg-[#fef9c3] text-[#ca8a04]",
    present: "bg-[#bbf7d0] text-[#166534]",
    absent: "bg-[#fecaca] text-[#991b1b]",
    unchecked: "bg-[#f3f4f6] text-[#9ca3af]",
  };

  // 주간 팝업/모달 공통 콘텐츠 (래퍼 없음)
  function renderWeeklyContent(selectedInThisRow: Seat) {
    if (tab === "absence") return null;
    const blockTypes = sessionTypesOfSeat(seatSessionOf(tab));
    const reasonLines = weeklyData.flatMap((d) =>
      blockTypes.flatMap((t) => {
        const cell = d.sessions[t];
        const r = cell.approvedReason ?? cell.reason;
        if (!r) return [];
        return [`${d.dayOfWeek} ${SESSION_META[t].shortLabel}: ${reasonLabel(r.type)}${r.detail ? ` (${r.detail})` : ""}`];
      })
    );
    const rowLabelClass =
      "text-[clamp(9px,2.2vw,11px)] font-semibold text-[#6b7280] whitespace-nowrap flex items-center justify-center px-1";

    return (
      <>
        <div className="flex justify-between items-center mb-2 flex-wrap gap-1">
          <span className="font-bold text-[clamp(11px,2.8vw,13px)] text-[#1e40af] whitespace-nowrap">
            {weeklyName} ({grade}-{selectedInThisRow.student?.classNumber})
          </span>
          <span className="text-[clamp(9px,2.2vw,11px)] text-[#6b7280] whitespace-nowrap">
            {(() => {
              const d = new Date(weeklyData[0]?.date);
              return `${d.getMonth() + 1}월 ${Math.ceil(d.getDate() / 7)}주차`;
            })()}
          </span>
        </div>
        <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-[clamp(2px,0.6vw,4px)] text-center">
          <div />
          {weeklyData.map((d) => {
            const isToday = d.date === selectedDate;
            return (
              <div
                key={`h-${d.date}`}
                className={`text-[clamp(10px,2.5vw,12px)] py-0.5 ${
                  isToday
                    ? "font-extrabold text-[#1e40af] border-b-[3px] border-[#2563eb] pb-1.5"
                    : "font-medium text-[#6b7280]"
                }`}
              >
                {d.dayOfWeek}
              </div>
            );
          })}
          {blockTypes.map((t) => (
            <Fragment key={t}>
              <div className={rowLabelClass}>{SESSION_META[t].shortLabel}</div>
              {weeklyData.map((d) => {
                const isToday = d.date === selectedDate;
                const { kind, label } = summarizeWeeklyCell(d.sessions[t]);
                return (
                  <div
                    key={`cell-${t}-${d.date}`}
                    className={`rounded-[4px] py-[clamp(6px,1.5vw,10px)] px-1 text-[clamp(9px,2.2vw,11px)] font-medium whitespace-nowrap ${weeklyCellStyle[kind]} ${
                      isToday && kind !== "not-participating" ? "border-2 border-[#2563eb] font-bold" : ""
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </Fragment>
          ))}
          <div className={rowLabelClass}>비고</div>
          {weeklyData.map((d) => {
            const participating = d.sessions[tab].participating;
            const noteKey = d.date;
            return (
              <div key={`note-${d.date}`} style={{ paddingTop: "2px" }}>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="비고"
                  disabled={!participating}
                  value={noteValues[noteKey] ?? ""}
                  onChange={(e) => setNoteValues(prev => ({ ...prev, [noteKey]: e.target.value }))}
                  onBlur={() => handleNoteSave(selectedSeat!, d.date, noteValues[noteKey] ?? "")}
                  className={`w-full py-[clamp(2px,0.6vw,4px)] px-1 border rounded text-[clamp(8px,2vw,10px)] text-center ${
                    noteValues[noteKey]
                      ? "border-[#ea580c] bg-[#fff7ed] text-[#ea580c] font-medium"
                      : "border-[#cbd5e1] bg-white text-[#374151]"
                  } disabled:bg-gray-50 disabled:text-gray-300 disabled:border-gray-200`}
                />
              </div>
            );
          })}
        </div>
        {reasonLines.length > 0 && (
          <div className="mt-1.5 text-[clamp(9px,2.2vw,11px)] text-[#dc2626]">
            {reasonLines.join(", ")}
          </div>
        )}
        {/* 누계·랭킹 블록 */}
        {weeklyTotals && (
          <div className="mt-3 pt-3 border-t border-[#bfdbfe] grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-gray-500">이번 달</p>
              <p className="text-sm font-bold text-blue-700">{weeklyTotals.monthlyHours.toFixed(1)}h</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">학년도</p>
              <p className="text-sm font-bold text-indigo-700">{weeklyTotals.academicYearHours.toFixed(1)}h</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">학년 내 순위</p>
              {weeklyRanking ? (
                <p className="text-sm font-bold text-amber-600">
                  {weeklyRanking.rank}위{" "}
                  <span className="text-[10px] text-gray-500">(상위 {weeklyRanking.topPercent}%)</span>
                </p>
              ) : (
                <p className="text-xs text-gray-400">-</p>
              )}
            </div>
          </div>
        )}
      </>
    );
  }
```

- [ ] **Step 8: 로컬 사유 라벨 맵 제거**

```ts
  const reasonLabels: Record<string, string> = {
    academy: "학원",
    afterschool: "방과후",
    illness: "질병",
    custom: "기타",
  };
```
블록 삭제. 이 맵을 쓰던 두 곳:
- 불참신청 목록: `{reasonLabels[r.reasonType] || r.reasonType}` → `{reasonLabel(r.reasonType)}`
- 일괄승인 모달: `{reasonLabels[request.reasonType] || request.reasonType}` → `{reasonLabel(request.reasonType)}`

세션 라벨 두 곳:
- 목록: `{dateLabel} · {r.sessionType === "afternoon" ? "오후자습" : "야간자습"} ·{" "}` → `{dateLabel} · {SESSION_META[r.sessionType].label} ·{" "}`
- 모달: `{request.sessionType === "afternoon" ? "오후자습" : "야간자습"}` → `{SESSION_META[request.sessionType].label}`

- [ ] **Step 9: 탭 버튼 교체**

`{/* 오후/야간/불참신청 탭 */}` 부터 불참신청 버튼 직전(오후자습·야간자습 두 `<button>`)까지를 다음으로 교체:

```tsx
        {/* 블록 탭 3개 + 불참신청 */}
        <div className="flex gap-1 mt-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {SESSION_TYPES.map((sessionType) => (
            <button
              key={sessionType}
              onClick={() => { setTab(sessionType); setSelectedSeat(null); setActivatedStudents(new Set()); }}
              className={`flex-1 text-center py-2.5 rounded-t-[10px] text-[clamp(12px,3vw,14px)] font-semibold transition-all whitespace-nowrap min-w-[64px] ${
                tab === sessionType
                  ? "bg-white text-[#2563eb] shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
                  : "bg-[#e2e8f0] text-[#94a3b8]"
              }`}
            >
              {SESSION_META[sessionType].shortLabel}
            </button>
          ))}
```

불참신청 버튼은 그대로 두되 `className` 에 `whitespace-nowrap min-w-[64px]` 추가.

- [ ] **Step 10: 교실 콘텐츠 분기 + 복사 버튼**

```tsx
        <div className="bg-white rounded-b-xl p-3 flex flex-col gap-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          {tab === "absence" ? (
            renderAbsenceRequests()
          ) : grade === 2 && tab === "night" ? (
```
→
```tsx
        <div className="bg-white rounded-b-xl p-3 flex flex-col gap-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          {tab === COPY_TARGET && rooms.length > 0 && (
            <div className="flex justify-end -mb-2">
              <button
                type="button"
                onClick={handleCopyFromSource}
                disabled={isCopying}
                className="min-h-11 px-4 rounded-md text-[clamp(11px,2.8vw,13px)] font-semibold bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] hover:bg-[#dbeafe] disabled:opacity-50 whitespace-nowrap"
              >
                {isCopying ? "복사 중..." : `${SESSION_META[COPY_SOURCE].shortLabel} 결과 복사`}
              </button>
            </div>
          )}
          {tab === "absence" ? (
            renderAbsenceRequests()
          ) : grade === 2 && seatSession === "night" ? (
```

```tsx
          ) : tab === "afternoon" ? (
            /* 오후 자습: 이름 접두사 기반 그룹 */
            <div className="flex flex-col gap-5">
              {buildPrintGroups(rooms, "afternoon", grade).map((group, gi) => (
```
→
```tsx
          ) : seatSession === "afternoon" ? (
            /* 오후 좌석: 이름 접두사 기반 그룹 */
            <div className="flex flex-col gap-5">
              {buildPrintGroups(rooms, seatSession, grade).map((group, gi) => (
```

- [ ] **Step 11: 통과 확인 + 커밋**

Run: `npx tsx tests/attendance-page-wiring.test.ts`
Expected: `attendance-page-wiring checks passed`

Run: `npx tsx tests/seat-print-wiring.test.ts`
Expected: `seat-print-wiring checks passed` (buildPrintGroups 사용·인라인 그룹핑 부재 가드 유지)

```bash
git add 'src/app/attendance/[grade]/page.tsx' tests/attendance-page-wiring.test.ts
git commit -m "Split attendance screen into afternoon1/afternoon2/night tabs with copy and approved-absence popup"
```

---

### Task 8: 감독배정 세트 (3행 생성 + 대표행 필터) + 일괄승인 lib

**Files:**
- Modify: `src/app/api/grade-admin/[grade]/supervisor-assignments/route.ts:112-126`
- Modify: `src/app/api/grade-admin/[grade]/supervisor-assignments/[id]/route.ts:30` (주석)
- Modify: `src/app/api/supervisor-assignments/[id]/route.ts:37,46` (주석)
- Modify: `src/app/api/homeroom/schedule/route.ts:53-54`
- Modify: `src/app/api/homeroom/schedule/summary/route.ts:24-28`
- Modify: `src/app/api/admin/supervisors/export/route.ts:56,63`
- Modify: `src/app/api/grade-admin/[grade]/supervisor-assignments/export/route.ts:68,75`
- Modify: `src/components/admin-shared/MonthlyCalendar.tsx:11,17,63,67,143-148,160`
- Modify: `src/app/homeroom/schedule/page.tsx:12,35,176`
- Modify: `src/lib/push/reminder-logic.ts:32` (주석), `tests/reminder-logic.test.ts`
- Modify: `src/lib/absence-request-bulk-approval.ts:126`, `tests/supervisor-bulk-absence-approval.test.ts`

**Interfaces:**
- Consumes: `SESSION_TYPES`, `REPRESENTATIVE_SESSION_TYPE`, `isSessionType`, `type SessionType` (Task 1)
- Produces: `POST /api/grade-admin/[grade]/supervisor-assignments` → `{ assignment: <대표행>, assignments: [3행] }`

- [ ] **Step 1: 기존 테스트를 3블록 기준으로 갱신 (실패 확인)**

`tests/reminder-logic.test.ts` 의 `sameTeacherTwoSessions` 블록:

```ts
// planReminders: 오후+야간 중복 → 1건으로 dedupe
const sameTeacherTwoSessions: ReminderAssignment[] = [
  { teacherId: 7, grade: 2, teacherName: "김교사" },
  { teacherId: 7, grade: 2, teacherName: "김교사" },
];
const r1 = planReminders(sameTeacherTwoSessions, "2026-06-25", new Set());
```
→
```ts
// planReminders: 오후1+오후2+야간 3행 → 1건으로 dedupe
const sameTeacherThreeSessions: ReminderAssignment[] = [
  { teacherId: 7, grade: 2, teacherName: "김교사" },
  { teacherId: 7, grade: 2, teacherName: "김교사" },
  { teacherId: 7, grade: 2, teacherName: "김교사" },
];
const r1 = planReminders(sameTeacherThreeSessions, "2026-06-25", new Set());
```

`tests/supervisor-bulk-absence-approval.test.ts`:
- 상단 `type SessionType = "afternoon" | "night";` → `import type { SessionType } from "../src/lib/sessions";` (기존 `import assert` 아래)
- id 4 요청의 `sessionType: "afternoon",` → `sessionType: "afternoon1",` (다른 블록은 미승인 케이스 유지)
- `main()` 앞에 새 케이스 추가:

```ts
async function testRejectsLegacySessionType() {
  const prisma = createFakePrisma({ assignments: [], requests: [] });
  await assert.rejects(
    () =>
      approvePendingAbsenceRequestsForSupervisor({
        prisma,
        teacherId: 7,
        grade: 2,
        date: "2026-04-30",
        sessionType: "afternoon" as unknown as SessionType,
      }),
    /invalid sessionType/
  );
}
```
그리고 `main()` 안에 `await testRejectsLegacySessionType();` 추가.

Run: `npx tsx tests/supervisor-bulk-absence-approval.test.ts`
Expected: FAIL — `testRejectsLegacySessionType` 이 `not assigned` 로 거부됨 (검증이 아직 옛 값을 허용)

- [ ] **Step 2: 일괄승인 lib**

`src/lib/absence-request-bulk-approval.ts`:
```ts
import type { ReasonType, SessionType } from "@/generated/prisma/client";
```
→
```ts
import type { ReasonType } from "@/generated/prisma/client";
import { isSessionType, type SessionType } from "@/lib/sessions";
```
```ts
  if (sessionType !== "afternoon" && sessionType !== "night") {
    throw new BulkAbsenceApprovalError("invalid sessionType", 400);
  }
```
→
```ts
  if (!isSessionType(sessionType)) {
    throw new BulkAbsenceApprovalError("invalid sessionType", 400);
  }
```

Run: `npx tsx tests/supervisor-bulk-absence-approval.test.ts` → `supervisor bulk absence approval tests passed`
Run: `npx tsx tests/reminder-logic.test.ts` → `reminder-logic checks passed`

`src/lib/push/reminder-logic.ts` 주석 `// 오후+야간 2행 → 1건` → `// 블록별 행(오후1·오후2·야간) → 1건`.

- [ ] **Step 3: POST 3행 생성**

`src/app/api/grade-admin/[grade]/supervisor-assignments/route.ts` — import 추가 `import { SESSION_TYPES, REPRESENTATIVE_SESSION_TYPE } from "@/lib/sessions";`, 그리고:

```ts
    // 오후 + 야간 동시 배정 (upsert)
    const [afternoon, night] = await Promise.all(
      (["afternoon", "night"] as const).map((sessionType) =>
        prisma.supervisorAssignment.upsert({
          where: {
            date_grade_sessionType: { date: parsedDate, grade, sessionType },
          },
          update: { teacherId: tid },
          create: { teacherId: tid, date: parsedDate, grade, sessionType },
          include: { teacher: { select: { id: true, name: true } } },
        })
      )
    );

    return NextResponse.json({ assignment: afternoon, assignments: [afternoon, night] }, { status: 200 });
```
→
```ts
    // 하루 1명이 모든 블록을 맡으므로 블록마다 같은 교사로 upsert
    const assignments = await Promise.all(
      SESSION_TYPES.map((sessionType) =>
        prisma.supervisorAssignment.upsert({
          where: {
            date_grade_sessionType: { date: parsedDate, grade, sessionType },
          },
          update: { teacherId: tid },
          create: { teacherId: tid, date: parsedDate, grade, sessionType },
          include: { teacher: { select: { id: true, name: true } } },
        })
      )
    );
    const representative = assignments[SESSION_TYPES.indexOf(REPRESENTATIVE_SESSION_TYPE)];

    return NextResponse.json({ assignment: representative, assignments }, { status: 200 });
```

주석만 바꿀 두 파일:
- `supervisor-assignments/[id]/route.ts`: `// 같은 날짜, 같은 학년의 오후+야간 모두 삭제 (교체이력 먼저 정리)` → `// 같은 날짜, 같은 학년의 모든 블록 배정 삭제 (교체이력 먼저 정리)`
- `src/app/api/supervisor-assignments/[id]/route.ts`: `// 같은 날짜, 같은 학년의 오후+야간 배정 모두 찾기` → `// 같은 날짜, 같은 학년의 모든 블록 배정 찾기`; `// 트랜잭션으로 교체 처리 (오후+야간 모두)` → `// 트랜잭션으로 교체 처리 (모든 블록)`

- [ ] **Step 4: 대표행 필터 4곳**

`src/app/api/homeroom/schedule/route.ts` — import `import { REPRESENTATIVE_SESSION_TYPE } from "@/lib/sessions";`:
```ts
  // 오후/야간이 동일 감독이므로 afternoon만 반환 (중복 제거)
  const uniqueAssignments = assignments.filter((a) => a.sessionType === "afternoon");
```
→
```ts
  // 모든 블록이 동일 감독이므로 대표행만 반환 (중복 제거)
  const uniqueAssignments = assignments.filter((a) => a.sessionType === REPRESENTATIVE_SESSION_TYPE);
```

`src/app/api/homeroom/schedule/summary/route.ts` — 같은 import:
```ts
  // 오후+야간 동일 감독이므로 afternoon만 카운트
  const assignments = await prisma.supervisorAssignment.findMany({
    where: {
      date: { gte: schoolYearStart, lte: schoolYearEnd },
      sessionType: "afternoon",
    },
```
→
```ts
  // 모든 블록이 동일 감독이므로 대표행만 카운트
  const assignments = await prisma.supervisorAssignment.findMany({
    where: {
      date: { gte: schoolYearStart, lte: schoolYearEnd },
      sessionType: REPRESENTATIVE_SESSION_TYPE,
    },
```

`src/app/api/admin/supervisors/export/route.ts` 와 `src/app/api/grade-admin/[grade]/supervisor-assignments/export/route.ts` — 같은 import, 각 파일의 `sessionType: "afternoon",` 2곳 → `sessionType: REPRESENTATIVE_SESSION_TYPE,`.

- [ ] **Step 5: 달력 UI 2곳**

`src/components/admin-shared/MonthlyCalendar.tsx` — import `import { REPRESENTATIVE_SESSION_TYPE, type SessionType } from "@/lib/sessions";`:
- `Assignment.sessionType: "afternoon" | "night";` → `sessionType: SessionType;`
- `SlotConfig.sessionType: "afternoon" | "night";` → `sessionType: SessionType;`
- `grade: g, sessionType: "afternoon" as const, label: \`${g}학년\`,` → `grade: g, sessionType: REPRESENTATIVE_SESSION_TYPE, label: \`${g}학년\`,`
- `{ grade: grade!, sessionType: "afternoon" as const, label: "감독" },` → `{ grade: grade!, sessionType: REPRESENTATIVE_SESSION_TYPE, label: "감독" },`
- `const cellKey = \`${dateStr}-${g}-afternoon\`;` → `const cellKey = \`${dateStr}-${g}-${REPRESENTATIVE_SESSION_TYPE}\`;`
- `// 해당 날짜+학년의 afternoon 배정을 찾아 DELETE (API가 양쪽 모두 삭제)` → `// 대표행을 찾아 DELETE (API 가 모든 블록을 삭제)`; `getAssignment(date, g, "afternoon")` → `getAssignment(date, g, REPRESENTATIVE_SESSION_TYPE)`
- `// POST가 오후+야간 동시 생성` → `// POST 가 모든 블록을 동시 생성`

`src/app/homeroom/schedule/page.tsx` — 같은 import:
- `sessionType: "afternoon" | "night";` → `sessionType: SessionType;`
- `grade: g, sessionType: "afternoon" as const, label: \`${g}학년\`,` → `grade: g, sessionType: REPRESENTATIVE_SESSION_TYPE, label: \`${g}학년\`,`
- `<span className="whitespace-nowrap">학년별 1명 오후+야간</span>` → `<span className="whitespace-nowrap">학년별 1명 (오후1·오후2·야간)</span>`

- [ ] **Step 6: 확인 + 커밋**

Run: `grep -rn '"afternoon"' src/app/api/homeroom/schedule src/app/api/admin/supervisors 'src/app/api/grade-admin/[grade]/supervisor-assignments' src/components/admin-shared/MonthlyCalendar.tsx src/app/homeroom/schedule/page.tsx`
Expected: 출력 없음

```bash
git add 'src/app/api/grade-admin/[grade]/supervisor-assignments' src/app/api/supervisor-assignments src/app/api/homeroom/schedule src/app/api/admin/supervisors src/components/admin-shared/MonthlyCalendar.tsx src/app/homeroom/schedule/page.tsx src/lib/push/reminder-logic.ts src/lib/absence-request-bulk-approval.ts tests/reminder-logic.test.ts tests/supervisor-bulk-absence-approval.test.ts
git commit -m "Create supervisor assignments for every study block and read via representative row"
```

---

### Task 9: 불참신청 — 학생 다중 블록 신청, 도우미 일괄, 담임 사유등록, 라벨

**Files:**
- Modify: `src/app/api/student/absence-requests/route.ts` (POST 전면)
- Modify: `src/app/student/absence-requests/page.tsx`
- Modify: `src/app/api/student/batch-absence/route.ts`
- Modify: `src/app/student/batch-absence/page.tsx`
- Modify: `src/app/api/homeroom/absence-reasons/route.ts:25-30`
- Modify: `src/app/homeroom/absence-reasons/page.tsx:24-27,41,149`
- Modify: `src/app/homeroom/absence-requests/page.tsx:15,52-56`
- Modify: `src/app/admin/swap-history/page.tsx:53`
- Test: `tests/absence-request-wiring.test.ts`

**Interfaces:**
- Consumes: `SESSION_TYPES`, `SESSION_META`, `isSessionType`, `sessionTypesOfSeat`, `emptySessionRecord`, `type SessionType` (Task 1); `REASON_LABELS`, `REASON_TYPES` (Task 1)
- Produces:
  - `POST /api/student/absence-requests` body `{ date, sessionTypes: SessionType[], reasonType, detail? }` → `201 { created, skipped }`
  - `GET /api/student/batch-absence` → `students[].{ participating: Record<SessionType, boolean>, existingRequests: Partial<Record<SessionType, string>> }`

- [ ] **Step 1: 실패하는 wiring 테스트 작성**

`tests/absence-request-wiring.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

const studentApi = read("../src/app/api/student/absence-requests/route.ts");
assert.match(studentApi, /sessionTypes/, "학생 신청 API 가 sessionTypes 배열을 받지 않음");
assert.match(studentApi, /skipDuplicates: true/, "중복 신청을 skipDuplicates 로 처리하지 않음");
assert.match(studentApi, /isSessionType/, "sessionTypes 원소 검증이 없음");
assert.doesNotMatch(studentApi, /\["afternoon", "night"\]/, "옛 세션 리스트가 남아 있음");

const studentPage = read("../src/app/student/absence-requests/page.tsx");
assert.match(studentPage, /SESSION_TYPES\.map/, "세션 버튼을 SESSION_TYPES 로 그리지 않음");
assert.match(studentPage, /오후 전체/, "오후 전체 편의 버튼이 없음");
assert.match(studentPage, /sessionTypesOfSeat\("afternoon"\)/, "오후 전체가 좌석 세션의 블록 목록을 쓰지 않음");
assert.match(studentPage, /sessionTypes,/, "전송 바디가 sessionTypes 가 아님");

const batchApi = read("../src/app/api/student/batch-absence/route.ts");
assert.match(batchApi, /participating: emptySessionRecord/, "도우미 GET 이 Record<SessionType,boolean> 을 만들지 않음");
assert.doesNotMatch(batchApi, /validSessionTypes = \[/, "옛 validSessionTypes 배열이 남아 있음");

const batchPage = read("../src/app/student/batch-absence/page.tsx");
assert.match(batchPage, /selected: Record<SessionType, boolean>/, "행 상태가 Record<SessionType,boolean> 이 아님");
assert.doesNotMatch(batchPage, /afternoonSelected|nightSelected/, "옛 행 상태 필드가 남아 있음");

const reasonsApi = read("../src/app/api/homeroom/absence-reasons/route.ts");
assert.match(reasonsApi, /isSessionType\(sessionType\)/);
const reasonsPage = read("../src/app/homeroom/absence-reasons/page.tsx");
assert.match(reasonsPage, /SESSION_TYPES\.map/);
assert.match(reasonsPage, /useState<SessionType>\("afternoon1"\)/);

const homeroomList = read("../src/app/homeroom/absence-requests/page.tsx");
assert.match(homeroomList, /SESSION_META\[req\.sessionType\]\.shortLabel/);
assert.doesNotMatch(homeroomList, /const SESSION_LABELS/);

const swapHistory = read("../src/app/admin/swap-history/page.tsx");
assert.doesNotMatch(swapHistory, /=== "afternoon" \? "오후" : "야간"/);

console.log("absence-request-wiring checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/absence-request-wiring.test.ts`
Expected: FAIL — `학생 신청 API 가 sessionTypes 배열을 받지 않음`

- [ ] **Step 3: 학생 신청 API POST 재작성**

`src/app/api/student/absence-requests/route.ts` — import 교체:
```ts
import type { SessionType, ReasonType } from "@/generated/prisma/client";
```
→
```ts
import type { ReasonType } from "@/generated/prisma/client";
import { isSessionType, type SessionType } from "@/lib/sessions";
import { REASON_TYPES } from "@/lib/absence-reasons";
```

`export const POST` 전체를 다음으로 교체:

```ts
// POST /api/student/absence-requests
// Body: { date, sessionTypes: SessionType[], reasonType, detail? } — 블록마다 신청 1건
export const POST = withAuth(["student"], async (req: Request, user) => {
  const studentId = user.userId;
  const body = await req.json();
  const { date, sessionTypes, reasonType, detail } = body as {
    date: string;
    sessionTypes: unknown;
    reasonType: ReasonType;
    detail?: string;
  };

  if (!date || !Array.isArray(sessionTypes) || sessionTypes.length === 0 || !reasonType) {
    return NextResponse.json(
      { error: "날짜, 자습 시간, 사유타입은 필수입니다." },
      { status: 400 }
    );
  }

  const uniqueSessionTypes: SessionType[] = [];
  for (const value of sessionTypes) {
    if (!isSessionType(value)) {
      return NextResponse.json({ error: "유효하지 않은 자습 시간입니다." }, { status: 400 });
    }
    if (!uniqueSessionTypes.includes(value)) uniqueSessionTypes.push(value);
  }

  if (!(REASON_TYPES as readonly string[]).includes(reasonType)) {
    return NextResponse.json(
      { error: "유효하지 않은 사유타입입니다." },
      { status: 400 }
    );
  }

  const dateObj = new Date(date + "T00:00:00Z");

  // 과거 날짜 검사
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (dateObj < today) {
    return NextResponse.json(
      { error: "과거 날짜에는 불참 신청을 할 수 없습니다." },
      { status: 400 }
    );
  }

  const result = await prisma.absenceRequest.createMany({
    data: uniqueSessionTypes.map((sessionType) => ({
      studentId,
      sessionType,
      date: dateObj,
      reasonType,
      detail: detail || null,
    })),
    skipDuplicates: true,
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "이미 해당 날짜/시간에 불참 신청이 있습니다." },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { created: result.count, skipped: uniqueSessionTypes.length - result.count },
    { status: 201 }
  );
});
```

- [ ] **Step 4: 학생 신청 페이지**

`src/app/student/absence-requests/page.tsx`:

import 추가:
```ts
import { SESSION_TYPES, SESSION_META, sessionTypesOfSeat, type SessionType } from "@/lib/sessions";
import { REASON_LABELS } from "@/lib/absence-reasons";
```

삭제: `const SESSION_OPTIONS = [...] as const;` 블록과 로컬 `const REASON_LABELS: Record<string, string> = {...};` 블록 (`REASON_OPTIONS` 는 유지).

`AbsenceRequestItem.sessionType: string;` → `sessionType: SessionType;`

상태:
```ts
  const [sessionType, setSessionType] = useState("afternoon");
```
→
```ts
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>(["afternoon1"]);
  const afternoonBlocks = sessionTypesOfSeat("afternoon");
  const allAfternoonSelected = afternoonBlocks.every((t) => sessionTypes.includes(t));

  function toggleSessionType(t: SessionType) {
    setSessionTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }
  function toggleAllAfternoon() {
    setSessionTypes((prev) =>
      allAfternoonSelected
        ? prev.filter((x) => !afternoonBlocks.includes(x))
        : [...prev.filter((x) => !afternoonBlocks.includes(x)), ...afternoonBlocks]
    );
  }
```

`handleSubmit` 안:
```ts
    if (!date) {
      setError("날짜를 선택해주세요.");
      return;
    }
```
아래에 추가:
```ts
    if (sessionTypes.length === 0) {
      setError("자습 시간을 하나 이상 선택해주세요.");
      return;
    }
```
전송 바디의 `sessionType,` → `sessionTypes,`. 성공 후 초기화 `setSessionType("afternoon");` → `setSessionTypes(["afternoon1"]);`.

세션 선택 UI:
```tsx
            <div className="flex gap-2">
              {SESSION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSessionType(opt.value)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                    sessionType === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
```
→
```tsx
            <div className="flex gap-2 overflow-x-auto">
              {SESSION_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleSessionType(t)}
                  className={`flex-1 min-h-11 px-3 py-2 text-sm font-medium rounded-md border transition-colors whitespace-nowrap ${
                    sessionTypes.includes(t)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {SESSION_META[t].shortLabel}
                </button>
              ))}
              <button
                type="button"
                onClick={toggleAllAfternoon}
                className={`min-h-11 px-3 py-2 text-sm font-medium rounded-md border transition-colors whitespace-nowrap ${
                  allAfternoonSelected
                    ? "border-blue-600 bg-blue-100 text-blue-800"
                    : "border-dashed border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                오후 전체
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">여러 시간을 함께 선택할 수 있습니다.</p>
```

목록 라벨:
```tsx
                      {req.sessionType === "afternoon" ? "오후" : "야간"}
```
→
```tsx
                      {SESSION_META[req.sessionType]?.shortLabel ?? req.sessionType}
```

- [ ] **Step 5: 도우미 일괄 API**

`src/app/api/student/batch-absence/route.ts`:
```ts
import type { SessionType, ReasonType } from "@/generated/prisma/client";
```
→
```ts
import type { ReasonType } from "@/generated/prisma/client";
import { SESSION_TYPES, emptySessionRecord, isSessionType, type SessionType } from "@/lib/sessions";
import { REASON_TYPES } from "@/lib/absence-reasons";
```

GET 의 `requestMap` 타입 `Map<number, Record<string, string>>` → `Map<number, Partial<Record<SessionType, string>>>`, 그리고 학생 매핑:
```ts
  const students = classmates.map((s) => {
    const afternoonDay = s.participationDays.find(
      (pd) => pd.sessionType === "afternoon"
    );
    const nightDay = s.participationDays.find(
      (pd) => pd.sessionType === "night"
    );

    const isAfternoon =
      !!afternoonDay &&
      afternoonDay.isParticipating &&
      !!todayField &&
      !!afternoonDay[todayField];

    const isNight =
      !!nightDay &&
      nightDay.isParticipating &&
      !!todayField &&
      !!nightDay[todayField];

    return {
      id: s.id,
      studentNumber: s.studentNumber,
      name: s.name,
      afternoon: isAfternoon,
      night: isNight,
      existingRequests: requestMap.get(s.id) ?? {},
    };
  });
```
→
```ts
  const students = classmates.map((s) => {
    const byType = new Map(s.participationDays.map((pd) => [pd.sessionType, pd]));
    return {
      id: s.id,
      studentNumber: s.studentNumber,
      name: s.name,
      participating: emptySessionRecord((t) => {
        const pd = byType.get(t);
        return !!pd && pd.isParticipating && !!todayField && !!pd[todayField];
      }),
      existingRequests: requestMap.get(s.id) ?? {},
    };
  });
```

POST 검증:
```ts
  const validSessionTypes = ["afternoon", "night"];
  const validReasonTypes = ["academy", "afterschool", "illness", "custom"];

  for (const r of requests) {
    if (!validSessionTypes.includes(r.sessionType)) {
      return NextResponse.json(
        { error: "세션은 afternoon 또는 night만 가능합니다." },
        { status: 400 }
      );
    }
    if (!validReasonTypes.includes(r.reasonType)) {
```
→
```ts
  for (const r of requests) {
    if (!isSessionType(r.sessionType)) {
      return NextResponse.json(
        { error: `자습 시간은 ${SESSION_TYPES.join(", ")} 중 하나여야 합니다.` },
        { status: 400 }
      );
    }
    if (!(REASON_TYPES as readonly string[]).includes(r.reasonType)) {
```

- [ ] **Step 6: 도우미 일괄 페이지**

`src/app/student/batch-absence/page.tsx`:

import 추가: `import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";`

타입:
```ts
type StudentData = {
  id: number;
  studentNumber: number;
  name: string;
  afternoon: boolean;
  night: boolean;
  existingRequests: {
    afternoon?: string;
    night?: string;
  };
};

type RowState = {
  checked: boolean;
  afternoonSelected: boolean;
  nightSelected: boolean;
  reasonType: string;
  detail: string;
};
```
→
```ts
type StudentData = {
  id: number;
  studentNumber: number;
  name: string;
  participating: Record<SessionType, boolean>;
  existingRequests: Partial<Record<SessionType, string>>;
};

type RowState = {
  checked: boolean;
  selected: Record<SessionType, boolean>;
  reasonType: string;
  detail: string;
};

function noneSelected(): Record<SessionType, boolean> {
  return { afternoon1: false, afternoon2: false, night: false };
}
```

`initRowState`:
```ts
    afternoonSelected: false,
    nightSelected: false,
```
→
```ts
    selected: noneSelected(),
```

`hasSelectableSession`:
```ts
  return (
    (s.afternoon && !s.existingRequests.afternoon) ||
    (s.night && !s.existingRequests.night)
  );
```
→
```ts
  return SESSION_TYPES.some((t) => s.participating[t] && !s.existingRequests[t]);
```

`handleSubmit` 의 두 `if (row.afternoonSelected) {...}` / `if (row.nightSelected) {...}` 블록 →
```ts
      for (const t of SESSION_TYPES) {
        if (!row.selected[t]) continue;
        requests.push({
          studentId: s.id,
          sessionType: t,
          reasonType: row.reasonType,
          detail: row.detail.trim(),
        });
      }
```

`const anyParticipating = students.some((s) => s.afternoon || s.night);` → `const anyParticipating = students.some((s) => SESSION_TYPES.some((t) => s.participating[t]));`

`hasValidSelection`:
```ts
    return (
      row?.checked && (row.afternoonSelected || row.nightSelected)
    );
```
→
```ts
    return row?.checked && SESSION_TYPES.some((t) => row.selected[t]);
```

세션 버튼 두 개(`<SessionButton label="오후" ... />` 와 `label="야간"`) →
```tsx
                      {SESSION_TYPES.map((t) => (
                        <SessionButton
                          key={t}
                          label={SESSION_META[t].shortLabel}
                          participates={s.participating[t]}
                          existingRequest={s.existingRequests[t]}
                          selected={row.selected[t]}
                          enabled={isChecked}
                          onClick={() =>
                            updateRow(s.id, {
                              selected: { ...row.selected, [t]: !row.selected[t] },
                            })
                          }
                        />
                      ))}
```

주석 `/** Individual session button (오후 / 야간) */` → `/** Individual session button (블록 1개) */`. `SessionButton` 의 세 `<button>` className 에 `whitespace-nowrap` 추가.

- [ ] **Step 7: 담임 사유등록 API + 페이지, 담임 목록 라벨, 교체이력 라벨**

`src/app/api/homeroom/absence-reasons/route.ts` — import `import { isSessionType } from "@/lib/sessions";`:
```ts
  if (sessionType !== "afternoon" && sessionType !== "night") {
    return NextResponse.json(
      { error: "sessionType은 afternoon 또는 night이어야 합니다." },
      { status: 400 }
    );
  }
```
→
```ts
  if (!isSessionType(sessionType)) {
    return NextResponse.json({ error: "유효하지 않은 sessionType 입니다." }, { status: 400 });
  }
```

`src/app/homeroom/absence-reasons/page.tsx` — import `import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";`. 삭제:
```ts
const SESSION_TYPES = [
  { value: "afternoon", label: "오후자습" },
  { value: "night", label: "야간자습" },
] as const;
```
`useState<"afternoon" | "night">("afternoon")` → `useState<SessionType>("afternoon1")`. 라디오 렌더:
```tsx
              {SESSION_TYPES.map((st) => (
                <label
                  key={st.value}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer transition-colors ${
                    sessionType === st.value
```
→
```tsx
              {SESSION_TYPES.map((t) => (
                <label
                  key={t}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer transition-colors whitespace-nowrap ${
                    sessionType === t
```
그 안의 `value={st.value}` → `value={t}`, `checked={sessionType === st.value}` → `checked={sessionType === t}`, `onChange={(e) => setSessionType(e.target.value as "afternoon" | "night")}` → `onChange={() => setSessionType(t)}`, `{st.label}` → `{SESSION_META[t].label}`. 바깥 `<div className="flex gap-3">` → `<div className="flex gap-3 overflow-x-auto">`.

`src/app/homeroom/absence-requests/page.tsx` — import `import { SESSION_META, type SessionType } from "@/lib/sessions";`; `sessionType: "afternoon" | "night";` → `sessionType: SessionType;`; `const SESSION_LABELS = {...}` 블록 삭제; 파일 내 `SESSION_LABELS[req.sessionType]` 사용처 → `SESSION_META[req.sessionType].shortLabel`.

`src/app/admin/swap-history/page.tsx` — import `import { SESSION_META, isSessionType } from "@/lib/sessions";`:
```tsx
                  <td className="px-4 py-3">{h.assignment.sessionType === "afternoon" ? "오후" : "야간"}</td>
```
→
```tsx
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isSessionType(h.assignment.sessionType) ? SESSION_META[h.assignment.sessionType].shortLabel : h.assignment.sessionType}
                  </td>
```

- [ ] **Step 8: 통과 확인 + 커밋**

Run: `npx tsx tests/absence-request-wiring.test.ts`
Expected: `absence-request-wiring checks passed`

```bash
git add src/app/api/student/absence-requests/route.ts src/app/student/absence-requests/page.tsx src/app/api/student/batch-absence/route.ts src/app/student/batch-absence/page.tsx src/app/api/homeroom/absence-reasons/route.ts src/app/homeroom/absence-reasons/page.tsx src/app/homeroom/absence-requests/page.tsx src/app/admin/swap-history/page.tsx tests/absence-request-wiring.test.ts
git commit -m "Accept per-block absence requests across student, helper, and homeroom flows"
```

---

### Task 10: 참여설정 — API 2개 + 표 3개 + 학생 참여일정

**Files:**
- Modify: `src/app/api/grade-admin/[grade]/participation-days/route.ts`
- Modify: `src/app/api/homeroom/participation-days/route.ts`
- Modify: `src/components/admin-shared/ParticipationManagement.tsx`
- Modify: `src/app/grade-admin/[grade]/participation/page.tsx`
- Modify: `src/app/homeroom/participation/page.tsx`
- Modify: `src/app/student/page.tsx`
- Test: `tests/participation-wiring.test.ts`

**Interfaces:**
- Consumes: `SESSION_TYPES`, `SESSION_META`, `emptySessionRecord`, `isSessionType`, `type SessionType` (Task 1)
- Produces: participation-days GET ×2 → `students[].sessions: Record<SessionType, DaySettings>` (기존 `afternoon`/`night` 키 제거)

- [ ] **Step 1: 실패하는 wiring 테스트 작성**

`tests/participation-wiring.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

for (const rel of [
  "../src/app/api/grade-admin/[grade]/participation-days/route.ts",
  "../src/app/api/homeroom/participation-days/route.ts",
]) {
  const src = read(rel);
  assert.match(src, /sessions: emptySessionRecord/, `${rel}: sessions Record 를 만들지 않음`);
  assert.match(src, /isSessionType\(sessionType\)/, `${rel}: PUT 검증이 없음`);
  assert.doesNotMatch(src, /=== "afternoon"/, `${rel}: 옛 afternoon 비교가 남아 있음`);
  assert.doesNotMatch(src, /night: night/, `${rel}: 옛 night 키가 남아 있음`);
}

for (const rel of [
  "../src/components/admin-shared/ParticipationManagement.tsx",
  "../src/app/grade-admin/[grade]/participation/page.tsx",
  "../src/app/homeroom/participation/page.tsx",
]) {
  const src = read(rel);
  assert.match(src, /sessions: Record<SessionType, DaySettings>/, `${rel}: 학생 타입이 sessions Record 가 아님`);
  assert.match(src, /SESSION_TYPES\.map/, `${rel}: 열을 SESSION_TYPES 로 그리지 않음`);
  assert.doesNotMatch(src, /\["afternoon", "night"\] as const/, `${rel}: 옛 세션 튜플이 남아 있음`);
  assert.doesNotMatch(src, /student\.afternoon|student\.night|s\.afternoon|s\.night/, `${rel}: 옛 세션 키 접근이 남아 있음`);
  assert.match(src, /colSpan=\{21\}/, `${rel}: 로딩/빈 행 colSpan 이 21(3+18) 이 아님`);
}

const studentPage = read("../src/app/student/page.tsx");
assert.match(studentPage, /SESSION_TYPES\.map\(\(t\) => renderSession/, "학생 참여일정이 3세션을 그리지 않음");
assert.doesNotMatch(studentPage, /participationDays\?\.afternoon/, "옛 afternoon 키 접근이 남아 있음");

console.log("participation-wiring checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/participation-wiring.test.ts`
Expected: FAIL — `sessions Record 를 만들지 않음`

- [ ] **Step 3: API 2개**

두 파일 공통 import: `import { emptySessionRecord, isSessionType } from "@/lib/sessions";`

`src/app/api/grade-admin/[grade]/participation-days/route.ts` GET 의 `const result = students.map((student) => { ... });` 전체를:

```ts
    const DEFAULT_DAYS = {
      isParticipating: true,
      mon: true, tue: true, wed: true, thu: true, fri: true,
      afterSchoolMon: false, afterSchoolTue: false, afterSchoolWed: false,
      afterSchoolThu: false, afterSchoolFri: false,
    };

    const result = students.map((student) => {
      const byType = new Map(student.participationDays.map((p) => [p.sessionType, p]));
      return {
        id: student.id,
        name: student.name,
        classNumber: student.classNumber,
        studentNumber: student.studentNumber,
        sessions: emptySessionRecord((t) => {
          const p = byType.get(t);
          return p
            ? {
                isParticipating: p.isParticipating,
                mon: p.mon, tue: p.tue, wed: p.wed, thu: p.thu, fri: p.fri,
                afterSchoolMon: p.afterSchoolMon, afterSchoolTue: p.afterSchoolTue,
                afterSchoolWed: p.afterSchoolWed, afterSchoolThu: p.afterSchoolThu,
                afterSchoolFri: p.afterSchoolFri,
              }
            : { ...DEFAULT_DAYS };
        }),
      };
    });
```

PUT:
```ts
    if (sessionType !== "afternoon" && sessionType !== "night") {
      return NextResponse.json(
        { error: "sessionType은 afternoon 또는 night이어야 합니다." },
        { status: 400 }
      );
    }
```
→
```ts
    if (!isSessionType(sessionType)) {
      return NextResponse.json({ error: "유효하지 않은 sessionType 입니다." }, { status: 400 });
    }
```

`src/app/api/homeroom/participation-days/route.ts` GET — `const result = students.map((student) => { ... });` 를 같은 구조로 교체(응답에 `grade: student.grade` 필드 포함, `defaultDays` 변수 → `DEFAULT_DAYS` 로 승격):

```ts
  const DEFAULT_DAYS = {
    isParticipating: true,
    mon: true, tue: true, wed: true, thu: true, fri: true,
    afterSchoolMon: false, afterSchoolTue: false, afterSchoolWed: false,
    afterSchoolThu: false, afterSchoolFri: false,
  };

  const result = students.map((student) => {
    const byType = new Map(student.participationDays.map((p) => [p.sessionType, p]));
    return {
      id: student.id,
      name: student.name,
      grade: student.grade,
      classNumber: student.classNumber,
      studentNumber: student.studentNumber,
      sessions: emptySessionRecord((t) => {
        const p = byType.get(t);
        return p
          ? {
              isParticipating: p.isParticipating,
              mon: p.mon, tue: p.tue, wed: p.wed, thu: p.thu, fri: p.fri,
              afterSchoolMon: p.afterSchoolMon, afterSchoolTue: p.afterSchoolTue,
              afterSchoolWed: p.afterSchoolWed, afterSchoolThu: p.afterSchoolThu,
              afterSchoolFri: p.afterSchoolFri,
            }
          : { ...DEFAULT_DAYS };
      }),
    };
  });
```
PUT 검증도 위와 동일하게 `isSessionType`.

- [ ] **Step 4: `ParticipationManagement.tsx`**

import: `import { SESSION_TYPES, SESSION_META, emptySessionRecord, type SessionType } from "@/lib/sessions";`

타입: `afternoon: DaySettings; night: DaySettings;` → `sessions: Record<SessionType, DaySettings>;`

```ts
  const allChecked = useMemo(() => {
    if (filteredStudents.length === 0) return { afternoon: false, night: false };
    return {
      afternoon: filteredStudents.every((s) => s.afternoon.isParticipating),
      night: filteredStudents.every((s) => s.night.isParticipating),
    };
  }, [filteredStudents]);
```
→
```ts
  const allChecked = useMemo(
    () =>
      emptySessionRecord(
        (t) => filteredStudents.length > 0 && filteredStudents.every((s) => s.sessions[t].isParticipating)
      ),
    [filteredStudents]
  );
```

`handleUpdate`: 시그니처 `sessionType: "afternoon" | "night"` → `sessionType: SessionType`; `const current = sessionType === "afternoon" ? student.afternoon : student.night;` → `const current = student.sessions[sessionType];`; 낙관적 갱신 `{ ...s, [sessionType]: updated }` → `{ ...s, sessions: { ...s.sessions, [sessionType]: updated } }`.

`handleBulkToggle`: 시그니처 → `SessionType`; `const label = sessionType === "afternoon" ? "오후자습" : "야간자습";` → `const label = SESSION_META[sessionType].label;`; 낙관적 갱신 `{ ...s, [sessionType]: { ...s[sessionType], isParticipating: value } }` → `{ ...s, sessions: { ...s.sessions, [sessionType]: { ...s.sessions[sessionType], isParticipating: value } } }`.

`<colgroup>` 의 오후/야간 두 블록 →
```tsx
              {SESSION_TYPES.flatMap((t) =>
                [...Array(6)].map((_, i) => <col key={`${t}-${i}`} style={{ width: "36px" }} />)
              )}
```

헤더 1행의 두 `<th colSpan={6}>` →
```tsx
                {SESSION_TYPES.map((t) => (
                  <th key={t} colSpan={6} className="py-2 text-center font-medium text-gray-600 border-l border-gray-200 whitespace-nowrap">
                    {SESSION_META[t].label}
                  </th>
                ))}
```

헤더 2행·3행, 본문 행, tfoot 의 `(["afternoon", "night"] as const).map((session) => ...)` 4곳 → `SESSION_TYPES.map((session) => ...)`; 그 안의 `student[session]` → `student.sessions[session]`, `s[session]` → `s.sessions[session]`; 체크박스 title `${session === "afternoon" ? "오후" : "야간"} 전체 참가 토글` → `${SESSION_META[session].shortLabel} 전체 참가 토글`.

`colSpan={15}` 2곳 → `colSpan={21}`.

- [ ] **Step 5: `grade-admin/[grade]/participation/page.tsx`**

import: `import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";`

타입: `afternoon: DaySettings; night: DaySettings;` → `sessions: Record<SessionType, DaySettings>;`

`handleUpdate`: 시그니처 → `sessionType: SessionType`; `const current = sessionType === "afternoon" ? student.afternoon : student.night;` → `const current = student.sessions[sessionType];`; 낙관적 갱신 `{ ...s, [sessionType]: updated }` → `{ ...s, sessions: { ...s.sessions, [sessionType]: updated } }`.

헤더 1행의 `오후자습`/`야간자습` 두 `<th colSpan={6}>` →
```tsx
                {SESSION_TYPES.map((t) => (
                  <th key={t} colSpan={6} className="px-3 py-2 text-center font-medium text-gray-600 border-l border-gray-200 whitespace-nowrap">
                    {SESSION_META[t].label}
                  </th>
                ))}
```

헤더 2행 (`{/* 오후 */}` ~ 야간 요일 헤더까지) →
```tsx
                {SESSION_TYPES.map((t) => (
                  <React.Fragment key={t}>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200 whitespace-nowrap">참가</th>
                    {DAY_LABELS.map((label) => (
                      <th key={`${t}-${label}`} className="px-1 py-2 text-center text-xs font-medium text-gray-500">{label}</th>
                    ))}
                  </React.Fragment>
                ))}
```
(`import { useState, useCallback } from "react";` → `import React, { useState, useCallback } from "react";`)

본문의 `{/* 오후자습 */}` 부터 야간 요일 버튼 끝까지 →
```tsx
                    {SESSION_TYPES.map((t) => {
                      const settings = student.sessions[t];
                      return (
                        <React.Fragment key={t}>
                          <td className="px-2 py-2.5 text-center border-l border-gray-100">
                            <input
                              type="checkbox"
                              checked={settings.isParticipating}
                              onChange={(e) => handleUpdate(student.id, t, "isParticipating", e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          {DAY_KEYS.map((day) => (
                            <td key={`${student.id}-${t}-${day}`} className="px-1 py-2.5 text-center">
                              <button
                                onClick={() => handleUpdate(student.id, t, day, !settings[day])}
                                disabled={!settings.isParticipating}
                                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                                  !settings.isParticipating
                                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                    : settings[day]
                                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                }`}
                              >
                                {DAY_LABELS[DAY_KEYS.indexOf(day)]}
                              </button>
                            </td>
                          ))}
                        </React.Fragment>
                      );
                    })}
```
`colSpan={15}` 2곳 → `colSpan={21}`.

- [ ] **Step 6: `homeroom/participation/page.tsx`**

import: `import React, { useState, useCallback } from "react";` + `import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";`

타입: `afternoon: DaySettings; night: DaySettings;` → `sessions: Record<SessionType, DaySettings>;`

`handleUpdate`: 시그니처 `sessionType: "afternoon" | "night"` → `sessionType: SessionType`; `const current = sessionType === "afternoon" ? student.afternoon : student.night;` → `const current = student.sessions[sessionType];`; 낙관적 갱신 `s.id === studentId ? { ...s, [sessionType]: updated } : s` → `s.id === studentId ? { ...s, sessions: { ...s.sessions, [sessionType]: updated } } : s`.

헤더 1행의 `오후자습`/`야간자습` 두 `<th colSpan={6}>` →
```tsx
                {SESSION_TYPES.map((t) => (
                  <th key={t} colSpan={6} className="px-3 py-2 text-center font-medium text-gray-600 border-l border-gray-200 whitespace-nowrap">
                    {SESSION_META[t].label}
                  </th>
                ))}
```

헤더 2행(참가 + 요일 헤더 ×2) →
```tsx
                {SESSION_TYPES.map((t) => (
                  <React.Fragment key={t}>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200 whitespace-nowrap">참가</th>
                    {DAY_LABELS.map((label) => (
                      <th key={`${t}-${label}`} className="px-1 py-2 text-center text-xs font-medium text-gray-500 whitespace-nowrap">{label}</th>
                    ))}
                  </React.Fragment>
                ))}
```

헤더 3행(방과후)의 `(["afternoon", "night"] as const).map((session) => [...])` → `SESSION_TYPES.map((session) => [...])`. 본문 `{/* 오후자습 */}` ~ 야간 끝까지 →

```tsx
                    {SESSION_TYPES.map((t) => {
                      const settings = student.sessions[t];
                      return (
                        <React.Fragment key={t}>
                          <td className="px-2 py-2.5 text-center border-l border-gray-100">
                            <input
                              type="checkbox"
                              checked={settings.isParticipating}
                              onChange={(e) => handleUpdate(student.id, t, "isParticipating", e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          {DAY_KEYS.map((day, dayIdx) => (
                            <td key={`${student.id}-${t}-${day}`} className="px-1 py-2.5 text-center">
                              <button
                                onClick={() => handleUpdate(student.id, t, day, !settings[day])}
                                disabled={!settings.isParticipating}
                                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                                  !settings.isParticipating
                                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                    : settings[day]
                                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                }`}
                              >
                                {DAY_LABELS[dayIdx]}
                              </button>
                              <div className="mt-1">
                                <input
                                  type="checkbox"
                                  checked={settings[AFTER_SCHOOL_KEYS[dayIdx]]}
                                  onChange={(e) => handleUpdate(student.id, t, AFTER_SCHOOL_KEYS[dayIdx], e.target.checked)}
                                  disabled={!settings.isParticipating || !settings[day]}
                                  className="w-3.5 h-3.5 rounded border-gray-300 disabled:opacity-30"
                                  style={{ accentColor: '#ea580c' }}
                                />
                              </div>
                            </td>
                          ))}
                        </React.Fragment>
                      );
                    })}
```
tfoot 의 `(["afternoon", "night"] as const).map((session) => {...})` → `SESSION_TYPES.map((session) => {...})`, `s[session]` → `s.sessions[session]`. `colSpan={15}` 2곳 → `colSpan={21}`.

- [ ] **Step 7: `student/page.tsx`**

import `import { SESSION_TYPES, SESSION_META } from "@/lib/sessions";`. 삭제:
```ts
  const afternoon = data?.participationDays?.afternoon;
  const night = data?.participationDays?.night;
```
렌더:
```tsx
        {renderSession("오후자습", afternoon)}
        {renderSession("야간자습", night)}
```
→
```tsx
        {SESSION_TYPES.map((t) => renderSession(SESSION_META[t].label, data?.participationDays?.[t]))}
```
`renderSession` 의 바깥 `<div className="bg-white ...">` 2곳에 `key={label}` 추가. 빈 상태:
```tsx
      {!afternoon && !night && (
```
→
```tsx
      {SESSION_TYPES.every((t) => !data?.participationDays?.[t]) && (
```

- [ ] **Step 8: 통과 확인 + 커밋**

Run: `npx tsx tests/participation-wiring.test.ts`
Expected: `participation-wiring checks passed`

```bash
git add 'src/app/api/grade-admin/[grade]/participation-days/route.ts' src/app/api/homeroom/participation-days/route.ts src/components/admin-shared/ParticipationManagement.tsx 'src/app/grade-admin/[grade]/participation/page.tsx' src/app/homeroom/participation/page.tsx src/app/student/page.tsx tests/participation-wiring.test.ts
git commit -m "Render participation settings per study block"
```

---

### Task 11: 월간출결·통계 API 3개 + 표 3개 + Excel 3개

**Files:**
- Modify: `src/app/api/grade-admin/[grade]/monthly-attendance/route.ts:58-77`
- Modify: `src/app/api/homeroom/monthly-attendance/route.ts:66-85`
- Modify: `src/app/api/admin/statistics/route.ts:58-74`
- Modify: `src/components/grade-admin/GradeMonthlyAttendance.tsx`
- Modify: `src/app/homeroom/attendance/page.tsx`
- Modify: `src/app/admin/statistics/page.tsx`
- Modify: `src/app/api/grade-admin/[grade]/export-attendance/route.ts`
- Modify: `src/app/api/homeroom/export-attendance/route.ts`
- Modify: `src/app/api/admin/export-excel/route.ts`
- Test: `tests/monthly-attendance-wiring.test.ts`

**Interfaces:**
- Consumes: `SESSION_TYPES`, `SESSION_META`, `type SessionType` (Task 1)
- Produces: 3개 API 의 `dates[date]: Partial<Record<SessionType, { status: string; reason?: string }>>`

- [ ] **Step 1: 실패하는 wiring 테스트 작성**

`tests/monthly-attendance-wiring.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

for (const rel of [
  "../src/app/api/grade-admin/[grade]/monthly-attendance/route.ts",
  "../src/app/api/homeroom/monthly-attendance/route.ts",
  "../src/app/api/admin/statistics/route.ts",
]) {
  const src = read(rel);
  assert.match(src, /Partial<Record<SessionType, \{ status: string; reason\?: string \}>>/, `${rel}: 셀 타입이 일반화되지 않음`);
  assert.match(src, /for \(const t of SESSION_TYPES\)/, `${rel}: 세션 루프가 없음`);
  assert.doesNotMatch(src, /afternoonReason|nightReason/, `${rel}: 옛 사유 키가 남아 있음`);
}

for (const rel of [
  "../src/components/grade-admin/GradeMonthlyAttendance.tsx",
  "../src/app/homeroom/attendance/page.tsx",
]) {
  const src = read(rel);
  assert.match(src, /colSpan=\{3\}/, `${rel}: 날짜 헤더 colSpan 이 3 이 아님`);
  assert.match(src, /SESSION_META\[t\]\.shortLabel/, `${rel}: 서브 헤더 라벨이 SESSION_META 가 아님`);
  assert.match(src, /SESSION_TYPES\.map\(\(t/, `${rel}: 셀을 SESSION_TYPES 로 그리지 않음`);
  assert.doesNotMatch(src, /afternoonPart|nightPart|att\.afternoon|att\.night/, `${rel}: 옛 세션 변수가 남아 있음`);
}

const stats = read("../src/app/admin/statistics/page.tsx");
assert.match(stats, /colSpan=\{3\}/);
assert.match(stats, /SESSION_TYPES\.map/);
assert.doesNotMatch(stats, /data\.afternoon|data\.night/);

for (const rel of [
  "../src/app/api/grade-admin/[grade]/export-attendance/route.ts",
  "../src/app/api/homeroom/export-attendance/route.ts",
  "../src/app/api/admin/export-excel/route.ts",
]) {
  const src = read(rel);
  assert.match(src, /headerRow2\.push\(\.\.\.SESSION_TYPES\.map\(\(t\) => SESSION_META\[t\]\.shortLabel\)\)/, `${rel}: 2행 헤더가 3블록이 아님`);
  assert.match(src, /i \* SESSION_TYPES\.length/, `${rel}: 날짜당 열 수가 SESSION_TYPES.length 가 아님`);
  assert.match(src, /mergeCells\(1, col, 1, col \+ SESSION_TYPES\.length - 1\)/, `${rel}: 병합 폭이 3칸이 아님`);
  assert.doesNotMatch(src, /headerRow2\.push\("오후", "야간"\)/, `${rel}: 옛 2칸 헤더가 남아 있음`);
  assert.doesNotMatch(src, /statusSymbol\(afternoon\), statusSymbol\(night\)/, `${rel}: 옛 2칸 값 push 가 남아 있음`);
}

console.log("monthly-attendance-wiring checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/monthly-attendance-wiring.test.ts`
Expected: FAIL — `셀 타입이 일반화되지 않음`

- [ ] **Step 3: API 3개의 날짜 맵 조립**

세 파일 공통 import: `import { SESSION_TYPES, type SessionType } from "@/lib/sessions";`

`grade-admin/[grade]/monthly-attendance/route.ts` 와 `homeroom/monthly-attendance/route.ts` 의 `const dateMap ... for (const date of dates) {...}` 블록 →

```ts
      const dateMap: Record<string, Partial<Record<SessionType, { status: string; reason?: string }>>> = {};

      for (const date of dates) {
        const cells: Partial<Record<SessionType, { status: string; reason?: string }>> = {};
        for (const t of SESSION_TYPES) {
          const a = attMap.get(`${date}-${t}`);
          if (a) cells[t] = { status: a.status, reason: a.absenceReason?.reasonType };
        }
        dateMap[date] = cells;
      }
```

`admin/statistics/route.ts` 의 `const byDate ... for (const date of dates) {...}` 블록 →

```ts
    const byDate: Record<string, Partial<Record<SessionType, { status: string; reason?: string }>>> = {};

    for (const date of dates) {
      const cells: Partial<Record<SessionType, { status: string; reason?: string }>> = {};
      for (const t of SESSION_TYPES) {
        const r = recordMap.get(`${date}-${t}`);
        cells[t] = { status: r?.status ?? "unchecked", reason: r?.absenceReason?.reasonType };
      }
      byDate[date] = cells;
    }
```

- [ ] **Step 4: `GradeMonthlyAttendance.tsx`**

import: `import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";`

타입:
- `ParticipationData.sessionType: "afternoon" | "night";` → `sessionType: SessionType;`
- `dates: Record<string, { afternoon?: string; night?: string; afternoonReason?: string; nightReason?: string; }>;` → `dates: Record<string, Partial<Record<SessionType, { status: string; reason?: string }>>>;`

헤더 1행 `<th key={date} colSpan={2} ...>` → `colSpan={3}`. 헤더 2행:
```tsx
                  {dates.map((date) => (
                    <React.Fragment key={date}>
                      <th className="px-1 py-1 text-center text-gray-400 border-l border-gray-300">오</th>
                      <th className="px-1 py-1 text-center text-gray-400">야</th>
                    </React.Fragment>
                  ))}
```
→
```tsx
                  {dates.map((date) => (
                    <React.Fragment key={date}>
                      {SESSION_TYPES.map((t, i) => (
                        <th key={t} className={`px-1 py-1 text-center text-gray-400 whitespace-nowrap ${i === 0 ? "border-l border-gray-300" : ""}`}>
                          {SESSION_META[t].shortLabel}
                        </th>
                      ))}
                    </React.Fragment>
                  ))}
```

본문: `const afternoonPart = ...; const nightPart = ...;` →
```tsx
                    const partByType = new Map(student.participationDays.map((p) => [p.sessionType, p]));
```
날짜 셀 `{dates.map((date) => { const att = ...; ... return (<React.Fragment key={date}> <td ...오후> <td ...야간> </React.Fragment>); })}` 전체 →
```tsx
                        {dates.map((date) => {
                          const att = student.dates[date] || {};
                          const dayKey = getDayKey(date);
                          const dayIdx = DAY_KEYS.indexOf(dayKey);
                          return (
                            <React.Fragment key={date}>
                              {SESSION_TYPES.map((t, i) => {
                                const part = partByType.get(t);
                                const cell = att[t];
                                const status = cell?.status;
                                const isParticipating = part ? part.isParticipating && part[dayKey] : true;
                                const isAfterSchool = part
                                  ? part.isParticipating && part[dayKey] && part[AFTER_SCHOOL_KEYS[dayIdx]]
                                  : false;
                                const gray = !isParticipating;
                                const hasData = !!status && status !== "unchecked";
                                const isAfterSchoolIdle = isAfterSchool && (!status || status === "unchecked");
                                const colorClass = gray && !hasData ? "text-gray-300"
                                  : isAfterSchoolIdle ? "text-yellow-600 bg-yellow-50"
                                  : status === "present" ? "text-green-700"
                                  : status === "absent" && cell?.reason ? "text-orange-500"
                                  : status === "absent" ? "text-red-700"
                                  : "text-gray-400";
                                const symbol = gray && !hasData ? "-"
                                  : isAfterSchoolIdle ? "방"
                                  : status === "present" ? "O"
                                  : status === "absent" ? (cell?.reason ? "△" : "X")
                                  : "-";
                                return (
                                  <td
                                    key={t}
                                    className={`px-1 py-1.5 text-center text-sm font-extrabold ${i === 0 ? "border-l border-gray-300" : ""} ${gray ? "bg-gray-100" : ""} ${colorClass}`}
                                  >
                                    {symbol}
                                  </td>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
```

- [ ] **Step 5: `homeroom/attendance/page.tsx`**

import: `import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";`. 타입: `ParticipationData.sessionType: "afternoon" | "night";` → `sessionType: SessionType;`, `dates: Record<string, { afternoon?: string; night?: string; afternoonReason?: string; nightReason?: string; }>;` → `dates: Record<string, Partial<Record<SessionType, { status: string; reason?: string }>>>;`.

헤더 1행 `<th key={date} colSpan={2} ...>` → `colSpan={3}`. 헤더 2행:
```tsx
                        {dates.map((date) => (
                          <React.Fragment key={date}>
                            <th className="px-1 py-1 text-center text-gray-400 border-l border-gray-300">오</th>
                            <th className="px-1 py-1 text-center text-gray-400">야</th>
                          </React.Fragment>
                        ))}
```
→
```tsx
                        {dates.map((date) => (
                          <React.Fragment key={date}>
                            {SESSION_TYPES.map((t, i) => (
                              <th key={t} className={`px-1 py-1 text-center text-gray-400 whitespace-nowrap ${i === 0 ? "border-l border-gray-300" : ""}`}>
                                {SESSION_META[t].shortLabel}
                              </th>
                            ))}
                          </React.Fragment>
                        ))}
```

본문:

```tsx
                        const afternoonPart = student.participationDays.find(
                          (p) => p.sessionType === "afternoon"
                        );
                        const nightPart = student.participationDays.find(
                          (p) => p.sessionType === "night"
                        );

                        const isAfternoonAllOff = afternoonPart ? !afternoonPart.isParticipating : false;
                        const isNightAllOff = nightPart ? !nightPart.isParticipating : false;
                        const isEntireRowGray = isAfternoonAllOff && isNightAllOff;
```
→
```tsx
                        const partByType = new Map(student.participationDays.map((p) => [p.sessionType, p]));
                        const isEntireRowGray = SESSION_TYPES.every((t) => {
                          const part = partByType.get(t);
                          return part ? !part.isParticipating : false;
                        });
```
날짜 셀 블록(`{dates.map((date) => { const att = student.dates[date] || {}; ... })}` 전체)은 Step 4 에 적은 `{dates.map((date) => { ... SESSION_TYPES.map((t, i) => { ... }) ... })}` 코드를 그대로 복사한다 (변수명·클래스가 동일하므로 문자 그대로 재사용 가능).

tfoot:
```tsx
                        {dates.map((date) => {
                          const dayKey = getDayKey(date);
                          const aPresent = ...
                          ...
                          return (
                            <React.Fragment key={`total-${date}`}>
                              <td ...>{aPresent}/{aAbsent}/{aParticipating}</td>
                              <td ...>{nPresent}/{nAbsent}/{nParticipating}</td>
                            </React.Fragment>
                          );
                        })}
```
→
```tsx
                        {dates.map((date) => {
                          const dayKey = getDayKey(date);
                          return (
                            <React.Fragment key={`total-${date}`}>
                              {SESSION_TYPES.map((t, i) => {
                                const present = classStudents.filter((s) => s.dates[date]?.[t]?.status === "present").length;
                                const absent = classStudents.filter((s) => s.dates[date]?.[t]?.status === "absent").length;
                                const participating = classStudents.filter((s) => {
                                  const p = s.participationDays.find((pd) => pd.sessionType === t);
                                  return p ? p.isParticipating && p[dayKey] : true;
                                }).length;
                                return (
                                  <td key={t} className={`px-0.5 py-2 text-center text-[9px] whitespace-nowrap ${i === 0 ? "border-l border-gray-300" : ""}`}>
                                    <span className="text-green-700 font-bold">{present}</span>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-red-700 font-bold">{absent}</span>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-gray-500">{participating}</span>
                                  </td>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
```

- [ ] **Step 6: `admin/statistics/page.tsx`**

import: `import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";`. `StudentStat.dates` → `Record<string, Partial<Record<SessionType, { status: string; reason?: string }>>>`. 헤더 1행 `colSpan={2}` → `colSpan={3}`. 헤더 2행의 `<th>오후</th><th>야간</th>` →
```tsx
                  <React.Fragment key={date}>
                    {SESSION_TYPES.map((t, i) => (
                      <th key={t} className={`px-1 py-1 text-center text-gray-400 whitespace-nowrap ${i === 0 ? "border-l border-gray-200" : ""}`}>
                        {SESSION_META[t].shortLabel}
                      </th>
                    ))}
                  </React.Fragment>
```
본문 셀 두 개 →
```tsx
                      <React.Fragment key={date}>
                        {SESSION_TYPES.map((t, i) => {
                          const status = data[t]?.status || "unchecked";
                          return (
                            <td key={t} className={`px-1 py-2 text-center font-bold ${i === 0 ? "border-l border-gray-200" : ""} ${STATUS_COLOR[status]}`}>
                              {STATUS_SYMBOL[status]}
                            </td>
                          );
                        })}
                      </React.Fragment>
```

- [ ] **Step 7: Excel 3개**

세 파일 공통 import: `import { SESSION_TYPES, SESSION_META } from "@/lib/sessions";`

`grade-admin/[grade]/export-attendance/route.ts`:
```ts
        headerRow1.push(`${date.slice(5)} (${dayName})`, "");
        headerRow2.push("오후", "야간");
```
→
```ts
        headerRow1.push(`${date.slice(5)} (${dayName})`, ...SESSION_TYPES.slice(1).map(() => ""));
        headerRow2.push(...SESSION_TYPES.map((t) => SESSION_META[t].shortLabel));
```
```ts
      for (let i = 0; i < dates.length; i++) {
        const col = 4 + i * 2;
        sheet.mergeCells(1, col, 1, col + 1);
```
→
```ts
      for (let i = 0; i < dates.length; i++) {
        const col = 4 + i * SESSION_TYPES.length;
        sheet.mergeCells(1, col, 1, col + SESSION_TYPES.length - 1);
```
행 값:
```ts
        for (const date of dates) {
          const afternoon = attMap.get(`${date}-afternoon`);
          const night = attMap.get(`${date}-night`);

          const statusSymbol = (a: typeof afternoon) => {
```
→
```ts
        for (const date of dates) {
          const statusSymbol = (a: (typeof student.attendances)[number] | undefined) => {
```
그리고 `row.push(statusSymbol(afternoon), statusSymbol(night));` → `row.push(...SESSION_TYPES.map((t) => statusSymbol(attMap.get(`${date}-${t}`))));`
열 너비:
```ts
      for (let i = 0; i < dates.length; i++) {
        sheet.getColumn(4 + i * 2).width = 14;
        sheet.getColumn(5 + i * 2).width = 14;
      }
```
→
```ts
      for (let i = 0; i < dates.length; i++) {
        for (let k = 0; k < SESSION_TYPES.length; k++) sheet.getColumn(4 + i * SESSION_TYPES.length + k).width = 14;
      }
```

`homeroom/export-attendance/route.ts` (학급 시트 루프 안, 기준 열 3):
```ts
        headerRow1.push(`${date.slice(5)} (${dayName})`, "");
        headerRow2.push("오후", "야간");
```
→
```ts
        headerRow1.push(`${date.slice(5)} (${dayName})`, ...SESSION_TYPES.slice(1).map(() => ""));
        headerRow2.push(...SESSION_TYPES.map((t) => SESSION_META[t].shortLabel));
```
```ts
      for (let i = 0; i < dates.length; i++) {
        const col = 3 + i * 2; // 1-based, 이름/번호 다음
        sheet.mergeCells(1, col, 1, col + 1);
```
→
```ts
      for (let i = 0; i < dates.length; i++) {
        const col = 3 + i * SESSION_TYPES.length; // 1-based, 이름/번호 다음
        sheet.mergeCells(1, col, 1, col + SESSION_TYPES.length - 1);
```
```ts
        for (const date of dates) {
          const afternoon = attMap.get(`${date}-afternoon`);
          const night = attMap.get(`${date}-night`);

          const statusSymbol = (a: typeof afternoon) => {
```
→
```ts
        for (const date of dates) {
          const statusSymbol = (a: (typeof student.attendances)[number] | undefined) => {
```
`row.push(statusSymbol(afternoon), statusSymbol(night));` → `row.push(...SESSION_TYPES.map((t) => statusSymbol(attMap.get(`${date}-${t}`))));`
```ts
      for (let i = 0; i < dates.length; i++) {
        sheet.getColumn(3 + i * 2).width = 14;
        sheet.getColumn(4 + i * 2).width = 14;
      }
```
→
```ts
      for (let i = 0; i < dates.length; i++) {
        for (let k = 0; k < SESSION_TYPES.length; k++) sheet.getColumn(3 + i * SESSION_TYPES.length + k).width = 14;
      }
```
주석 `// 헤더 행 1: 이름, 번호, 날짜별(2칸씩)` → `// 헤더 행 1: 이름, 번호, 날짜별(블록 수만큼)`.

`admin/export-excel/route.ts` (기준 열 4, 너비 8):
```ts
    // 헤더: 이름, 반, 번호, 날짜별(오후/야간)
    const headerRow1 = ["이름", "반", "번호"];
    const headerRow2 = ["", "", ""];
    for (const date of dates) {
      const dayName = ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()];
      headerRow1.push(`${date.slice(5)} (${dayName})`, "");
      headerRow2.push("오후", "야간");
    }
```
→
```ts
    // 헤더: 이름, 반, 번호, 날짜별(블록 수만큼)
    const headerRow1 = ["이름", "반", "번호"];
    const headerRow2 = ["", "", ""];
    for (const date of dates) {
      const dayName = ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()];
      headerRow1.push(`${date.slice(5)} (${dayName})`, ...SESSION_TYPES.slice(1).map(() => ""));
      headerRow2.push(...SESSION_TYPES.map((t) => SESSION_META[t].shortLabel));
    }
```
```ts
    // 날짜 헤더 셀 병합 (각 날짜가 오후/야간 2칸을 차지)
    for (let i = 0; i < dates.length; i++) {
      const col = 4 + i * 2; // 1-based, 이름/반/번호 다음부터
      sheet.mergeCells(1, col, 1, col + 1);
```
→
```ts
    // 날짜 헤더 셀 병합 (각 날짜가 블록 수만큼 칸을 차지)
    for (let i = 0; i < dates.length; i++) {
      const col = 4 + i * SESSION_TYPES.length; // 1-based, 이름/반/번호 다음부터
      sheet.mergeCells(1, col, 1, col + SESSION_TYPES.length - 1);
```
```ts
      for (const date of dates) {
        const afternoon = attendanceMap.get(`${student.id}-${date}-afternoon`);
        const night = attendanceMap.get(`${student.id}-${date}-night`);

        const statusSymbol = (a: typeof afternoon) => {
```
→
```ts
      for (const date of dates) {
        const statusSymbol = (a: (typeof attendances)[number] | undefined) => {
```
`row.push(statusSymbol(afternoon), statusSymbol(night));` → `row.push(...SESSION_TYPES.map((t) => statusSymbol(attendanceMap.get(`${student.id}-${date}-${t}`))));`
```ts
    for (let i = 0; i < dates.length; i++) {
      sheet.getColumn(4 + i * 2).width = 8;
      sheet.getColumn(5 + i * 2).width = 8;
    }
```
→
```ts
    for (let i = 0; i < dates.length; i++) {
      for (let k = 0; k < SESSION_TYPES.length; k++) sheet.getColumn(4 + i * SESSION_TYPES.length + k).width = 8;
    }
```

- [ ] **Step 8: 통과 확인 + 커밋**

Run: `npx tsx tests/monthly-attendance-wiring.test.ts`
Expected: `monthly-attendance-wiring checks passed`

```bash
git add 'src/app/api/grade-admin/[grade]/monthly-attendance/route.ts' src/app/api/homeroom/monthly-attendance/route.ts src/app/api/admin/statistics/route.ts src/components/grade-admin/GradeMonthlyAttendance.tsx src/app/homeroom/attendance/page.tsx src/app/admin/statistics/page.tsx 'src/app/api/grade-admin/[grade]/export-attendance/route.ts' src/app/api/homeroom/export-attendance/route.ts src/app/api/admin/export-excel/route.ts tests/monthly-attendance-wiring.test.ts
git commit -m "Show three study blocks per date in monthly tables and Excel exports"
```

---

### Task 12: 오늘출결 대시보드 2개 + 담임 주간표 + 학생 출결

**Files:**
- Modify: `src/app/api/grade-admin/[grade]/today-attendance/route.ts`
- Modify: `src/app/api/admin/today-attendance/route.ts`
- Modify: `src/components/grade-admin/TodayAttendanceDashboard.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/homeroom/page.tsx`
- Modify: `src/app/student/attendance/page.tsx`
- Test: `tests/today-dashboard-wiring.test.ts`

**Interfaces:**
- Consumes: `SESSION_TYPES`, `SESSION_META`(`.icon` 포함), `emptySessionRecord`, `type SessionType` (Task 1)
- Produces: today-attendance ×2 → `sessions: Record<SessionType, SessionStats>` (admin 은 `grades[].sessions`)

- [ ] **Step 1: 실패하는 wiring 테스트 작성**

`tests/today-dashboard-wiring.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

for (const rel of [
  "../src/app/api/grade-admin/[grade]/today-attendance/route.ts",
  "../src/app/api/admin/today-attendance/route.ts",
]) {
  const src = read(rel);
  assert.match(src, /sessions: emptySessionRecord/, `${rel}: sessions Record 를 만들지 않음`);
  assert.match(src, /sessionType: SessionType\)/, `${rel}: calcStats 가 SessionType 을 받지 않음`);
  assert.doesNotMatch(src, /afternoon: (emptyStats|calcStats)/, `${rel}: 옛 afternoon 키가 남아 있음`);
}

const dashboard = read("../src/components/grade-admin/TodayAttendanceDashboard.tsx");
assert.match(dashboard, /sessions: Record<SessionType, SessionStats>/);
assert.match(dashboard, /SESSION_TYPES\.map\(\(t\) => \(/);
assert.match(dashboard, /SESSION_META\[t\]\.icon/);

const adminPage = read("../src/app/admin/page.tsx");
assert.match(adminPage, /sessions: Record<SessionType, SessionStats>/);
assert.match(adminPage, /SESSION_TYPES\.map\(\(t\) => \(/);

const homeroom = read("../src/app/homeroom/page.tsx");
assert.match(homeroom, /colSpan=\{3\}/, "담임 주간표 날짜 헤더가 3칸이 아님");
assert.match(homeroom, /SESSION_TYPES\.map\(\(t/, "담임 주간표 셀을 SESSION_TYPES 로 그리지 않음");
assert.doesNotMatch(homeroom, /afternoonAtt|nightAtt|afternoonPart|nightPart/, "옛 세션 변수가 남아 있음");
assert.match(homeroom, /colSpan=\{18\}/, "로딩/빈 행 colSpan 이 18(3+15) 이 아님");

const student = read("../src/app/student/attendance/page.tsx");
assert.match(student, /SESSION_TYPES\.map\(\(sessionType\) => \(/, "학생 주간표 행이 3세션이 아님");
assert.match(student, /SESSION_META\[a\.sessionType\]\.shortLabel/, "결석 사유 라벨이 SESSION_META 가 아님");
assert.doesNotMatch(student, /getDayStatus\(day, "afternoon"\)/, "옛 월간 점 조회가 남아 있음");

console.log("today-dashboard-wiring checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/today-dashboard-wiring.test.ts`
Expected: FAIL — `sessions Record 를 만들지 않음`

- [ ] **Step 3: today-attendance API 2개**

공통 import: `import { emptySessionRecord, type SessionType } from "@/lib/sessions";`

`grade-admin/[grade]/today-attendance/route.ts`:
- 주말 응답 `afternoon: emptyStats(), night: emptyStats(),` → `sessions: emptySessionRecord(() => emptyStats()),`
- `function calcStats(sessionType: "afternoon" | "night"): SessionStats {` → `function calcStats(sessionType: SessionType): SessionStats {`
- 최종 응답 `afternoon: calcStats("afternoon"), night: calcStats("night"),` → `sessions: emptySessionRecord((t) => calcStats(t)),`

`admin/today-attendance/route.ts`:
- 주말 `grades` 매핑 안 `afternoon: emptyStats(), night: emptyStats(),` → `sessions: emptySessionRecord(() => emptyStats()),`
- `function calcStats(gradeStudents: typeof students, gradeNum: number, sessionType: "afternoon" | "night"): SessionStats {` → `..., sessionType: SessionType): SessionStats {`
- `const grades = [1, 2, 3].map((g) => ({ grade: g, afternoon: calcStats(...,"afternoon"), night: calcStats(..., "night") }));` →
```ts
  const grades = [1, 2, 3].map((g) => ({
    grade: g,
    sessions: emptySessionRecord((t) => calcStats(studentsByGrade.get(g) || [], g, t)),
  }));
```

- [ ] **Step 4: 대시보드 2개**

`TodayAttendanceDashboard.tsx` — import `import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";`; `TodayData` 의 `afternoon: SessionStats; night: SessionStats;` → `sessions: Record<SessionType, SessionStats>;`; 렌더:
```tsx
        <SessionCard title="오후자습" icon="☀️" stats={data.afternoon} />
        <SessionCard title="야간자습" icon="🌙" stats={data.night} />
```
→
```tsx
        {SESSION_TYPES.map((t) => (
          <SessionCard key={t} title={SESSION_META[t].label} icon={SESSION_META[t].icon} stats={data.sessions[t]} />
        ))}
```

`admin/page.tsx` — 같은 import; `GradeData` 의 `afternoon: SessionStats; night: SessionStats;` → `sessions: Record<SessionType, SessionStats>;`; 렌더:
```tsx
            <SessionRow label="오후" icon="☀️" stats={g.afternoon} />
            <SessionRow label="야간" icon="🌙" stats={g.night} />
```
→
```tsx
            {SESSION_TYPES.map((t) => (
              <SessionRow key={t} label={SESSION_META[t].shortLabel} icon={SESSION_META[t].icon} stats={g.sessions[t]} />
            ))}
```
`SessionRow` 의 라벨 span `w-14` → `w-16 whitespace-nowrap`.

- [ ] **Step 5: `homeroom/page.tsx`**

import `import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";`. 세 타입의 `sessionType: "afternoon" | "night";` → `sessionType: SessionType;`.

헤더 1행 `colSpan={2}` → `colSpan={3}`. 헤더 2행:
```tsx
                {DAY_LABELS.map((label) => (
                  <Fragment key={label}>
                    <th className="px-1 py-1 text-center text-xs font-medium text-gray-400 border-l border-gray-300">오후</th>
                    <th className="px-1 py-1 text-center text-xs font-medium text-gray-400">야간</th>
                  </Fragment>
                ))}
```
→
```tsx
                {DAY_LABELS.map((label) => (
                  <Fragment key={label}>
                    {SESSION_TYPES.map((t, i) => (
                      <th key={t} className={`px-1 py-1 text-center text-xs font-medium text-gray-400 whitespace-nowrap ${i === 0 ? "border-l border-gray-300" : ""}`}>
                        {SESSION_META[t].shortLabel}
                      </th>
                    ))}
                  </Fragment>
                ))}
```
`colSpan={13}` 3곳 → `colSpan={18}`.

본문 학생 행 시작부:
```tsx
                  const afternoonPart = student.participationDays.find(
                    (p) => p.sessionType === "afternoon"
                  );
                  const nightPart = student.participationDays.find(
                    (p) => p.sessionType === "night"
                  );

                  const dayKeys = ["mon", "tue", "wed", "thu", "fri"] as const;
                  const afterSchoolKeys = ["afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri"] as const;

                  const isAfternoonAllOff = afternoonPart ? !afternoonPart.isParticipating : false;
                  const isNightAllOff = nightPart ? !nightPart.isParticipating : false;
                  const isEntireRowGray = isAfternoonAllOff && isNightAllOff;
```
→
```tsx
                  const partByType = new Map(student.participationDays.map((p) => [p.sessionType, p]));

                  const dayKeys = ["mon", "tue", "wed", "thu", "fri"] as const;
                  const afterSchoolKeys = ["afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri"] as const;

                  const isEntireRowGray = SESSION_TYPES.every((t) => {
                    const part = partByType.get(t);
                    return part ? !part.isParticipating : false;
                  });
```
날짜 셀 `{weekDates.map((date, idx) => { ... <Fragment key=...> <td 오후> <td 야간> </Fragment> })}` 전체 →
```tsx
                        {weekDates.map((date, idx) => {
                          const dayKey = dayKeys[idx];
                          return (
                            <Fragment key={`${student.id}-${date}`}>
                              {SESSION_TYPES.map((t, i) => {
                                const part = partByType.get(t);
                                const att = student.attendances.find((a) => a.date === date && a.sessionType === t);
                                const isParticipating = part ? part.isParticipating && part[dayKey] : true;
                                const isAfterSchool = part
                                  ? part.isParticipating && part[dayKey] && part[afterSchoolKeys[idx]]
                                  : false;
                                const gray = !isParticipating;
                                const hasData = att?.status && att.status !== "unchecked";
                                const note = weekNotes.find((n) => n.date === date && n.sessionType === t);
                                return (
                                  <td key={t} className={`px-1 py-2 text-center ${i === 0 ? "border-l border-gray-300" : ""} ${gray && !hasData ? "bg-gray-100" : ""}`}>
                                    {gray && !hasData
                                      ? <span className="text-xs text-gray-300">-</span>
                                      : <StatusCell status={att?.status} isAfterSchool={isAfterSchool} reasonType={att?.reasonType} reasonDetail={att?.reasonDetail} />}
                                    {note && <NoteIndicator note={note.note} />}
                                  </td>
                                );
                              })}
                            </Fragment>
                          );
                        })}
```
tfoot 의 `{weekDates.map((date, idx) => { ... afternoonPresent ... nightParticipating ... })}` 전체 →
```tsx
                  {weekDates.map((date, idx) => {
                    const dayKeys = ["mon", "tue", "wed", "thu", "fri"] as const;
                    const dayKey = dayKeys[idx];
                    return (
                      <Fragment key={`total-${date}`}>
                        {SESSION_TYPES.map((t, i) => {
                          const present = students.filter((s) => s.attendances.find((a) => a.date === date && a.sessionType === t)?.status === "present").length;
                          const absent = students.filter((s) => s.attendances.find((a) => a.date === date && a.sessionType === t)?.status === "absent").length;
                          const participating = students.filter((s) => {
                            const part = s.participationDays.find((p) => p.sessionType === t);
                            return part ? part.isParticipating && part[dayKey] : true;
                          }).length;
                          return (
                            <td key={t} className={`px-1 py-2.5 text-center text-[10px] whitespace-nowrap ${i === 0 ? "border-l border-gray-300" : ""}`}>
                              <span className="text-green-700 font-bold">{present}</span>
                              <span className="text-gray-400">/</span>
                              <span className="text-red-700 font-bold">{absent}</span>
                              <span className="text-gray-400">/</span>
                              <span className="text-gray-500">{participating}</span>
                            </td>
                          );
                        })}
                      </Fragment>
                    );
                  })}
```

- [ ] **Step 6: `student/attendance/page.tsx`**

import `import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";`. `AttendanceRecord.sessionType: "afternoon" | "night";` → `sessionType: SessionType;`.

결석 사유 모음: `sessionType: a.sessionType === "afternoon" ? "오후" : "야간",` → `sessionType: SESSION_META[a.sessionType].shortLabel,`.

주간 행:
```tsx
            {(["afternoon", "night"] as const).map((sessionType) => (
              <tr key={sessionType} className="border-t border-gray-100">
                <td className="px-3 py-3 text-gray-600 font-medium">
                  {sessionType === "afternoon" ? "오후" : "야간"}
                </td>
```
→
```tsx
            {SESSION_TYPES.map((sessionType) => (
              <tr key={sessionType} className="border-t border-gray-100">
                <td className="px-3 py-3 text-gray-600 font-medium whitespace-nowrap">
                  {SESSION_META[sessionType].shortLabel}
                </td>
```

월간 달력 점:
```tsx
            const afternoonStatus = getDayStatus(day, "afternoon");
            const nightStatus = getDayStatus(day, "night");
            const hasData = afternoonStatus || nightStatus;
```
→
```tsx
            const statusByType = SESSION_TYPES.map((t) => ({ t, status: getDayStatus(day, t) }));
            const hasData = statusByType.some((s) => s.status);
```
```tsx
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400">오</span>
                      <StatusDot status={afternoonStatus} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400">야</span>
                      <StatusDot status={nightStatus} />
                    </div>
                  </div>
```
→
```tsx
                  <div className="space-y-0.5">
                    {statusByType.map(({ t, status }) => (
                      <div key={t} className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{SESSION_META[t].shortLabel}</span>
                        <StatusDot status={status} />
                      </div>
                    ))}
                  </div>
```
`min-h-[60px]` 2곳 → `min-h-[72px]` (행 3개가 들어가도록).

- [ ] **Step 7: 통과 확인 + 커밋**

Run: `npx tsx tests/today-dashboard-wiring.test.ts`
Expected: `today-dashboard-wiring checks passed`

```bash
git add 'src/app/api/grade-admin/[grade]/today-attendance/route.ts' src/app/api/admin/today-attendance/route.ts src/components/grade-admin/TodayAttendanceDashboard.tsx src/app/admin/page.tsx src/app/homeroom/page.tsx src/app/student/attendance/page.tsx tests/today-dashboard-wiring.test.ts
git commit -m "Render today dashboards, homeroom weekly table, and student attendance per study block"
```

---

### Task 13: 좌석·인쇄 — `SeatSessionType` 타입 교체

**Files:**
- Modify: `src/components/seats/SeatingEditor.tsx:54,78`
- Modify: `src/components/seats/SeatPrintGroup.tsx:18,21`
- Modify: `src/app/grade-admin/[grade]/seats/print/page.tsx:28,56-57,103`
- Modify: `src/lib/seats/print-groups.ts:37`
- Modify: `src/app/api/grade-admin/[grade]/seat-layouts/route.ts:21-26`
- Modify: `src/app/admin/seats/page.tsx:14`
- Modify: `src/app/grade-admin/[grade]/seats/page.tsx:15`
- Modify: `src/app/grade-admin/[grade]/page.tsx:48`
- Test: `tests/seat-print-groups.test.ts` (변경 없음 — 통과 확인만), `tests/seat-print-wiring.test.ts` (변경 없음)

**Interfaces:**
- Consumes: `SEAT_SESSION_META`, `isSeatSessionType`, `type SeatSessionType` (Task 1)
- Produces: `buildPrintGroups(rooms, sessionType: SeatSessionType, grade)`; `SeatingEditor` prop `sessionType: SeatSessionType`; `SeatPrintGroup` prop `sessionType: SeatSessionType`

이 파일들은 **좌석 컨텍스트**라 `"afternoon"`/`"night"` 리터럴이 허용된다(Task 15 허용 목록). 로직·라우트 파라미터는 바꾸지 않는다.

- [ ] **Step 1: 타입 교체**

각 파일에 `import { ..., type SeatSessionType } from "@/lib/sessions";` 를 추가하고:

- `SeatingEditor.tsx`: `type: "afternoon" | "night";` → `type: SeatSessionType;`, prop `sessionType: "afternoon" | "night";` → `sessionType: SeatSessionType;`
- `SeatPrintGroup.tsx`: prop 타입 교체 + `const sessionLabel = sessionType === "afternoon" ? "오후자습" : "야간자습";` → `const sessionLabel = SEAT_SESSION_META[sessionType].label;` (import 에 `SEAT_SESSION_META` 추가)
- `seats/print/page.tsx`: `type ApiSession = { id: number; type: "afternoon" | "night"; rooms: ApiRoom[] };` → `type: SeatSessionType`; `const sessionType: "afternoon" | "night" = searchParams.get("session") === "night" ? "night" : "afternoon";` → `const sessionType: SeatSessionType = searchParams.get("session") === "night" ? "night" : "afternoon";`; `const sessionLabel = sessionType === "afternoon" ? "오후자습" : "야간자습";` → `const sessionLabel = SEAT_SESSION_META[sessionType].label;`
- `print-groups.ts`: `sessionType: "afternoon" | "night",` → `sessionType: SeatSessionType,`
- `seat-layouts/route.ts`: 
  ```ts
      if (sessionType !== "afternoon" && sessionType !== "night") {
        return NextResponse.json(
          { error: "sessionType은 afternoon 또는 night이어야 합니다." },
          { status: 400 }
        );
      }
  ```
  → 
  ```ts
      if (!isSeatSessionType(sessionType)) {
        return NextResponse.json({ error: "sessionType은 afternoon 또는 night이어야 합니다." }, { status: 400 });
      }
  ```
- `admin/seats/page.tsx`: `sessionType: "afternoon" | "night";` → `sessionType: SeatSessionType;`
- `grade-admin/[grade]/seats/page.tsx`: `useState<"afternoon" | "night">("afternoon")` → `useState<SeatSessionType>("afternoon")`
- `grade-admin/[grade]/page.tsx`: 같은 교체

- [ ] **Step 2: 확인 + 커밋**

Run: `npx tsx tests/seat-print-groups.test.ts && npx tsx tests/seat-print-wiring.test.ts`
Expected: 두 줄 `... checks passed`

Run: `grep -rn '"afternoon" | "night"' src --include='*.ts' --include='*.tsx' | grep -v generated`
Expected: 출력 없음

```bash
git add src/components/seats/SeatingEditor.tsx src/components/seats/SeatPrintGroup.tsx 'src/app/grade-admin/[grade]/seats/print/page.tsx' src/lib/seats/print-groups.ts 'src/app/api/grade-admin/[grade]/seat-layouts/route.ts' src/app/admin/seats/page.tsx 'src/app/grade-admin/[grade]/seats/page.tsx' 'src/app/grade-admin/[grade]/page.tsx'
git commit -m "Type seat layout code with SeatSessionType"
```

---

### Task 14: 시드 · 스크립트 · 도움말

**Files:**
- Modify: `prisma/seed.ts:1,99-115,126-135,172-179,203,263`
- Modify: `prisma/scripts/add-afternoon-mirae-rooms.ts:1,12`
- Modify: `prisma/scripts/update-room-sizes.ts:1,15,86`
- Modify: `src/app/help/content.mdx:38,66`
- Modify: `src/components/help/HelpDemos.tsx:220-221`

**Interfaces:**
- Consumes: Prisma 생성 enum `SeatSessionType`, `SessionType` (Task 2)

- [ ] **Step 1: seed.ts**

```ts
import { PrismaClient, Role, SessionType } from "../src/generated/prisma/client.js";
```
→
```ts
import { PrismaClient, Role, SessionType, SeatSessionType } from "../src/generated/prisma/client.js";
```

참여설정 생성(학생 루프 안):
```ts
        // 참여 설정 (기본: 오후 전원 참여, 야간은 일부만)
        await prisma.participationDay.create({
          data: {
            studentId: student.id,
            sessionType: SessionType.afternoon,
            isParticipating: true,
            mon: true, tue: true, wed: true, thu: true, fri: true,
          },
        });
```
→
```ts
        // 참여 설정 (기본: 오후 두 블록 전원 참여, 야간은 일부만)
        for (const sessionType of [SessionType.afternoon1, SessionType.afternoon2]) {
          await prisma.participationDay.create({
            data: {
              studentId: student.id,
              sessionType,
              isParticipating: true,
              mon: true, tue: true, wed: true, thu: true, fri: true,
            },
          });
        }
```

StudySession: `type: SessionType.afternoon,` → `type: SeatSessionType.afternoon,`; `type: SessionType.night,` → `type: SeatSessionType.night,`. 좌석 배치 조회 `where: { session: { grade, type: SessionType.afternoon } },` → `type: SeatSessionType.afternoon`.

감독배정: `for (const sessionType of [SessionType.afternoon, SessionType.night]) {` → `for (const sessionType of Object.values(SessionType)) {`.

- [ ] **Step 2: 스크립트 2개**

`prisma/scripts/add-afternoon-mirae-rooms.ts` 와 `prisma/scripts/update-room-sizes.ts`: import 의 `SessionType` → `SeatSessionType`, 본문의 `SessionType.afternoon` → `SeatSessionType.afternoon`, `SessionType.night` → `SeatSessionType.night`.

Run: `grep -n "SessionType\." prisma/scripts/*.ts prisma/seed.ts | grep -v "SeatSessionType\.\|SessionType.afternoon1\|SessionType.afternoon2\|Object.values"`
Expected: 출력 없음

- [ ] **Step 3: 도움말**

`src/app/help/content.mdx`:
- 38행 `감독교사는 담당 자습 시간에 학생 출결을 확인합니다.` → `감독교사는 담당 자습 시간(오후1·오후2·야간)에 학생 출결을 확인합니다. 오후2 탭의 "오후1 결과 복사" 버튼으로 오후1 출석 결과를 오후2 미체크 학생에게 옮길 수 있습니다.`
- 66행 `학년 전체의 오후 자습과 야간 자습 현황을 카드로 확인합니다.` → `학년 전체의 오후1·오후2·야간 자습 현황을 카드로 확인합니다.`

`src/components/help/HelpDemos.tsx`:
```tsx
        <SessionSummary title="오후 자습" supervisor="김교사" values={[116, 3, 5, 12]} />
        <SessionSummary title="야간 자습" supervisor="박교사" values={[98, 4, 8, 0]} />
```
→
```tsx
        <SessionSummary title="오후1 자습" supervisor="김교사" values={[116, 3, 5, 12]} />
        <SessionSummary title="오후2 자습" supervisor="김교사" values={[112, 5, 7, 12]} />
        <SessionSummary title="야간 자습" supervisor="김교사" values={[98, 4, 8, 0]} />
```

Run: `npx tsx tests/help-mdx.test.ts`
Expected: `help-mdx checks passed` (파일명·문구는 그대로 유지되므로 통과)

- [ ] **Step 4: 커밋**

```bash
git add prisma/seed.ts prisma/scripts/add-afternoon-mirae-rooms.ts prisma/scripts/update-room-sizes.ts src/app/help/content.mdx src/components/help/HelpDemos.tsx
git commit -m "Update seed, scripts, and help content for three study blocks"
```

---

### Task 15: 리터럴 가드 테스트 + 전체 검증 + 문서 동기화

**Files:**
- Create: `tests/session-literal-guard.test.ts`
- Modify: `.claude/PROJECT_MAP.md` (`project-map-updater` 에이전트)
- 검증: `npm run build`, 전체 테스트, `responsive-ui-reviewer`

- [ ] **Step 1: 가드 테스트 작성**

`tests/session-literal-guard.test.ts`:

```ts
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// "afternoon" 리터럴은 좌석 세션 컨텍스트에서만 유효하다. 출석·불참·참여·감독 코드에 남으면
// 타입은 통과해도 런타임 enum 오류 또는 빈 결과로 조용히 실패한다.
const SEAT_CONTEXT_ALLOWLIST = new Set([
  "lib/sessions.ts",
  "lib/seats/print-groups.ts",
  "components/seats/SeatingEditor.tsx",
  "app/grade-admin/[grade]/seats/print/page.tsx",
  "app/grade-admin/[grade]/seats/page.tsx",
  "app/grade-admin/[grade]/page.tsx",
  "app/admin/seats/page.tsx",
  "app/api/grade-admin/[grade]/seat-layouts/route.ts",
  // 좌석 세션 분기(seatSession === "afternoon") 와 "오후 전체" 편의 선택(sessionTypesOfSeat("afternoon"))
  "app/attendance/[grade]/page.tsx",
  "app/student/absence-requests/page.tsx",
]);

const SKIPPED_DIRS = new Set(["generated", "node_modules"]);
const srcDir = fileURLToPath(new URL("../src/", import.meta.url));

function collect(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) out.push(...collect(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = collect(srcDir);
assert.ok(files.length > 50, `src 스캔이 비정상적으로 적게 잡힘 (${files.length}개)`);

const afternoonLiteral = /["']afternoon["']/;
const legacyMinutes = /\?\? 100\b/;
const legacyCoalesce = /COALESCE\([^)]*duration_minutes,\s*100\)/;

const offenders: string[] = [];
for (const file of files) {
  const rel = path.relative(srcDir, file).replace(/\\/g, "/");
  const src = readFileSync(file, "utf8");
  if (afternoonLiteral.test(src) && !SEAT_CONTEXT_ALLOWLIST.has(rel)) offenders.push(`${rel}: "afternoon" 리터럴`);
  if (legacyMinutes.test(src)) offenders.push(`${rel}: ?? 100`);
  if (legacyCoalesce.test(src)) offenders.push(`${rel}: COALESCE(duration_minutes, 100)`);
}

assert.deepEqual(offenders, [], "세션 리터럴/기본 분 상수가 진실 공급원 밖에 남아 있음");

console.log("session-literal-guard checks passed");
```

- [ ] **Step 2: 가드 실행 — 남은 위반 수정**

Run: `npx tsx tests/session-literal-guard.test.ts`
Expected: `session-literal-guard checks passed`. 실패하면 출력된 파일의 리터럴을 `SESSION_TYPES`/`SESSION_META`/`REPRESENTATIVE_SESSION_TYPE`/`seatSessionOf` 로 교체하고 재실행.

- [ ] **Step 3: 전체 테스트 + 빌드**

Run:
```bash
for f in tests/*.test.ts; do echo "== $f"; npx tsx "$f" || exit 1; done
```
Expected: 모든 파일이 `... checks passed` / `... tests passed`

Run: `npm run build`
Expected: `prisma generate` 성공 후 Next 빌드 성공(타입 오류 0). 타입 오류가 나면 해당 파일의 소비자/생산자 형태 불일치이므로 §4 API 계약표 기준으로 맞춘다. (기존 `npm run lint` 는 무관한 lint 오류로 실패 상태 — 이번 변경에서 새로 추가된 lint 오류만 없으면 된다: `npx eslint <변경 파일들>`.)

- [ ] **Step 4: 문서·UI 리뷰 에이전트**

- `project-map-updater` 에이전트 실행: enum 2개, `src/lib/sessions.ts`·`absence-reasons.ts`·`attendance/*`, 신규 API `POST /api/attendance/copy-session`, 응답 형태 변경(§4), 탭 4개, 수정 이력 `2026-08-26: 오후자습 2블록 분리`, 배포 정보의 빌드 명령을 `prisma generate && next build` 로 정정.
- `responsive-ui-reviewer` 에이전트 실행 대상: `attendance/[grade]/page.tsx`, `ParticipationManagement.tsx`, `grade-admin/[grade]/participation/page.tsx`, `homeroom/participation/page.tsx`, `GradeMonthlyAttendance.tsx`, `homeroom/attendance/page.tsx`, `homeroom/page.tsx`, `admin/statistics/page.tsx`, `student/absence-requests/page.tsx`, `student/batch-absence/page.tsx`, `student/attendance/page.tsx`, `TodayAttendanceDashboard.tsx`, `admin/page.tsx`. 보고된 위반은 수정.

- [ ] **Step 5: 커밋**

```bash
git add tests/session-literal-guard.test.ts .claude/PROJECT_MAP.md
git commit -m "Guard against legacy session literals and sync project map"
```
(리뷰 수정 파일이 있으면 함께 `git add`.)

---

### Task 16: 배포 절차

**Files:** 없음 (운영 절차). Railway 대시보드 + `git push`.

- [ ] **Step 1: Railway 빌드 명령 확인**

Railway 대시보드 → `selfstudy` 서비스 → Settings → Build Command. `prisma db push` 가 포함돼 있으면 **반드시** `npm run build` 로 변경(= `prisma generate && next build`). `db push` 가 마이그레이션보다 먼저 실행되면 enum 을 스키마 기준으로 임의 변경해 데이터 복제 마이그레이션이 실패한다. Start Command 는 `npm run start`(= `prisma migrate deploy && next start`) 인지 확인.

- [ ] **Step 2: DB 스냅샷**

Railway Postgres 서비스 → Backups 에서 수동 백업 생성, 또는 로컬에서 `pg_dump "$DATABASE_PUBLIC_URL" -Fc -f selfstudy-before-split.dump`.

- [ ] **Step 3: 배포**

```bash
git push origin main
```
Railway 배포 로그에서 `prisma migrate deploy` 가 `20260826000000_split_afternoon_session` 을 적용했는지 확인.

- [ ] **Step 4: 검증 SQL**

Railway Postgres 콘솔 또는 `psql "$DATABASE_PUBLIC_URL"`:

```sql
SELECT 'attendance' t, count(*) FILTER (WHERE session_type='afternoon1') a1, count(*) FILTER (WHERE session_type='afternoon2') a2 FROM attendance
UNION ALL SELECT 'absence_requests', count(*) FILTER (WHERE session_type='afternoon1'), count(*) FILTER (WHERE session_type='afternoon2') FROM absence_requests
UNION ALL SELECT 'participation_days', count(*) FILTER (WHERE session_type='afternoon1'), count(*) FILTER (WHERE session_type='afternoon2') FROM participation_days
UNION ALL SELECT 'attendance_notes', count(*) FILTER (WHERE session_type='afternoon1'), count(*) FILTER (WHERE session_type='afternoon2') FROM attendance_notes
UNION ALL SELECT 'supervisor_assignments', count(*) FILTER (WHERE session_type='afternoon1'), count(*) FILTER (WHERE session_type='afternoon2') FROM supervisor_assignments;
-- 각 행 a1 = a2
SELECT DISTINCT type FROM study_sessions;   -- afternoon, night 만
SELECT count(*) FROM absence_reasons r JOIN attendance a ON a.id = r.attendance_id WHERE a.session_type = 'afternoon2';  -- afternoon1 사유 수와 동일
```

- [ ] **Step 5: 화면 스모크 테스트**

1. 감독교사(`teacher1-1`)로 `/attendance/1`: 탭 오후1/오후2/야간/불참신청 4개, 오후2 탭에 "오후1 결과 복사" 버튼, 좌석 "i" 팝업에 오후1·오후2 두 행.
2. 학생 계정으로 불참신청: 오후1·오후2·야간 다중 선택 + "오후 전체".
3. 학년관리자 참여설정 표 18열, 월간출결 날짜당 3셀, Excel 헤더 3칸.
4. 관리자 오늘출결 카드 3개.

- [ ] **Step 6: 실패 시 롤백**

스냅샷 복원 후 이전 커밋(`git revert` 또는 이전 SHA 재배포). 마이그레이션은 단일 트랜잭션이라 부분 적용 상태는 남지 않는다.
