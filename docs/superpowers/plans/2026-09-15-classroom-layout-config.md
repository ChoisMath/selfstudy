# 학급 교실 구조 설정(분단형/단독형) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학년 관리자가 오후 자율학습의 일반 학급 교실을 반 번호 단위로 추가/삭제하고, 학급마다 복도 위치·분단형/단독형·분단별 행 수를 저장하면 편집기·출석 화면·인쇄물이 그 구조로 그려지도록 한다.

**Architecture:** 기존 `Room`(=분단 1개)은 그대로 두고 새 `Classroom` 모델이 `Room.classroomId`로 분단들을 묶는다. 순수 함수 `planClassroomRooms`/`isGeometryChanged`가 설정→Room 변환과 초기화 판정을 담당하고, 기존 `buildPrintGroups`가 `room.classroom` 메타로 학급 그룹을 만들어 세 렌더러(편집기·출석·인쇄)가 공용 `ClassroomFrame`(복도/창문 라벨 + 교탁)으로 그린다. 미래혜윰·야간 Room은 `classroomId = null`이라 기존 경로 그대로다.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (client output `src/generated/prisma`), PostgreSQL(Railway, 로컬 DB 없음 → 수기 migration.sql), SWR, Tailwind 4, 테스트는 `npx tsx tests/<file>.test.ts` (node:assert 스크립트).

**Spec:** `docs/superpowers/specs/2026-09-15-classroom-layout-config-design.md`

## Global Constraints

- 답변·UI 문구·에러 메시지(사용자용)는 한국어. 개발자용 로그는 영어 허용.
- `"afternoon"` 문자열 리터럴은 `tests/session-literal-guard.test.ts` 허용 목록 파일 밖에서 금지. 새 파일에서 쓰면 허용 목록에 추가한다.
- 반응형 규칙: 버튼 `min-h-11`, 라벨 `whitespace-nowrap`, 표 래퍼 `overflow-x-auto` + 셀 `whitespace-nowrap`, `100vh` 대신 `dvh`.
- 인쇄 컴포넌트(`PrintRoomGrid`, `SeatPrintGroup`, `ClassroomFrame` print variant)는 `@dnd-kit` 비의존, 고정 px만 사용(`PrintPageFitter` 실측 때문).
- 주석은 "왜"가 비자명할 때만. WHAT 주석 금지.
- Prisma 스키마 변경 후 `npx prisma generate` 실행(클라이언트가 `src/generated/prisma`에 생성됨). 마이그레이션은 Railway `migrate deploy`가 적용하므로 로컬에서는 `migrate dev`를 실행하지 않는다.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- 각 Task 마지막에 `npx tsc --noEmit`과 관련 테스트가 통과해야 한다.

## File Structure

| 파일 | 책임 |
|---|---|
| `prisma/schema.prisma` | `Classroom` 모델, enum 2개, `Room.classroomId` |
| `prisma/migrations/20260915000000_add_classrooms/migration.sql` | DDL + 기존 `"N-M반 분단K"` Room 백필 |
| `prisma/seed.ts` | 4·5·6반 Classroom 시드 |
| `src/lib/seats/classroom-config.ts` (신규) | 설정 타입·한계·검증·Room 계획·기하 변경 판정·복도 라벨 |
| `src/lib/seats/print-groups.ts` | `classroom` 메타로 학급 그룹핑 |
| `src/app/api/grade-admin/[grade]/seat-layouts/route.ts` | 응답 rooms에 `classroom` 포함 |
| `src/app/api/attendance/route.ts` | 응답 rooms에 `classroom` 포함 |
| `src/app/api/grade-admin/[grade]/classrooms/route.ts` (신규) | GET 목록 / POST 생성 |
| `src/app/api/grade-admin/[grade]/classrooms/[id]/route.ts` (신규) | PUT 수정(기하 변경 시 초기화) / DELETE |
| `src/components/seats/ClassroomFrame.tsx` (신규) | 복도/창문 세로 라벨 + 하단 교탁 프레임(screen/print) |
| `src/components/seats/ClassroomConfigModal.tsx` (신규) | 학급 목록·추가·수정·삭제 모달 |
| `src/components/seats/SeatingEditor.tsx` | "교실 구조 설정" 버튼 + 학급 그룹을 `ClassroomFrame`으로 |
| `src/components/seats/SeatPrintGroup.tsx` | 학급 그룹을 `ClassroomFrame` print로 |
| `src/app/attendance/[grade]/page.tsx` | 학급 그룹을 `ClassroomFrame` screen으로 |
| `tests/classroom-migration.test.ts` (신규) | 스키마·SQL 계약 |
| `tests/classroom-config.test.ts` (신규) | 순수 로직 |
| `tests/seat-print-groups.test.ts` | 학급 그룹 픽스처 추가 |
| `tests/classroom-wiring.test.ts` (신규) | API·렌더러 배선 src 스캔 |
| `tests/session-literal-guard.test.ts` | 허용 목록 2개 추가 |

---

### Task 1: 스키마 · 마이그레이션 · 시드

**Files:**
- Modify: `prisma/schema.prisma` (enum 블록 근처 `enum SeatSessionType` 아래, `model StudySession`, `model Room`)
- Create: `prisma/migrations/20260915000000_add_classrooms/migration.sql`
- Modify: `prisma/seed.ts:13-18` (TRUNCATE 목록), `prisma/seed.ts:138-155` (오후 Room 생성)
- Test: `tests/classroom-migration.test.ts`

**Interfaces:**
- Produces: Prisma 모델 `Classroom { id, sessionId, classNumber, corridorSide: CorridorSide, layoutType: ClassroomLayoutType, sortOrder, rooms }`, `Room.classroomId: number | null`, `Room.classroom`, `StudySession.classrooms`. Prisma enum `CorridorSide { left right }`, `ClassroomLayoutType { division single }`.

- [ ] **Step 1: 실패하는 계약 테스트 작성**

`tests/classroom-migration.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// --- schema.prisma ---
const schema = read("../prisma/schema.prisma");
assert.match(schema, /enum CorridorSide \{\s*left\s*right\s*\}/, "CorridorSide enum 없음");
assert.match(schema, /enum ClassroomLayoutType \{\s*division\s*single\s*\}/, "ClassroomLayoutType enum 없음");
assert.match(schema, /model Classroom \{[\s\S]*?@@unique\(\[sessionId, classNumber\]\)[\s\S]*?@@map\("classrooms"\)/, "Classroom 모델 계약 위반");
assert.match(schema, /model Classroom \{[\s\S]*?sortOrder\s+Int\s+@default\(0\)/, "Classroom.sortOrder 없음");
assert.match(schema, /model Room \{[\s\S]*?classroomId\s+Int\?\s+@map\("classroom_id"\)/, "Room.classroomId 가 nullable 이 아님");
assert.match(schema, /model Room \{[\s\S]*?classroom\s+Classroom\?/, "Room.classroom 관계 없음");
assert.match(schema, /model StudySession \{[\s\S]*?classrooms\s+Classroom\[\]/, "StudySession.classrooms 없음");
// 삭제 순서는 트랜잭션이 보장한다 — cascade 로 조용히 지우지 않는다
assert.doesNotMatch(schema, /model Room \{[\s\S]*?classroom\s+Classroom\?[^\n]*onDelete: Cascade/, "Room.classroom 에 Cascade 사용");

// --- migration.sql ---
const sql = read("../prisma/migrations/20260915000000_add_classrooms/migration.sql");
assert.match(sql, /CREATE TYPE "CorridorSide" AS ENUM \('left', 'right'\)/);
assert.match(sql, /CREATE TYPE "ClassroomLayoutType" AS ENUM \('division', 'single'\)/);
assert.match(sql, /CREATE TABLE "classrooms"/);
assert.match(sql, /"corridor_side" "CorridorSide" NOT NULL DEFAULT 'right'/);
assert.match(sql, /"layout_type" "ClassroomLayoutType" NOT NULL DEFAULT 'division'/);
assert.match(sql, /CREATE UNIQUE INDEX "classrooms_session_id_class_number_key" ON "classrooms"\("session_id", "class_number"\)/);
assert.match(sql, /ALTER TABLE "rooms" ADD COLUMN "classroom_id" INTEGER/);
assert.match(sql, /ALTER TABLE "rooms" ADD CONSTRAINT "rooms_classroom_id_fkey" FOREIGN KEY \("classroom_id"\) REFERENCES "classrooms"\("id"\) ON DELETE SET NULL/);
// 백필: 기존 "N-M반 분단K" 오후 Room 을 학급에 연결하고 좌석 배정은 보존한다
const ROOM_NAME_PATTERN = "\\^\\[0-9\\]\\+-\\(\\[0-9\\]\\+\\)반 분단\\[0-9\\]\\+\\$";
assert.match(sql, new RegExp(`INSERT INTO "classrooms" \\("session_id", "class_number", "sort_order"\\)[\\s\\S]*?${ROOM_NAME_PATTERN}`), "classrooms 백필 INSERT 없음");
assert.match(sql, /s\."type" = 'afternoon'/, "백필이 오후 세션으로 한정되지 않음");
assert.match(sql, /UPDATE "rooms" r SET "classroom_id" = c\."id"/, "rooms.classroom_id 백필 UPDATE 없음");
assert.doesNotMatch(sql, /seat_layouts/, "마이그레이션이 좌석 배정을 건드림");

// --- seed.ts ---
const seed = read("../prisma/seed.ts");
assert.match(seed, /TRUNCATE TABLE[\s\S]*?classrooms/, "시드 TRUNCATE 목록에 classrooms 없음");
assert.match(seed, /prisma\.classroom\.create/, "시드가 Classroom 을 만들지 않음");
assert.match(seed, /classroomId: classroom\.id/, "시드 Room 이 classroomId 를 연결하지 않음");

console.log("classroom-migration checks passed");
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx tsx tests/classroom-migration.test.ts`
Expected: FAIL — `CorridorSide enum 없음`

- [ ] **Step 3: schema.prisma 수정**

`enum SeatSessionType { ... }` 바로 아래에 추가:

```prisma
enum CorridorSide {
  left
  right
}

enum ClassroomLayoutType {
  division
  single
}
```

