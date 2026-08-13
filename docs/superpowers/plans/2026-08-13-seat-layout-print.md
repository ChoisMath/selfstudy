# 좌석배치 인쇄(출력) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학년 관리자 좌석배치 탭에 `출력` 버튼을 추가해, 오후자습은 학급별로 · 야간자습은 도면 전체를 A4 한 페이지에 꽉 차게 인쇄한다.

**Architecture:** 순수 함수(그룹핑 · A4 기하 계산) → dnd 없는 읽기전용 좌석 격자 → 콘텐츠 실측 후 `transform: scale`로 A4에 맞추는 페이지 래퍼 → 새 탭 인쇄 미리보기 라우트 순으로 아래에서 위로 쌓는다. 방향(가로/세로)은 실측 비율로 자동 추천하고 교사 선택을 localStorage에 저장한다. DB · API 변경은 없다.

**Tech Stack:** Next.js 16 (App Router, client component), TypeScript, Tailwind CSS 4, SWR, CSS 명명 페이지(`@page`), `node:assert/strict` + `tsx` 테스트

**Spec:** `docs/superpowers/specs/2026-08-13-seat-layout-print-design.md`

## Global Constraints

- 새 파일 · 수정 파일 모두 **TypeScript**, `any` 금지. 타입이 모호하면 `unknown` + 타입 가드.
- 주석은 "왜"가 비자명할 때만. "무엇" 주석 금지.
- 인쇄물 텍스트에 **줄바꿈 금지** — 좌석 셀 · 라벨 · 버튼 라벨은 `whitespace-nowrap`.
- **DB 스키마 변경 없음, API 라우트 추가 없음, 환경변수 추가 없음.** 데이터는 기존 `GET /api/grade-admin/{grade}/seat-layouts?sessionType=...` 만 사용한다.
- 테스트는 프로젝트 관행을 따른다: 프레임워크 없이 `node:assert/strict` 최상위 assert, 마지막 줄에 `console.log("<이름> checks passed")`, 실행은 `npx.cmd tsx tests/<파일>`.
- 좌석 셀 크기 상수는 **`src/lib/seats/print-layout.ts` 한 곳에만** 정의한다. 컴포넌트에 숫자를 직접 쓰지 않는다.
- 화면(`SeatingEditor`) 렌더 결과는 Task 8 리팩터링 전후로 **동일해야 한다**.
- 커밋 메시지는 영문 한 줄 요약 + 필요 시 한글 본문. "update", "fix" 같은 단어 하나짜리 금지.

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/seats/print-layout.ts` (신규) | A4 기하 상수, 좌석 셀 크기, 방향 추천 · 배율 계산 순수 함수 |
| `src/lib/seats/print-groups.ts` (신규) | 방 목록 → 인쇄 그룹 분해 (화면/인쇄 공용) |
| `src/components/seats/PrintRoomGrid.tsx` (신규) | dnd 없는 읽기전용 좌석 격자 1개 (고정 셀 크기) |
| `src/components/seats/SeatPrintGroup.tsx` (신규) | 그룹 1개 = 제목 + kind별 분단 배치 + 교탁 |
| `src/components/seats/PrintPageFitter.tsx` (신규) | A4 페이지 박스 + 콘텐츠 실측 + 배율 적용 |
| `src/app/grade-admin/[grade]/seats/print/page.tsx` (신규) | 인쇄 미리보기 라우트 (툴바 + 페이지 나열) |
| `src/app/grade-admin/[grade]/seats/print/print.css` (신규) | `@page` 명명 페이지 + 인쇄 전용 규칙 |
| `src/components/seats/MiraeHallLayout.tsx` (수정) | `fitContent` 프롭 추가 |
| `src/components/seats/SeatingEditor.tsx` (수정) | `출력` 버튼 + 그룹핑을 공용 헬퍼로 교체 |

---

### Task 1: A4 기하 · 방향 추천 순수 함수

**Files:**
- Create: `src/lib/seats/print-layout.ts`
- Test: `tests/seat-print-layout.test.ts`

**Interfaces:**
- Consumes: 없음 (최하위 모듈)
- Produces:
  - `type Orientation = "landscape" | "portrait"`
  - `const MM_TO_PX: number`, `A4_SHORT_MM = 210`, `A4_LONG_MM = 297`, `PAGE_PADDING_MM = 8`
  - `const SEAT_CELL_WIDTH = 96`, `SEAT_CELL_HEIGHT = 60`, `SEAT_CELL_GAP = 4`
  - `pageSizeMm(orientation: Orientation): { width: number; height: number }`
  - `contentBoxPx(orientation: Orientation): { width: number; height: number }`
  - `suggestOrientation(contentWidth: number, contentHeight: number): Orientation`
  - `computeFitScale(contentWidth: number, contentHeight: number, orientation: Orientation): number`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/seat-print-layout.test.ts`:

```ts
import assert from "node:assert/strict";
import {
  contentBoxPx,
  computeFitScale,
  pageSizeMm,
  suggestOrientation,
} from "../src/lib/seats/print-layout";

// 용지 크기: 가로는 297×210, 세로는 210×297 (mm)
assert.deepEqual(pageSizeMm("landscape"), { width: 297, height: 210 });
assert.deepEqual(pageSizeMm("portrait"), { width: 210, height: 297 });

// 가용 영역: 양쪽 8mm 패딩 제외 후 px 환산 (1mm = 96/25.4 px)
const land = contentBoxPx("landscape");
assert.ok(Math.abs(land.width - 1062.05) < 0.1, `가로 가용폭 ${land.width}`);
assert.ok(Math.abs(land.height - 733.23) < 0.1, `가로 가용높이 ${land.height}`);

const port = contentBoxPx("portrait");
assert.ok(Math.abs(port.width - 733.23) < 0.1, `세로 가용폭 ${port.width}`);
assert.ok(Math.abs(port.height - 1062.05) < 0.1, `세로 가용높이 ${port.height}`);

// 방향 추천: 비율 r = 폭/높이 가 1 이상이면 가로, 미만이면 세로
assert.equal(suggestOrientation(620, 288), "landscape");   // 2-4반
assert.equal(suggestOrientation(496, 384), "landscape");   // 오후미래혜윰1
assert.equal(suggestOrientation(496, 544), "portrait");    // 오후미래혜윰2
assert.equal(suggestOrientation(100, 100), "landscape");   // 경계 r = 1
assert.equal(suggestOrientation(99, 100), "portrait");
// 측정 전(0) 방어
assert.equal(suggestOrientation(0, 0), "portrait");

// 배율: 콘텐츠가 가용 영역과 같으면 1
assert.ok(Math.abs(computeFitScale(land.width, land.height, "landscape") - 1) < 1e-9);
// 두 배 크면 0.5
assert.ok(Math.abs(computeFitScale(land.width * 2, land.height * 2, "landscape") - 0.5) < 1e-9);
// 폭·높이 중 더 빡빡한 쪽이 배율을 결정
assert.ok(Math.abs(computeFitScale(620, 288, "landscape") - land.width / 620) < 1e-9);
// 작은 콘텐츠는 확대되어 페이지를 채운다 (상한 없음)
assert.ok(computeFitScale(100, 100, "portrait") > 1);
// 측정 전(0) 방어
assert.equal(computeFitScale(0, 100, "portrait"), 1);
assert.equal(computeFitScale(100, 0, "portrait"), 1);

console.log("seat-print-layout checks passed");
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx.cmd tsx tests/seat-print-layout.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/seats/print-layout'`

