# 학년관리 출결 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** grade-admin에 오늘출결/월간출결 탭, admin에 전학년 오늘 출결 대시보드를 추가한다.

**Architecture:** 기존 homeroom monthly-attendance/export-attendance API를 참조하여 grade-admin용 API 3개 + admin용 API 1개를 신규 생성. 프론트엔드는 grade-admin 탭 확장 + admin 페이지 교체 + AdminNav 메뉴 추가.

**Tech Stack:** Next.js 16 App Router, Prisma 7, SWR, ExcelJS, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-04-09-grade-admin-attendance-design.md`

---

### Task 1: grade-admin 오늘출결 API

**Files:**
- Create: `src/app/api/grade-admin/[grade]/today-attendance/route.ts`

- [ ] **Step 1: Create the API route file**

```typescript
// src/app/api/grade-admin/[grade]/today-attendance/route.ts
import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const DAY_FIELDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const AFTER_SCHOOL_FIELDS = [
  "", "afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri", "",
] as const;
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

type SessionStats = {
  supervisor: string | null;
  total: number;
  present: number;
  absent: number;
  excusedAbsent: number;
  afterSchool: number;
};

function emptyStats(): SessionStats {
  return { supervisor: null, total: 0, present: 0, absent: 0, excusedAbsent: 0, afterSchool: 0 };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseInt(gradeStr, 10);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req, user) => {
    // KST 오늘 날짜 (toISOString 사용 금지)
    const now = new Date();
    const kstOffset = now.getTime() + 9 * 60 * 60 * 1000;
    const kst = new Date(kstOffset);
    const y = kst.getUTCFullYear();
    const m = kst.getUTCMonth();
    const d = kst.getUTCDate();
    const dayOfWeek = kst.getUTCDay(); // 0=일 ~ 6=토
    const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    // 주말이면 빈 응답
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({
        date: dateStr,
        dayOfWeek: DAY_NAMES[dayOfWeek],
        isWeekend: true,
        afternoon: emptyStats(),
        night: emptyStats(),
      });
    }

    const dayField = DAY_FIELDS[dayOfWeek] as "mon" | "tue" | "wed" | "thu" | "fri";
    const afterSchoolField = AFTER_SCHOOL_FIELDS[dayOfWeek];
    const dateObj = new Date(dateStr + "T00:00:00Z");

    // 병렬 쿼리: 학생+참여설정, 출결, 감독배정
    const [students, attendances, supervisorAssignments] = await Promise.all([
      prisma.student.findMany({
        where: { grade, isActive: true },
        include: { participationDays: true },
      }),
      prisma.attendance.findMany({
        where: { date: dateObj, student: { grade } },
        include: { absenceReason: { select: { reasonType: true } } },
      }),
      prisma.supervisorAssignment.findMany({
        where: { date: dateObj, grade },
        include: { teacher: { select: { name: true } } },
      }),
    ]);

    // 출결 Map: studentId-sessionType → attendance
    const attMap = new Map<string, typeof attendances[0]>();
    for (const a of attendances) {
      attMap.set(`${a.studentId}-${a.sessionType}`, a);
    }

    // 감독교사 Map: sessionType → name
    const supervisorMap = new Map<string, string>();
    for (const sa of supervisorAssignments) {
      supervisorMap.set(sa.sessionType, sa.teacher.name);
    }

    function calcStats(sessionType: "afternoon" | "night"): SessionStats {
      const stats = emptyStats();
      stats.supervisor = supervisorMap.get(sessionType) ?? null;

      for (const student of students) {
        const part = student.participationDays.find((p) => p.sessionType === sessionType);
        if (!part || !part.isParticipating || !part[dayField]) continue;

        stats.total++;

        // 방과후 체크
        if (afterSchoolField && part[afterSchoolField as keyof typeof part]) {
          stats.afterSchool++;
        }

        const att = attMap.get(`${student.id}-${sessionType}`);
        if (!att || att.status === "unchecked") continue;

        if (att.status === "present") {
          stats.present++;
        } else if (att.status === "absent") {
          if (att.absenceReason) {
            stats.excusedAbsent++;
          } else {
            stats.absent++;
          }
        }
      }

      return stats;
    }

    return NextResponse.json({
      date: dateStr,
      dayOfWeek: DAY_NAMES[dayOfWeek],
      isWeekend: false,
      afternoon: calcStats("afternoon"),
      night: calcStats("night"),
    });
  })(req);
}
```

- [ ] **Step 2: Verify the API works**

Run: `curl http://localhost:3000/api/grade-admin/1/today-attendance` (requires auth cookie)
Or test via the browser dev tools after login as admin.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/grade-admin/\[grade\]/today-attendance/route.ts
git commit -m "feat: grade-admin 오늘출결 API 추가"
```

---

### Task 2: admin 전학년 오늘출결 API

**Files:**
- Create: `src/app/api/admin/today-attendance/route.ts`

- [ ] **Step 1: Create the API route file**

```typescript
// src/app/api/admin/today-attendance/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const DAY_FIELDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const AFTER_SCHOOL_FIELDS = [
  "", "afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri", "",
] as const;
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