`model StudySession`의 `rooms Room[]` 아래에 `classrooms Classroom[]` 추가.

`model Room`을 아래처럼 변경(기존 필드 유지, `classroomId`·`classroom`·인덱스 추가):

```prisma
model Room {
  id          Int    @id @default(autoincrement())
  sessionId   Int    @map("session_id")
  classroomId Int?   @map("classroom_id")
  name        String @db.VarChar(50)
  cols        Int
  rows        Int
  sortOrder   Int    @default(0) @map("sort_order")

  session     StudySession @relation(fields: [sessionId], references: [id])
  classroom   Classroom?   @relation(fields: [classroomId], references: [id])
  seatLayouts SeatLayout[]

  @@index([sessionId, sortOrder])
  @@index([classroomId])
  @@map("rooms")
}
```

`model Room` 바로 위에 추가:

```prisma
model Classroom {
  id           Int                 @id @default(autoincrement())
  sessionId    Int                 @map("session_id")
  classNumber  Int                 @map("class_number")
  corridorSide CorridorSide        @default(right) @map("corridor_side")
  layoutType   ClassroomLayoutType @default(division) @map("layout_type")
  sortOrder    Int                 @default(0) @map("sort_order")

  session StudySession @relation(fields: [sessionId], references: [id])
  rooms   Room[]

  @@unique([sessionId, classNumber])
  @@index([sessionId, sortOrder])
  @@map("classrooms")
}
```

- [ ] **Step 4: migration.sql 작성**

`prisma/migrations/20260915000000_add_classrooms/migration.sql`:

```sql
-- 1. enum
CREATE TYPE "CorridorSide" AS ENUM ('left', 'right');
CREATE TYPE "ClassroomLayoutType" AS ENUM ('division', 'single');

-- 2. classrooms
CREATE TABLE "classrooms" (
  "id" SERIAL NOT NULL,
  "session_id" INTEGER NOT NULL,
  "class_number" INTEGER NOT NULL,
  "corridor_side" "CorridorSide" NOT NULL DEFAULT 'right',
  "layout_type" "ClassroomLayoutType" NOT NULL DEFAULT 'division',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "classrooms_session_id_class_number_key" ON "classrooms"("session_id", "class_number");
CREATE INDEX "classrooms_session_id_sort_order_idx" ON "classrooms"("session_id", "sort_order");
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "study_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. rooms.classroom_id
ALTER TABLE "rooms" ADD COLUMN "classroom_id" INTEGER;
CREATE INDEX "rooms_classroom_id_idx" ON "rooms"("classroom_id");
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_classroom_id_fkey"
  FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. 백필: 기존 시드 이름 "N-M반 분단K" 인 오후 Room 을 학급으로 묶는다 (좌석 배정은 그대로)
INSERT INTO "classrooms" ("session_id", "class_number", "sort_order")
SELECT DISTINCT
  r."session_id",
  (regexp_match(r."name", '^[0-9]+-([0-9]+)반 분단[0-9]+$'))[1]::integer,
  (regexp_match(r."name", '^[0-9]+-([0-9]+)반 분단[0-9]+$'))[1]::integer
FROM "rooms" r
JOIN "study_sessions" s ON s."id" = r."session_id"
WHERE s."type" = 'afternoon'
  AND r."name" ~ '^[0-9]+-[0-9]+반 분단[0-9]+$';

UPDATE "rooms" r SET "classroom_id" = c."id"
FROM "classrooms" c
JOIN "study_sessions" s ON s."id" = c."session_id"
WHERE r."session_id" = c."session_id"
  AND s."type" = 'afternoon'
  AND r."name" ~ '^[0-9]+-[0-9]+반 분단[0-9]+$'
  AND c."class_number" = (regexp_match(r."name", '^[0-9]+-([0-9]+)반 분단[0-9]+$'))[1]::integer;
```

- [ ] **Step 5: seed.ts 수정**

TRUNCATE 목록(`prisma/seed.ts:13-18`)의 `teacher_roles, rooms, study_sessions,` 를 `teacher_roles, rooms, classrooms, study_sessions,` 로 변경.

오후 Room 생성 블록(`// 실제 도면: 각 반에 분단 3개...` 부터 `for (const room of afternoonRooms) {...}` 까지)을 아래로 교체. `sortOrder`는 기존 값(1~9)을 유지해 아래 좌석 배정 루프의 `Math.floor((room.sortOrder - 1) / 3) + 4` 가 그대로 동작한다.

```ts
    // 실제 도면: 각 반에 분단 3개(2열×3행=6석씩), 반당 18석, 총 54석
    for (const classNumber of [4, 5, 6]) {
      const classroom = await prisma.classroom.create({
        data: { sessionId: afternoonSession.id, classNumber, sortOrder: classNumber },
      });
      for (let division = 1; division <= 3; division++) {
        await prisma.room.create({
          data: {
            sessionId: afternoonSession.id,
            classroomId: classroom.id,
            name: `${grade}-${classNumber}반 분단${division}`,
            cols: 2,
            rows: 3,
            sortOrder: (classNumber - 4) * 3 + division,
          },
        });
      }
    }
```

- [ ] **Step 6: Prisma 클라이언트 재생성 + 테스트·타입 확인**

Run: `npx prisma generate && npx tsx tests/classroom-migration.test.ts && npx tsx tests/session-split-migration.test.ts && npx tsc --noEmit`
Expected: `classroom-migration checks passed`, 기존 마이그레이션 테스트 통과, tsc 오류 0.

- [ ] **Step 7: `prisma-migration-guardian` 에이전트로 스키마·SQL 검수**

Agent 도구로 `prisma-migration-guardian` 를 호출해 `prisma/schema.prisma` 와 새 `migration.sql` 을 검수시킨다. 지적 사항(예: NOT NULL 기본값 누락)은 이 Task 안에서 수정.

- [ ] **Step 8: 커밋**

```bash
git add prisma/schema.prisma prisma/migrations/20260915000000_add_classrooms/migration.sql prisma/seed.ts tests/classroom-migration.test.ts
git commit -m "Add Classroom model with backfill migration for afternoon rooms

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: 순수 로직 `classroom-config.ts`

**Files:**
- Create: `src/lib/seats/classroom-config.ts`
- Test: `tests/classroom-config.test.ts`

**Interfaces:**
- Produces:
  - `type CorridorSide = "left" | "right"`, `type ClassroomLayoutType = "division" | "single"`
  - `CORRIDOR_SIDES`, `LAYOUT_TYPES` (readonly 튜플), `CORRIDOR_SIDE_LABELS`, `LAYOUT_TYPE_LABELS` (한국어 라벨)
  - `type ClassroomConfig = { classNumber: number; corridorSide: CorridorSide; layoutType: ClassroomLayoutType; rowsPerDivision: number[] }`
  - `CLASSROOM_LIMITS`, `COLS_BY_LAYOUT`
  - `type PlannedRoom = { name: string; cols: number; rows: number; sortOrder: number }`
  - `planClassroomRooms(grade: number, config: ClassroomConfig): PlannedRoom[]`
  - `isGeometryChanged(existingRooms: { cols: number; rows: number; sortOrder: number }[], config: ClassroomConfig): boolean`
  - `seatCountOf(config: ClassroomConfig): number`
  - `corridorLabels(side: CorridorSide): { left: string; right: string }`
  - `parseClassroomConfig(input: unknown): { ok: true; config: ClassroomConfig } | { ok: false; error: string }`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/classroom-config.test.ts`:

```ts
import assert from "node:assert/strict";
import {
  CLASSROOM_LIMITS,
  corridorLabels,
  isGeometryChanged,
  parseClassroomConfig,
  planClassroomRooms,
  seatCountOf,
  type ClassroomConfig,
} from "../src/lib/seats/classroom-config";

const divisionConfig: ClassroomConfig = {
  classNumber: 4,
  corridorSide: "right",
  layoutType: "division",
  rowsPerDivision: [6, 6, 5],
};

// --- planClassroomRooms ---
const planned = planClassroomRooms(2, divisionConfig);
assert.deepEqual(planned, [
  { name: "2-4반 분단1", cols: 2, rows: 6, sortOrder: 1 },
  { name: "2-4반 분단2", cols: 2, rows: 6, sortOrder: 2 },
  { name: "2-4반 분단3", cols: 2, rows: 5, sortOrder: 3 },
]);

const singlePlanned = planClassroomRooms(1, { ...divisionConfig, classNumber: 7, layoutType: "single", rowsPerDivision: [5, 5] });
assert.deepEqual(singlePlanned, [
  { name: "1-7반 1열", cols: 1, rows: 5, sortOrder: 1 },
  { name: "1-7반 2열", cols: 1, rows: 5, sortOrder: 2 },
]);

// --- seatCountOf ---
assert.equal(seatCountOf(divisionConfig), 34);
assert.equal(seatCountOf({ ...divisionConfig, layoutType: "single" }), 17);

// --- isGeometryChanged ---
const existing = [
  { cols: 2, rows: 6, sortOrder: 2 },
  { cols: 2, rows: 5, sortOrder: 3 },
  { cols: 2, rows: 6, sortOrder: 1 },
];
assert.equal(isGeometryChanged(existing, divisionConfig), false, "순서가 섞여도 sortOrder 기준으로 같으면 변경 아님");
assert.equal(isGeometryChanged(existing, { ...divisionConfig, corridorSide: "left" }), false, "복도만 바뀌면 변경 아님");
assert.equal(isGeometryChanged(existing, { ...divisionConfig, classNumber: 9 }), false, "반 번호만 바뀌면 변경 아님");
assert.equal(isGeometryChanged(existing, { ...divisionConfig, rowsPerDivision: [6, 6, 6] }), true, "행 수 변경");
assert.equal(isGeometryChanged(existing, { ...divisionConfig, rowsPerDivision: [6, 6] }), true, "분단 수 변경");
assert.equal(isGeometryChanged(existing, { ...divisionConfig, layoutType: "single" }), true, "유형 변경");
assert.equal(isGeometryChanged([], divisionConfig), true, "Room 이 없으면 변경");

// --- corridorLabels ---
assert.deepEqual(corridorLabels("right"), { left: "창문", right: "복도" });
assert.deepEqual(corridorLabels("left"), { left: "복도", right: "창문" });

// --- parseClassroomConfig ---
const ok = parseClassroomConfig({ classNumber: "4", corridorSide: "left", layoutType: "division", rowsPerDivision: [6, 6, 5] });
assert.ok(ok.ok);
assert.deepEqual(ok.config, { classNumber: 4, corridorSide: "left", layoutType: "division", rowsPerDivision: [6, 6, 5] });

function expectError(input: unknown, fragment: string) {
  const result = parseClassroomConfig(input);
  assert.equal(result.ok, false, `통과하면 안 됨: ${JSON.stringify(input)}`);
  if (!result.ok) assert.match(result.error, new RegExp(fragment));
}
expectError(null, "요청");
expectError({ ...divisionConfig, classNumber: 0 }, "반 번호");
expectError({ ...divisionConfig, classNumber: CLASSROOM_LIMITS.classNumber.max + 1 }, "반 번호");
expectError({ ...divisionConfig, classNumber: 4.5 }, "반 번호");
expectError({ ...divisionConfig, corridorSide: "up" }, "복도");
expectError({ ...divisionConfig, layoutType: "pair" }, "유형");
expectError({ ...divisionConfig, rowsPerDivision: [] }, "분단");
expectError({ ...divisionConfig, rowsPerDivision: [3, 3, 3, 3, 3, 3, 3] }, "분단");
expectError({ ...divisionConfig, rowsPerDivision: [0, 3] }, "행 수");
expectError({ ...divisionConfig, rowsPerDivision: [3, CLASSROOM_LIMITS.rows.max + 1] }, "행 수");
expectError({ ...divisionConfig, rowsPerDivision: [3, "3"] }, "행 수");

console.log("classroom-config checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/classroom-config.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/seats/classroom-config'`