- [ ] **Step 3: 구현**

`src/lib/seats/print-layout.ts`:

```ts
export type Orientation = "landscape" | "portrait";

export const MM_TO_PX = 96 / 25.4;

export const A4_SHORT_MM = 210;
export const A4_LONG_MM = 297;
export const PAGE_PADDING_MM = 8;

export const SEAT_CELL_WIDTH = 96;
export const SEAT_CELL_HEIGHT = 60;
export const SEAT_CELL_GAP = 4;

export function pageSizeMm(orientation: Orientation): { width: number; height: number } {
  return orientation === "landscape"
    ? { width: A4_LONG_MM, height: A4_SHORT_MM }
    : { width: A4_SHORT_MM, height: A4_LONG_MM };
}

export function contentBoxPx(orientation: Orientation): { width: number; height: number } {
  const { width, height } = pageSizeMm(orientation);
  return {
    width: (width - PAGE_PADDING_MM * 2) * MM_TO_PX,
    height: (height - PAGE_PADDING_MM * 2) * MM_TO_PX,
  };
}

// A4에서 축소 배율을 최대화하는 분기점은 정확히 폭/높이 = 1 이다.
export function suggestOrientation(contentWidth: number, contentHeight: number): Orientation {
  if (contentWidth <= 0 || contentHeight <= 0) return "portrait";
  return contentWidth / contentHeight >= 1 ? "landscape" : "portrait";
}

export function computeFitScale(
  contentWidth: number,
  contentHeight: number,
  orientation: Orientation
): number {
  if (contentWidth <= 0 || contentHeight <= 0) return 1;
  const box = contentBoxPx(orientation);
  return Math.min(box.width / contentWidth, box.height / contentHeight);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx.cmd tsx tests/seat-print-layout.test.ts`
Expected: PASS — `seat-print-layout checks passed`

- [ ] **Step 5: 커밋**

```bash
git add src/lib/seats/print-layout.ts tests/seat-print-layout.test.ts
git commit -m "Add A4 print geometry helpers for seat layout printing"
```

---

### Task 2: 인쇄 그룹 분해 순수 함수

**Files:**
- Create: `src/lib/seats/print-groups.ts`
- Test: `tests/seat-print-groups.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type PrintBaseRoom = { id: number; name: string; cols: number; rows: number; sortOrder: number }`
  - `type PrintGroupKind = "divisions-row" | "divisions-column" | "hall" | "stack"`
  - `type PrintGroup<T extends PrintBaseRoom = PrintBaseRoom> = { key: string; title: string; kind: PrintGroupKind; rooms: T[] }`
  - `roomPrefix(name: string): string`
  - `divisionLabel(name: string): string`
  - `buildPrintGroups<T extends PrintBaseRoom>(rooms: T[], sessionType: "afternoon" | "night", grade: number): PrintGroup<T>[]`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/seat-print-groups.test.ts`:

```ts
import assert from "node:assert/strict";
import {
  buildPrintGroups,
  divisionLabel,
  roomPrefix,
  type PrintBaseRoom,
} from "../src/lib/seats/print-groups";

const room = (id: number, name: string, cols: number, rows: number, sortOrder: number): PrintBaseRoom =>
  ({ id, name, cols, rows, sortOrder });

// 2학년 오후자습 실제 구성 (교실 3반 × 분단3 + 오후미래혜윰1 분단2 + 오후미래혜윰2 분단3)
const afternoonRooms: PrintBaseRoom[] = [
  room(1, "2-4반 분단1", 2, 3, 1),
  room(2, "2-4반 분단2", 2, 3, 2),
  room(3, "2-4반 분단3", 2, 3, 3),
  room(4, "2-5반 분단1", 2, 3, 4),
  room(5, "2-5반 분단2", 2, 3, 5),
  room(6, "2-5반 분단3", 2, 3, 6),
  room(7, "2-6반 분단1", 2, 3, 7),
  room(8, "2-6반 분단2", 2, 3, 8),
  room(9, "2-6반 분단3", 2, 3, 9),
  room(10, "오후미래혜윰1 분단1", 5, 2, 10),
  room(11, "오후미래혜윰1 분단2", 5, 2, 11),
  room(12, "오후미래혜윰2 분단1", 5, 2, 12),
  room(13, "오후미래혜윰2 분단2", 5, 2, 13),
  room(14, "오후미래혜윰2 분단3", 5, 2, 14),
];

const groups = buildPrintGroups(afternoonRooms, "afternoon", 2);

assert.equal(groups.length, 5);
assert.deepEqual(
  groups.map((g) => g.key),
  ["2-4반", "2-5반", "2-6반", "오후미래혜윰1", "오후미래혜윰2"]
);
assert.deepEqual(
  groups.map((g) => g.kind),
  ["divisions-row", "divisions-row", "divisions-row", "divisions-column", "divisions-column"]
);
assert.deepEqual(groups.map((g) => g.rooms.length), [3, 3, 3, 2, 3]);
assert.equal(groups[0].title, "2-4반");

// 입력 순서가 뒤섞여도 sortOrder 기준으로 정렬해 그룹핑한다
const shuffled = [...afternoonRooms].reverse();
const shuffledGroups = buildPrintGroups(shuffled, "afternoon", 2);
assert.deepEqual(
  shuffledGroups.map((g) => g.key),
  ["2-4반", "2-5반", "2-6반", "오후미래혜윰1", "오후미래혜윰2"]
);
assert.deepEqual(shuffledGroups[0].rooms.map((r) => r.id), [1, 2, 3]);

// 원본 배열을 변형하지 않는다
assert.equal(afternoonRooms[0].id, 1);

// 야간 2학년: 미래홀 도면 1그룹
const nightRooms: PrintBaseRoom[] = [
  room(20, "복도석", 1, 12, 0),
  room(21, "미래혜윰실2", 5, 4, 1),
  room(22, "미래202", 3, 2, 2),
  room(23, "미래아띠존", 4, 2, 3),
  room(24, "미래201", 3, 2, 4),
  room(25, "미래혜윰실1", 5, 10, 5),
];
const nightGrade2 = buildPrintGroups(nightRooms, "night", 2);
assert.equal(nightGrade2.length, 1);
assert.equal(nightGrade2[0].key, "night");
assert.equal(nightGrade2[0].title, "미래홀");
assert.equal(nightGrade2[0].kind, "hall");
assert.equal(nightGrade2[0].rooms.length, 6);

