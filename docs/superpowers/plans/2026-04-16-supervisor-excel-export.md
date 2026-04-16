# 감독배정 Excel 다운로드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin/supervisors`와 `/grade-admin/[grade]/supervisors` 페이지에 Excel 다운로드 버튼을 추가하여 선택된 월의 감독 배정 달력(Month 시트)과 교사별 월별 감독횟수 누계(누계 시트)를 하나의 Excel 파일로 다운로드한다.

**Architecture:** 새 API 엔드포인트 2개(관리자/학년관리자)가 공통 헬퍼 `lib/excel/supervisor-export.ts`를 호출하여 ExcelJS 워크북을 생성한다. 기존 `MonthlyCalendar` 컴포넌트에 `excelHref` prop을 추가하여 재사용한다. 이 프로젝트는 자동화된 테스트 프레임워크가 없으므로, 각 API/UI는 dev 서버 + curl/브라우저로 수동 검증한다 (기존 `export-attendance` 패턴과 동일).

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma 7, ExcelJS, NextAuth v5, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-04-16-supervisor-excel-export-design.md`

---

## File Structure

| 경로 | 동작 | 책임 |
|------|------|------|
| `src/lib/excel/supervisor-export.ts` | Create | ExcelJS 워크북 빌더(Month + 누계 시트 생성). 순수 함수, DB 미접근 |
| `src/app/api/grade-admin/[grade]/supervisor-assignments/export/route.ts` | Create | 학년별 export 엔드포인트. DB 조회 후 헬퍼 호출 |
| `src/app/api/admin/supervisors/export/route.ts` | Create | 전학년 export 엔드포인트. DB 조회 후 헬퍼 호출 |
| `src/components/admin-shared/MonthlyCalendar.tsx` | Modify | `excelHref` prop 추가 + 헤더에 Excel 버튼 렌더 |
| `src/app/admin/supervisors/page.tsx` | Modify | `excelHref` prop 전달 |
| `src/app/grade-admin/[grade]/supervisors/page.tsx` | Modify | `excelHref` prop 전달 |
| `.claude/PROJECT_MAP.md` | Modify | 새 API/파일 추가 반영 |

---

## Task 1: 공통 헬퍼 `buildSupervisorWorkbook` 작성

**Files:**
- Create: `src/lib/excel/supervisor-export.ts`

- [ ] **Step 1: 새 파일 생성**

경로: `src/lib/excel/supervisor-export.ts`

```typescript
import ExcelJS from "exceljs";

type Mode = "grade" | "all";

export type SupervisorAssignmentLite = {
  date: Date;
  grade: number;
  teacherId: number;
};

export type TeacherLite = {
  id: number;
  name: string;
  primaryGrade: number | null;
};

