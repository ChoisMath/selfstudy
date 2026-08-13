# 2학년 오후자습 미래혜윰실 추가 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2학년 오후자습 세션에 "오후미래혜윰1" (분단2개, 20석), "오후미래혜윰2" (분단3개, 30석)을 추가하고, 출석/좌석편집 UI가 이를 정상 렌더링하도록 한다.

**Architecture:** 기존 오후자습 분단 패턴(Room per 분단)을 그대로 따름. 그룹핑 로직만 "3개씩 고정" → "이름 접두사 기반"으로 변경. DB 스크립트로 2학년 오후세션에 Room 5개 추가.

**Tech Stack:** Prisma (PrismaPg), Next.js App Router, TypeScript

---

### Task 1: DB 추가 스크립트 작성

**Files:**
- Create: `prisma/scripts/add-afternoon-mirae-rooms.ts`

- [ ] **Step 1: 스크립트 작성**

```typescript
import { PrismaClient, SessionType } from "../../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== 2학년 오후자습 미래혜윰실 추가 ===\n");

  // 2학년 오후자습 세션 찾기
  const session = await prisma.studySession.findUnique({
    where: { type_grade: { type: SessionType.afternoon, grade: 2 } },
  });
  if (!session) {
    console.error("2학년 오후자습 세션을 찾을 수 없습니다.");
    process.exit(1);
  }
  console.log(`세션 발견: id=${session.id}, name=${session.name}`);

  // 이미 존재하는지 확인
  const existing = await prisma.room.findFirst({
    where: { sessionId: session.id, name: { startsWith: "오후미래혜윰" } },
  });
  if (existing) {
    console.log("이미 오후미래혜윰 방이 존재합니다. 스킵합니다.");
    await prisma.$disconnect();
    return;
  }

  // 5개 방 추가
  const newRooms = [
    { name: "오후미래혜윰1 분단1", cols: 5, rows: 2, sortOrder: 10 },
    { name: "오후미래혜윰1 분단2", cols: 5, rows: 2, sortOrder: 11 },
    { name: "오후미래혜윰2 분단1", cols: 5, rows: 2, sortOrder: 12 },
    { name: "오후미래혜윰2 분단2", cols: 5, rows: 2, sortOrder: 13 },
    { name: "오후미래혜윰2 분단3", cols: 5, rows: 2, sortOrder: 14 },
  ];

  for (const room of newRooms) {
    const created = await prisma.room.create({
      data: { sessionId: session.id, ...room },
    });
    console.log(`  생성: ${room.name} (id=${created.id}, ${room.cols}×${room.rows})`);
  }

  console.log("\n완료: 5개 방 추가 (총 50석)");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
```

- [ ] **Step 2: 스크립트 실행**

Run: `cd E:/Projects/selfstudy && npx tsx prisma/scripts/add-afternoon-mirae-rooms.ts`
Expected: 5개 방 생성 메시지 출력

- [ ] **Step 3: Commit**

```bash
git add prisma/scripts/add-afternoon-mirae-rooms.ts
git commit -m "feat: add script to create afternoon mirae rooms for grade 2"
```

---

### Task 2: seed.ts 업데이트

**Files:**
- Modify: `prisma/seed.ts:137-147` (2학년 오후자습 방 목록)

- [ ] **Step 1: seed.ts에 2학년 미래혜윰실 추가**

`prisma/seed.ts`의 `afternoonRooms` 배열 아래에, grade === 2일 때 추가 방을 생성하는 코드를 추가한다.

기존 코드 (line 149-153):
```typescript
    for (const room of afternoonRooms) {
      await prisma.room.create({
        data: { sessionId: afternoonSession.id, ...room },
      });
    }
```

변경 후:
```typescript
    for (const room of afternoonRooms) {
      await prisma.room.create({
        data: { sessionId: afternoonSession.id, ...room },
      });
    }

    // 2학년: 오후 미래혜윰실 추가 (5열×2행 분단)
    if (grade === 2) {
      const afternoonMiraeRooms = [
        { name: "오후미래혜윰1 분단1", cols: 5, rows: 2, sortOrder: 10 },
        { name: "오후미래혜윰1 분단2", cols: 5, rows: 2, sortOrder: 11 },
        { name: "오후미래혜윰2 분단1", cols: 5, rows: 2, sortOrder: 12 },
        { name: "오후미래혜윰2 분단2", cols: 5, rows: 2, sortOrder: 13 },
        { name: "오후미래혜윰2 분단3", cols: 5, rows: 2, sortOrder: 14 },
      ];
      for (const room of afternoonMiraeRooms) {
        await prisma.room.create({
          data: { sessionId: afternoonSession.id, ...room },
        });
      }
    }
```