type SessionStats = {
  supervisor: string | null;
  total: number;
  present: number;
  absent: number;
  excusedAbsent: number;
  afterSchool: number;
};

function emptyStats(): SessionStats {
  return { supervisor: null, total: 0, present: 0, absent: 0, excusedAbsent: 0, afterSchool: 0 };
}

export const GET = withAuth(["admin"], async (req: Request) => {
  // KST 오늘 날짜
  const now = new Date();
  const kstOffset = now.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstOffset);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  const dayOfWeek = kst.getUTCDay();
  const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return NextResponse.json({
      date: dateStr,
      dayOfWeek: DAY_NAMES[dayOfWeek],
      isWeekend: true,
      grades: [1, 2, 3].map((g) => ({
        grade: g,
        afternoon: emptyStats(),
        night: emptyStats(),
      })),
    });
  }

  const dayField = DAY_FIELDS[dayOfWeek] as "mon" | "tue" | "wed" | "thu" | "fri";
  const afterSchoolField = AFTER_SCHOOL_FIELDS[dayOfWeek];
  const dateObj = new Date(dateStr + "T00:00:00Z");

  // 전학년 병렬 쿼리
  const [students, attendances, supervisorAssignments] = await Promise.all([
    prisma.student.findMany({
      where: { isActive: true, grade: { in: [1, 2, 3] } },
      include: { participationDays: true },
    }),
    prisma.attendance.findMany({
      where: { date: dateObj },
      include: { absenceReason: { select: { reasonType: true } } },
    }),
    prisma.supervisorAssignment.findMany({
      where: { date: dateObj },
      include: { teacher: { select: { name: true } } },
    }),
  ]);

  // 학년별 학생 그룹
  const studentsByGrade = new Map<number, typeof students>();
  for (const s of students) {
    const arr = studentsByGrade.get(s.grade) || [];
    arr.push(s);
    studentsByGrade.set(s.grade, arr);
  }

  // 출결 Map: studentId-sessionType
  const attMap = new Map<string, typeof attendances[0]>();
  for (const a of attendances) {
    attMap.set(`${a.studentId}-${a.sessionType}`, a);
  }

  // 감독 Map: grade-sessionType → name
  const supervisorMap = new Map<string, string>();
  for (const sa of supervisorAssignments) {
    supervisorMap.set(`${sa.grade}-${sa.sessionType}`, sa.teacher.name);
  }

  function calcStats(gradeStudents: typeof students, gradeNum: number, sessionType: "afternoon" | "night"): SessionStats {
    const stats = emptyStats();
    stats.supervisor = supervisorMap.get(`${gradeNum}-${sessionType}`) ?? null;

    for (const student of gradeStudents) {
      const part = student.participationDays.find((p) => p.sessionType === sessionType);
      if (!part || !part.isParticipating || !part[dayField]) continue;

      stats.total++;

      if (afterSchoolField && part[afterSchoolField as keyof typeof part]) {
        stats.afterSchool++;
      }

      const att = attMap.get(`${student.id}-${sessionType}`);
      if (!att || att.status === "unchecked") continue;

      if (att.status === "present") {
        stats.present++;
      } else if (att.status === "absent") {
        if (att.absenceReason) {
          stats.excusedAbsent++;
        } else {
          stats.absent++;
        }
      }
    }

    return stats;
  }

  const grades = [1, 2, 3].map((g) => ({
    grade: g,
    afternoon: calcStats(studentsByGrade.get(g) || [], g, "afternoon"),
    night: calcStats(studentsByGrade.get(g) || [], g, "night"),
  }));

  return NextResponse.json({
    date: dateStr,
    dayOfWeek: DAY_NAMES[dayOfWeek],
    isWeekend: false,
    grades,
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/today-attendance/route.ts
git commit -m "feat: admin 전학년 오늘출결 API 추가"
```

---

### Task 3: grade-admin 월간출결 API

**Files:**
- Create: `src/app/api/grade-admin/[grade]/monthly-attendance/route.ts`

- [ ] **Step 1: Create the API route file**

이 API는 `/api/homeroom/monthly-attendance`와 동일한 로직이지만, 담임 배정이 아닌 학년 전체 학생을 조회한다.

```typescript
// src/app/api/grade-admin/[grade]/monthly-attendance/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withGradeAuth } from "@/lib/api-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseInt(gradeStr, 10);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req, user) => {
    const url = new URL(req.url);
    const monthStr = url.searchParams.get("month"); // YYYY-MM

    let year: number, monthIdx: number;
    if (monthStr) {
      [year, monthIdx] = monthStr.split("-").map(Number);
      monthIdx -= 1;
    } else {
      const now = new Date();
      year = now.getFullYear();
      monthIdx = now.getMonth();
    }

    const startDate = new Date(year, monthIdx, 1);
    const endDate = new Date(year, monthIdx + 1, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // 평일 날짜 배열
    const dates: string[] = [];
    const d = new Date(startDate);
    while (d <= endDate) {
      if (d.getDay() >= 1 && d.getDay() <= 5) {
        dates.push(d.toISOString().split("T")[0]);
      }
      d.setDate(d.getDate() + 1);
    }

    // 학년 전체 활성 학생 (반+번호 순)
    const students = await prisma.student.findMany({
      where: { grade, isActive: true },
      orderBy: [{ classNumber: "asc" }, { studentNumber: "asc" }],
      include: {
        attendances: {
          where: { date: { gte: startDate, lte: endDate } },
          include: { absenceReason: { select: { reasonType: true } } },
        },
        participationDays: true,
      },
    });

    const result = students.map((student) => {
      const attMap = new Map<string, typeof student.attendances[0]>();
      for (const a of student.attendances) {
        attMap.set(`${a.date.toISOString().split("T")[0]}-${a.sessionType}`, a);
      }

      const dateMap: Record<string, {
        afternoon?: string;
        night?: string;
        afternoonReason?: string;
        nightReason?: string;
      }> = {};

      for (const date of dates) {
        const afternoon = attMap.get(`${date}-afternoon`);
        const night = attMap.get(`${date}-night`);
        dateMap[date] = {
          afternoon: afternoon?.status,
          night: night?.status,
          afternoonReason: afternoon?.absenceReason?.reasonType,
          nightReason: night?.absenceReason?.reasonType,
        };
      }

      return {
        id: student.id,
        name: student.name,
        grade: student.grade,
        classNumber: student.classNumber,
        studentNumber: student.studentNumber,
        dates: dateMap,
        participationDays: student.participationDays.map((p) => ({
          sessionType: p.sessionType,
          isParticipating: p.isParticipating,
          mon: p.mon, tue: p.tue, wed: p.wed, thu: p.thu, fri: p.fri,
          afterSchoolMon: p.afterSchoolMon, afterSchoolTue: p.afterSchoolTue,
          afterSchoolWed: p.afterSchoolWed, afterSchoolThu: p.afterSchoolThu,
          afterSchoolFri: p.afterSchoolFri,
        })),
      };
    });

    return NextResponse.json({ students: result, dates });
  })(req);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/grade-admin/\[grade\]/monthly-attendance/route.ts
git commit -m "feat: grade-admin 월간출결 API 추가"
```

---

### Task 4: grade-admin 월간출결 Excel 다운로드 API

**Files:**
- Create: `src/app/api/grade-admin/[grade]/export-attendance/route.ts`

- [ ] **Step 1: Create the API route file**

`/api/homeroom/export-attendance`를 참조하되, 학년 전체를 하나의 시트에 출력하고 짝수반에 연한 파란 배경을 적용한다.

```typescript
// src/app/api/grade-admin/[grade]/export-attendance/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withGradeAuth } from "@/lib/api-auth";
import ExcelJS from "exceljs";

const REASON_KO: Record<string, string> = {
  academy: "학원", afterschool: "방과후", illness: "질병", custom: "기타",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseInt(gradeStr, 10);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req, user) => {
    const url = new URL(req.url);
    const monthStr = url.searchParams.get("month");

    let year: number, monthIdx: number;
    if (monthStr) {
      [year, monthIdx] = monthStr.split("-").map(Number);
      monthIdx -= 1;
    } else {
      const now = new Date();
      year = now.getFullYear();
      monthIdx = now.getMonth();
    }

    const startDate = new Date(year, monthIdx, 1);
    const endDate = new Date(year, monthIdx + 1, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const dates: string[] = [];
    const d = new Date(startDate);
    while (d <= endDate) {
      if (d.getDay() >= 1 && d.getDay() <= 5) {
        dates.push(d.toISOString().split("T")[0]);
      }
      d.setDate(d.getDate() + 1);
    }

    const students = await prisma.student.findMany({
      where: { grade, isActive: true },
      orderBy: [{ classNumber: "asc" }, { studentNumber: "asc" }],
      include: {
        attendances: {
          where: { date: { gte: startDate, lte: endDate } },
          include: { absenceReason: { select: { reasonType: true, detail: true } } },
        },
      },
    });

    try {
      const workbook = new ExcelJS.Workbook();
      const sheetName = `${grade}학년 월간출결`;
      const sheet = workbook.addWorksheet(sheetName);

      // 헤더 행 1: 반, 번호, 이름, 날짜별(2칸씩)
      const headerRow1 = ["반", "번호", "이름"];
      const headerRow2 = ["", "", ""];
      for (const date of dates) {
        const dayName = ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()];
        headerRow1.push(`${date.slice(5)} (${dayName})`, "");
        headerRow2.push("오후", "야간");
      }

      sheet.addRow(headerRow1);
      sheet.addRow(headerRow2);

      // 날짜 헤더 셀 병합
      for (let i = 0; i < dates.length; i++) {
        const col = 4 + i * 2; // 1-based, 반/번호/이름 다음
        sheet.mergeCells(1, col, 1, col + 1);
        const cell = sheet.getCell(1, col);
        cell.alignment = { horizontal: "center" };
      }

      // 헤더 스타일
      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      });
      sheet.getRow(2).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
      });

      // 짝수반 배경색
      const evenClassFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F7FF" },
      };

      // 데이터 행
      let prevClassNumber = -1;
      for (const student of students) {
        const attMap = new Map<string, typeof student.attendances[0]>();
        for (const a of student.attendances) {
          attMap.set(`${a.date.toISOString().split("T")[0]}-${a.sessionType}`, a);
        }

        const showClass = student.classNumber !== prevClassNumber;
        prevClassNumber = student.classNumber;

        const row: string[] = [
          showClass ? String(student.classNumber) : "",
          String(student.studentNumber),
          student.name,
        ];

        for (const date of dates) {
          const afternoon = attMap.get(`${date}-afternoon`);
          const night = attMap.get(`${date}-night`);

          const statusSymbol = (a: typeof afternoon) => {
            if (!a) return "-";
            if (a.status === "present") return "O";
            if (a.status === "absent") {
              const reason = a.absenceReason;
              if (reason) {
                const label = REASON_KO[reason.reasonType] || reason.reasonType;
                return reason.detail ? `△(${label}: ${reason.detail})` : `△(${label})`;
              }
              return "X";
            }
            return "-";
          };

          row.push(statusSymbol(afternoon), statusSymbol(night));
        }

        const excelRow = sheet.addRow(row);

        // 짝수반 배경 적용
        if (student.classNumber % 2 === 0) {
          excelRow.eachCell((cell) => {
            cell.fill = evenClassFill;
          });
        }
      }

      // 열 너비
      sheet.getColumn(1).width = 5;  // 반
      sheet.getColumn(2).width = 6;  // 번호
      sheet.getColumn(3).width = 10; // 이름
      for (let i = 0; i < dates.length; i++) {
        sheet.getColumn(4 + i * 2).width = 14;
        sheet.getColumn(5 + i * 2).width = 14;
      }

      const uint8 = new Uint8Array(await workbook.xlsx.writeBuffer());
      const displayMonth = `${year}년 ${monthIdx + 1}월`;
      const filename = `${grade}학년_월간출결_${year}-${String(monthIdx + 1).padStart(2, "0")}.xlsx`;
      const encodedFilename = encodeURIComponent(filename);

      return new Response(uint8, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="attendance.xlsx"; filename*=UTF-8''${encodedFilename}`,
        },
      });
    } catch (error) {
      console.error("Grade attendance Excel generation error:", error);
      return NextResponse.json({ error: "엑셀 생성에 실패했습니다." }, { status: 500 });
    }
  })(req);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/grade-admin/\[grade\]/export-attendance/route.ts
git commit -m "feat: grade-admin 월간출결 Excel 다운로드 API 추가"
```

---

### Task 5: grade-admin 탭 확장 (오늘출결 + 월간출결)

**Files:**
- Modify: `src/app/grade-admin/[grade]/page.tsx`

- [ ] **Step 1: Update the tab configuration and add new components**

`src/app/grade-admin/[grade]/page.tsx`를 수정하여 "오늘출결" 탭을 맨 앞, "월간출결" 탭을 맨 뒤에 추가한다.

기존 TABS 배열과 TabKey 타입을 수정:

```typescript
const TABS = [
  { key: "today", label: "오늘출결" },
  { key: "students", label: "학생 관리" },
  { key: "participation", label: "참여 설정" },
  { key: "seats", label: "좌석 배치" },
  { key: "supervisors", label: "감독 배정" },
  { key: "monthly", label: "월간출결" },
] as const;
```

기본 activeTab을 `"today"`로 변경.

dynamic import 2개 추가:

```typescript
const TodayAttendanceDashboard = dynamic(
  () => import("@/components/grade-admin/TodayAttendanceDashboard"),
  { ssr: false, loading: () => <div className="text-center py-12 text-gray-400">불러오는 중...</div> }
);
const GradeMonthlyAttendance = dynamic(
  () => import("@/components/grade-admin/GradeMonthlyAttendance"),
  { ssr: false, loading: () => <div className="text-center py-12 text-gray-400">불러오는 중...</div> }
);
```

탭 콘텐츠에 추가:

```tsx
{activeTab === "today" && <TodayAttendanceDashboard grade={grade} />}
{/* ... 기존 탭 콘텐츠 유지 ... */}
{activeTab === "monthly" && <GradeMonthlyAttendance grade={grade} />}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/grade-admin/\[grade\]/page.tsx
git commit -m "feat: grade-admin 오늘출결/월간출결 탭 추가"
```

---

### Task 6: TodayAttendanceDashboard 컴포넌트

**Files:**
- Create: `src/components/grade-admin/TodayAttendanceDashboard.tsx`

- [ ] **Step 1: Create the dashboard component**

```tsx
// src/components/grade-admin/TodayAttendanceDashboard.tsx
"use client";

import useSWR from "swr";

type SessionStats = {
  supervisor: string | null;
  total: number;
  present: number;
  absent: number;
  excusedAbsent: number;
  afterSchool: number;
};

type TodayData = {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  afternoon: SessionStats;
  night: SessionStats;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
    yellow: "bg-yellow-50 text-yellow-600",
  };
  return (
    <div className={`rounded-lg p-4 text-center ${colorMap[color] || ""}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function SessionCard({ title, icon, stats }: { title: string; icon: string; stats: SessionStats }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <span className="text-base font-semibold text-gray-700">{icon} {title}</span>
        {stats.supervisor && (
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
            감독: {stats.supervisor}
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="출석" value={stats.present} color="green" />
        <StatCard label="결석" value={stats.absent} color="red" />
        <StatCard label="사유결석" value={stats.excusedAbsent} color="orange" />
        <StatCard label="방과후" value={stats.afterSchool} color="yellow" />
      </div>
      <div className="mt-3 text-right text-sm text-gray-400">
        총 자습대상: {stats.total}명
      </div>
    </div>
  );
}

export default function TodayAttendanceDashboard({ grade }: { grade: number }) {
  const { data, isLoading } = useSWR<TodayData>(
    `/api/grade-admin/${grade}/today-attendance`,
    fetcher
  );

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">불러오는 중...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-400">데이터를 불러올 수 없습니다.</div>;
  }

  if (data.isWeekend) {
    return (
      <div className="text-center py-12">
        <div className="text-lg font-semibold text-gray-800 mb-2">
          {data.date.replace(/-/g, ".")} ({data.dayOfWeek})
        </div>
        <div className="text-gray-400">주말에는 자습이 없습니다.</div>
      </div>
    );
  }

  // 날짜 포맷: "2026년 4월 9일 (목)"
  const [y, m, d] = data.date.split("-");
  const dateDisplay = `${y}년 ${parseInt(m)}월 ${parseInt(d)}일 (${data.dayOfWeek})`;

  return (
    <div>
      <div className="text-center mb-5">
        <span className="text-lg font-semibold text-gray-800">{dateDisplay}</span>
      </div>
      <div className="space-y-4">
        <SessionCard title="오후자습" icon="☀️" stats={data.afternoon} />
        <SessionCard title="야간자습" icon="🌙" stats={data.night} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/grade-admin/TodayAttendanceDashboard.tsx
git commit -m "feat: TodayAttendanceDashboard 컴포넌트 생성"
```

---

### Task 7: GradeMonthlyAttendance 컴포넌트

**Files:**
- Create: `src/components/grade-admin/GradeMonthlyAttendance.tsx`

- [ ] **Step 1: Create the monthly attendance component**

`/homeroom/attendance/page.tsx`와 동일한 로직이지만, 학급별 그룹 대신 학년 전체를 하나의 테이블로 표시하고 짝수반 배경을 적용한다.

```tsx
// src/components/grade-admin/GradeMonthlyAttendance.tsx
"use client";

import React, { useState } from "react";
import useSWR from "swr";

type ParticipationData = {
  sessionType: "afternoon" | "night";
  isParticipating: boolean;
  mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean;
  afterSchoolMon: boolean; afterSchoolTue: boolean; afterSchoolWed: boolean;
  afterSchoolThu: boolean; afterSchoolFri: boolean;
};

type StudentData = {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  dates: Record<string, {
    afternoon?: string;
    night?: string;
    afternoonReason?: string;
    nightReason?: string;
  }>;
  participationDays: ParticipationData[];
};

type ResponseData = {
  students: StudentData[];
  dates: string[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;
const AFTER_SCHOOL_KEYS = ["afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri"] as const;

function getDayKey(dateStr: string): typeof DAY_KEYS[number] {
  const day = new Date(dateStr + "T00:00:00").getDay();
  return DAY_KEYS[day - 1];
}

export default function GradeMonthlyAttendance({ grade }: { grade: number }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [legendOpen, setLegendOpen] = useState(false);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const { data, isLoading } = useSWR<ResponseData>(
    `/api/grade-admin/${grade}/monthly-attendance?month=${monthStr}`,
    fetcher
  );

  const students = data?.students ?? [];
  const dates = data?.dates ?? [];

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const handleExport = async () => {
    const res = await fetch(`/api/grade-admin/${grade}/export-attendance?month=${monthStr}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${grade}학년_월간출결_${monthStr}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 같은 반 첫 학생만 반 번호 표시
  let prevClassNumber = -1;

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            &larr;
          </button>
          <span className="text-lg font-semibold text-gray-800">
            {year}.{String(month + 1).padStart(2, "0")}
          </span>
          <button onClick={goToday} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100">
            Now
          </button>
          <button onClick={nextMonth} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            &rarr;
          </button>
        </div>
        <button
          onClick={handleExport}
          disabled={students.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          Excel
        </button>
      </div>

      {/* 범례 토글 */}
      <div className="mb-3">
        <button
          onClick={() => setLegendOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 w-full"
        >
          <span className="flex-1 border-t border-gray-200" />
          <span className="text-[10px] select-none">{legendOpen ? "▲" : "▼"}</span>
          <span className="flex-1 border-t border-gray-200" />
        </button>
        {legendOpen && (
          <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
            <span className="whitespace-nowrap"><span className="text-green-700 font-extrabold text-sm">O</span> 출석</span>
            <span className="whitespace-nowrap"><span className="text-red-700 font-extrabold text-sm">X</span> 무단결석</span>
            <span className="whitespace-nowrap"><span className="text-orange-500 font-extrabold text-sm">△</span> 사유결석</span>
            <span className="whitespace-nowrap"><span className="text-yellow-600 font-extrabold text-sm">방</span> 방과후</span>
            <span className="whitespace-nowrap"><span className="text-gray-400 font-bold">-</span> 미확인</span>
            <span className="whitespace-nowrap"><span className="inline-block w-4 h-3 bg-gray-100 border border-gray-300 rounded-sm align-middle" /> 미참가</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-sm text-gray-400">불러오는 중...</div>
      ) : students.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">학생이 없습니다.</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-300">
                  <th className="px-2 py-2 text-center font-medium text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[36px]">반</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-600 sticky left-[36px] bg-gray-50 z-10 min-w-[36px]">번</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 sticky left-[72px] bg-gray-50 z-10 min-w-[56px]">이름</th>
                  {dates.map((date) => {
                    const d = new Date(date);
                    const dayName = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
                    return (
                      <th key={date} colSpan={2} className="px-1 py-2 text-center font-medium text-gray-600 border-l border-gray-300 whitespace-nowrap">
                        {date.slice(8)}/{dayName}
                      </th>
                    );
                  })}
                </tr>
                <tr className="bg-gray-50 border-b border-gray-300">
                  <th className="sticky left-0 bg-gray-50 z-10" />
                  <th className="sticky left-[36px] bg-gray-50 z-10" />
                  <th className="sticky left-[72px] bg-gray-50 z-10" />
                  {dates.map((date) => (
                    <React.Fragment key={date}>
                      <th className="px-1 py-1 text-center text-gray-400 border-l border-gray-300">오</th>
                      <th className="px-1 py-1 text-center text-gray-400">야</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  prevClassNumber = -1;
                  return students.map((student) => {
                    const showClass = student.classNumber !== prevClassNumber;
                    prevClassNumber = student.classNumber;
                    const isEvenClass = student.classNumber % 2 === 0;
                    const rowBg = isEvenClass ? "bg-[#f0f7ff]" : "bg-white";
                    const stickyBg = isEvenClass ? "bg-[#f0f7ff]" : "bg-white";

                    const afternoonPart = student.participationDays.find((p) => p.sessionType === "afternoon");
                    const nightPart = student.participationDays.find((p) => p.sessionType === "night");

                    return (
                      <tr key={student.id} className={`border-b border-gray-300 ${rowBg}`}>
                        <td className={`px-2 py-1.5 text-center font-semibold sticky left-0 z-10 ${stickyBg}`}>
                          {showClass ? student.classNumber : ""}
                        </td>
                        <td className={`px-2 py-1.5 text-center sticky left-[36px] z-10 ${stickyBg} text-gray-600`}>
                          {student.studentNumber}
                        </td>
                        <td className={`px-3 py-1.5 font-medium sticky left-[72px] z-10 ${stickyBg} text-gray-900`}>
                          {student.name}
                        </td>
                        {dates.map((date) => {
                          const att = student.dates[date] || {};
                          const dayKey = getDayKey(date);
                          const dayIdx = DAY_KEYS.indexOf(dayKey);

                          const isAfternoonParticipating = afternoonPart
                            ? afternoonPart.isParticipating && afternoonPart[dayKey]
                            : true;
                          const isNightParticipating = nightPart
                            ? nightPart.isParticipating && nightPart[dayKey]
                            : true;

                          const isAfternoonAfterSchool = afternoonPart
                            ? afternoonPart.isParticipating && afternoonPart[dayKey] && afternoonPart[AFTER_SCHOOL_KEYS[dayIdx]]
                            : false;
                          const isNightAfterSchool = nightPart
                            ? nightPart.isParticipating && nightPart[dayKey] && nightPart[AFTER_SCHOOL_KEYS[dayIdx]]
                            : false;

                          const afternoonGray = !isAfternoonParticipating;
                          const nightGray = !isNightParticipating;
                          const afternoonHasData = att.afternoon && att.afternoon !== "unchecked";
                          const nightHasData = att.night && att.night !== "unchecked";

                          return (
                            <React.Fragment key={date}>
                              <td className={`px-1 py-1.5 text-center text-sm font-extrabold border-l border-gray-300 ${
                                afternoonGray ? "bg-gray-100" : ""
                              } ${
                                afternoonGray && !afternoonHasData ? "text-gray-300"
                                  : isAfternoonAfterSchool && (!att.afternoon || att.afternoon === "unchecked") ? "text-yellow-600 bg-yellow-50"
                                  : att.afternoon === "present" ? "text-green-700"
                                  : att.afternoon === "absent" && att.afternoonReason ? "text-orange-500"
                                  : att.afternoon === "absent" ? "text-red-700"
                                  : "text-gray-400"
                              }`}>
                                {afternoonGray && !afternoonHasData ? "-"
                                  : isAfternoonAfterSchool && (!att.afternoon || att.afternoon === "unchecked") ? "방"
                                  : att.afternoon === "present" ? "O"
                                  : att.afternoon === "absent" ? (att.afternoonReason ? "△" : "X")
                                  : "-"}
                              </td>
                              <td className={`px-1 py-1.5 text-center text-sm font-extrabold ${
                                nightGray ? "bg-gray-100" : ""
                              } ${
                                nightGray && !nightHasData ? "text-gray-300"
                                  : isNightAfterSchool && (!att.night || att.night === "unchecked") ? "text-yellow-600 bg-yellow-50"
                                  : att.night === "present" ? "text-green-700"
                                  : att.night === "absent" && att.nightReason ? "text-orange-500"
                                  : att.night === "absent" ? "text-red-700"
                                  : "text-gray-400"
                              }`}>
                                {nightGray && !nightHasData ? "-"
                                  : isNightAfterSchool && (!att.night || att.night === "unchecked") ? "방"
                                  : att.night === "present" ? "O"
                                  : att.night === "absent" ? (att.nightReason ? "△" : "X")
                                  : "-"}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-300 text-xs text-gray-500">
            총 {students.length}명
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/grade-admin/GradeMonthlyAttendance.tsx
git commit -m "feat: GradeMonthlyAttendance 컴포넌트 생성"
```

---

### Task 8: admin 대시보드 페이지 + AdminNav 변경

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/components/admin-shared/AdminNav.tsx`

- [ ] **Step 1: Replace admin/page.tsx with dashboard page**

기존 리다이렉트를 대시보드 페이지로 교체한다.

```tsx
// src/app/admin/page.tsx — 전체 교체
"use client";

import useSWR from "swr";

type SessionStats = {
  supervisor: string | null;
  total: number;
  present: number;
  absent: number;
  excusedAbsent: number;
  afterSchool: number;
};

type GradeData = {
  grade: number;
  afternoon: SessionStats;
  night: SessionStats;
};

type TodayData = {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  grades: GradeData[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function CompactStatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
    yellow: "bg-yellow-50 text-yellow-600",
  };
  return (
    <div className={`rounded-md p-2.5 text-center ${colorMap[color] || ""}`}>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-xs text-gray-500 ml-1">{label}</span>
    </div>
  );
}

function SessionRow({ label, icon, stats }: { label: string; icon: string; stats: SessionStats }) {
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-gray-500 w-14">{icon} {label}</span>
        {stats.supervisor && (
          <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
            {stats.supervisor}
          </span>
        )}
        <div className="flex-1" />
        <span className="text-xs text-gray-400">대상 {stats.total}명</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <CompactStatCard label="출석" value={stats.present} color="green" />
        <CompactStatCard label="결석" value={stats.absent} color="red" />
        <CompactStatCard label="사유결석" value={stats.excusedAbsent} color="orange" />
        <CompactStatCard label="방과후" value={stats.afterSchool} color="yellow" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useSWR<TodayData>(
    "/api/admin/today-attendance",
    fetcher
  );

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">불러오는 중...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-400">데이터를 불러올 수 없습니다.</div>;
  }

  if (data.isWeekend) {
    return (
      <div className="text-center py-12">
        <div className="text-lg font-semibold text-gray-800 mb-2">
          {data.date.replace(/-/g, ".")} ({data.dayOfWeek})
        </div>
        <div className="text-gray-400">주말에는 자습이 없습니다.</div>
      </div>
    );
  }

  const [y, m, d] = data.date.split("-");
  const dateDisplay = `${y}년 ${parseInt(m)}월 ${parseInt(d)}일 (${data.dayOfWeek}) 자습 현황`;

  return (
    <div>
      <div className="text-center mb-6">
        <span className="text-lg font-semibold text-gray-800">{dateDisplay}</span>
      </div>
      <div className="space-y-3">
        {data.grades.map((g) => (
          <div key={g.grade} className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-base font-bold text-gray-800 mb-3">{g.grade}학년</div>
            <SessionRow label="오후" icon="☀️" stats={g.afternoon} />
            <SessionRow label="야간" icon="🌙" stats={g.night} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add "오늘 출결" to AdminNav**

`src/components/admin-shared/AdminNav.tsx`의 `adminItems` 배열 맨 앞에 추가하고, exact match 로직을 적용한다.

기존 `adminItems` 배열:
```typescript
const adminItems: NavItem[] = isAdmin
  ? [
      { label: "사용자 관리", href: "/admin/users" },
      // ...
    ]
  : [];
```

변경:
```typescript
const adminItems: NavItem[] = isAdmin
  ? [
      { label: "오늘 출결", href: "/admin" },
      { label: "사용자 관리", href: "/admin/users" },
      { label: "좌석 배치", href: "/admin/seats" },
      { label: "감독 배정", href: "/admin/supervisors" },
      { label: "교체 이력", href: "/admin/swap-history" },
      { label: "출결 통계", href: "/admin/statistics" },
    ]
  : [];
```

기존 active 판별 로직 `pathname.startsWith(item.href)`를 `/admin` 경로에서만 exact match로 변경:

```tsx
{adminItems.map((item) => {
  const isActive = item.href === "/admin"
    ? pathname === "/admin"
    : pathname.startsWith(item.href);
  return (
    <Link
      key={item.href}
      href={item.href}
      className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      }`}
    >
      {item.label}
    </Link>
  );
})}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx src/components/admin-shared/AdminNav.tsx
git commit -m "feat: admin 오늘출결 대시보드 + AdminNav 메뉴 추가"
```

---

### Task 9: Build 확인 및 최종 검증

- [ ] **Step 1: Run the build**

```bash
npx next build
```

Expected: 빌드 성공. 새로운 라우트 4개 + 수정된 페이지 2개 + 새 컴포넌트 2개 모두 컴파일 통과.

- [ ] **Step 2: Manual smoke test**

1. admin 로그인 → `/admin` 접속 → 전학년 오늘 출결 대시보드 표시 확인
2. AdminNav에 "오늘 출결" 메뉴 첫 번째에 표시, active 상태 확인
3. AdminNav에서 "사용자 관리" 클릭 → `/admin/users`로 이동, "오늘 출결" active 해제 확인
4. `/grade-admin/1` 접속 → "오늘출결" 탭이 첫 번째, 기본 선택 확인
5. 오늘출결 탭 → 오후/야간 카드 표시 확인
6. "월간출결" 탭 → 테이블 표시, 짝수반 배경색 확인
7. 월간출결 Excel 다운로드 → 파일 열어서 짝수반 배경색 확인

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: 빌드 및 스모크 테스트 수정"
```