export type BuildOptions = {
  mode: Mode;
  year: number;
  monthIdx: number; // 0-based
  grade?: number; // mode === "grade" 시 필수
  assignmentsInMonth: SupervisorAssignmentLite[];
  assignmentsInSchoolYear: SupervisorAssignmentLite[];
  teachers: TeacherLite[];
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymKey(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

function dateKey(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

// 학년도(3월~익년 2월) 중 실제 배정이 있는 월 키 정렬 반환
function collectSchoolYearMonths(assignments: SupervisorAssignmentLite[]): string[] {
  const set = new Set<string>();
  for (const a of assignments) set.add(ymKey(a.date));
  return Array.from(set).sort();
}

function monthLabel(ymKeyStr: string) {
  return `${parseInt(ymKeyStr.split("-")[1], 10)}월`;
}

export function buildSupervisorWorkbook(opts: BuildOptions): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  addMonthSheet(wb, opts);
  addSummarySheet(wb, opts);
  return wb;
}

function addMonthSheet(wb: ExcelJS.Workbook, opts: BuildOptions) {
  const { mode, year, monthIdx, grade, assignmentsInMonth, teachers } = opts;
  const sheet = wb.addWorksheet(`${year}-${pad2(monthIdx + 1)}`);

  const teacherNameById = new Map<number, string>();
  for (const t of teachers) teacherNameById.set(t.id, t.name);

  // key: "YYYY-MM-DD-grade" → teacherId
  const cellMap = new Map<string, number>();
  for (const a of assignmentsInMonth) {
    cellMap.set(`${dateKey(a.date)}-${a.grade}`, a.teacherId);
  }

  // 요일 헤더
  const headerRow = sheet.addRow(DAY_LABELS);
  headerRow.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
    if (col === 1) cell.font = { bold: true, color: { argb: "FFDC2626" } };
    if (col === 7) cell.font = { bold: true, color: { argb: "FF2563EB" } };
  });
  headerRow.height = 20;

  // 달력 셀 채우기
  const firstDay = new Date(year, monthIdx, 1);
  const lastDay = new Date(year, monthIdx + 1, 0);
  const startOffset = firstDay.getDay();
  const totalCells = startOffset + lastDay.getDate();
  const weekCount = Math.ceil(totalCells / 7);

  const weekendFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF9FAFB" },
  };
  const emptyFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };

  const rowHeight = mode === "all" ? 80 : 40;

  for (let w = 0; w < weekCount; w++) {
    const row = sheet.addRow(Array(7).fill(""));
    row.height = rowHeight;

    for (let dow = 0; dow < 7; dow++) {
      const dayNum = w * 7 + dow - startOffset + 1;
      const cell = row.getCell(dow + 1);
      cell.alignment = { horizontal: "center", vertical: "top", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      };

      if (dayNum < 1 || dayNum > lastDay.getDate()) {
        cell.fill = emptyFill;
        continue;
      }

      const isWeekend = dow === 0 || dow === 6;
      if (isWeekend) {
        cell.fill = weekendFill;
        cell.value = String(dayNum);
        cell.alignment = { horizontal: "center", vertical: "top", wrapText: true };
        continue;
      }

      const dKey = `${year}-${pad2(monthIdx + 1)}-${pad2(dayNum)}`;

      const lines: string[] = [String(dayNum)];

      if (mode === "grade") {
        const tid = cellMap.get(`${dKey}-${grade}`);
        lines.push(tid ? teacherNameById.get(tid) || "-" : "-");
      } else {
        for (const g of [1, 2, 3]) {
          const tid = cellMap.get(`${dKey}-${g}`);
          const name = tid ? teacherNameById.get(tid) || "-" : "-";
          lines.push(`${g}: ${name}`);
        }
      }

      cell.value = lines.join("\n");
    }
  }

  for (let i = 1; i <= 7; i++) {
    sheet.getColumn(i).width = mode === "all" ? 18 : 14;
  }
}

function addSummarySheet(wb: ExcelJS.Workbook, opts: BuildOptions) {
  const { mode, grade, assignmentsInSchoolYear, teachers } = opts;
  const sheet = wb.addWorksheet("누계");

  const months = collectSchoolYearMonths(assignmentsInSchoolYear);

  // 헤더
  const header: string[] = ["교사명"];
  if (mode === "all") header.push("담당학년");
  for (const m of months) header.push(monthLabel(m));
  header.push("총계");
  const headerRow = sheet.addRow(header);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
  });

  // 교사 필터링
  const filteredTeachers = mode === "grade"
    ? teachers.filter((t) => t.primaryGrade === grade)
    : [...teachers];

  // 교사별 월별 카운트
  const countByTeacherMonth = new Map<string, number>();
  for (const a of assignmentsInSchoolYear) {
    const key = `${a.teacherId}-${ymKey(a.date)}`;
    countByTeacherMonth.set(key, (countByTeacherMonth.get(key) || 0) + 1);
  }

  // 정렬
  filteredTeachers.sort((a, b) => {
    if (mode === "all") {
      const ga = a.primaryGrade ?? 999;
      const gb = b.primaryGrade ?? 999;
      if (ga !== gb) return ga - gb;
    }
    return a.name.localeCompare(b.name, "ko");
  });

  // 행 작성
  for (const t of filteredTeachers) {
    const row: (string | number)[] = [t.name];
    if (mode === "all") row.push(t.primaryGrade ?? "");
    let total = 0;
    for (const m of months) {
      const count = countByTeacherMonth.get(`${t.id}-${m}`) || 0;
      row.push(count);
      total += count;
    }
    row.push(total);
    const excelRow = sheet.addRow(row);
    const totalCell = excelRow.getCell(row.length);
    totalCell.font = { bold: true };
  }

  sheet.getColumn(1).width = 12;
  if (mode === "all") sheet.getColumn(2).width = 10;
  const monthStartCol = mode === "all" ? 3 : 2;
  for (let i = 0; i < months.length; i++) {
    sheet.getColumn(monthStartCol + i).width = 8;
  }
  sheet.getColumn(monthStartCol + months.length).width = 8;
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

