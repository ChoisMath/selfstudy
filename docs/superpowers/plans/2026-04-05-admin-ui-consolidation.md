# 관리자 UI 통합 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 메뉴 8개를 5개로 통합하고, SeatingPeriod를 제거하며, 감독배정을 월간 캘린더로 전환한다.

**Architecture:** DB 마이그레이션(SeatingPeriod 제거) → API 수정(seat-layouts, attendance) → 공유 컴포넌트 생성(MonthlyCalendar) → SeatingEditor 리팩토링 → 신규 사용자관리 페이지 → 좌석배치/감독배정 페이지 개편 → 네비게이션 업데이트 → 기존 페이지/컴포넌트 삭제

**Tech Stack:** Next.js 16 (App Router), Prisma 7, TypeScript, Tailwind CSS 4, SWR, @dnd-kit

**Design Spec:** `docs/superpowers/specs/2026-04-05-admin-ui-consolidation-design.md`

---

## Task 1: DB 마이그레이션 — SeatingPeriod 제거

**Files:**
- Modify: `prisma/schema.prisma`
- Create: Migration file (auto-generated)

- [ ] **Step 1: Prisma 스키마에서 SeatingPeriod 제거 및 SeatLayout 수정**

`prisma/schema.prisma`에서 다음 변경:

1. `SeatingPeriod` 모델 전체 삭제 (lines 161-173)
2. `SeatLayout` 모델에서 `periodId` 제거, unique 제약조건 변경:

```prisma
model SeatLayout {
  id        Int  @id @default(autoincrement())
  roomId    Int  @map("room_id")
  rowIndex  Int  @map("row_index")
  colIndex  Int  @map("col_index")
  studentId Int? @map("student_id")

  room    Room     @relation(fields: [roomId], references: [id])
  student Student? @relation(fields: [studentId], references: [id])

  @@unique([roomId, rowIndex, colIndex])
  @@index([roomId])
  @@map("seat_layouts")
}
```

- [ ] **Step 2: 마이그레이션 SQL 직접 작성**

자동 마이그레이션은 데이터 손실 가능. 수동 SQL로 활성 기간 데이터만 보존:

```bash
npx prisma migrate dev --create-only --name remove-seating-period
```

생성된 migration.sql을 다음 내용으로 교체:

```sql
-- 활성 기간의 SeatLayout만 보존하기 위한 임시 테이블
CREATE TEMP TABLE active_layouts AS
SELECT sl.room_id, sl.row_index, sl.col_index, sl.student_id
FROM seat_layouts sl
JOIN seating_periods sp ON sl.period_id = sp.id
WHERE sp.is_active = true;

-- 기존 seat_layouts 삭제
DROP TABLE "seat_layouts";
DROP TABLE "seating_periods";

-- 새 seat_layouts 생성 (period_id 없음)
CREATE TABLE "seat_layouts" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "row_index" INTEGER NOT NULL,
    "col_index" INTEGER NOT NULL,
    "student_id" INTEGER,
    CONSTRAINT "seat_layouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seat_layouts_room_id_row_index_col_index_key" ON "seat_layouts"("room_id", "row_index", "col_index");
CREATE INDEX "seat_layouts_room_id_idx" ON "seat_layouts"("room_id");

ALTER TABLE "seat_layouts" ADD CONSTRAINT "seat_layouts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seat_layouts" ADD CONSTRAINT "seat_layouts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 활성 기간 데이터 복원
INSERT INTO seat_layouts (room_id, row_index, col_index, student_id)
SELECT room_id, row_index, col_index, student_id
FROM active_layouts;

DROP TABLE active_layouts;
```

- [ ] **Step 3: 마이그레이션 실행 및 클라이언트 재생성**

```bash
npx prisma migrate dev
npx prisma generate
```

Expected: 마이그레이션 성공, `SeatingPeriod` 타입이 generated client에서 사라짐