- [ ] **Step 3: 구현**

`src/lib/seats/classroom-config.ts`:

```ts
export const CORRIDOR_SIDES = ["left", "right"] as const;
export type CorridorSide = (typeof CORRIDOR_SIDES)[number];

export const LAYOUT_TYPES = ["division", "single"] as const;
export type ClassroomLayoutType = (typeof LAYOUT_TYPES)[number];

export const CORRIDOR_SIDE_LABELS: Record<CorridorSide, string> = { left: "왼쪽", right: "오른쪽" };
export const LAYOUT_TYPE_LABELS: Record<ClassroomLayoutType, string> = { division: "분단형", single: "단독형" };

export const COLS_BY_LAYOUT: Record<ClassroomLayoutType, number> = { division: 2, single: 1 };

export const CLASSROOM_LIMITS = {
  classNumber: { min: 1, max: 20 },
  divisions: { min: 1, max: 6 },
  rows: { min: 1, max: 10 },
} as const;

export type ClassroomConfig = {
  classNumber: number;
  corridorSide: CorridorSide;
  layoutType: ClassroomLayoutType;
  rowsPerDivision: number[];
};

export type PlannedRoom = { name: string; cols: number; rows: number; sortOrder: number };

export function planClassroomRooms(grade: number, config: ClassroomConfig): PlannedRoom[] {
  const cols = COLS_BY_LAYOUT[config.layoutType];
  const prefix = `${grade}-${config.classNumber}반`;
  return config.rowsPerDivision.map((rows, index) => {
    const ordinal = index + 1;
    const label = config.layoutType === "division" ? `분단${ordinal}` : `${ordinal}열`;
    return { name: `${prefix} ${label}`, cols, rows, sortOrder: ordinal };
  });
}

export function isGeometryChanged(
  existingRooms: { cols: number; rows: number; sortOrder: number }[],
  config: ClassroomConfig
): boolean {
  if (existingRooms.length !== config.rowsPerDivision.length) return true;
  const cols = COLS_BY_LAYOUT[config.layoutType];
  const sorted = [...existingRooms].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted.some((room, index) => room.cols !== cols || room.rows !== config.rowsPerDivision[index]);
}

export function seatCountOf(config: ClassroomConfig): number {
  const cols = COLS_BY_LAYOUT[config.layoutType];
  return config.rowsPerDivision.reduce((sum, rows) => sum + rows, 0) * cols;
}

export function corridorLabels(side: CorridorSide): { left: string; right: string } {
  return side === "left" ? { left: "복도", right: "창문" } : { left: "창문", right: "복도" };
}

export type ParseClassroomConfigResult =
  | { ok: true; config: ClassroomConfig }
  | { ok: false; error: string };

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

export function parseClassroomConfig(input: unknown): ParseClassroomConfigResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "요청 본문이 올바르지 않습니다." };
  }
  const body = input as Record<string, unknown>;

  // 폼 input 은 문자열을 보낼 수 있어 숫자 문자열만 허용한다
  const classNumber = typeof body.classNumber === "string" && body.classNumber.trim() !== ""
    ? Number(body.classNumber)
    : body.classNumber;
  const { min: classMin, max: classMax } = CLASSROOM_LIMITS.classNumber;
  if (!isIntegerInRange(classNumber, classMin, classMax)) {
    return { ok: false, error: `반 번호는 ${classMin}~${classMax} 사이의 정수여야 합니다.` };
  }

  const corridorSide = body.corridorSide;
  if (!CORRIDOR_SIDES.includes(corridorSide as CorridorSide)) {
    return { ok: false, error: "복도 위치는 왼쪽 또는 오른쪽이어야 합니다." };
  }

  const layoutType = body.layoutType;
  if (!LAYOUT_TYPES.includes(layoutType as ClassroomLayoutType)) {
    return { ok: false, error: "배치 유형은 분단형 또는 단독형이어야 합니다." };
  }

  const rowsPerDivision = body.rowsPerDivision;
  const { min: divMin, max: divMax } = CLASSROOM_LIMITS.divisions;
  if (!Array.isArray(rowsPerDivision) || rowsPerDivision.length < divMin || rowsPerDivision.length > divMax) {
    return { ok: false, error: `분단(열) 개수는 ${divMin}~${divMax}개여야 합니다.` };
  }
  const { min: rowMin, max: rowMax } = CLASSROOM_LIMITS.rows;
  if (!rowsPerDivision.every((rows) => isIntegerInRange(rows, rowMin, rowMax))) {
    return { ok: false, error: `분단별 행 수는 ${rowMin}~${rowMax} 사이의 정수여야 합니다.` };
  }

  return {
    ok: true,
    config: {
      classNumber,
      corridorSide: corridorSide as CorridorSide,
      layoutType: layoutType as ClassroomLayoutType,
      rowsPerDivision: rowsPerDivision as number[],
    },
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx tsx tests/classroom-config.test.ts && npx tsc --noEmit`
Expected: `classroom-config checks passed`, tsc 오류 0.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/seats/classroom-config.ts tests/classroom-config.test.ts
git commit -m "Add classroom config planning and validation helpers

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: 그룹 규칙 확장 + API 응답에 `classroom` 포함

**Files:**
- Modify: `src/lib/seats/print-groups.ts`
- Modify: `src/app/api/grade-admin/[grade]/seat-layouts/route.ts:30-50` (GET include)
- Modify: `src/app/api/attendance/route.ts:31-36` (include), `:117-124` (응답 매핑)
- Modify: `src/components/seats/SeatingEditor.tsx:44-51` (`Room` 타입)
- Modify: `src/app/attendance/[grade]/page.tsx:35-42` (`Room` 인터페이스)
- Test: `tests/seat-print-groups.test.ts`

**Interfaces:**
- Consumes: `CorridorSide`, `ClassroomLayoutType` (Task 2)
- Produces:
  - `type ClassroomMeta = { id: number; classNumber: number; corridorSide: CorridorSide; layoutType: ClassroomLayoutType; sortOrder: number }`
  - `PrintBaseRoom.classroom?: ClassroomMeta | null`
  - `PrintGroup.classroom?: ClassroomMeta` (학급 그룹에만)
  - API 응답: seat-layouts GET `sessions[].rooms[].classroom: ClassroomMeta | null`, attendance GET `rooms[].classroom: ClassroomMeta | null`

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/seat-print-groups.test.ts` 맨 끝 `console.log` 앞(파일 끝에 로그가 없으면 파일 끝)에 추가:

```ts
// --- 학급(Classroom) 메타가 있으면 반 번호 순으로 학급 그룹을 만들고, 없는 Room 은 접두사 규칙으로 뒤에 붙인다 ---
const classroom4 = { id: 11, classNumber: 4, corridorSide: "right" as const, layoutType: "division" as const, sortOrder: 4 };
const classroom7 = { id: 12, classNumber: 7, corridorSide: "left" as const, layoutType: "single" as const, sortOrder: 7 };
const mixedRooms: PrintBaseRoom[] = [
  { ...room(31, "2-7반 1열", 1, 5, 1), classroom: classroom7 },
  { ...room(32, "2-7반 2열", 1, 5, 2), classroom: classroom7 },
  { ...room(21, "2-4반 분단1", 2, 6, 1), classroom: classroom4 },
  { ...room(22, "2-4반 분단2", 2, 6, 2), classroom: classroom4 },
  { ...room(23, "2-4반 분단3", 2, 5, 3), classroom: classroom4 },
  { ...room(10, "오후미래혜윰1 분단1", 5, 2, 10), classroom: null },
  { ...room(11, "오후미래혜윰1 분단2", 5, 2, 11) },
];
const mixed = buildPrintGroups(mixedRooms, "afternoon", 2);
assert.deepEqual(mixed.map((g) => g.key), ["2-4반", "2-7반", "오후미래혜윰1"]);
assert.deepEqual(mixed.map((g) => g.kind), ["divisions-row", "divisions-row", "divisions-column"]);
assert.deepEqual(mixed[0].rooms.map((r) => r.id), [21, 22, 23], "학급 안 Room 은 sortOrder 순");
assert.deepEqual(mixed[1].rooms.map((r) => r.id), [31, 32]);
assert.equal(mixed[0].title, "2-4반");
assert.deepEqual(mixed[0].classroom, classroom4);
assert.deepEqual(mixed[1].classroom, classroom7);
assert.equal(mixed[2].classroom, undefined, "접두사 그룹에는 classroom 메타가 없다");