- [ ] **Step 2: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add afternoon mirae rooms to seed for grade 2"
```

---

### Task 3: 출석 페이지 그룹핑 로직 변경

**Files:**
- Modify: `src/app/attendance/[grade]/page.tsx:429-461`

- [ ] **Step 1: 오후자습 그룹핑을 이름 접두사 기반으로 변경**

기존 코드 (line 431-461):
```tsx
            <div className="flex flex-col gap-5">
              {(() => {
                const sorted = [...rooms].sort((a, b) => a.sortOrder - b.sortOrder);
                const groups: typeof rooms[] = [];
                for (let i = 0; i < sorted.length; i += 3) {
                  groups.push(sorted.slice(i, i + 3));
                }
                return groups.map((group, gi) => (
```

변경 후:
```tsx
            <div className="flex flex-col gap-5">
              {(() => {
                const sorted = [...rooms].sort((a, b) => a.sortOrder - b.sortOrder);
                const groups: typeof rooms[] = [];
                let currentGroup: typeof rooms = [];
                let currentPrefix = "";
                for (const room of sorted) {
                  const prefix = room.name.split(" ")[0];
                  if (prefix !== currentPrefix && currentGroup.length > 0) {
                    groups.push(currentGroup);
                    currentGroup = [];
                  }
                  currentPrefix = prefix;
                  currentGroup.push(room);
                }
                if (currentGroup.length > 0) groups.push(currentGroup);
                return groups.map((group, gi) => (
```

나머지 JSX (`<div key={gi}>` 이하)는 변경 없음. 단, `grid-cols-3`은 그룹 내 분단 수에 맞게 동적으로 변경:

기존:
```tsx
                    <div className="grid grid-cols-3 gap-1 p-[clamp(6px,1.5vw,12px)]">
```

변경 후:
```tsx
                    <div className={`grid gap-1 p-[clamp(6px,1.5vw,12px)]`} style={{ gridTemplateColumns: `repeat(${group.length}, 1fr)` }}>
```

- [ ] **Step 2: 브라우저에서 확인**

URL: `/attendance/2` → 오후자습 탭
Expected: 기존 3개 교실 + 오후미래혜윰1 (2분단) + 오후미래혜윰2 (3분단) 순서로 표시

- [ ] **Step 3: Commit**

```bash
git add src/app/attendance/[grade]/page.tsx
git commit -m "feat: change afternoon room grouping to name-prefix based"
```

---

### Task 4: 좌석편집기 그룹핑 로직 변경

**Files:**
- Modify: `src/components/seats/SeatingEditor.tsx:343-371`

- [ ] **Step 1: SeatingEditor 오후자습 그룹핑을 동일하게 변경**

기존 코드 (line 346-371):
```tsx
                <div className="space-y-6">
                  {(() => {
                    // sortOrder 기준 3개씩 그룹화 (각 반)
                    const groups: typeof rooms[] = [];
                    const sorted = [...rooms].sort((a, b) => a.sortOrder - b.sortOrder);
                    for (let i = 0; i < sorted.length; i += 3) {
                      groups.push(sorted.slice(i, i + 3));
                    }
                    return groups.map((group, gi) => (
                      <div key={gi}>
                        <h3 className="font-semibold text-gray-700 mb-2">
                          {group[0]?.name.split(" ")[0]}
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
```

변경 후:
```tsx
                <div className="space-y-6">
                  {(() => {
                    const sorted = [...rooms].sort((a, b) => a.sortOrder - b.sortOrder);
                    const groups: typeof rooms[] = [];
                    let currentGroup: typeof rooms = [];
                    let currentPrefix = "";
                    for (const room of sorted) {
                      const prefix = room.name.split(" ")[0];
                      if (prefix !== currentPrefix && currentGroup.length > 0) {
                        groups.push(currentGroup);
                        currentGroup = [];
                      }
                      currentPrefix = prefix;
                      currentGroup.push(room);
                    }
                    if (currentGroup.length > 0) groups.push(currentGroup);
                    return groups.map((group, gi) => (
                      <div key={gi}>
                        <h3 className="font-semibold text-gray-700 mb-2">
                          {group[0]?.name.split(" ")[0]}
                        </h3>
                        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${group.length}, 1fr)` }}>
```

나머지 JSX는 변경 없음.

- [ ] **Step 2: 좌석배치 편집기에서 확인**

URL: `/admin/seats` → 2학년 오후자습 탭, 또는 `/grade-admin/2/seats` → 오후자습 탭
Expected: 기존 3개 교실 + 오후미래혜윰1 (2분단) + 오후미래혜윰2 (3분단) 정상 표시, 드래그앤드롭 작동

- [ ] **Step 3: Commit**

```bash
git add src/components/seats/SeatingEditor.tsx
git commit -m "feat: change SeatingEditor afternoon grouping to name-prefix based"
```