Run: `cd E:/Projects/selfstudy && npx tsc --noEmit`
Expected: 새 파일에서 에러 없음 (기존 프로젝트의 기타 경고는 무시)

- [ ] **Step 3: Commit**

```bash
git add src/lib/excel/supervisor-export.ts
git commit -m "feat: 감독배정 Excel 워크북 빌더 헬퍼 추가"
```

---

## Task 2: 학년관리자 export API 엔드포인트

**Files:**
- Create: `src/app/api/grade-admin/[grade]/supervisor-assignments/export/route.ts`

- [ ] **Step 1: 새 API route 파일 생성**

경로: `src/app/api/grade-admin/[grade]/supervisor-assignments/export/route.ts`

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withGradeAuth } from "@/lib/api-auth";
import { buildSupervisorWorkbook } from "@/lib/excel/supervisor-export";

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
    const url = new URL(req.url);
    const monthStr = url.searchParams.get("month");

    let year: number, monthIdx: number;
    if (monthStr) {
      const [y, m] = monthStr.split("-").map(Number);
      if (!y || !m || m < 1 || m > 12) {
        return NextResponse.json({ error: "잘못된 month 파라미터입니다." }, { status: 400 });
      }
      year = y;
      monthIdx = m - 1;
    } else {
      const now = new Date();
      year = now.getFullYear();
      monthIdx = now.getMonth();
    }

    // 해당 월 범위
    const monthStart = new Date(year, monthIdx, 1);
    const monthEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);

    // 학년도 범위 (3월~익년 2월)
    const currentMonth = monthIdx + 1;
    const syStart = currentMonth >= 3
      ? new Date(year, 2, 1)
      : new Date(year - 1, 2, 1);
    const syEnd = currentMonth >= 3
      ? new Date(year + 1, 1, 28, 23, 59, 59, 999)
      : new Date(year, 1, 28, 23, 59, 59, 999);

    try {
      const [assignmentsInMonth, assignmentsInSchoolYear, teachers] = await Promise.all([
        prisma.supervisorAssignment.findMany({
          where: {
            grade,
            sessionType: "afternoon",
            date: { gte: monthStart, lte: monthEnd },
          },
          select: { date: true, grade: true, teacherId: true },
        }),
        prisma.supervisorAssignment.findMany({
          where: {
            sessionType: "afternoon",
            date: { gte: syStart, lte: syEnd },
          },
          select: { date: true, grade: true, teacherId: true },
        }),
        prisma.teacher.findMany({
          select: { id: true, name: true, primaryGrade: true },
          orderBy: { name: "asc" },
        }),
      ]);

      const workbook = buildSupervisorWorkbook({
        mode: "grade",
        year,
        monthIdx,
        grade,
        assignmentsInMonth,
        assignmentsInSchoolYear,
        teachers,
      });

      const uint8 = new Uint8Array(await workbook.xlsx.writeBuffer());
      const filename = `${grade}학년_감독배정_${year}-${String(monthIdx + 1).padStart(2, "0")}.xlsx`;
      const encodedFilename = encodeURIComponent(filename);

      return new Response(uint8, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="supervisors.xlsx"; filename*=UTF-8''${encodedFilename}`,
        },
      });
    } catch (error) {
      console.error("Grade supervisor export error:", error);
      return NextResponse.json({ error: "엑셀 생성에 실패했습니다." }, { status: 500 });
    }
  })(req);
}
```

- [ ] **Step 2: 수동 검증 — 학년관리자 계정으로 다운로드**

1. `npm run dev`로 dev 서버 실행
2. 브라우저에서 `teacher1-1 / pass1234` (1학년 서브관리자) 로그인
3. 주소창에 `http://localhost:3000/api/grade-admin/1/supervisor-assignments/export?month=2026-04` 입력
4. 파일 다운로드 확인 → 파일명 `1학년_감독배정_2026-04.xlsx`
5. Excel에서 열어 Month 시트에 달력 + 누계 시트에 1학년 담당 교사 목록 확인

Expected:
- 다운로드됨
- Month 시트: 2026-04 달력, 각 평일 셀에 날짜 + 교사명 줄바꿈 표시
- 누계 시트: 컬럼 `교사명 | 3월 | 4월 | ... | 총계`, `primaryGrade === 1` 교사만

- [ ] **Step 3: 권한 검증 — 다른 학년 접근 차단**

`teacher1-1` 로그인 상태로 `/api/grade-admin/2/supervisor-assignments/export` 접근 → 403 또는 401 (withGradeAuth 거부)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/grade-admin/[grade]/supervisor-assignments/export/route.ts
git commit -m "feat: 학년 감독배정 Excel export API 추가"
```

---

## Task 3: 관리자 export API 엔드포인트

**Files:**
- Create: `src/app/api/admin/supervisors/export/route.ts`

- [ ] **Step 1: 새 API route 파일 생성**

경로: `src/app/api/admin/supervisors/export/route.ts`

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { buildSupervisorWorkbook } from "@/lib/excel/supervisor-export";

export const GET = withAuth(["admin"], async (req) => {
  const url = new URL(req.url);
  const monthStr = url.searchParams.get("month");

  let year: number, monthIdx: number;
  if (monthStr) {
    const [y, m] = monthStr.split("-").map(Number);
    if (!y || !m || m < 1 || m > 12) {
      return NextResponse.json({ error: "잘못된 month 파라미터입니다." }, { status: 400 });
    }
    year = y;
    monthIdx = m - 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthIdx = now.getMonth();
  }

  const monthStart = new Date(year, monthIdx, 1);
  const monthEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);

  const currentMonth = monthIdx + 1;
  const syStart = currentMonth >= 3
    ? new Date(year, 2, 1)
    : new Date(year - 1, 2, 1);
  const syEnd = currentMonth >= 3
    ? new Date(year + 1, 1, 28, 23, 59, 59, 999)
    : new Date(year, 1, 28, 23, 59, 59, 999);

  try {
    const [assignmentsInMonth, assignmentsInSchoolYear, teachers] = await Promise.all([
      prisma.supervisorAssignment.findMany({
        where: {
          sessionType: "afternoon",
          date: { gte: monthStart, lte: monthEnd },
        },
        select: { date: true, grade: true, teacherId: true },
      }),
      prisma.supervisorAssignment.findMany({
        where: {
          sessionType: "afternoon",
          date: { gte: syStart, lte: syEnd },
        },
        select: { date: true, grade: true, teacherId: true },
      }),
      prisma.teacher.findMany({
        select: { id: true, name: true, primaryGrade: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const workbook = buildSupervisorWorkbook({
      mode: "all",
      year,
      monthIdx,
      assignmentsInMonth,
      assignmentsInSchoolYear,
      teachers,
    });

    const uint8 = new Uint8Array(await workbook.xlsx.writeBuffer());
    const filename = `감독배정_전학년_${year}-${String(monthIdx + 1).padStart(2, "0")}.xlsx`;
    const encodedFilename = encodeURIComponent(filename);

    return new Response(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="supervisors.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error("Admin supervisor export error:", error);
    return NextResponse.json({ error: "엑셀 생성에 실패했습니다." }, { status: 500 });
  }
});
```

- [ ] **Step 2: 수동 검증 — 관리자 계정으로 다운로드**

1. `admin / admin1234` 로그인
2. `http://localhost:3000/api/admin/supervisors/export?month=2026-04` 접근
3. 파일명 `감독배정_전학년_2026-04.xlsx` 다운로드

Expected:
- Month 시트: 각 평일 셀에 날짜 / `1: ...` / `2: ...` / `3: ...` 4줄 표시 (줄바꿈)
- 누계 시트: 컬럼 `교사명 | 담당학년 | 3월 | 4월 | ... | 총계`, 전체 교사

- [ ] **Step 3: 권한 검증**

일반 교사 계정(`teacher1-1`) 로그인 상태에서 `/api/admin/supervisors/export` 접근 → 403

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/supervisors/export/route.ts
git commit -m "feat: 관리자 전학년 감독배정 Excel export API 추가"
```

---

## Task 4: `MonthlyCalendar`에 Excel 버튼 추가

**Files:**
- Modify: `src/components/admin-shared/MonthlyCalendar.tsx`

- [ ] **Step 1: `excelHref` prop 추가**

`MonthlyCalendar` 컴포넌트의 props 타입에 `excelHref`를 추가합니다.

기존 (41-49행):
```tsx
export default function MonthlyCalendar({
  grade,
  showAllGrades = false,
  apiBasePath,
}: {
  grade?: number;
  showAllGrades?: boolean;
  apiBasePath: string;
}) {
```

신규:
```tsx
export default function MonthlyCalendar({
  grade,
  showAllGrades = false,
  apiBasePath,
  excelHref,
}: {
  grade?: number;
  showAllGrades?: boolean;
  apiBasePath: string;
  excelHref?: string;
}) {
```

- [ ] **Step 2: 월 네비게이션 헤더에 Excel 버튼 렌더**

`goToday` 버튼이 있는 중앙 그룹(216-226행 부근)에 Excel 버튼을 추가합니다. 기존 `이번달` 버튼 옆에 배치합니다.

기존:
```tsx
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
```

신규:
```tsx
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
  {excelHref && (
    <a
      href={`${excelHref}?month=${year}-${String(month + 1).padStart(2, "0")}`}
      className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100"
    >
      Excel
    </a>
  )}
</div>
```

- [ ] **Step 3: 수동 검증 — 버튼 렌더**

dev 서버 실행 중 상태에서:
- `admin` 로그인 → `/admin/supervisors` 아직 prop을 전달하지 않았으므로 Excel 버튼 **미표시** 확인 (기존 UI 그대로)
- TypeScript 에러 없음 (`npx tsc --noEmit`)

- [ ] **Step 4: Commit**

```bash
git add src/components/admin-shared/MonthlyCalendar.tsx
git commit -m "feat: MonthlyCalendar에 Excel 다운로드 버튼 옵션 추가"
```

---

## Task 5: 관리자 페이지에서 Excel 버튼 연결

**Files:**
- Modify: `src/app/admin/supervisors/page.tsx`

- [ ] **Step 1: `excelHref` prop 전달**

25행의 MonthlyCalendar 호출을 수정.

기존:
```tsx
<MonthlyCalendar showAllGrades apiBasePath="" />
```

신규:
```tsx
<MonthlyCalendar
  showAllGrades
  apiBasePath=""
  excelHref="/api/admin/supervisors/export"
/>
```

- [ ] **Step 2: 수동 검증**

`admin` 로그인 → `/admin/supervisors` → 헤더에 녹색 "Excel" 버튼 보임 → 클릭 → `감독배정_전학년_YYYY-MM.xlsx` 다운로드 → 시트 2개(YYYY-MM, 누계) 확인

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/supervisors/page.tsx
git commit -m "feat: 관리자 감독배정 페이지에 Excel 다운로드 버튼 연결"
```

---

## Task 6: 학년관리자 페이지에서 Excel 버튼 연결

**Files:**
- Modify: `src/app/grade-admin/[grade]/supervisors/page.tsx`

- [ ] **Step 1: `excelHref` prop 전달**

29-32행의 MonthlyCalendar 호출을 수정.

기존:
```tsx
<MonthlyCalendar
  grade={grade}
  apiBasePath={`/api/grade-admin/${grade}/supervisor-assignments`}
/>
```

신규:
```tsx
<MonthlyCalendar
  grade={grade}
  apiBasePath={`/api/grade-admin/${grade}/supervisor-assignments`}
  excelHref={`/api/grade-admin/${grade}/supervisor-assignments/export`}
/>
```

- [ ] **Step 2: 수동 검증**

`teacher1-1` (1학년 서브관리자) 로그인 → `/grade-admin/1/supervisors` → Excel 버튼 → `1학년_감독배정_YYYY-MM.xlsx` 다운로드 → Month 시트에 단일학년 달력 + 누계 시트에 1학년 담당 교사만 표시 확인

- [ ] **Step 3: Commit**

```bash
git add src/app/grade-admin/[grade]/supervisors/page.tsx
git commit -m "feat: 학년 감독배정 페이지에 Excel 다운로드 버튼 연결"
```

---

## Task 7: 전체 통합 검증

- [ ] **Step 1: 다양한 월/권한 조합으로 수동 E2E 검증**

다음 시나리오를 모두 수행:

| 시나리오 | 계정 | URL | 기대 결과 |
|---------|------|-----|----------|
| 관리자 현재월 | admin | `/admin/supervisors` Excel 클릭 | Month+누계, 3학년 모두 표시 |
| 관리자 과거월 | admin | 이전달 이동 후 Excel | 해당 월 달력 정확 |
| 1학년 서브관리자 | teacher1-1 | `/grade-admin/1/supervisors` Excel | 1학년만 |
| 2학년 서브관리자 | teacher2-1 | `/grade-admin/2/supervisors` Excel | 2학년만 |
| 3학년 서브관리자 | teacher3-1 | `/grade-admin/3/supervisors` Excel | 3학년만 |
| 서브관리자 월경계(1월) | teacher1-1 | `month=2027-01` 직접 URL | 학년도 전체 조회 범위가 작년3월~올해2월 |
| 월경계(3월) | admin | `month=2026-03` | 학년도 3월~익년2월, 3월만 컬럼에 나옴 |
| 파라미터 누락 | admin | `/api/admin/supervisors/export` | 현재월 다운로드 |
| 잘못된 month | admin | `month=invalid` | 400 에러 |

- [ ] **Step 2: Excel 내용 검증 체크리스트**

각 다운로드 파일에 대해:
- Month 시트: 요일 헤더 1행, 일=빨강/토=파랑, 주말 회색 배경
- Month 시트(관리자): 평일 셀 = 날짜+`1:`/`2:`/`3:` 4줄
- Month 시트(학년): 평일 셀 = 날짜+교사명 2줄
- 미배정 날짜: `-`
- 누계 시트: 실제 배정 있는 월만 컬럼으로 (빈 달 컬럼 없음)
- 누계 시트(관리자): 담당학년 컬럼 존재, 학년 오름차순 → 이름 가나다순
- 누계 시트(학년): 해당 학년 담당 교사만, 가나다순
- 총계 열: 월별 합과 수동 일치 확인

- [ ] **Step 3: 전체 빌드 확인**

```bash
cd E:/Projects/selfstudy && npx tsc --noEmit && npx next build
```

Expected: 컴파일 에러 없음, 빌드 성공

- [ ] **Step 4: PROJECT_MAP 업데이트**

`.claude/PROJECT_MAP.md`의 API 라우트 섹션에 아래 추가:

`### 학년관리 (/api/grade-admin/[grade]/)` 테이블에:
```
| GET | `supervisor-assignments/export?month=YYYY-MM` | 학년 감독배정 Excel (Month+누계 시트) |
```

`### 관리자 (/api/admin/)` 테이블에:
```
| GET | `supervisors/export?month=YYYY-MM` | 전학년 감독배정 Excel (Month+누계 시트) |
```

`### 2026-04-16: 감독배정 Excel 다운로드` 섹션을 "수정 이력" 맨 위에 추가:
```
### 2026-04-16: 감독배정 Excel 다운로드 기능
- **신규 API 2개**: `/api/admin/supervisors/export`, `/api/grade-admin/[grade]/supervisor-assignments/export`
- **공통 헬퍼**: `src/lib/excel/supervisor-export.ts` (Month 달력 시트 + 누계 시트 빌더)
- **UI**: MonthlyCalendar에 `excelHref` prop 추가 → 월 네비게이션 옆 Excel 버튼
- **Month 시트**: 7열 달력, 단일 셀 + 줄바꿈(wrapText)으로 학년별 교사명 표시
- **누계 시트**: 학년도(3~2월) 중 실제 배정 있는 월만 컬럼, 관리자 버전에는 담당학년 컬럼 추가
```

- [ ] **Step 5: Commit**

```bash
git add .claude/PROJECT_MAP.md
git commit -m "docs: PROJECT_MAP에 감독배정 Excel export API 반영"
```

---

## 완료 기준 (Definition of Done)

- 두 페이지에서 Excel 버튼 클릭 시 spec에 명시된 포맷의 xlsx가 정상 다운로드된다
- 서브관리자는 담당 학년 외 export 접근 불가 (403)
- 학년관리자 누계 시트는 해당 학년 담당 교사만 포함
- 관리자 누계 시트는 전체 교사 + 담당학년 컬럼 포함
- Month 시트는 단일 셀 + 줄바꿈으로 7열 달력 표현
- TypeScript 컴파일 및 `next build` 성공
- PROJECT_MAP 업데이트됨