// 야간 1·3학년: 도면 없이 나열
const nightGrade1 = buildPrintGroups(nightRooms.slice(1), "night", 1);
assert.equal(nightGrade1.length, 1);
assert.equal(nightGrade1[0].kind, "stack");
const nightGrade3 = buildPrintGroups(nightRooms.slice(1), "night", 3);
assert.equal(nightGrade3[0].kind, "stack");

// 방이 없으면 빈 배열
assert.deepEqual(buildPrintGroups([], "afternoon", 2), []);
assert.deepEqual(buildPrintGroups([], "night", 2), []);

// 라벨 헬퍼
assert.equal(roomPrefix("2-4반 분단1"), "2-4반");
assert.equal(roomPrefix("복도석"), "복도석");
assert.equal(divisionLabel("2-4반 분단1"), "분단1");
assert.equal(divisionLabel("오후미래혜윰2 분단3"), "분단3");
assert.equal(divisionLabel("복도석"), "복도석");

console.log("seat-print-groups checks passed");
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx.cmd tsx tests/seat-print-groups.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/seats/print-groups'`

- [ ] **Step 3: 구현**

`src/lib/seats/print-groups.ts`:

```ts
export type PrintBaseRoom = {
  id: number;
  name: string;
  cols: number;
  rows: number;
  sortOrder: number;
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

export function buildPrintGroups<T extends PrintBaseRoom>(
  rooms: T[],
  sessionType: "afternoon" | "night",
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

  const groups: PrintGroup<T>[] = [];
  for (const currentRoom of sorted) {
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx.cmd tsx tests/seat-print-groups.test.ts`
Expected: PASS — `seat-print-groups checks passed`

- [ ] **Step 5: 커밋**

```bash
git add src/lib/seats/print-groups.ts tests/seat-print-groups.test.ts
git commit -m "Add seat print group decomposition helper"
```

---

### Task 3: 읽기전용 좌석 격자 컴포넌트

`RoomGrid`는 `useDroppable`/`useDraggable`을 호출하므로 `DndContext` 밖에서 렌더할 수 없고, React 훅은 조건부 호출이 불가능해 `readOnly` 프롭으로 우회할 수 없다. 그래서 인쇄 전용 표현 컴포넌트를 분리한다.

**Files:**
- Create: `src/components/seats/PrintRoomGrid.tsx`
- Test: `tests/seat-print-wiring.test.ts` (신규)

**Interfaces:**
- Consumes: `SEAT_CELL_WIDTH`, `SEAT_CELL_HEIGHT`, `SEAT_CELL_GAP` (Task 1)
- Produces:
  - `type PrintSeatStudent = { id: number; name: string; classNumber: number; studentNumber: number }`
  - `type PrintCellState = { studentId: number | null; student: PrintSeatStudent | null }`
  - `type PrintRoomSeats = Map<string, PrintCellState>` — 키는 `"{row}-{col}"`
  - `default PrintRoomGrid({ room, seats, label?, gapAfterRows? })`
    - `room: { id: number; name: string; cols: number; rows: number }`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/seat-print-wiring.test.ts` (신규 파일):

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// --- Task 3: PrintRoomGrid ---
const printRoomGrid = read("../src/components/seats/PrintRoomGrid.tsx");
// 읽기전용 보장: dnd-kit 의존이 없어야 DndContext 밖에서 렌더된다
assert.doesNotMatch(printRoomGrid, /@dnd-kit/, "PrintRoomGrid 가 dnd-kit 에 의존함");
// 셀 크기는 print-layout 상수에서만 온다
assert.match(printRoomGrid, /SEAT_CELL_WIDTH/, "PrintRoomGrid 가 셀 폭 상수를 쓰지 않음");
assert.match(printRoomGrid, /SEAT_CELL_HEIGHT/, "PrintRoomGrid 가 셀 높이 상수를 쓰지 않음");
assert.match(printRoomGrid, /whitespace-nowrap/, "PrintRoomGrid 셀에 줄바꿈 금지 클래스 없음");

console.log("seat-print-wiring checks passed");
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx.cmd tsx tests/seat-print-wiring.test.ts`
Expected: FAIL — `ENOENT ... PrintRoomGrid.tsx`

- [ ] **Step 3: 구현**

`src/components/seats/PrintRoomGrid.tsx`:

```tsx
"use client";

import { memo } from "react";
import {
  SEAT_CELL_GAP,
  SEAT_CELL_HEIGHT,
  SEAT_CELL_WIDTH,
} from "@/lib/seats/print-layout";

export type PrintSeatStudent = {
  id: number;
  name: string;
  classNumber: number;
  studentNumber: number;
};

export type PrintCellState = {
  studentId: number | null;
  student: PrintSeatStudent | null;
};

export type PrintRoomSeats = Map<string, PrintCellState>;

type PrintRoom = {
  id: number;
  name: string;
  cols: number;
  rows: number;
};

const SUB_BLOCK_GAP = SEAT_CELL_GAP * 3;

export default memo(function PrintRoomGrid({
  room,
  seats,
  label,
  gapAfterRows,
}: {
  room: PrintRoom;
  seats: PrintRoomSeats;
  label?: string;
  gapAfterRows?: number[];
}) {
  return (
    <div className="flex flex-col">
      {label ? (
        <div className="mb-1 text-center text-[13px] font-semibold text-black whitespace-nowrap">
          {label}
        </div>
      ) : null}

      {Array.from({ length: room.rows }, (_, r) => (
        <div
          key={`row-${r}`}
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${room.cols}, ${SEAT_CELL_WIDTH}px)`,
            columnGap: `${SEAT_CELL_GAP}px`,
            marginBottom:
              r === room.rows - 1
                ? 0
                : `${gapAfterRows?.includes(r) ? SUB_BLOCK_GAP : SEAT_CELL_GAP}px`,
          }}
        >
          {Array.from({ length: room.cols }, (_, c) => {
            const cell = seats.get(`${r}-${c}`);
            return (
              <div
                key={`${r}-${c}`}
                className="flex flex-col items-center justify-center overflow-hidden rounded-sm border border-gray-700"
                style={{ height: `${SEAT_CELL_HEIGHT}px` }}
              >
                {cell?.student ? (
                  <>
                    <span className="block text-[10px] leading-tight text-gray-500 whitespace-nowrap">
                      {cell.student.classNumber}-{cell.student.studentNumber}
                    </span>
                    <span className="block text-[13px] font-medium leading-tight text-black whitespace-nowrap">
                      {cell.student.name}
                    </span>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
});
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx.cmd tsx tests/seat-print-wiring.test.ts`
Expected: PASS — `seat-print-wiring checks passed`

- [ ] **Step 5: 커밋**

```bash
git add src/components/seats/PrintRoomGrid.tsx tests/seat-print-wiring.test.ts
git commit -m "Add read-only seat grid component for printing"
```

---

### Task 4: MiraeHallLayout 에 `fitContent` 모드 추가

현재 컨테이너에 `minWidth: "700px"` 와 `overflow-x-auto` 가 하드코딩되어 있어 자연 크기 측정이 왜곡된다. 인쇄에서만 이를 끄는 프롭을 추가한다. 기존 호출부(`SeatingEditor`, `HelpDemos`)는 프롭을 넘기지 않으므로 동작이 바뀌지 않는다.

**Files:**
- Modify: `src/components/seats/MiraeHallLayout.tsx:28-57` (스타일 상수), `:59-79` (컴포넌트 시그니처와 컨테이너 div)
- Test: `tests/seat-print-wiring.test.ts` (블록 추가)

**Interfaces:**
- Consumes: 없음
- Produces: `MiraeHallLayout<T>({ rooms, renderRoom, fitContent? })` — `fitContent === true` 이면 `minWidth` 없이 `width: max-content`, 가로 스크롤 없음

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/seat-print-wiring.test.ts` 의 `console.log(...)` 줄 **위에** 아래 블록을 추가:

```ts
// --- Task 4: MiraeHallLayout fitContent ---
const miraeHall = read("../src/components/seats/MiraeHallLayout.tsx");
assert.match(miraeHall, /fitContent\?: boolean/, "MiraeHallLayout 에 fitContent 프롭 없음");
assert.match(miraeHall, /containerFit/, "MiraeHallLayout 에 containerFit 스타일 없음");
assert.match(miraeHall, /max-content/, "containerFit 이 width: max-content 를 쓰지 않음");
// 기존 스크롤 모드는 유지되어야 한다
assert.match(miraeHall, /minWidth: "700px"/, "기존 minWidth 700px 가 사라짐");
assert.match(miraeHall, /overflow-x-auto/, "기존 가로 스크롤이 사라짐");
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx.cmd tsx tests/seat-print-wiring.test.ts`
Expected: FAIL — `MiraeHallLayout 에 fitContent 프롭 없음`

- [ ] **Step 3: 구현**

`src/components/seats/MiraeHallLayout.tsx` 에서 `GRID_STYLES` 정의(28-57행)를 아래로 교체:

```tsx
// 인라인 스타일 상수 (렌더링마다 새 객체 생성 방지)
const CONTAINER_BASE = {
  display: "grid" as const,
  gridTemplateColumns: "90px 1fr 44px 1fr",
  gridTemplateRows: "auto auto 1fr 1fr 1fr auto",
  gridTemplateAreas: `
    "sidebar label1   divider stairs"
    "sidebar room1    divider bath"
    "sidebar room2    divider room5"
    "sidebar room3    divider room5"
    "sidebar room4    divider room5"
    "sidebar teacher  divider room5"
  `,
  gap: "6px",
};

const GRID_STYLES = {
  sidebar: { gridArea: "sidebar" } as const,
  label1: { gridArea: "label1" } as const,
  room1: { gridArea: "room1" } as const,
  room2: { gridArea: "room2" } as const,
  room3: { gridArea: "room3" } as const,
  room4: { gridArea: "room4" } as const,
  room5: { gridArea: "room5" } as const,
  teacher: { gridArea: "teacher" } as const,
  divider: { gridArea: "divider" } as const,
  stairs: { gridArea: "stairs" } as const,
  bath: { gridArea: "bath" } as const,
  verticalText: { writingMode: "vertical-rl" } as const,
  container: { ...CONTAINER_BASE, minWidth: "700px" },
  containerFit: { ...CONTAINER_BASE, width: "max-content" },
};
```

컴포넌트 시그니처(59-65행)와 컨테이너 div(76-79행)를 교체:

```tsx
export default function MiraeHallLayout<T extends BaseRoom>({
  rooms,
  renderRoom,
  fitContent,
}: {
  rooms: T[];
  renderRoom: (room: T) => ReactNode;
  fitContent?: boolean;
}) {
```

```tsx
    <div
      className={`bg-white rounded-lg border p-4 ${fitContent ? "" : "overflow-x-auto"}`}
      style={fitContent ? GRID_STYLES.containerFit : GRID_STYLES.container}
    >
```

나머지 본문은 변경하지 않는다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx.cmd tsx tests/seat-print-wiring.test.ts`
Expected: PASS — `seat-print-wiring checks passed`

- [ ] **Step 5: 커밋**

```bash
git add src/components/seats/MiraeHallLayout.tsx tests/seat-print-wiring.test.ts
git commit -m "Add fitContent mode to MiraeHallLayout for print measurement"
```

---

### Task 5: 그룹 1개를 그리는 인쇄 콘텐츠 컴포넌트

**Files:**
- Create: `src/components/seats/SeatPrintGroup.tsx`
- Test: `tests/seat-print-wiring.test.ts` (블록 추가)

**Interfaces:**
- Consumes: `PrintGroup`, `divisionLabel` (Task 2), `PrintRoomGrid`/`PrintRoomSeats` (Task 3), `MiraeHallLayout` + `GAP_CONFIG` (Task 4)
- Produces: `default SeatPrintGroup({ group, grade, sessionType, seatsByRoom })`
  - `group: PrintGroup<SeatPrintRoom>` (`SeatPrintRoom = PrintBaseRoom`)
  - `seatsByRoom: Map<number, PrintRoomSeats>` — roomId → 좌석 맵

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/seat-print-wiring.test.ts` 의 `console.log(...)` 줄 **위에** 추가:

```ts
// --- Task 5: SeatPrintGroup ---
const seatPrintGroup = read("../src/components/seats/SeatPrintGroup.tsx");
assert.match(seatPrintGroup, /PrintRoomGrid/, "SeatPrintGroup 이 PrintRoomGrid 를 쓰지 않음");
assert.match(seatPrintGroup, /MiraeHallLayout/, "SeatPrintGroup 이 도면 레이아웃을 쓰지 않음");
assert.match(seatPrintGroup, /fitContent/, "SeatPrintGroup 이 도면을 fitContent 로 렌더하지 않음");
assert.match(seatPrintGroup, /GAP_CONFIG/, "SeatPrintGroup 이 서브블록 갭 설정을 넘기지 않음");
assert.match(seatPrintGroup, /divisionLabel/, "SeatPrintGroup 이 분단 라벨 헬퍼를 쓰지 않음");
assert.match(seatPrintGroup, /교탁/, "SeatPrintGroup 에 교탁 표시가 없음");
// 교탁은 오후자습(divisions-*)에서만 — 야간(hall/stack)에는 없다
assert.match(
  seatPrintGroup,
  /divisions-row"\s*\|\|[\s\S]{0,80}divisions-column"/,
  "교탁 표시 조건이 오후자습 두 kind 로 한정되지 않음"
);
assert.doesNotMatch(seatPrintGroup, /@dnd-kit/, "SeatPrintGroup 이 dnd-kit 에 의존함");
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx.cmd tsx tests/seat-print-wiring.test.ts`
Expected: FAIL — `ENOENT ... SeatPrintGroup.tsx`

- [ ] **Step 3: 구현**

`src/components/seats/SeatPrintGroup.tsx`:

```tsx
"use client";

import MiraeHallLayout, { GAP_CONFIG } from "./MiraeHallLayout";
import PrintRoomGrid, { type PrintRoomSeats } from "./PrintRoomGrid";
import { divisionLabel, type PrintBaseRoom, type PrintGroup } from "@/lib/seats/print-groups";

const EMPTY_SEATS: PrintRoomSeats = new Map();
const GROUP_GAP_PX = 16;

export default function SeatPrintGroup({
  group,
  grade,
  sessionType,
  seatsByRoom,
}: {
  group: PrintGroup<PrintBaseRoom>;
  grade: number;
  sessionType: "afternoon" | "night";
  seatsByRoom: Map<number, PrintRoomSeats>;
}) {
  const sessionLabel = sessionType === "afternoon" ? "오후자습" : "야간자습";
  const showTeacherDesk = group.kind === "divisions-row" || group.kind === "divisions-column";

  return (
    <div className="inline-flex flex-col items-center">
      <h2 className="mb-3 text-[18px] font-bold text-black whitespace-nowrap">
        {grade}학년 {sessionLabel} — {group.title}
      </h2>

      {group.kind === "hall" ? (
        <MiraeHallLayout
          rooms={group.rooms}
          fitContent
          renderRoom={(room) => (
            <PrintRoomGrid
              room={room}
              seats={seatsByRoom.get(room.id) ?? EMPTY_SEATS}
              label={room.name}
              gapAfterRows={GAP_CONFIG[room.name]}
            />
          )}
        />
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

      {showTeacherDesk ? (
        <div className="mt-3 border border-gray-700 px-10 py-1 text-[13px] text-black whitespace-nowrap">
          교탁
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx.cmd tsx tests/seat-print-wiring.test.ts`
Expected: PASS — `seat-print-wiring checks passed`

- [ ] **Step 5: 커밋**

```bash
git add src/components/seats/SeatPrintGroup.tsx tests/seat-print-wiring.test.ts
git commit -m "Add printable seat group component with per-kind layout"
```

---

### Task 6: A4 페이지 박스 + 실측 스케일러

**Files:**
- Create: `src/components/seats/PrintPageFitter.tsx`
- Test: `tests/seat-print-wiring.test.ts` (블록 추가)

**Interfaces:**
- Consumes: `Orientation`, `PAGE_PADDING_MM`, `pageSizeMm`, `computeFitScale`, `suggestOrientation` (Task 1)
- Produces: `default PrintPageFitter({ orientation, onMeasure?, children })`
  - `onMeasure?: (suggested: Orientation) => void` — 콘텐츠 크기가 바뀔 때만 호출

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/seat-print-wiring.test.ts` 의 `console.log(...)` 줄 **위에** 추가:

```ts
// --- Task 6: PrintPageFitter ---
const fitter = read("../src/components/seats/PrintPageFitter.tsx");
// 변환된 크기가 아닌 레이아웃 크기를 재야 하므로 offsetWidth/offsetHeight 를 쓴다
assert.match(fitter, /offsetWidth/, "PrintPageFitter 가 offsetWidth 로 측정하지 않음");
assert.match(fitter, /offsetHeight/, "PrintPageFitter 가 offsetHeight 로 측정하지 않음");
assert.doesNotMatch(
  fitter,
  /getBoundingClientRect/,
  "getBoundingClientRect 는 scale 적용 후 크기를 반환하므로 쓰면 안 됨"
);
assert.match(fitter, /useLayoutEffect/, "PrintPageFitter 가 레이아웃 측정 훅을 쓰지 않음");
assert.match(fitter, /computeFitScale/, "PrintPageFitter 가 배율 계산 함수를 쓰지 않음");
assert.match(fitter, /print-page-landscape/, "가로 페이지 클래스가 없음");
assert.match(fitter, /print-page-portrait/, "세로 페이지 클래스가 없음");
assert.match(fitter, /fonts/, "폰트 로드 후 재측정 처리가 없음");
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx.cmd tsx tests/seat-print-wiring.test.ts`
Expected: FAIL — `ENOENT ... PrintPageFitter.tsx`

- [ ] **Step 3: 구현**

`src/components/seats/PrintPageFitter.tsx`:

```tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  computeFitScale,
  pageSizeMm,
  suggestOrientation,
  PAGE_PADDING_MM,
  type Orientation,
} from "@/lib/seats/print-layout";

export default function PrintPageFitter({
  orientation,
  onMeasure,
  children,
}: {
  orientation: Orientation;
  onMeasure?: (suggested: Orientation) => void;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const measureCallbackRef = useRef(onMeasure);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontTick, setFontTick] = useState(0);

  useEffect(() => {
    measureCallbackRef.current = onMeasure;
  }, [onMeasure]);

  // 웹폰트가 늦게 로드되면 첫 측정값이 실제보다 작다. 로드 완료 후 한 번 더 잰다.
  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) setFontTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    if (width === size.width && height === size.height) return;
    setSize({ width, height });
    measureCallbackRef.current?.(suggestOrientation(width, height));
  }, [size.width, size.height, fontTick, children]);

  const scale = computeFitScale(size.width, size.height, orientation);
  const page = pageSizeMm(orientation);

  return (
    <div
      className={`print-page mx-auto mb-6 bg-white shadow-lg ${
        orientation === "landscape" ? "print-page-landscape" : "print-page-portrait"
      }`}
      style={{
        width: `${page.width}mm`,
        height: `${page.height}mm`,
        padding: `${PAGE_PADDING_MM}mm`,
      }}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        <div ref={contentRef} style={{ transform: `scale(${scale})` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx.cmd tsx tests/seat-print-wiring.test.ts`
Expected: PASS — `seat-print-wiring checks passed`

- [ ] **Step 5: 커밋**

```bash
git add src/components/seats/PrintPageFitter.tsx tests/seat-print-wiring.test.ts
git commit -m "Add A4 page fitter that scales measured content to fill the page"
```

---

### Task 7: 인쇄 미리보기 라우트 + 인쇄 CSS

**Files:**
- Create: `src/app/grade-admin/[grade]/seats/print/print.css`
- Create: `src/app/grade-admin/[grade]/seats/print/page.tsx`
- Test: `tests/seat-print-wiring.test.ts` (블록 추가)

**Interfaces:**
- Consumes: `buildPrintGroups` (Task 2), `SeatPrintGroup` (Task 5), `PrintPageFitter` (Task 6), `Orientation` (Task 1)
- Produces: 라우트 `/grade-admin/[grade]/seats/print?session=afternoon|night` (Task 8 이 이 URL 로 새 탭을 연다)

**배경 지식:**
- 이 라우트는 `src/app/grade-admin/[grade]/layout.tsx` 의 `<AdminNav />` 와 `<main className="max-w-7xl mx-auto px-4 py-3">` 안에서 렌더된다. 인쇄 시 이 여백이 A4 페이지 박스를 밀어내므로 CSS 로 무력화해야 한다. 전역 오염을 막기 위해 `body.seat-print-mode` 로 스코프한다.
- `useSearchParams()` 는 Suspense 경계가 없으면 빌드 시 경고/실패를 낸다. 페이지 본문을 `<Suspense>` 로 감싼다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/seat-print-wiring.test.ts` 의 `console.log(...)` 줄 **위에** 추가:

```ts
// --- Task 7: 인쇄 라우트 + CSS ---
const printCss = read("../src/app/grade-admin/[grade]/seats/print/print.css");
assert.match(printCss, /@page\s+portraitPage\s*\{[^}]*size:\s*A4 portrait/, "세로 명명 페이지 규칙 없음");
assert.match(printCss, /@page\s+landscapePage\s*\{[^}]*size:\s*A4 landscape/, "가로 명명 페이지 규칙 없음");
assert.match(printCss, /\.print-page-portrait\s*\{[^}]*page:\s*portraitPage/, "세로 page 속성 매핑 없음");
assert.match(printCss, /\.print-page-landscape\s*\{[^}]*page:\s*landscapePage/, "가로 page 속성 매핑 없음");
assert.match(printCss, /break-after:\s*page/, "페이지 분할 규칙 없음");
assert.match(printCss, /seat-print-mode/, "인쇄 모드 스코프 클래스 없음");
assert.match(printCss, /\.no-print/, "툴바 숨김 규칙 없음");

const printPage = read("../src/app/grade-admin/[grade]/seats/print/page.tsx");
assert.match(printPage, /buildPrintGroups/, "인쇄 페이지가 그룹 헬퍼를 쓰지 않음");
assert.match(printPage, /PrintPageFitter/, "인쇄 페이지가 페이지 피터를 쓰지 않음");
assert.match(printPage, /SeatPrintGroup/, "인쇄 페이지가 그룹 컴포넌트를 쓰지 않음");
assert.match(printPage, /Suspense/, "useSearchParams 용 Suspense 경계가 없음");
assert.match(printPage, /seatPrintOrientation:/, "localStorage 방향 저장 키가 없음");
assert.match(printPage, /seat-print-mode/, "body 인쇄 모드 클래스 토글이 없음");
assert.match(printPage, /window\.print\(\)/, "인쇄 실행이 없음");
// 기존 API 재사용 — 새 엔드포인트를 만들지 않는다
assert.match(printPage, /\/seat-layouts\?sessionType=/, "기존 좌석 API 를 쓰지 않음");
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx.cmd tsx tests/seat-print-wiring.test.ts`
Expected: FAIL — `ENOENT ... print/print.css`

- [ ] **Step 3-a: 인쇄 CSS 작성**

`src/app/grade-admin/[grade]/seats/print/print.css`:

```css
@page portraitPage {
  size: A4 portrait;
  margin: 0;
}

@page landscapePage {
  size: A4 landscape;
  margin: 0;
}

/* 1px 라도 넘치면 브라우저가 빈 페이지를 끼워 넣는다 */
.print-page {
  break-after: page;
  overflow: hidden;
}

.print-page:last-child {
  break-after: auto;
}

.print-page-portrait {
  page: portraitPage;
}

.print-page-landscape {
  page: landscapePage;
}

@media print {
  body.seat-print-mode nav,
  body.seat-print-mode .no-print {
    display: none !important;
  }

  body.seat-print-mode main {
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  body.seat-print-mode .print-page {
    margin: 0 !important;
    box-shadow: none !important;
  }
}
```

- [ ] **Step 3-b: 인쇄 페이지 작성**

`src/app/grade-admin/[grade]/seats/print/page.tsx`:

```tsx
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import PrintPageFitter from "@/components/seats/PrintPageFitter";
import type { PrintRoomSeats } from "@/components/seats/PrintRoomGrid";
import SeatPrintGroup from "@/components/seats/SeatPrintGroup";
import { buildPrintGroups, type PrintBaseRoom } from "@/lib/seats/print-groups";
import type { Orientation } from "@/lib/seats/print-layout";
import "./print.css";

type SeatStudent = {
  id: number;
  name: string;
  classNumber: number;
  studentNumber: number;
};

type SeatLayoutItem = {
  rowIndex: number;
  colIndex: number;
  studentId: number | null;
  student: SeatStudent | null;
};

type ApiRoom = PrintBaseRoom & { seatLayouts: SeatLayoutItem[] };
type ApiSession = { id: number; type: "afternoon" | "night"; rooms: ApiRoom[] };

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function orientationStorageKey(grade: number, sessionType: string) {
  return `seatPrintOrientation:${grade}:${sessionType}`;
}

function readStoredOrientations(key: string): Record<string, Orientation> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const result: Record<string, Orientation> = {};
    for (const [groupKey, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value === "landscape" || value === "portrait") result[groupKey] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function SeatPrintView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const grade = Number(params.grade);
  const sessionType: "afternoon" | "night" =
    searchParams.get("session") === "night" ? "night" : "afternoon";

  const { data, isLoading } = useSWR<{ sessions: ApiSession[] }>(
    `/api/grade-admin/${grade}/seat-layouts?sessionType=${sessionType}`,
    fetcher
  );

  const rooms = useMemo<ApiRoom[]>(() => data?.sessions?.[0]?.rooms ?? [], [data]);
  const groups = useMemo(
    () => buildPrintGroups(rooms, sessionType, grade),
    [rooms, sessionType, grade]
  );

  const seatsByRoom = useMemo(() => {
    const map = new Map<number, PrintRoomSeats>();
    for (const room of rooms) {
      const roomSeats: PrintRoomSeats = new Map();
      for (const layout of room.seatLayouts) {
        roomSeats.set(`${layout.rowIndex}-${layout.colIndex}`, {
          studentId: layout.studentId,
          student: layout.student,
        });
      }
      map.set(room.id, roomSeats);
    }
    return map;
  }, [rooms]);

  const [stored, setStored] = useState<Record<string, Orientation>>({});
  const [suggested, setSuggested] = useState<Record<string, Orientation>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setStored(readStoredOrientations(orientationStorageKey(grade, sessionType)));
  }, [grade, sessionType]);

  useEffect(() => {
    document.body.classList.add("seat-print-mode");
    return () => document.body.classList.remove("seat-print-mode");
  }, []);

  useEffect(() => {
    const sessionLabel = sessionType === "afternoon" ? "오후자습" : "야간자습";
    document.title = `${grade}학년 ${sessionLabel} 좌석배치`;
  }, [grade, sessionType]);

  const orientationOf = useCallback(
    (groupKey: string): Orientation => stored[groupKey] ?? suggested[groupKey] ?? "portrait",
    [stored, suggested]
  );

  const handleMeasure = useCallback((groupKey: string, next: Orientation) => {
    setSuggested((prev) => (prev[groupKey] === next ? prev : { ...prev, [groupKey]: next }));
  }, []);

  const setOrientation = (groupKey: string, next: Orientation) => {
    setStored((prev) => {
      const updated = { ...prev, [groupKey]: next };
      try {
        window.localStorage.setItem(
          orientationStorageKey(grade, sessionType),
          JSON.stringify(updated)
        );
      } catch {
        // 저장 실패(프라이빗 모드 등)는 이번 세션 선택만 유지하면 충분하다
      }
      return updated;
    });
  };

  const toggleExcluded = (groupKey: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const visibleGroups = groups.filter((group) => !excluded.has(group.key));

  if (isLoading) {
    return <div className="py-12 text-center text-gray-500">불러오는 중...</div>;
  }

  if (groups.length === 0) {
    return <div className="py-12 text-center text-gray-400">인쇄할 좌석 배치가 없습니다.</div>;
  }

  return (
    <div>
      <div className="no-print sticky top-14 z-40 mb-4 rounded-lg border bg-white p-2">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-3">
            {groups.map((group) => {
              const orientation = orientationOf(group.key);
              return (
                <div
                  key={group.key}
                  className="flex items-center gap-1 whitespace-nowrap rounded border px-2 py-1"
                >
                  <label className="flex items-center gap-1 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={!excluded.has(group.key)}
                      onChange={() => toggleExcluded(group.key)}
                    />
                    {group.title}
                  </label>
                  <div className="ml-1 flex overflow-hidden rounded border">
                    <button
                      type="button"
                      onClick={() => setOrientation(group.key, "landscape")}
                      className={`min-h-11 px-2 text-xs whitespace-nowrap ${
                        orientation === "landscape" ? "bg-blue-600 text-white" : "bg-white text-gray-600"
                      }`}
                    >
                      가로
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation(group.key, "portrait")}
                      className={`min-h-11 px-2 text-xs whitespace-nowrap ${
                        orientation === "portrait" ? "bg-blue-600 text-white" : "bg-white text-gray-600"
                      }`}
                    >
                      세로
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={visibleGroups.length === 0}
              className="min-h-11 whitespace-nowrap rounded-md bg-blue-600 px-4 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              인쇄
            </button>
            <button
              type="button"
              onClick={() => window.close()}
              className="min-h-11 whitespace-nowrap rounded-md border px-4 text-sm text-gray-700"
            >
              닫기
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-400 whitespace-nowrap">
          가로·세로 혼합 인쇄는 Chrome·Edge에서 정확히 동작합니다.
        </p>
      </div>

      {/* flex 컨테이너 안에서는 인쇄 페이지 분할이 무시될 수 있어 블록 레이아웃을 쓴다 */}
      <div className="seat-print-pages">
        {visibleGroups.map((group) => (
          <PrintPageFitter
            key={group.key}
            orientation={orientationOf(group.key)}
            onMeasure={(next) => handleMeasure(group.key, next)}
          >
            <SeatPrintGroup
              group={group}
              grade={grade}
              sessionType={sessionType}
              seatsByRoom={seatsByRoom}
            />
          </PrintPageFitter>
        ))}
      </div>
    </div>
  );
}

export default function SeatPrintPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-gray-500">불러오는 중...</div>}>
      <SeatPrintView />
    </Suspense>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx.cmd tsx tests/seat-print-wiring.test.ts`
Expected: PASS — `seat-print-wiring checks passed`

- [ ] **Step 5: 페이지 렌더 확인**

Run: `npm.cmd run dev` (별도 터미널) 후 브라우저에서 `admin / admin1234` 로 로그인하고 `http://localhost:3000/grade-admin/2/seats/print?session=afternoon` 접속.
Expected: 상단 툴바에 `2-4반 / 2-5반 / 2-6반 / 오후미래혜윰1 / 오후미래혜윰2` 5개 항목, 아래에 A4 종이 카드 5장. 방향이 각각 가로·가로·가로·가로·세로.

- [ ] **Step 6: 커밋**

```bash
git add src/app/grade-admin/[grade]/seats/print tests/seat-print-wiring.test.ts
git commit -m "Add seat layout print preview route with per-group orientation"
```

---

### Task 8: SeatingEditor 에 출력 버튼 + 그룹핑 통합

**Files:**
- Modify: `src/components/seats/SeatingEditor.tsx:1-18` (import), `:313-324` (헤더), `:354-391` (오후자습 그룹핑)
- Test: `tests/seat-print-wiring.test.ts` (블록 추가)

**Interfaces:**
- Consumes: `buildPrintGroups` (Task 2), 인쇄 라우트 URL (Task 7)
- Produces: 없음 (최종 소비자)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/seat-print-wiring.test.ts` 의 `console.log(...)` 줄 **위에** 추가:

```ts
// --- Task 8: SeatingEditor 출력 버튼 + 그룹핑 통합 ---
const editor = read("../src/components/seats/SeatingEditor.tsx");
assert.match(editor, /출력/, "SeatingEditor 에 출력 버튼이 없음");
assert.match(editor, /seats\/print\?session=/, "출력 버튼이 인쇄 라우트를 열지 않음");
assert.match(editor, /window\.open/, "출력 버튼이 새 탭을 열지 않음");
assert.match(editor, /dirty\.size > 0[\s\S]{0,200}confirm/, "미저장 변경 확인 분기가 없음");
assert.match(editor, /buildPrintGroups/, "SeatingEditor 가 공용 그룹 헬퍼를 쓰지 않음");
// 인라인 그룹핑 잔재가 남아 있으면 화면/인쇄가 갈라진다
assert.doesNotMatch(editor, /currentPrefix/, "인라인 그룹핑 로직이 남아 있음");
assert.doesNotMatch(editor, /startsWith\("오후미래혜윰"\)/, "인라인 접두사 분기가 남아 있음");
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx.cmd tsx tests/seat-print-wiring.test.ts`
Expected: FAIL — `SeatingEditor 에 출력 버튼이 없음`

- [ ] **Step 3-a: import 추가**

`src/components/seats/SeatingEditor.tsx` 의 `MiraeHallLayout` import 아래에 추가:

```tsx
import { buildPrintGroups } from "@/lib/seats/print-groups";
```

- [ ] **Step 3-b: 출력 핸들러 추가**

`handleSave` 함수 정의 바로 아래에 추가:

```tsx
  const handlePrint = () => {
    if (
      dirty.size > 0 &&
      !confirm("저장하지 않은 변경사항은 인쇄에 반영되지 않습니다. 계속할까요?")
    ) {
      return;
    }
    window.open(`/grade-admin/${grade}/seats/print?session=${sessionType}`, "_blank");
  };
```

- [ ] **Step 3-c: 헤더에 버튼 배치**

현재 헤더 블록(313-324행)의 저장 버튼을 감싸도록 교체:

```tsx
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">좌석 편집</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="min-h-11 whitespace-nowrap rounded-md border border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-50"
          >
            출력
          </button>
          <button
            onClick={handleSave}
            disabled={saving || dirty.size === 0}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "저장 중..." : dirty.size > 0 ? `저장 (${dirty.size}개 교실 변경)` : "저장"}
          </button>
        </div>
      </div>
```

- [ ] **Step 3-d: 오후자습 그룹핑을 공용 헬퍼로 교체**

354-391행의 `) : sessionType === "afternoon" ? (` 블록 전체를 아래로 교체:

```tsx
              ) : sessionType === "afternoon" ? (
                /* 오후 자습: 이름 접두사 기반 그룹 */
                <div className="space-y-6">
                  {buildPrintGroups(rooms, "afternoon", grade).map((group, gi) => (
                    <div key={`${group.key}-${gi}`}>
                      <h3 className="font-semibold text-gray-700 mb-2">{group.title}</h3>
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
                            onRemoveStudent={handleRemoveStudent}
                            compact
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx.cmd tsx tests/seat-print-wiring.test.ts`
Expected: PASS — `seat-print-wiring checks passed`

- [ ] **Step 5: 화면 회귀 확인**

Run: dev 서버에서 `http://localhost:3000/grade-admin/2/seats` 접속 (오후자습 탭).
Expected: 리팩터링 **전과 동일한 배치** — `2-4반`·`2-5반`·`2-6반`은 분단 3개가 가로로, `오후미래혜윰1`·`오후미래혜윰2`는 분단이 세로 1열로. 드래그앤드롭 정상 동작. 헤더에 `출력` 버튼.

- [ ] **Step 6: 커밋**

```bash
git add src/components/seats/SeatingEditor.tsx tests/seat-print-wiring.test.ts
git commit -m "Add print button and share group helper in SeatingEditor"
```

---

### Task 9: 통합 검증 + 프로젝트 지도 갱신

**Files:**
- Modify: `.claude/PROJECT_MAP.md`

**Interfaces:**
- Consumes: Task 1-8 전체
- Produces: 없음

- [ ] **Step 1: 전체 테스트 실행**

Run:
```bash
npx.cmd tsx tests/seat-print-layout.test.ts
npx.cmd tsx tests/seat-print-groups.test.ts
npx.cmd tsx tests/seat-print-wiring.test.ts
```
Expected: 세 파일 모두 `... checks passed`

- [ ] **Step 2: 빌드 확인**

Run: `npm.cmd run build`
Expected: 성공. `/grade-admin/[grade]/seats/print` 가 라우트 목록에 나타남.
빌드가 `.next/dev/types/routes.d.ts` 문제로 막히면 dev 서버를 끄고 `.next/dev/types` 를 지운 뒤 재시도한다(과거 동일 사례 있음).

- [ ] **Step 3: 수동 인쇄 검증 (Chrome)**

1. `http://localhost:3000/grade-admin/2/seats` → 오후자습 탭 → `출력`
2. 새 탭에서 5페이지 확인, 방향 가로/가로/가로/가로/세로
3. `Ctrl+P` → 인쇄 미리보기에서 **페이지별 용지 방향이 실제로 섞여** 나오는지, 내용이 잘리지 않고 페이지를 채우는지 확인
4. `오후미래혜윰2`를 `가로`로 토글 → 미리보기 반영 확인 → 탭을 닫고 다시 `출력` → **선택이 기억**되는지 확인
5. `2-5반` 체크 해제 → 4페이지만 남는지 확인
6. 야간자습 탭 → `출력` → 미래홀 도면 1페이지가 잘리지 않고 채워지는지 확인
7. 좌석을 옮기고 저장하지 않은 채 `출력` → 확인창이 뜨는지 확인

- [ ] **Step 4: PROJECT_MAP 갱신**

`.claude/PROJECT_MAP.md` 를 다음과 같이 수정한다.

(1) 상단 `> 마지막 업데이트:` 를 `2026-08-13` 으로 변경.

(2) 디렉토리 구조의 `seats/` 항목을 아래로 교체:

```
│   ├── seats/
│   │   ├── SeatingEditor.tsx       # DndContext + 저장 + 출력 버튼 (props: grade, sessionType)
│   │   ├── RoomGrid.tsx            # 교실 격자 (droppable/draggable 셀)
│   │   ├── MiraeHallLayout.tsx     # 2학년 야간 미래홀 도면 (fitContent 옵션)
│   │   ├── PrintRoomGrid.tsx       # 인쇄용 읽기전용 좌석 격자 (dnd 없음, 고정 셀 크기)
│   │   ├── SeatPrintGroup.tsx      # 인쇄 그룹 1개 (제목 + kind별 배치 + 교탁)
│   │   ├── PrintPageFitter.tsx     # A4 페이지 박스 + 콘텐츠 실측 후 scale
│   │   └── UnassignedStudents.tsx  # 미배정 학생 풀 (검색/반별 그룹)
```

(3) `lib/` 항목에 추가:

```
│   ├── seats/
│   │   ├── print-groups.ts   # 방 목록 → 인쇄 그룹 분해 (화면/인쇄 공용)
│   │   └── print-layout.ts   # A4 기하 상수 + 방향 추천/배율 계산
```

(4) `grade-admin/[grade]/` 라우트 목록에 `seats/print/page.tsx` 추가:

```
│   │   ├── seats/page.tsx      # 2탭 (오후자습/야간자습) + SeatingEditor
│   │   ├── seats/print/page.tsx # 인쇄 미리보기 (그룹별 가로/세로 + 체크박스)
```

(5) `## 수정 이력 (주요 변경)` 맨 위에 항목 추가:

```markdown
### 2026-08-13: 좌석배치 인쇄(출력)
- **신규 lib `src/lib/seats/`**: `print-groups.ts`(방 이름 접두사 기반 그룹 분해, kind = divisions-row/divisions-column/hall/stack), `print-layout.ts`(A4 기하 상수, `suggestOrientation` = 폭/높이 ≥ 1 이면 가로, `computeFitScale`)
- **신규 컴포넌트 3개**: `PrintRoomGrid`(dnd 없는 읽기전용 격자 — RoomGrid 는 훅 때문에 DndContext 밖에서 못 씀), `SeatPrintGroup`(제목 + 분단 배치 + 교탁), `PrintPageFitter`(offsetWidth/Height 실측 → `transform: scale` 로 A4 채움)
- **신규 라우트**: `/grade-admin/[grade]/seats/print?session=` — 새 탭 인쇄 미리보기. 그룹별 체크박스 + 가로/세로 토글, 방향은 `localStorage["seatPrintOrientation:{grade}:{session}"]` 에 저장
- **혼합 방향 인쇄**: CSS 명명 페이지(`@page portraitPage/landscapePage` + `page:` 속성). Chrome·Edge 110+ 필요
- **수정**: `SeatingEditor`(출력 버튼 + 인라인 그룹핑 → `buildPrintGroups` 통합), `MiraeHallLayout`(`fitContent` 프롭으로 minWidth·가로스크롤 해제)
- **인쇄 단위**: 오후자습 = 학급별 1페이지, 야간자습 = 도면/나열 전체 1페이지
- DB 스키마·API·환경변수 변경 없음
```

- [ ] **Step 5: 커밋**

```bash
git add .claude/PROJECT_MAP.md
git commit -m "Sync PROJECT_MAP with seat layout printing"
```

---

## 참고

- 스펙: `docs/superpowers/specs/2026-08-13-seat-layout-print-design.md`
- `npm.cmd run lint` 는 이 기능과 무관한 기존 오류로 실패 상태다. 새로 추가한 파일에서 **새 오류가 늘지 않았는지만** 확인한다.
- Firefox 는 CSS 명명 페이지를 지원하지 않아 모든 페이지가 인쇄 대화상자의 단일 방향으로 나온다. 내용은 잘리지 않고 축소되므로 치명적이지 않다. 툴바 안내 문구로 대응한다.