// 같은 반 번호라도 Room.sortOrder 가 학급 사이에서 겹칠 수 있다(백필 데이터는 1~9 전역 순번) — 그룹은 classroom.id 로 묶는다
const backfilled: PrintBaseRoom[] = [
  { ...room(1, "2-4반 분단1", 2, 3, 1), classroom: classroom4 },
  { ...room(4, "2-5반 분단1", 2, 3, 4), classroom: { ...classroom4, id: 13, classNumber: 5, sortOrder: 5 } },
  { ...room(2, "2-4반 분단2", 2, 3, 2), classroom: classroom4 },
];
const backfilledGroups = buildPrintGroups(backfilled, "afternoon", 2);
assert.deepEqual(backfilledGroups.map((g) => g.key), ["2-4반", "2-5반"]);
assert.deepEqual(backfilledGroups[0].rooms.map((r) => r.id), [1, 2]);

// 야간은 classroom 메타가 있어도 무시한다
const nightWithMeta = buildPrintGroups([{ ...room(20, "미래201", 3, 2, 1), classroom: classroom4 }], "night", 1);
assert.equal(nightWithMeta[0].kind, "stack");
assert.equal(nightWithMeta[0].classroom, undefined);

console.log("seat-print-groups checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/seat-print-groups.test.ts`
Expected: FAIL — `mixed.map(...)` 키가 `["2-7반", "2-4반", "오후미래혜윰1"]` 처럼 sortOrder 순으로 나와 `deepEqual` 실패(또는 `classroom` 속성 타입 오류).

- [ ] **Step 3: `print-groups.ts` 수정**

파일 전체를 아래로 교체:

```ts
import { type SeatSessionType } from "@/lib/sessions";
import type { ClassroomLayoutType, CorridorSide } from "@/lib/seats/classroom-config";

export type ClassroomMeta = {
  id: number;
  classNumber: number;
  corridorSide: CorridorSide;
  layoutType: ClassroomLayoutType;
  sortOrder: number;
};

export type PrintBaseRoom = {
  id: number;
  name: string;
  cols: number;
  rows: number;
  sortOrder: number;
  classroom?: ClassroomMeta | null;
};

export type PrintGroupKind =
  | "divisions-row"
  | "divisions-column"
  | "hall"
  | "stack";

export type PrintGroup<T extends PrintBaseRoom = PrintBaseRoom> = {
  key: string;
  title: string;
  kind: PrintGroupKind;
  rooms: T[];
  classroom?: ClassroomMeta;
};

const MIRAE_AFTERNOON_PREFIX = "오후미래혜윰";
const NIGHT_GROUP_TITLE = "미래홀";
const HALL_LAYOUT_GRADE = 2;

export function roomPrefix(name: string): string {
  return name.split(" ")[0];
}

export function divisionLabel(name: string): string {
  const rest = name.slice(roomPrefix(name).length).trim();
  return rest.length > 0 ? rest : name;
}

export function classroomTitle(grade: number, classNumber: number): string {
  return `${grade}-${classNumber}반`;
}

function buildClassroomGroups<T extends PrintBaseRoom>(rooms: T[], grade: number): PrintGroup<T>[] {
  const byClassroom = new Map<number, PrintGroup<T>>();
  for (const currentRoom of rooms) {
    const meta = currentRoom.classroom;
    if (!meta) continue;
    let group = byClassroom.get(meta.id);
    if (!group) {
      const title = classroomTitle(grade, meta.classNumber);
      group = { key: title, title, kind: "divisions-row", rooms: [], classroom: meta };
      byClassroom.set(meta.id, group);
    }
    group.rooms.push(currentRoom);
  }
  return [...byClassroom.values()].sort(
    (a, b) => a.classroom!.sortOrder - b.classroom!.sortOrder || a.classroom!.id - b.classroom!.id
  );
}

function buildPrefixGroups<T extends PrintBaseRoom>(rooms: T[]): PrintGroup<T>[] {
  const groups: PrintGroup<T>[] = [];
  for (const currentRoom of rooms) {
    const prefix = roomPrefix(currentRoom.name);
    const last = groups[groups.length - 1];
    if (last && last.key === prefix) {
      last.rooms.push(currentRoom);
      continue;
    }
    groups.push({
      key: prefix,
      title: prefix,
      kind: prefix.startsWith(MIRAE_AFTERNOON_PREFIX) ? "divisions-column" : "divisions-row",
      rooms: [currentRoom],
    });
  }
  return groups;
}

export function buildPrintGroups<T extends PrintBaseRoom>(
  rooms: T[],
  sessionType: SeatSessionType,
  grade: number
): PrintGroup<T>[] {
  if (rooms.length === 0) return [];

  const sorted = [...rooms].sort((a, b) => a.sortOrder - b.sortOrder);

  if (sessionType === "night") {
    return [
      {
        key: "night",
        title: NIGHT_GROUP_TITLE,
        kind: grade === HALL_LAYOUT_GRADE ? "hall" : "stack",
        rooms: sorted,
      },
    ];
  }

  const classroomRooms = sorted.filter((r) => r.classroom);
  const prefixRooms = sorted.filter((r) => !r.classroom);
  return [...buildClassroomGroups(classroomRooms, grade), ...buildPrefixGroups(prefixRooms)];
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx tsx tests/seat-print-groups.test.ts && npx tsx tests/seat-print-wiring.test.ts`
Expected: 둘 다 `checks passed`.

- [ ] **Step 5: API 응답에 `classroom` 포함**

`src/app/api/grade-admin/[grade]/seat-layouts/route.ts` GET의 `rooms:` include를 수정:

```ts
        rooms: {
          orderBy: { sortOrder: "asc" },
          include: {
            classroom: true,
            seatLayouts: {
```

`src/app/api/attendance/route.ts`의 `studySession` 조회 include를 수정:

```ts
      include: {
        rooms: { orderBy: { sortOrder: "asc" }, include: { classroom: true } },
      },
```

같은 파일 응답 매핑(`rooms: studySession.rooms.map((room) => ({`)에 `sortOrder: room.sortOrder,` 다음 줄로 추가:

```ts
        classroom: room.classroom,
```

- [ ] **Step 6: 프론트 타입에 `classroom` 추가**

`src/components/seats/SeatingEditor.tsx` 상단 import에 추가:

```ts
import { buildPrintGroups, type ClassroomMeta } from "@/lib/seats/print-groups";
```
(기존 `import { buildPrintGroups } from "@/lib/seats/print-groups";` 를 이 줄로 교체)

`type Room = {...}` 에 `sortOrder: number;` 다음 줄로 `classroom?: ClassroomMeta | null;` 추가.

`src/app/attendance/[grade]/page.tsx`: import를 `import { buildPrintGroups, type ClassroomMeta } from "@/lib/seats/print-groups";` 로 교체하고 `interface Room` 에 `classroom?: ClassroomMeta | null;` 추가.

인쇄 페이지(`ApiRoom = PrintBaseRoom & {...}`)는 `PrintBaseRoom` 확장이라 수정 없음.

- [ ] **Step 7: 타입·기존 테스트 확인**

Run: `npx tsc --noEmit && npx tsx tests/attendance-api-wiring.test.ts && npx tsx tests/attendance-page-wiring.test.ts && npx tsx tests/seat-participation.test.ts`
Expected: 모두 통과.

- [ ] **Step 8: 커밋**

```bash
git add src/lib/seats/print-groups.ts tests/seat-print-groups.test.ts "src/app/api/grade-admin/[grade]/seat-layouts/route.ts" src/app/api/attendance/route.ts src/components/seats/SeatingEditor.tsx "src/app/attendance/[grade]/page.tsx"
git commit -m "Group afternoon rooms by Classroom meta and expose it from seat APIs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: classrooms API (GET/POST, PUT/DELETE)

**Files:**
- Create: `src/app/api/grade-admin/[grade]/classrooms/route.ts`
- Create: `src/app/api/grade-admin/[grade]/classrooms/[id]/route.ts`
- Modify: `tests/session-literal-guard.test.ts:8-21` (허용 목록)
- Test: `tests/classroom-wiring.test.ts` (신규, 이 Task에서는 API 절만 작성)

**Interfaces:**
- Consumes: `parseClassroomConfig`, `planClassroomRooms`, `isGeometryChanged`, `COLS_BY_LAYOUT` (Task 2), Prisma `classroom` 모델 (Task 1), `withGradeAuth` (`src/lib/api-auth.ts`)
- Produces (모달이 의존):
  - `GET /api/grade-admin/[grade]/classrooms` → `{ classrooms: ClassroomSummary[] }`, `type ClassroomSummary = { id; classNumber; corridorSide; layoutType; sortOrder; rowsPerDivision: number[]; seatCount: number; assignedCount: number }` (반 번호 오름차순)
  - `POST` 본문 `ClassroomConfig` → 201 `{ classroom: { id, classNumber, corridorSide, layoutType, sortOrder } }` / 400 / 404 / 409
  - `PUT /[id]` 본문 `ClassroomConfig` → `{ classroom, reset: boolean }` / 400 / 404 / 409
  - `DELETE /[id]` → `{ success: true }` / 404
  - 모든 오류는 `{ error: string }`

- [ ] **Step 1: 실패하는 배선 테스트 작성**

`tests/classroom-wiring.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// --- API: 목록/생성 ---
const listRoute = read("../src/app/api/grade-admin/[grade]/classrooms/route.ts");
assert.match(listRoute, /withGradeAuth\(grade/, "classrooms GET/POST 가 withGradeAuth 를 쓰지 않음");
assert.match(listRoute, /export async function GET/);
assert.match(listRoute, /export async function POST/);
assert.match(listRoute, /parseClassroomConfig\(/, "POST 가 parseClassroomConfig 로 검증하지 않음");
assert.match(listRoute, /planClassroomRooms\(/, "POST 가 planClassroomRooms 로 Room 을 만들지 않음");
assert.match(listRoute, /\$transaction/, "POST 가 트랜잭션을 쓰지 않음");
assert.match(listRoute, /status: 409/, "중복 반 번호 409 없음");
assert.match(listRoute, /assignedCount/, "GET 응답에 assignedCount 없음");

// --- API: 수정/삭제 ---
const itemRoute = read("../src/app/api/grade-admin/[grade]/classrooms/[id]/route.ts");
assert.match(itemRoute, /withGradeAuth\(grade/);
assert.match(itemRoute, /export async function PUT/);
assert.match(itemRoute, /export async function DELETE/);
assert.match(itemRoute, /parseClassroomConfig\(/);
assert.match(itemRoute, /isGeometryChanged\(/, "PUT 이 isGeometryChanged 로 초기화 여부를 판정하지 않음");
assert.match(itemRoute, /planClassroomRooms\(/);
assert.match(itemRoute, /\$transaction/);
// 삭제 순서: SeatLayout → Room → Classroom (cascade 없음)
const deleteOrder = /seatLayout\.deleteMany[\s\S]*?room\.deleteMany[\s\S]*?classroom\.delete\(/;
assert.match(itemRoute, deleteOrder, "DELETE 의 삭제 순서가 SeatLayout → Room → Classroom 이 아님");
assert.match(itemRoute, /session\.grade !== grade/, "다른 학년의 classroom id 접근을 막지 않음");
assert.match(itemRoute, /reset/, "PUT 응답에 reset 없음");

console.log("classroom-wiring checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/classroom-wiring.test.ts`
Expected: FAIL — `ENOENT ... classrooms/route.ts`

- [ ] **Step 3: 목록/생성 라우트 작성**

`src/app/api/grade-admin/[grade]/classrooms/route.ts`:

```ts
import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { parseClassroomConfig, planClassroomRooms } from "@/lib/seats/classroom-config";

function parseGrade(gradeStr: string): number | null {
  const grade = parseInt(gradeStr, 10);
  return isNaN(grade) || grade < 1 || grade > 3 ? null : grade;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseGrade(gradeStr);
  if (grade === null) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async () => {
    const session = await prisma.studySession.findUnique({
      where: { type_grade: { type: "afternoon", grade } },
      include: {
        classrooms: {
          orderBy: { sortOrder: "asc" },
          include: {
            rooms: {
              orderBy: { sortOrder: "asc" },
              include: {
                _count: { select: { seatLayouts: { where: { studentId: { not: null } } } } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ classrooms: [] });
    }

    const classrooms = session.classrooms.map((classroom) => ({
      id: classroom.id,
      classNumber: classroom.classNumber,
      corridorSide: classroom.corridorSide,
      layoutType: classroom.layoutType,
      sortOrder: classroom.sortOrder,
      rowsPerDivision: classroom.rooms.map((room) => room.rows),
      seatCount: classroom.rooms.reduce((sum, room) => sum + room.cols * room.rows, 0),
      assignedCount: classroom.rooms.reduce((sum, room) => sum + room._count.seatLayouts, 0),
    }));

    return NextResponse.json({ classrooms });
  })(req);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseGrade(gradeStr);
  if (grade === null) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req) => {
    const parsed = parseClassroomConfig(await req.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const config = parsed.config;

    const session = await prisma.studySession.findUnique({
      where: { type_grade: { type: "afternoon", grade } },
    });
    if (!session) {
      return NextResponse.json({ error: "오후 자율학습 세션이 없습니다." }, { status: 404 });
    }

    const duplicate = await prisma.classroom.findUnique({
      where: { sessionId_classNumber: { sessionId: session.id, classNumber: config.classNumber } },
    });
    if (duplicate) {
      return NextResponse.json({ error: "이미 있는 반 번호입니다." }, { status: 409 });
    }

    const classroom = await prisma.$transaction(async (tx) => {
      const created = await tx.classroom.create({
        data: {
          sessionId: session.id,
          classNumber: config.classNumber,
          corridorSide: config.corridorSide,
          layoutType: config.layoutType,
          sortOrder: config.classNumber,
        },
      });
      await tx.room.createMany({
        data: planClassroomRooms(grade, config).map((room) => ({
          ...room,
          sessionId: session.id,
          classroomId: created.id,
        })),
      });
      return created;
    });

    return NextResponse.json({ classroom }, { status: 201 });
  })(req);
}
```

- [ ] **Step 4: 수정/삭제 라우트 작성**

`src/app/api/grade-admin/[grade]/classrooms/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  isGeometryChanged,
  parseClassroomConfig,
  planClassroomRooms,
} from "@/lib/seats/classroom-config";

type RouteParams = { params: Promise<{ grade: string; id: string }> };

function parseIds(gradeStr: string, idStr: string): { grade: number; id: number } | null {
  const grade = parseInt(gradeStr, 10);
  const id = parseInt(idStr, 10);
  if (isNaN(grade) || grade < 1 || grade > 3 || isNaN(id)) return null;
  return { grade, id };
}

async function findOwnedClassroom(id: number, grade: number) {
  const classroom = await prisma.classroom.findUnique({
    where: { id },
    include: { session: true, rooms: { orderBy: { sortOrder: "asc" } } },
  });
  if (!classroom || classroom.session.grade !== grade) return null;
  return classroom;
}

export async function PUT(req: Request, { params }: RouteParams) {
  const { grade: gradeStr, id: idStr } = await params;
  const ids = parseIds(gradeStr, idStr);
  if (!ids) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { grade, id } = ids;

  return withGradeAuth(grade, async (req) => {
    const parsed = parseClassroomConfig(await req.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const config = parsed.config;

    const classroom = await findOwnedClassroom(id, grade);
    if (!classroom) {
      return NextResponse.json({ error: "교실을 찾을 수 없습니다." }, { status: 404 });
    }

    if (config.classNumber !== classroom.classNumber) {
      const duplicate = await prisma.classroom.findUnique({
        where: { sessionId_classNumber: { sessionId: classroom.sessionId, classNumber: config.classNumber } },
      });
      if (duplicate) {
        return NextResponse.json({ error: "이미 있는 반 번호입니다." }, { status: 409 });
      }
    }

    const reset = isGeometryChanged(classroom.rooms, config);
    const plannedRooms = planClassroomRooms(grade, config);

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.classroom.update({
        where: { id },
        data: {
          classNumber: config.classNumber,
          corridorSide: config.corridorSide,
          layoutType: config.layoutType,
          sortOrder: config.classNumber,
        },
      });

      if (reset) {
        const roomIds = classroom.rooms.map((room) => room.id);
        await tx.seatLayout.deleteMany({ where: { roomId: { in: roomIds } } });
        await tx.room.deleteMany({ where: { id: { in: roomIds } } });
        await tx.room.createMany({
          data: plannedRooms.map((room) => ({ ...room, sessionId: classroom.sessionId, classroomId: id })),
        });
      } else if (config.classNumber !== classroom.classNumber) {
        // 기하가 같으면 Room 순서도 같다 — 이름만 새 반 번호로 바꾼다
        for (const [index, room] of classroom.rooms.entries()) {
          await tx.room.update({ where: { id: room.id }, data: { name: plannedRooms[index].name } });
        }
      }

      return next;
    });

    return NextResponse.json({ classroom: updated, reset });
  })(req);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { grade: gradeStr, id: idStr } = await params;
  const ids = parseIds(gradeStr, idStr);
  if (!ids) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { grade, id } = ids;

  return withGradeAuth(grade, async () => {
    const classroom = await findOwnedClassroom(id, grade);
    if (!classroom) {
      return NextResponse.json({ error: "교실을 찾을 수 없습니다." }, { status: 404 });
    }

    const roomIds = classroom.rooms.map((room) => room.id);
    await prisma.$transaction(async (tx) => {
      await tx.seatLayout.deleteMany({ where: { roomId: { in: roomIds } } });
      await tx.room.deleteMany({ where: { id: { in: roomIds } } });
      await tx.classroom.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  })(req);
}
```

- [ ] **Step 5: session-literal-guard 허용 목록 갱신**

`tests/session-literal-guard.test.ts`의 `SEAT_CONTEXT_ALLOWLIST` 에서 `"app/api/grade-admin/[grade]/seat-layouts/route.ts",` 다음 줄에 추가:

```ts
  "app/api/grade-admin/[grade]/classrooms/route.ts",
  "app/api/grade-admin/[grade]/classrooms/[id]/route.ts",
```

- [ ] **Step 6: 통과 확인**

Run: `npx tsc --noEmit && npx tsx tests/classroom-wiring.test.ts && npx tsx tests/session-literal-guard.test.ts && npx eslint "src/app/api/grade-admin/[grade]/classrooms"`
Expected: tsc 0 오류, 두 테스트 `checks passed`, eslint 경고 0.

`_count.select.seatLayouts.where` 가 tsc에서 거부되면(Prisma 버전에 따라 필터 count 미지원) GET을 아래처럼 바꾼다: rooms include에서 `_count` 대신 `seatLayouts: { where: { studentId: { not: null } }, select: { id: true } }` 를 include 하고 `assignedCount` 는 `room.seatLayouts.length` 로 합산.

- [ ] **Step 7: 커밋**

```bash
git add "src/app/api/grade-admin/[grade]/classrooms" tests/classroom-wiring.test.ts tests/session-literal-guard.test.ts
git commit -m "Add classroom config API with seat reset on geometry change

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: `ClassroomFrame` + 렌더러 3곳 배선

**Files:**
- Create: `src/components/seats/ClassroomFrame.tsx`
- Modify: `src/components/seats/SeatingEditor.tsx:426-455` (오후 그룹 렌더)
- Modify: `src/app/attendance/[grade]/page.tsx:1018-1042` (오후 그룹 카드)
- Modify: `src/components/seats/SeatPrintGroup.tsx`
- Test: `tests/classroom-wiring.test.ts` (렌더러 절 추가), `tests/seat-print-wiring.test.ts` (변경 없음 — 통과 유지 확인)

**Interfaces:**
- Consumes: `corridorLabels`, `CorridorSide` (Task 2), `PrintGroup.classroom` (Task 3), `SEAT_CELL_GAP` (`src/lib/seats/print-layout.ts`)
- Produces: `ClassroomFrame` default export, props `{ corridorSide: CorridorSide; variant: "screen" | "print"; showTeacherDesk?: boolean; children: ReactNode }`, `export const PRINT_SIDE_LABEL_WIDTH = 20`

- [ ] **Step 1: 실패하는 배선 테스트 추가**

`tests/classroom-wiring.test.ts` 의 `console.log` 앞에 추가:

```ts
// --- ClassroomFrame: 인쇄에서도 쓰므로 dnd-kit 비의존, 라벨은 corridorLabels 에서만 ---
const frame = read("../src/components/seats/ClassroomFrame.tsx");
assert.doesNotMatch(frame, /@dnd-kit/, "ClassroomFrame 이 dnd-kit 에 의존함");
assert.match(frame, /corridorLabels\(/, "ClassroomFrame 이 corridorLabels 를 쓰지 않음");
assert.match(frame, /writingMode: "vertical-rl"/, "복도/창문 라벨이 세로 텍스트가 아님");
assert.match(frame, /whitespace-nowrap/, "라벨에 줄바꿈 금지 클래스 없음");
assert.match(frame, /PRINT_SIDE_LABEL_WIDTH/, "인쇄 라벨 폭 상수 없음");
assert.match(frame, /교탁/, "ClassroomFrame 에 교탁 없음");
assert.doesNotMatch(frame, /gridTemplateColumns:[^\n]*1fr[^\n]*isPrint \?/, "인쇄 variant 에 1fr 사용 의심");

// --- 렌더러 3곳이 학급 그룹을 ClassroomFrame 으로 그린다 ---
for (const [label, rel] of [
  ["SeatingEditor", "../src/components/seats/SeatingEditor.tsx"],
  ["attendance page", "../src/app/attendance/[grade]/page.tsx"],
  ["SeatPrintGroup", "../src/components/seats/SeatPrintGroup.tsx"],
] as const) {
  const src = read(rel);
  assert.match(src, /import ClassroomFrame from/, `${label} 가 ClassroomFrame 을 import 하지 않음`);
  assert.match(src, /group\.classroom/, `${label} 가 group.classroom 으로 분기하지 않음`);
}
assert.match(read("../src/components/seats/SeatingEditor.tsx"), /variant="screen"/);
assert.match(read("../src/app/attendance/[grade]/page.tsx"), /variant="screen"/);
assert.match(read("../src/components/seats/SeatPrintGroup.tsx"), /variant="print"/);
// 편집기의 학급 그룹은 RoomGrid 자체 교탁을 끄고 프레임 교탁 하나만 남긴다
assert.match(
  read("../src/components/seats/SeatingEditor.tsx"),
  /<ClassroomFrame[\s\S]*?<RoomGrid[\s\S]*?hideTeacherDesk[\s\S]*?<\/ClassroomFrame>/,
  "편집기 학급 그룹의 RoomGrid 가 hideTeacherDesk 가 아님"
);
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/classroom-wiring.test.ts`
Expected: FAIL — `ENOENT ... ClassroomFrame.tsx`

- [ ] **Step 3: `ClassroomFrame` 작성**

`src/components/seats/ClassroomFrame.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { corridorLabels, type CorridorSide } from "@/lib/seats/classroom-config";
import { SEAT_CELL_GAP } from "@/lib/seats/print-layout";

export const PRINT_SIDE_LABEL_WIDTH = 20;

export default function ClassroomFrame({
  corridorSide,
  variant,
  showTeacherDesk = true,
  children,
}: {
  corridorSide: CorridorSide;
  variant: "screen" | "print";
  showTeacherDesk?: boolean;
  children: ReactNode;
}) {
  const labels = corridorLabels(corridorSide);
  const isPrint = variant === "print";

  const sideLabel = (text: string) => (
    <div
      className={`flex items-center justify-center whitespace-nowrap ${
        isPrint ? "text-[11px] text-gray-700" : "text-[clamp(10px,2.5vw,12px)] text-[#94a3b8]"
      }`}
      style={{ writingMode: "vertical-rl", width: isPrint ? PRINT_SIDE_LABEL_WIDTH : undefined }}
    >
      {text}
    </div>
  );

  return (
    <div className="flex flex-col">
      <div
        className="grid items-stretch"
        style={{
          // 인쇄는 PrintPageFitter 가 자연 크기를 실측하므로 고정 px + max-content 만 쓴다.
          // 화면은 격자 최소 폭(min-content) 아래로 줄이지 않아 바깥 overflow-x-auto 래퍼가 스크롤한다.
          gridTemplateColumns: isPrint
            ? `${PRINT_SIDE_LABEL_WIDTH}px max-content ${PRINT_SIDE_LABEL_WIDTH}px`
            : "auto minmax(min-content, 1fr) auto",
          columnGap: isPrint ? `${SEAT_CELL_GAP * 2}px` : "4px",
        }}
      >
        {sideLabel(labels.left)}
        <div>{children}</div>
        {sideLabel(labels.right)}
      </div>

      {showTeacherDesk ? (
        isPrint ? (
          <div className="mt-3 self-center border border-gray-700 px-10 py-1 text-[13px] text-black whitespace-nowrap">
            교탁
          </div>
        ) : (
          <div className="mt-2 text-center py-1.5 bg-[#f9fafb] border-t border-dashed border-[#d1d5db] text-[#9ca3af] text-[clamp(10px,2.5vw,12px)] whitespace-nowrap">
            교탁
          </div>
        )
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: `SeatingEditor` 오후 그룹 배선**

import 추가(`import MiraeHallLayout ...` 아래):

```ts
import ClassroomFrame from "./ClassroomFrame";
```

오후 분기의 `{buildPrintGroups(rooms, "afternoon", grade).map((group, gi) => (` 블록 안 `<h3 ...>{group.title}</h3>` 다음의 `<div className="grid gap-3" ...>...</div>` 를 아래로 교체:

```tsx
                      {group.classroom ? (
                        <ClassroomFrame corridorSide={group.classroom.corridorSide} variant="screen">
                          <div
                            className="grid gap-3"
                            style={{ gridTemplateColumns: `repeat(${group.rooms.length}, 1fr)` }}
                          >
                            {group.rooms.map((room) => (
                              <RoomGrid
                                key={room.id}
                                room={room}
                                seats={seats.get(room.id) ?? EMPTY_ROOM_SEATS}
                                selectedSeatKey={selectedSeatKeyOf(room.id)}
                                onSelectSeat={handleSelectSeat}
                                compact
                                preserveSeatWidth
                                hideTeacherDesk
                              />
                            ))}
                          </div>
                        </ClassroomFrame>
                      ) : (
                        <div
                          className="grid gap-3"
                          style={{
                            gridTemplateColumns: `repeat(${
                              group.kind === "divisions-column" ? 1 : group.rooms.length
                            }, 1fr)`,
                          }}
                        >
                          {group.rooms.map((room) => (
                            <RoomGrid
                              key={room.id}
                              room={room}
                              seats={seats.get(room.id) ?? EMPTY_ROOM_SEATS}
                              selectedSeatKey={selectedSeatKeyOf(room.id)}
                              onSelectSeat={handleSelectSeat}
                              compact
                              preserveSeatWidth
                            />
                          ))}
                        </div>
                      )}
```

- [ ] **Step 5: 출석 페이지 오후 그룹 배선**

`src/app/attendance/[grade]/page.tsx` import 추가:

```ts
import ClassroomFrame from "@/components/seats/ClassroomFrame";
```

오후 분기(`/* 오후 좌석: 이름 접두사 기반 그룹 */`)의 그룹 카드 안에서, 헤더 `<div className="bg-[#f8fafc] ...">...</div>` 다음의 격자 div와 교탁 div 두 개를 아래로 교체:

```tsx
                    {group.classroom ? (
                      <div className="p-[clamp(6px,1.5vw,12px)]">
                        <ClassroomFrame corridorSide={group.classroom.corridorSide} variant="screen">
                          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${group.rooms.length}, 1fr)` }}>
                            {group.rooms.map((room) => (
                              <div key={room.id}>{renderAttendanceGrid(room)}</div>
                            ))}
                          </div>
                        </ClassroomFrame>
                      </div>
                    ) : (
                      <>
                        <div className={`grid gap-1 p-[clamp(6px,1.5vw,12px)]`} style={{ gridTemplateColumns: `repeat(${group.kind === "divisions-column" ? 1 : group.rooms.length}, 1fr)` }}>
                          {group.rooms.map((room) => (
                            <div key={room.id}>
                              {renderAttendanceGrid(room)}
                            </div>
                          ))}
                        </div>
                        <div className="text-center py-1.5 bg-[#f9fafb] border-t border-dashed border-[#d1d5db] text-[#9ca3af] text-[clamp(10px,2.5vw,12px)]">
                          교탁
                        </div>
                      </>
                    )}
```

- [ ] **Step 6: `SeatPrintGroup` 배선**

import 추가:

```ts
import ClassroomFrame from "./ClassroomFrame";
```

`const showTeacherDesk = ...` 를 아래로 교체(기존 `seat-print-wiring` 테스트의 정규식 `divisions-row"\s*\|\|[\s\S]{0,80}divisions-column"` 를 유지해야 한다):

```ts
  const isDivisions = group.kind === "divisions-row" || group.kind === "divisions-column";
  const showTeacherDesk = isDivisions && !group.classroom;
```

`{group.kind === "hall" ? (...) : (...)}` 삼항의 `: (` 이후 분단 격자 `<div className="grid items-start" ...>...</div>` 를 아래로 교체:

```tsx
      ) : group.classroom ? (
        <ClassroomFrame corridorSide={group.classroom.corridorSide} variant="print">
          <div
            className="grid items-start"
            style={{
              gridTemplateColumns: `repeat(${group.rooms.length}, max-content)`,
              columnGap: `${GROUP_GAP_PX}px`,
            }}
          >
            {group.rooms.map((room) => (
              <PrintRoomGrid
                key={room.id}
                room={room}
                seats={seatsByRoom.get(room.id) ?? EMPTY_SEATS}
                label={divisionLabel(room.name)}
              />
            ))}
          </div>
        </ClassroomFrame>
      ) : (
        <div
          className="grid items-start"
          style={{
            gridTemplateColumns:
              group.kind === "divisions-row"
                ? `repeat(${group.rooms.length}, max-content)`
                : "max-content",
            columnGap: `${GROUP_GAP_PX}px`,
            rowGap: `${GROUP_GAP_PX}px`,
          }}
        >
          {group.rooms.map((room) => (
            <PrintRoomGrid
              key={room.id}
              room={room}
              seats={seatsByRoom.get(room.id) ?? EMPTY_SEATS}
              label={group.kind === "stack" ? room.name : divisionLabel(room.name)}
            />
          ))}
        </div>
      )}
```

- [ ] **Step 7: 통과 확인**

Run: `npx tsc --noEmit && npx tsx tests/classroom-wiring.test.ts && npx tsx tests/seat-print-wiring.test.ts && npx tsx tests/seating-editor-responsive.test.ts && npx tsx tests/responsive-tables.test.ts && npx tsx tests/attendance-page-wiring.test.ts && npx eslint src/components/seats "src/app/attendance/[grade]/page.tsx"`
Expected: 모두 통과, eslint 경고는 기존 `no-img-element` 외 0.

- [ ] **Step 8: 커밋**

```bash
git add src/components/seats/ClassroomFrame.tsx src/components/seats/SeatingEditor.tsx src/components/seats/SeatPrintGroup.tsx "src/app/attendance/[grade]/page.tsx" tests/classroom-wiring.test.ts
git commit -m "Render classroom groups with corridor labels and a single teacher desk

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: `ClassroomConfigModal` + 편집기 버튼

**Files:**
- Create: `src/components/seats/ClassroomConfigModal.tsx`
- Modify: `src/components/seats/SeatingEditor.tsx` (상태·버튼·모달 마운트; 헤더는 `:372-392`)
- Test: `tests/classroom-wiring.test.ts` (모달 절 추가)

**Interfaces:**
- Consumes: GET/POST/PUT/DELETE `/api/grade-admin/[grade]/classrooms` (Task 4 응답 형태 `ClassroomSummary`), `CLASSROOM_LIMITS`, `CORRIDOR_SIDES`, `LAYOUT_TYPES`, `CORRIDOR_SIDE_LABELS`, `LAYOUT_TYPE_LABELS`, `COLS_BY_LAYOUT`, `isGeometryChanged`, `seatCountOf`, `parseClassroomConfig`, `type ClassroomConfig` (Task 2)
- Produces: `ClassroomConfigModal` default export, props `{ grade: number; onClose: () => void; onChanged: () => void }`

- [ ] **Step 1: 실패하는 배선 테스트 추가**

`tests/classroom-wiring.test.ts` 의 `console.log` 앞에 추가:

```ts
// --- ClassroomConfigModal ---
const modal = read("../src/components/seats/ClassroomConfigModal.tsx");
assert.match(modal, /\/api\/grade-admin\/\$\{grade\}\/classrooms/, "모달이 classrooms API 를 호출하지 않음");
assert.match(modal, /isGeometryChanged\(/, "모달이 초기화 여부를 클라이언트에서 판정하지 않음");
assert.match(modal, /parseClassroomConfig\(/, "모달이 저장 전 검증하지 않음");
assert.match(modal, /좌석이 초기화됩니다/, "초기화 확인 문구 없음");
assert.match(modal, /overflow-x-auto/, "학급 목록 표 래퍼에 가로 스크롤 없음");
assert.match(modal, /max-h-\[90dvh\]/, "모달 높이가 dvh 가 아님");
assert.doesNotMatch(modal, /100vh|\[90vh\]/, "vh 사용");
assert.match(modal, /min-h-11/, "버튼 44px 터치 타겟 없음");
assert.match(modal, /role="dialog"/, "dialog 역할 없음");

// --- SeatingEditor 가 오후 탭에서만 설정 모달을 연다 ---
const editor = read("../src/components/seats/SeatingEditor.tsx");
assert.match(editor, /import ClassroomConfigModal from/, "편집기가 모달을 import 하지 않음");
assert.match(editor, /교실 구조 설정/, "설정 버튼 없음");
assert.match(editor, /sessionType === "afternoon" && \(/, "설정 버튼이 오후 탭으로 한정되지 않음");
assert.match(editor, /onChanged=\{[^}]*layoutMutate/, "구조 변경 후 좌석 SWR 을 갱신하지 않음");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/classroom-wiring.test.ts`
Expected: FAIL — `ENOENT ... ClassroomConfigModal.tsx`

- [ ] **Step 3: 모달 작성**

`src/components/seats/ClassroomConfigModal.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  CLASSROOM_LIMITS,
  COLS_BY_LAYOUT,
  CORRIDOR_SIDES,
  CORRIDOR_SIDE_LABELS,
  LAYOUT_TYPES,
  LAYOUT_TYPE_LABELS,
  isGeometryChanged,
  parseClassroomConfig,
  seatCountOf,
  type ClassroomConfig,
  type ClassroomLayoutType,
  type CorridorSide,
} from "@/lib/seats/classroom-config";

type ClassroomSummary = {
  id: number;
  classNumber: number;
  corridorSide: CorridorSide;
  layoutType: ClassroomLayoutType;
  sortOrder: number;
  rowsPerDivision: number[];
  seatCount: number;
  assignedCount: number;
};

type FormState = {
  classNumber: string;
  corridorSide: CorridorSide;
  layoutType: ClassroomLayoutType;
  rowsPerDivision: number[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DEFAULT_FORM: FormState = {
  classNumber: "",
  corridorSide: "right",
  layoutType: "division",
  rowsPerDivision: [3, 3, 3],
};

function formFromSummary(summary: ClassroomSummary): FormState {
  return {
    classNumber: String(summary.classNumber),
    corridorSide: summary.corridorSide,
    layoutType: summary.layoutType,
    rowsPerDivision: [...summary.rowsPerDivision],
  };
}

function resizeRows(rows: number[], count: number): number[] {
  const fill = rows[rows.length - 1] ?? CLASSROOM_LIMITS.rows.min;
  return Array.from({ length: count }, (_, i) => rows[i] ?? fill);
}

function LayoutPreview({ config }: { config: ClassroomConfig }) {
  const cols = COLS_BY_LAYOUT[config.layoutType];
  return (
    <div className="flex items-end gap-2 overflow-x-auto py-1">
      {config.rowsPerDivision.map((rows, division) => (
        <div
          key={division}
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${cols}, 12px)` }}
        >
          {Array.from({ length: rows * cols }, (_, i) => (
            <div key={i} className="h-2 w-3 rounded-[2px] border border-gray-400 bg-white" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ClassroomConfigModal({
  grade,
  onClose,
  onChanged,
}: {
  grade: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const listUrl = `/api/grade-admin/${grade}/classrooms`;
  const { data, mutate, isLoading } = useSWR<{ classrooms: ClassroomSummary[] }>(listUrl, fetcher);
  const classrooms = data?.classrooms ?? [];

  const [editing, setEditing] = useState<ClassroomSummary | "new" | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const openNew = () => {
    setForm(DEFAULT_FORM);
    setError(null);
    setEditing("new");
  };

  const openEdit = (summary: ClassroomSummary) => {
    setForm(formFromSummary(summary));
    setError(null);
    setEditing(summary);
  };

  const parsed = parseClassroomConfig(form);
  const previewConfig = parsed.ok ? parsed.config : null;

  const notifyChanged = async () => {
    await mutate();
    onChanged();
  };

  const handleSubmit = async () => {
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const config = parsed.config;

    const target = editing === "new" ? null : editing;
    if (target) {
      const existingRooms = target.rowsPerDivision.map((rows, index) => ({
        cols: COLS_BY_LAYOUT[target.layoutType],
        rows,
        sortOrder: index + 1,
      }));
      if (isGeometryChanged(existingRooms, config) && target.assignedCount > 0) {
        const ok = confirm(
          `${grade}-${target.classNumber}반의 책상 구조가 바뀌어 현재 배정된 ${target.assignedCount}명의 좌석이 초기화됩니다. 계속할까요?`
        );
        if (!ok) return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(target ? `${listUrl}/${target.id}` : listUrl, {
        method: target ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "저장에 실패했습니다.");
        return;
      }
      await notifyChanged();
      setEditing(null);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (summary: ClassroomSummary) => {
    const suffix = summary.assignedCount > 0 ? ` 배정된 ${summary.assignedCount}명의 좌석이 초기화됩니다.` : "";
    if (!confirm(`${grade}-${summary.classNumber}반 교실을 삭제할까요?${suffix}`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${listUrl}/${summary.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "삭제에 실패했습니다.");
        return;
      }
      await notifyChanged();
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const divisionWord = form.layoutType === "division" ? "분단" : "열";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="교실 구조 설정"
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h3 className="whitespace-nowrap text-lg font-bold text-gray-900">{grade}학년 교실 구조 설정</h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 whitespace-nowrap rounded-md px-3 text-sm text-gray-600 hover:bg-gray-100"
          >
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {editing === null ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="whitespace-nowrap text-sm text-gray-500">칠판·교탁은 항상 아래쪽입니다.</p>
                <button
                  type="button"
                  onClick={openNew}
                  className="min-h-11 whitespace-nowrap rounded-md bg-blue-600 px-4 text-sm text-white hover:bg-blue-700"
                >
                  학급 추가
                </button>
              </div>

              {isLoading ? (
                <div className="py-8 text-center text-gray-400">불러오는 중...</div>
              ) : classrooms.length === 0 ? (
                <div className="rounded-lg border py-8 text-center text-gray-400">등록된 학급 교실이 없습니다.</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-2">학급</th>
                        <th className="whitespace-nowrap px-3 py-2">유형</th>
                        <th className="whitespace-nowrap px-3 py-2">복도</th>
                        <th className="whitespace-nowrap px-3 py-2">행 수</th>
                        <th className="whitespace-nowrap px-3 py-2">좌석</th>
                        <th className="whitespace-nowrap px-3 py-2">배정</th>
                        <th className="whitespace-nowrap px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {classrooms.map((c) => (
                        <tr key={c.id} className="border-t">
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{grade}-{c.classNumber}반</td>
                          <td className="whitespace-nowrap px-3 py-2">{LAYOUT_TYPE_LABELS[c.layoutType]}</td>
                          <td className="whitespace-nowrap px-3 py-2">{CORRIDOR_SIDE_LABELS[c.corridorSide]}</td>
                          <td className="whitespace-nowrap px-3 py-2">{c.rowsPerDivision.join(" / ")}</td>
                          <td className="whitespace-nowrap px-3 py-2">{c.seatCount}석</td>
                          <td className="whitespace-nowrap px-3 py-2">{c.assignedCount}명</td>
                          <td className="whitespace-nowrap px-3 py-1">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(c)}
                                className="min-h-11 whitespace-nowrap rounded-md border px-3 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDelete(c)}
                                className="min-h-11 whitespace-nowrap rounded-md border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3">
                <span className="w-24 shrink-0 whitespace-nowrap text-sm text-gray-700">반 번호</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={CLASSROOM_LIMITS.classNumber.min}
                  max={CLASSROOM_LIMITS.classNumber.max}
                  value={form.classNumber}
                  onChange={(e) => setForm({ ...form, classNumber: e.target.value })}
                  className="min-h-11 w-24 rounded-md border px-3 text-sm"
                />
              </label>

              <div className="flex items-center gap-3">
                <span className="w-24 shrink-0 whitespace-nowrap text-sm text-gray-700">복도 위치</span>
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                  {CORRIDOR_SIDES.map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setForm({ ...form, corridorSide: side })}
                      className={`min-h-11 whitespace-nowrap rounded-md px-4 text-sm ${
                        form.corridorSide === side ? "bg-white font-medium text-blue-700 shadow-sm" : "text-gray-600"
                      }`}
                    >
                      {CORRIDOR_SIDE_LABELS[side]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-24 shrink-0 whitespace-nowrap text-sm text-gray-700">배치 유형</span>
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                  {LAYOUT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, layoutType: type })}
                      className={`min-h-11 whitespace-nowrap rounded-md px-4 text-sm ${
                        form.layoutType === type ? "bg-white font-medium text-blue-700 shadow-sm" : "text-gray-600"
                      }`}
                    >
                      {LAYOUT_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3">
                <span className="w-24 shrink-0 whitespace-nowrap text-sm text-gray-700">{divisionWord} 개수</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={CLASSROOM_LIMITS.divisions.min}
                  max={CLASSROOM_LIMITS.divisions.max}
                  value={form.rowsPerDivision.length}
                  onChange={(e) => {
                    const count = Math.min(
                      CLASSROOM_LIMITS.divisions.max,
                      Math.max(CLASSROOM_LIMITS.divisions.min, Number(e.target.value) || CLASSROOM_LIMITS.divisions.min)
                    );
                    setForm({ ...form, rowsPerDivision: resizeRows(form.rowsPerDivision, count) });
                  }}
                  className="min-h-11 w-24 rounded-md border px-3 text-sm"
                />
              </label>

              <div className="flex items-start gap-3">
                <span className="w-24 shrink-0 whitespace-nowrap pt-3 text-sm text-gray-700">{divisionWord}별 행 수</span>
                <div className="flex flex-wrap gap-2">
                  {form.rowsPerDivision.map((rows, index) => (
                    <label key={index} className="flex items-center gap-1 text-sm text-gray-600">
                      <span className="whitespace-nowrap">{divisionWord}{index + 1}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={CLASSROOM_LIMITS.rows.min}
                        max={CLASSROOM_LIMITS.rows.max}
                        value={rows}
                        onChange={(e) => {
                          const next = [...form.rowsPerDivision];
                          next[index] = Number(e.target.value);
                          setForm({ ...form, rowsPerDivision: next });
                        }}
                        className="min-h-11 w-16 rounded-md border px-2 text-sm"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="whitespace-nowrap text-xs text-gray-500">미리보기 (아래가 칠판)</span>
                  <span className="whitespace-nowrap text-xs font-medium text-gray-700">
                    {previewConfig ? `총 ${seatCountOf(previewConfig)}석` : "입력값을 확인하세요"}
                  </span>
                </div>
                {previewConfig ? <LayoutPreview config={previewConfig} /> : null}
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="min-h-11 whitespace-nowrap rounded-md border px-4 text-sm text-gray-700"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSubmit}
                  className="min-h-11 whitespace-nowrap rounded-md bg-blue-600 px-4 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `SeatingEditor`에 버튼·모달 연결**

import 추가(`import ClassroomFrame from "./ClassroomFrame";` 아래):

```ts
import ClassroomConfigModal from "./ClassroomConfigModal";
```

상태 추가(`const [selectedSeat, setSelectedSeat] = ...` 아래):

```ts
  const [configOpen, setConfigOpen] = useState(false);
```

헤더의 `<div className="flex items-center gap-2">` 안, `출력` 버튼 앞에 추가:

```tsx
          {sessionType === "afternoon" && (
            <button
              onClick={() => setConfigOpen(true)}
              className="min-h-11 whitespace-nowrap rounded-md border border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-50"
            >
              교실 구조 설정
            </button>
          )}
```

컴포넌트 루트 `<div>` 의 마지막 자식(기존 `sticky bottom-2` 액션바 뒤)으로 추가. `DndContext` 밖이어야 dnd 훅 없는 모달이 정상 동작한다:

```tsx
      {configOpen && (
        <ClassroomConfigModal
          grade={grade}
          onClose={() => setConfigOpen(false)}
          onChanged={() => {
            layoutMutate();
          }}
        />
      )}
```

`layoutMutate` 후 기존 `useEffect([layoutData])` 가 `seats`·`dirty`·`selectedSeat` 를 서버 상태로 다시 초기화하므로 별도 처리 없음. 저장하지 않은 편집이 있을 때 구조를 바꾸면 편집이 사라지므로, 버튼 `onClick` 을 아래처럼 보호한다:

```tsx
              onClick={() => {
                if (dirty.size > 0 && !confirm("저장하지 않은 좌석 변경이 있습니다. 구조 설정을 열면 변경이 사라질 수 있습니다. 계속할까요?")) return;
                setConfigOpen(true);
              }}
```

- [ ] **Step 5: 통과 확인**

Run: `npx tsc --noEmit && npx tsx tests/classroom-wiring.test.ts && npx tsx tests/seating-editor-responsive.test.ts && npx tsx tests/session-literal-guard.test.ts && npx eslint src/components/seats`
Expected: 모두 통과. `session-literal-guard` 는 `SeatingEditor.tsx` 가 허용 목록에 있어 `"afternoon"` 비교가 허용된다.

- [ ] **Step 6: 브라우저 확인(수동)**

`npm run dev` 후 `admin / admin1234` 로 `/admin/seats` 오후 탭:
1. "교실 구조 설정" → 4·5·6반이 분단형/오른쪽/`3 / 3 / 3`/18석으로 보인다.
2. 4반 수정 → 행 수 `[6,6,5]` 저장 → 초기화 확인 창 → 확인 → 편집기 4반이 3분단 6·6·5행 빈 좌석, 좌우에 "창문"/"복도" 라벨, 하단 교탁 1개.
3. 복도만 "왼쪽"으로 바꿔 저장 → 확인 창 없음, 배정 유지, 라벨 좌우 반전.
4. 7반 단독형 2열 5행 추가 → 편집기에 `1열`/`2열` 1열 격자.
5. `/attendance/2` 오후1 탭·`출력` 인쇄 미리보기에서 같은 구조.

- [ ] **Step 7: 커밋**

```bash
git add src/components/seats/ClassroomConfigModal.tsx src/components/seats/SeatingEditor.tsx tests/classroom-wiring.test.ts
git commit -m "Add classroom structure settings modal to the seating editor

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: 검수 · 전체 테스트 · 프로젝트 지도

**Files:**
- Modify: `.claude/PROJECT_MAP.md` (에이전트가 갱신)
- 필요 시 Modify: Task 5·6에서 만든 UI 파일(리뷰 지적 수정)

- [ ] **Step 1: 전체 테스트 스크립트 실행**

스크래치패드에 스크립트를 만들어 실행한다(셸 루프는 워크트리 세션에서 거부될 수 있어 파일로):

```bash
cat > /private/tmp/claude-501/-Volumes-Chois-SD2-dev-selfstudy/run-all-tests.sh <<'EOF'
#!/bin/zsh
set -e
cd /Volumes/Chois_SD2/dev/selfstudy
for f in tests/*.test.ts; do
  echo "== $f"
  npx tsx "$f"
done
EOF
zsh /private/tmp/claude-501/-Volumes-Chois-SD2-dev-selfstudy/run-all-tests.sh
```

Expected: 모든 파일이 `checks passed` 를 출력하고 종료 코드 0. 실패하면 해당 Task 로 돌아가 수정 후 재실행.

- [ ] **Step 2: lint + tsc + build**

Run: `npx eslint && npx tsc --noEmit && npm run build`
Expected: eslint 오류 0(경고는 기존 `no-img-element` 7건만), tsc 0, build 성공.

- [ ] **Step 3: `responsive-ui-reviewer` 실행 후 위반 수정**

Agent 도구로 `responsive-ui-reviewer` 를 호출해 `src/components/seats/ClassroomFrame.tsx`, `src/components/seats/ClassroomConfigModal.tsx`, `src/components/seats/SeatingEditor.tsx`, `src/components/seats/SeatPrintGroup.tsx`, `src/app/attendance/[grade]/page.tsx` 를 검토시킨다. 보고된 위반은 같은 세션에서 수정하고 Step 1을 다시 실행한다.

- [ ] **Step 4: `project-map-updater` 실행**

Agent 도구로 `project-map-updater` 를 호출한다. 반영할 내용: `Classroom` 모델·enum 2개, `Room.classroomId`, `classroom-config.ts`, `ClassroomFrame`/`ClassroomConfigModal`, classrooms API 4개, `buildPrintGroups` 의 학급 그룹 규칙, 마이그레이션 `20260915000000_add_classrooms`(백필·좌석 보존), 테스트 3개 신규.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "Sync PROJECT_MAP with classroom layout configuration

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## 배포 메모 (실행자용)

- Railway 는 push 마다 `prisma migrate deploy` 를 실행한다(`package.json` `start`). 백필 SQL 은 좌석 배정을 건드리지 않지만, 배포 전 메모리 문서 `afternoon-split-deploy-pending.md` 의 JSON 백업 절차를 따른다.
- 배포 후 `/admin/seats` 오후 탭에서 4·5·6반이 학급 그룹으로 보이고 기존 배정이 그대로인지 확인한다.