- [ ] **Step 4: 커밋**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: remove SeatingPeriod, simplify SeatLayout schema"
```

---

## Task 2: seat-layouts API 수정 — periodId 제거

**Files:**
- Modify: `src/app/api/grade-admin/[grade]/seat-layouts/route.ts`

- [ ] **Step 1: GET 핸들러에서 periodId 제거**

`src/app/api/grade-admin/[grade]/seat-layouts/route.ts`의 GET 함수를 다음으로 교체:

```typescript
import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET: 학년 + 세션타입의 좌석 배치 조회
export async function GET(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseInt(gradeStr, 10);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req) => {
    const { searchParams } = new URL(req.url);
    const sessionType = searchParams.get("sessionType");

    if (sessionType !== "afternoon" && sessionType !== "night") {
      return NextResponse.json(
        { error: "sessionType은 afternoon 또는 night이어야 합니다." },
        { status: 400 }
      );
    }

    const sessions = await prisma.studySession.findMany({
      where: { grade, type: sessionType },
      include: {
        rooms: {
          orderBy: { sortOrder: "asc" },
          include: {
            seatLayouts: {
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    grade: true,
                    classNumber: true,
                    studentNumber: true,
                  },
                },
              },
              orderBy: [{ rowIndex: "asc" }, { colIndex: "asc" }],
            },
          },
        },
      },
    });

    return NextResponse.json({ sessions });
  })(req);
}
```

- [ ] **Step 2: POST 핸들러에서 periodId 제거**

같은 파일의 POST 함수를 다음으로 교체:

```typescript
// POST: 좌석 배치 저장 (전체 교체 방식)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseInt(gradeStr, 10);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req) => {
    const body = await req.json();
    const { roomId, layouts } = body;

    if (!roomId || !Array.isArray(layouts)) {
      return NextResponse.json(
        { error: "roomId, layouts는 필수입니다." },
        { status: 400 }
      );
    }

    const rid = parseInt(roomId, 10);

    // Room이 해당 학년 세션에 속하는지 확인
    const room = await prisma.room.findFirst({
      where: {
        id: rid,
        session: { grade },
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "교실을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 트랜잭션: 기존 삭제 -> 새로 생성
    await prisma.$transaction(async (tx) => {
      await tx.seatLayout.deleteMany({
        where: { roomId: rid },
      });

      if (layouts.length > 0) {
        await tx.seatLayout.createMany({
          data: layouts.map(
            (l: { rowIndex: number; colIndex: number; studentId?: number | null }) => ({
              roomId: rid,
              rowIndex: l.rowIndex,
              colIndex: l.colIndex,
              studentId: l.studentId ?? null,
            })
          ),
        });
      }
    });

    return NextResponse.json({ success: true });
  })(req);
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/grade-admin/[grade]/seat-layouts/route.ts
git commit -m "feat: remove periodId from seat-layouts API"
```

---

## Task 3: attendance API 수정 — SeatingPeriod 의존 제거

**Files:**
- Modify: `src/app/api/attendance/route.ts`

- [ ] **Step 1: activePeriod 조회 제거, 직접 SeatLayout 조회로 변경**

`src/app/api/attendance/route.ts`에서 lines 22-62를 다음으로 교체:

기존:
```typescript
    // 현재 활성 좌석 배치 기간 조회
    const activePeriod = await prisma.seatingPeriod.findFirst({
      where: {
        grade: gradeNum,
        isActive: true,
        startDate: { lte: dateObj },
        endDate: { gte: dateObj },
      },
    });

    // 해당 학년 + 세션의 교실(Room) 목록
    const studySession = await prisma.studySession.findUnique({
      where: { type_grade: { type: session, grade: gradeNum } },
      include: {
        rooms: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!studySession) {
      return NextResponse.json({ rooms: [], attendances: {} });
    }

    // 좌석 배치 조회 (별도 쿼리)
    const seatLayouts = activePeriod
      ? await prisma.seatLayout.findMany({
          where: {
            periodId: activePeriod.id,
            roomId: { in: studySession.rooms.map((r) => r.id) },
          },
          include: {
            student: {
              include: {
                participationDays: {
                  where: { sessionType: session },
                },
              },
            },
          },
          orderBy: [{ rowIndex: "asc" }, { colIndex: "asc" }],
        })
      : [];
```

교체:
```typescript
    // 해당 학년 + 세션의 교실(Room) 목록
    const studySession = await prisma.studySession.findUnique({
      where: { type_grade: { type: session, grade: gradeNum } },
      include: {
        rooms: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!studySession) {
      return NextResponse.json({ rooms: [], attendances: {} });
    }

    // 좌석 배치 조회 (SeatingPeriod 없이 직접 조회)
    const seatLayouts = await prisma.seatLayout.findMany({
      where: {
        roomId: { in: studySession.rooms.map((r) => r.id) },
      },
      include: {
        student: {
          include: {
            participationDays: {
              where: { sessionType: session },
            },
          },
        },
      },
      orderBy: [{ rowIndex: "asc" }, { colIndex: "asc" }],
    });
```

나머지 코드(lines 64 이후)는 변경 없음.

- [ ] **Step 2: 사용하지 않는 import 정리**

`import type { SessionType } from "@/generated/prisma/client";`는 유지 (여전히 사용됨).

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/attendance/route.ts
git commit -m "feat: remove SeatingPeriod dependency from attendance API"
```

---

## Task 4: seating-periods API 삭제

**Files:**
- Delete: `src/app/api/grade-admin/[grade]/seating-periods/route.ts`
- Delete: `src/app/api/grade-admin/[grade]/seating-periods/[id]/route.ts`

- [ ] **Step 1: seating-periods API 파일 삭제**

```bash
rm -rf src/app/api/grade-admin/\[grade\]/seating-periods
```

- [ ] **Step 2: 커밋**

```bash
git add -A src/app/api/grade-admin/[grade]/seating-periods
git commit -m "feat: remove seating-periods API routes"
```

---

## Task 5: SeatingEditor 리팩토링 — period prop 제거

**Files:**
- Modify: `src/components/seats/SeatingEditor.tsx`

- [ ] **Step 1: props에서 period 제거, sessionType prop 추가**

`src/components/seats/SeatingEditor.tsx`를 다음과 같이 수정:

1. `SeatingPeriod` 타입 정의 삭제 (lines 52-59)

2. 컴포넌트 props 변경 (lines 73-79):

기존:
```typescript
export default function SeatingEditor({
  grade,
  period,
}: {
  grade: number;
  period: SeatingPeriod;
}) {
```

교체:
```typescript
export default function SeatingEditor({
  grade,
  sessionType,
}: {
  grade: number;
  sessionType: "afternoon" | "night";
}) {
```

3. `activeTab` state 제거 (line 80), 대신 props의 `sessionType` 직접 사용

4. SWR fetch URL 변경 (lines 91-93):

기존:
```typescript
    `/api/grade-admin/${grade}/seat-layouts?periodId=${period.id}&sessionType=${activeTab}`,
```

교체:
```typescript
    `/api/grade-admin/${grade}/seat-layouts?sessionType=${sessionType}`,
```

5. 저장 시 body에서 periodId 제거 (lines 268-275):

기존:
```typescript
        return fetch(`/api/grade-admin/${grade}/seat-layouts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            periodId: period.id,
            roomId,
            layouts,
          }),
        });
```

교체:
```typescript
        return fetch(`/api/grade-admin/${grade}/seat-layouts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            layouts,
          }),
        });
```

6. 제목 변경 (line 317):

기존:
```typescript
        <h2 className="text-xl font-bold text-gray-900">{period.name} - 좌석 편집</h2>
```

교체:
```typescript
        <h2 className="text-xl font-bold text-gray-900">좌석 편집</h2>
```

7. 오후/야간 탭 UI 제거 (lines 328-349의 전체 탭 div 삭제). sessionType은 이제 부모에서 결정.

- [ ] **Step 2: 커밋**

```bash
git add src/components/seats/SeatingEditor.tsx
git commit -m "refactor: remove period prop from SeatingEditor, accept sessionType"
```

---

## Task 6: 관리자 좌석배치 페이지 — 6개 탭으로 개편

**Files:**
- Modify: `src/app/admin/seats/page.tsx`

- [ ] **Step 1: 6개 탭 구조로 전체 교체**

`src/app/admin/seats/page.tsx`를 다음으로 전체 교체:

```typescript
"use client";

import { useState } from "react";
import SeatingEditor from "@/components/seats/SeatingEditor";

type TabConfig = {
  label: string;
  grade: number;
  sessionType: "afternoon" | "night";
};

const TABS: TabConfig[] = [
  { label: "1학년 오자", grade: 1, sessionType: "afternoon" },
  { label: "1학년 야자", grade: 1, sessionType: "night" },
  { label: "2학년 오자", grade: 2, sessionType: "afternoon" },
  { label: "2학년 야자", grade: 2, sessionType: "night" },
  { label: "3학년 오자", grade: 3, sessionType: "afternoon" },
  { label: "3학년 야자", grade: 3, sessionType: "night" },
];

export default function AdminSeatsPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = TABS[activeIdx];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">좌석 배치</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIdx(idx)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeIdx === idx
                ? "bg-white text-blue-700 shadow-sm font-medium"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SeatingEditor
        key={`${active.grade}-${active.sessionType}`}
        grade={active.grade}
        sessionType={active.sessionType}
      />
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/admin/seats/page.tsx
git commit -m "feat: admin seats page with 6 grade×session tabs"
```

---

## Task 7: 학년관리 좌석배치 페이지 — 오후/야간 탭

**Files:**
- Modify: `src/app/grade-admin/[grade]/seats/page.tsx`

- [ ] **Step 1: 오후자습/야간자습 2개 탭으로 전체 교체**

`src/app/grade-admin/[grade]/seats/page.tsx`를 다음으로 전체 교체:

```typescript
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import SeatingEditor from "@/components/seats/SeatingEditor";

export default function GradeAdminSeatsPage() {
  const params = useParams();
  const grade = Number(params.grade);
  const [sessionType, setSessionType] = useState<"afternoon" | "night">("afternoon");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">좌석 배치</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setSessionType("afternoon")}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            sessionType === "afternoon"
              ? "bg-white text-blue-700 shadow-sm font-medium"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          오후자습
        </button>
        <button
          onClick={() => setSessionType("night")}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            sessionType === "night"
              ? "bg-white text-blue-700 shadow-sm font-medium"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          야간자습
        </button>
      </div>

      <SeatingEditor
        key={`${grade}-${sessionType}`}
        grade={grade}
        sessionType={sessionType}
      />
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/grade-admin/[grade]/seats/page.tsx
git commit -m "feat: grade-admin seats page with afternoon/night tabs"
```

---

## Task 8: MonthlyCalendar 공유 컴포넌트 생성

**Files:**
- Create: `src/components/admin-shared/MonthlyCalendar.tsx`

- [ ] **Step 1: 월간 달력 컴포넌트 작성**

`src/components/admin-shared/MonthlyCalendar.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

type Teacher = { id: number; name: string };
type Assignment = {
  id: number;
  teacherId: number;
  date: string;
  grade: number;
  sessionType: "afternoon" | "night";
  teacher: { id: number; name: string };
};

type SlotConfig = {
  grade: number;
  sessionType: "afternoon" | "night";
  label: string;
};

const SESSION_LABELS: Record<string, string> = {
  afternoon: "오",
  night: "야",
};
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];

  // 첫 주 앞의 빈칸
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null);
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

export default function MonthlyCalendar({
  grade,
  showAllGrades = false,
  apiBasePath,
}: {
  grade?: number;
  showAllGrades?: boolean;
  apiBasePath: string;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // 슬롯 설정: 전체 학년(6슬롯) or 단일 학년(2슬롯)
  const slots: SlotConfig[] = useMemo(() => {
    if (showAllGrades) {
      return [1, 2, 3].flatMap((g) => [
        { grade: g, sessionType: "afternoon" as const, label: `${g}학년 ${SESSION_LABELS.afternoon}` },
        { grade: g, sessionType: "night" as const, label: `${g}학년 ${SESSION_LABELS.night}` },
      ]);
    }
    return [
      { grade: grade!, sessionType: "afternoon" as const, label: "오후자습" },
      { grade: grade!, sessionType: "night" as const, label: "야간자습" },
    ];
  }, [grade, showAllGrades]);

  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  // 월의 첫날/마지막날
  const fromStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDate = new Date(year, month + 1, 0);
  const toStr = formatDate(lastDate);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBasePath}?from=${fromStr}&to=${toStr}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments);
      }
    } finally {
      setLoading(false);
    }
  }, [apiBasePath, fromStr, toStr]);

  const fetchTeachers = useCallback(async () => {
    const res = await fetch("/api/teachers");
    if (res.ok) {
      const data = await res.json();
      setTeachers(data.teachers);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);
  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const getAssignment = (date: Date, g: number, sessionType: string) =>
    assignments.find(
      (a) =>
        a.date.startsWith(formatDate(date)) &&
        a.grade === g &&
        a.sessionType === sessionType
    );

  const handleAssign = async (
    date: Date,
    g: number,
    sessionType: string,
    teacherId: number | null
  ) => {
    const dateStr = formatDate(date);
    const cellKey = `${dateStr}-${g}-${sessionType}`;
    setSaving(cellKey);
    try {
      if (teacherId === null) {
        const existing = getAssignment(date, g, sessionType);
        if (existing) {
          const res = await fetch(
            `/api/grade-admin/${g}/supervisor-assignments/${existing.id}`,
            { method: "DELETE" }
          );
          if (res.ok)
            setAssignments((prev) => prev.filter((a) => a.id !== existing.id));
        }
      } else {
        const res = await fetch(
          `/api/grade-admin/${g}/supervisor-assignments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teacherId, date: dateStr, sessionType }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          setAssignments((prev) => [
            ...prev.filter(
              (a) =>
                !(
                  a.date.startsWith(dateStr) &&
                  a.grade === g &&
                  a.sessionType === sessionType
                )
            ),
            data.assignment,
          ]);
        }
      }
    } finally {
      setSaving(null);
    }
  };

  const prevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

  return (
    <div>
      {/* 헤더: 월 전환 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          &larr; 이전달
        </button>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-gray-800">
            {year}년 {month + 1}월
          </span>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            이번달
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          다음달 &rarr;
        </button>
      </div>

      {loading && (
        <div className="text-center py-4 text-sm text-gray-400">로딩 중...</div>
      )}

      {/* 달력 그리드 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className={`px-2 py-2 text-center text-xs font-medium ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* 날짜 셀 */}
        <div className="grid grid-cols-7">
          {monthDays.map((date, idx) => (
            <div
              key={idx}
              className={`min-h-[100px] border-b border-r border-gray-100 p-1 ${
                !date
                  ? "bg-gray-50"
                  : isWeekend(date)
                    ? "bg-gray-50"
                    : ""
              }`}
            >
              {date && (
                <>
                  <div
                    className={`text-xs font-medium mb-1 ${
                      date.getDay() === 0
                        ? "text-red-400"
                        : date.getDay() === 6
                          ? "text-blue-400"
                          : "text-gray-700"
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  {!isWeekend(date) && (
                    <div className="space-y-0.5">
                      {slots.map((slot) => {
                        const assignment = getAssignment(
                          date,
                          slot.grade,
                          slot.sessionType
                        );
                        const cellKey = `${formatDate(date)}-${slot.grade}-${slot.sessionType}`;
                        const isSaving = saving === cellKey;
                        return (
                          <div key={cellKey} className="flex items-center gap-0.5">
                            <span className="text-[10px] text-gray-400 w-12 shrink-0 truncate">
                              {slot.label}
                            </span>
                            <select
                              value={assignment?.teacherId ?? ""}
                              disabled={loading || isSaving}
                              onChange={(e) =>
                                handleAssign(
                                  date,
                                  slot.grade,
                                  slot.sessionType,
                                  e.target.value === ""
                                    ? null
                                    : parseInt(e.target.value, 10)
                                )
                              }
                              className={`flex-1 text-[11px] border rounded px-1 py-0.5 min-w-0 ${
                                isSaving
                                  ? "bg-yellow-50 border-yellow-300"
                                  : assignment
                                    ? "bg-blue-50 border-blue-200 text-blue-800"
                                    : "bg-white border-gray-200 text-gray-400"
                              }`}
                            >
                              <option value="">미배정</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/admin-shared/MonthlyCalendar.tsx
git commit -m "feat: add MonthlyCalendar component for supervisor assignments"
```

---

## Task 9: 감독배정 API 월간 조회 지원

**Files:**
- Modify: `src/app/api/grade-admin/[grade]/supervisor-assignments/route.ts`

- [ ] **Step 1: GET 핸들러가 이미 from/to 날짜 범위를 지원하는지 확인**

현재 API는 이미 `?from=...&to=...` 파라미터로 날짜 범위 조회를 지원합니다. 월간 조회 시 from=월초, to=월말로 요청하면 됩니다. **API 수정 불필요.**

- [ ] **Step 2: 관리자용 감독배정 전체 학년 조회 API 추가**

현재 `/api/grade-admin/[grade]/supervisor-assignments`는 단일 학년만 조회. 관리자 페이지에서 전 학년을 한 번에 조회해야 하므로 MonthlyCalendar 컴포넌트가 3개 학년 API를 병렬 호출하는 방식으로 처리. `apiBasePath`를 구현하는 방식은 MonthlyCalendar 내부에서 처리.

MonthlyCalendar의 `fetchAssignments`를 수정하여 `showAllGrades`일 때 3개 학년 병렬 조회:

`src/components/admin-shared/MonthlyCalendar.tsx`의 `fetchAssignments` 콜백을 수정:

기존:
```typescript
  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBasePath}?from=${fromStr}&to=${toStr}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments);
      }
    } finally {
      setLoading(false);
    }
  }, [apiBasePath, fromStr, toStr]);
```

교체:
```typescript
  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      if (showAllGrades) {
        // 전 학년 병렬 조회
        const results = await Promise.all(
          [1, 2, 3].map(async (g) => {
            const res = await fetch(
              `/api/grade-admin/${g}/supervisor-assignments?from=${fromStr}&to=${toStr}`
            );
            if (res.ok) {
              const data = await res.json();
              return data.assignments as Assignment[];
            }
            return [];
          })
        );
        setAssignments(results.flat());
      } else {
        const res = await fetch(`${apiBasePath}?from=${fromStr}&to=${toStr}`);
        if (res.ok) {
          const data = await res.json();
          setAssignments(data.assignments);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [apiBasePath, fromStr, toStr, showAllGrades]);
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/admin-shared/MonthlyCalendar.tsx
git commit -m "feat: MonthlyCalendar supports all-grades parallel fetch"
```

---

## Task 10: 관리자 감독배정 페이지 — 월간 캘린더

**Files:**
- Create: `src/app/admin/supervisors/page.tsx`

- [ ] **Step 1: 관리자 감독배정 페이지 작성**

```typescript
"use client";

import MonthlyCalendar from "@/components/admin-shared/MonthlyCalendar";

export default function AdminSupervisorsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">감독 배정</h1>
      <MonthlyCalendar showAllGrades apiBasePath="" />
    </div>
  );
}
```

(`apiBasePath`는 `showAllGrades`일 때 사용되지 않으므로 빈 문자열 전달)

- [ ] **Step 2: 커밋**

```bash
git add src/app/admin/supervisors/page.tsx
git commit -m "feat: admin supervisors page with monthly calendar"
```

---

## Task 11: 학년관리 감독배정 페이지 — 월간 캘린더 (2슬롯)

**Files:**
- Modify: `src/app/grade-admin/[grade]/supervisors/page.tsx`

- [ ] **Step 1: 주간 캘린더를 월간 캘린더로 교체**

`src/app/grade-admin/[grade]/supervisors/page.tsx`를 다음으로 전체 교체:

```typescript
"use client";

import { useParams } from "next/navigation";
import MonthlyCalendar from "@/components/admin-shared/MonthlyCalendar";

export default function GradeAdminSupervisorsPage() {
  const params = useParams();
  const grade = Number(params.grade);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{grade}학년 감독 배정</h1>
      <MonthlyCalendar
        grade={grade}
        apiBasePath={`/api/grade-admin/${grade}/supervisor-assignments`}
      />
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/grade-admin/[grade]/supervisors/page.tsx
git commit -m "feat: grade-admin supervisors page with monthly calendar"
```

---

## Task 12: 사용자 관리 페이지 — 교사 탭 (인라인 테이블)

**Files:**
- Create: `src/app/admin/users/page.tsx`

- [ ] **Step 1: 사용자 관리 통합 페이지 작성**

`src/app/admin/users/page.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import StudentManagement from "@/components/students/StudentManagement";

type Teacher = {
  id: number;
  loginId: string;
  name: string;
  roles: { role: string }[];
  homeroomAssignments: { id: number; grade: number; classNumber: number }[];
  subAdminAssignments: { id: number; grade: number }[];
};

type TabConfig =
  | { type: "teachers"; label: string }
  | { type: "students"; label: string; grade: number };

const TABS: TabConfig[] = [
  { type: "teachers", label: "교사" },
  { type: "students", label: "1학년", grade: 1 },
  { type: "students", label: "2학년", grade: 2 },
  { type: "students", label: "3학년", grade: 3 },
];

// 학년-반 옵션 (1~3학년, 반은 1~10)
const CLASS_OPTIONS = [1, 2, 3].flatMap((g) =>
  Array.from({ length: 10 }, (_, i) => ({
    label: `${g}-${i + 1}`,
    grade: g,
    classNumber: i + 1,
  }))
);

export default function AdminUsersPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeTab = TABS[activeIdx];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">사용자 관리</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIdx(idx)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeIdx === idx
                ? "bg-white text-blue-700 shadow-sm font-medium"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab.type === "teachers" ? (
        <TeacherTab />
      ) : (
        <StudentManagement key={activeTab.grade} grade={activeTab.grade} />
      )}
    </div>
  );
}

// ────────── 교사 탭 ──────────

function TeacherTab() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ loginId: "", name: "", password: "" });

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teachers");
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.teachers);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // 교사 추가/수정 제출
  const handleSubmit = async () => {
    const url = editTarget
      ? `/api/admin/teachers/${editTarget.id}`
      : "/api/admin/teachers";
    const method = editTarget ? "PUT" : "POST";
    const body: Record<string, string> = { loginId: form.loginId, name: form.name };
    if (form.password) body.password = form.password;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowModal(false);
      setEditTarget(null);
      setForm({ loginId: "", name: "", password: "" });
      fetchTeachers();
    } else {
      const data = await res.json();
      alert(data.error || "오류가 발생했습니다.");
    }
  };

  // 교사 삭제
  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" });
    if (res.ok) fetchTeachers();
    else alert("삭제에 실패했습니다.");
  };

  // 담임 배정 변경
  const handleHomeroomChange = async (
    teacherId: number,
    value: string
  ) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    // 기존 담임 해제
    for (const ha of teacher.homeroomAssignments) {
      await fetch("/api/admin/homeroom-assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: ha.grade, classNumber: ha.classNumber }),
      });
    }

    // 새로 배정
    if (value !== "") {
      const [g, c] = value.split("-").map(Number);
      await fetch("/api/admin/homeroom-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, grade: g, classNumber: c }),
      });
    }

    fetchTeachers();
  };

  // 서브관리자 변경
  const handleSubAdminChange = async (
    teacherId: number,
    value: string
  ) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    // 기존 서브관리자 해제
    for (const sa of teacher.subAdminAssignments) {
      await fetch("/api/admin/sub-admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, grade: sa.grade }),
      });
    }

    // 새로 배정
    if (value !== "") {
      const grade = parseInt(value, 10);
      await fetch("/api/admin/sub-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, grade }),
      });
    }

    fetchTeachers();
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm({ loginId: "", name: "", password: "" });
    setShowModal(true);
  };

  const openEdit = (t: Teacher) => {
    setEditTarget(t);
    setForm({ loginId: t.loginId, name: t.name, password: "" });
    setShowModal(true);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          교사 추가
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">이름</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">아이디</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">역할</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">담임</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">서브관리자</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">작업</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  로딩 중...
                </td>
              </tr>
            ) : teachers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  등록된 교사가 없습니다.
                </td>
              </tr>
            ) : (
              teachers.map((t) => {
                const homeroomValue =
                  t.homeroomAssignments.length > 0
                    ? `${t.homeroomAssignments[0].grade}-${t.homeroomAssignments[0].classNumber}`
                    : "";
                const subAdminValue =
                  t.subAdminAssignments.length > 0
                    ? String(t.subAdminAssignments[0].grade)
                    : "";

                return (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {t.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t.loginId}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {t.roles.map((r) => (
                          <span
                            key={r.role}
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              r.role === "admin"
                                ? "bg-red-100 text-red-700"
                                : r.role === "homeroom"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {r.role === "admin"
                              ? "관리자"
                              : r.role === "homeroom"
                                ? "담임"
                                : "감독"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={homeroomValue}
                        onChange={(e) => handleHomeroomChange(t.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 w-24"
                      >
                        <option value="">미배정</option>
                        {CLASS_OPTIONS.map((opt) => (
                          <option key={opt.label} value={opt.label}>
                            {opt.label}반
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={subAdminValue}
                        onChange={(e) => handleSubAdminChange(t.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 w-24"
                      >
                        <option value="">없음</option>
                        <option value="1">1학년</option>
                        <option value="2">2학년</option>
                        <option value="3">3학년</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEdit(t)}
                        className="text-sm text-blue-600 hover:text-blue-800 mr-2"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              {editTarget ? "교사 수정" : "교사 추가"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">이름</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">아이디</label>
                <input
                  value={form.loginId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, loginId: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  disabled={!!editTarget}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  비밀번호{editTarget && " (변경 시에만 입력)"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {editTarget ? "수정" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: teachers API가 homeroomAssignments와 subAdminAssignments를 include하는지 확인**

`src/app/api/admin/teachers/route.ts`의 GET에서 teacher를 조회할 때 다음 include가 필요:

```typescript
include: {
  roles: true,
  homeroomAssignments: true,
  subAdminAssignments: true,
}
```

기존 코드를 읽어서 이미 포함되어 있는지 확인 후, 없으면 추가.

- [ ] **Step 3: 커밋**

```bash
git add src/app/admin/users/page.tsx
git commit -m "feat: unified users page with teacher inline table + student tabs"
```

---

## Task 13: teachers API 수정 — 관계 데이터 include

**Files:**
- Modify: `src/app/api/admin/teachers/route.ts`

- [ ] **Step 1: GET에서 homeroomAssignments, subAdminAssignments include 추가**

teachers API의 `prisma.teacher.findMany`에 include 확인 및 수정:

```typescript
const teachers = await prisma.teacher.findMany({
  include: {
    roles: true,
    homeroomAssignments: true,
    subAdminAssignments: true,
  },
  orderBy: { name: "asc" },
});
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/admin/teachers/route.ts
git commit -m "feat: include homeroom and subadmin assignments in teachers API"
```

---

## Task 14: AdminNav 네비게이션 업데이트

**Files:**
- Modify: `src/components/admin-shared/AdminNav.tsx`

- [ ] **Step 1: admin 메뉴 8개 → 5개로 변경**

`src/components/admin-shared/AdminNav.tsx`의 `adminItems` 배열 (lines 19-30):

기존:
```typescript
  const adminItems: NavItem[] = isAdmin
    ? [
        { label: "학�� 관리", href: "/admin/students" },
        { label: "교사 관리", href: "/admin/teachers" },
        { label: "서브관리자", href: "/admin/sub-admins" },
        { label: "담임배정", href: "/admin/homeroom-assignments" },
        { label: "좌석 배치", href: "/admin/seats" },
        { label: "감독 배정", href: "/admin/supervisors" },
        { label: "교체 이력", href: "/admin/swap-history" },
        { label: "출결 통계", href: "/admin/statistics" },
      ]
    : [];
```

교체:
```typescript
  const adminItems: NavItem[] = isAdmin
    ? [
        { label: "사용자 관리", href: "/admin/users" },
        { label: "좌석 배치", href: "/admin/seats" },
        { label: "감독 배정", href: "/admin/supervisors" },
        { label: "교체 이력", href: "/admin/swap-history" },
        { label: "출결 통계", href: "/admin/statistics" },
      ]
    : [];
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/admin-shared/AdminNav.tsx
git commit -m "feat: consolidate admin nav from 8 to 5 menu items"
```

---

## Task 15: 학년관리 페이지(hub) — 좌석/감독 탭 반영

**Files:**
- Modify: `src/app/grade-admin/[grade]/page.tsx`

- [ ] **Step 1: hub 페이지가 개별 라우트를 사용하는지 확인**

`src/app/grade-admin/[grade]/page.tsx`에서 SeatingManagement 컴포넌트를 직접 import하고 있다면, 좌석배치 탭은 `/grade-admin/[grade]/seats` 라우트로 링크하는 방식으로 변경하거나, 인라인으로 SeatingEditor를 사용하도록 수정.

기존 hub 페이지의 seats 탭 부분에서 `SeatingManagement` → 새로운 오후/야간 탭 + `SeatingEditor` 직접 사용으로 변경.

기존 hub 페이지의 supervisors 탭 부분에서 `SupervisorManagement` → `MonthlyCalendar` 사용으로 변경.

hub 페이지에서 import를 수정:

기존:
```typescript
import SeatingManagement from "@/components/seats/SeatingManagement";
import SupervisorManagement from "@/components/admin-shared/SupervisorManagement";
```

교체:
```typescript
import SeatingEditor from "@/components/seats/SeatingEditor";
import MonthlyCalendar from "@/components/admin-shared/MonthlyCalendar";
```

그리고 seats 탭 렌더링 부분을 오후/야간 서브탭 + SeatingEditor로, supervisors 부분을 MonthlyCalendar로 교체. 구체적인 코드는 기존 hub 페이지의 전체 구조를 읽은 뒤 맞춤 작성.

- [ ] **Step 2: 커밋**

```bash
git add src/app/grade-admin/[grade]/page.tsx
git commit -m "feat: update grade-admin hub with new seating/supervisor components"
```

---

## Task 16: 기존 파일 삭제 및 정리

**Files:**
- Delete: `src/app/admin/students/page.tsx`
- Delete: `src/app/admin/teachers/page.tsx`
- Delete: `src/app/admin/sub-admins/page.tsx`
- Delete: `src/app/admin/homeroom-assignments/page.tsx`
- Delete: `src/components/seats/SeatingPeriodList.tsx`
- Delete: `src/components/seats/SeatingManagement.tsx`
- Delete: `src/components/admin-shared/SupervisorManagement.tsx`

- [ ] **Step 1: 더 이상 사용하지 않는 파일 삭제**

```bash
rm src/app/admin/students/page.tsx
rm src/app/admin/teachers/page.tsx
rm src/app/admin/sub-admins/page.tsx
rm src/app/admin/homeroom-assignments/page.tsx
rm src/components/seats/SeatingPeriodList.tsx
rm src/components/seats/SeatingManagement.tsx
rm src/components/admin-shared/SupervisorManagement.tsx
```

- [ ] **Step 2: 삭제된 컴포넌트를 import하는 곳이 없는지 확인**

```bash
grep -r "SeatingManagement\|SeatingPeriodList\|SupervisorManagement" src/ --include="*.tsx" --include="*.ts"
```

Expected: 결과 없음 (모두 새 컴포넌트로 교체 완료)

만약 결과가 있으면 해당 import를 수정.

- [ ] **Step 3: 삭제된 페이지 경로를 참조하는 곳 확인**

```bash
grep -r "/admin/students\|/admin/teachers\|/admin/sub-admins\|/admin/homeroom-assignments" src/ --include="*.tsx" --include="*.ts"
```

Expected: 결과 없음. 만약 있으면 `/admin/users`로 수정.

- [ ] **Step 4: seating-periods API 디렉토리 삭제 확인**

```bash
ls src/app/api/grade-admin/\[grade\]/seating-periods/ 2>/dev/null && echo "NOT DELETED" || echo "OK: already deleted"
```

Expected: `OK: already deleted` (Task 4에서 삭제 완료)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "chore: remove obsolete pages, components, and APIs"
```

---

## Task 17: 빌드 검증

**Files:** None (검증만)

- [ ] **Step 1: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 2: Next.js 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공

- [ ] **Step 3: 빌드 에러가 있으면 수정 후 커밋**

에러 메시지에 따라 수정 후:

```bash
git add -A
git commit -m "fix: resolve build errors from UI consolidation"
```

---

## Task Summary

| Task | 설명 | 의존 |
|------|------|------|
| 1 | DB 마이그레이션: SeatingPeriod 제거 | — |
| 2 | seat-layouts API: periodId 제거 | Task 1 |
| 3 | attendance API: SeatingPeriod ��존 제거 | Task 1 |
| 4 | seating-periods API 삭제 | Task 1 |
| 5 | SeatingEditor: period prop → sessionType prop | Task 2 |
| 6 | 관리자 좌석배치 페이지: 6개 탭 | Task 5 |
| 7 | 학년관리 좌석배치 페이지: 2개 탭 | Task 5 |
| 8 | MonthlyCalendar 컴포넌트 생성 | — |
| 9 | MonthlyCalendar 전학년 병렬 조회 | Task 8 |
| 10 | 관리자 감독배정 페이지 | Task 9 |
| 11 | 학년관리 감독배정 페이지 | Task 9 |
| 12 | 사용자 관리 페이지: 교사+학생 통합 | — |
| 13 | teachers API: 관계 데이터 include | — |
| 14 | AdminNav: 8→5 메뉴 | — |
| 15 | 학년관리 hub 페이지 업데이트 | Task 5, 9 |
| 16 | 기존 파일 삭제 및 정리 | Task 6, 7, 10-15 |
| 17 | 빌드 검증 | Task 16 |

**병렬 가능 그룹:**
- Group A (DB+API): Task 1 → Tasks 2, 3, 4 (병렬) → Task 5
- Group B (감독배정): Tasks 8 → 9 → 10, 11 (병렬)
- Group C (사용자관리): Tasks 12, 13, 14 (병렬)
- Final: Tasks 6, 7, 15 → 16 → 17
