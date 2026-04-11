# 모바일 "i" 모달 + 자습시간 누계·랭킹 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/attendance/[grade]` 페이지의 "i" 팝업을 모바일/태블릿에서 오버레이 모달로 전환하고, 교사·학생 양쪽에 학년도 기준 누계/랭킹을 표시한다.

**Architecture:** 학년도/랭킹 계산을 `lib/academic-year.ts` 유틸로 단일화. 두 API(`weekly`, `participation-days`)에서 이 유틸을 호출해 응답에 `totals`/`ranking`을 추가. 출석 페이지는 기존 `renderWeeklyPopup`의 JSX 본문을 `renderWeeklyContent()`로 분리하고, `>= 1024px`는 기존 인라인 말풍선, `< 1024px`는 오버레이 모달에서 동일 콘텐츠를 렌더.

**Tech Stack:** Next.js 16 (App Router) + TypeScript + Prisma 7 + Tailwind CSS 4 + SWR

**Spec:** `docs/superpowers/specs/2026-04-11-mobile-i-modal-ranking-design.md`

**Verification policy:** 프로젝트에 자동화된 테스트 프레임워크가 없음 (package.json scripts: dev/build/start/lint). 각 태스크는 `npm run lint`, `npx tsc --noEmit`, 수동 QA로 검증한다.

---

## Task 1: 학년도/랭킹 유틸 작성

**Files:**
- Create: `src/lib/academic-year.ts`

- [ ] **Step 1: 유틸 파일 생성**

파일 `src/lib/academic-year.ts`:

```ts
import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma";

/**
 * 학년도 범위: 매년 3월 1일 00:00 (inclusive) ~ 익년 3월 1일 00:00 (exclusive).
 * 서버 로컬 시각 기준 (프로젝트는 KST 가정).
 */
export function getAcademicYearRange(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const y = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
  const start = new Date(y, 2, 1, 0, 0, 0, 0);
  const end = new Date(y + 1, 2, 1, 0, 0, 0, 0);
  return { start, end };
}

export type RankingResult = {
  rank: number;
  totalRanked: number;
  topPercent: number;
  minutes: number;
};

type GroupRow = { studentId: number; minutes: bigint | number };

/**
 * 학년 내 학년도 자습시간 누계를 집계하고, 대상 학생의 표준 경쟁 순위를 반환한다.
 * 대상 학생의 누계가 0이거나 재적하지 않으면 null.
 */
export async function computeGradeStudyRanking(
  grade: number,
  targetStudentId: number,
  now: Date = new Date(),
): Promise<RankingResult | null> {
  const { start, end } = getAcademicYearRange(now);

  const rows = await prisma.$queryRaw<GroupRow[]>`
    SELECT
      a."studentId" AS "studentId",
      SUM(COALESCE(a."durationMinutes", 100))::int AS minutes
    FROM "Attendance" a
    INNER JOIN "Student" s ON s.id = a."studentId"
    WHERE s.grade = ${grade}
      AND s."isActive" = true
      AND a.status = 'present'::"AttendanceStatus"
      AND a.date >= ${start}
      AND a.date < ${end}
    GROUP BY a."studentId"
    HAVING SUM(COALESCE(a."durationMinutes", 100)) > 0
  `;

  if (rows.length === 0) return null;

  const normalized = rows.map((r) => ({
    studentId: r.studentId,
    minutes: typeof r.minutes === "bigint" ? Number(r.minutes) : r.minutes,
  }));
  normalized.sort((a, b) => b.minutes - a.minutes);

  // 표준 경쟁 순위: 동점자 같은 순위, 다음은 N+k
  let rank = 0;
  let prevMinutes = -1;
  let targetRank: number | null = null;
  let targetMinutes = 0;
  for (let i = 0; i < normalized.length; i++) {
    const r = normalized[i];
    if (r.minutes !== prevMinutes) {
      rank = i + 1;
      prevMinutes = r.minutes;
    }
    if (r.studentId === targetStudentId) {
      targetRank = rank;
      targetMinutes = r.minutes;
      break;
    }
  }

  if (targetRank === null) return null;

  const totalRanked = normalized.length;
  const topPercent = Math.ceil((targetRank / totalRanked) * 100);

  return {
    rank: targetRank,
    totalRanked,
    topPercent,
    minutes: targetMinutes,
  };
}
```

**중요 주의사항:**
- `Prisma.sql` 태그가 아닌 `$queryRaw` 템플릿 리터럴을 사용하므로 `${}` 바인딩이 자동으로 파라미터화됨 (SQL 인젝션 안전)
- `AttendanceStatus` enum 캐스트: `'present'::"AttendanceStatus"` — 프로젝트의 Prisma enum 이름 일치 확인 필요
- `@/generated/prisma`에서 `Prisma`를 import하지만 실제로는 사용하지 않으므로 불필요하면 삭제 가능 — 린트 경고 나면 제거
- `bigint` 변환: PostgreSQL `SUM()::int` 캐스팅해도 일부 드라이버는 bigint 반환 → 런타임 `typeof` 가드로 안전하게 처리

- [ ] **Step 2: 타입/린트 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

만약 `Prisma` import 미사용 경고 나면:
```ts
import { prisma } from "./prisma";
// Prisma import 삭제
```

또는 `AttendanceStatus` enum 캐스트 에러가 나면 enum 실제 이름 확인:
```bash
grep -rn "enum AttendanceStatus" prisma/schema.prisma
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/academic-year.ts
git commit -m "feat: 학년도/학년 내 자습 랭킹 유틸 추가"
```

---

## Task 2: `/api/student/participation-days` — 학년도 유틸 사용 + 랭킹 추가

**Files:**
- Modify: `src/app/api/student/participation-days/route.ts`

- [ ] **Step 1: 파일 전체 교체**

`src/app/api/student/participation-days/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { getAcademicYearRange, computeGradeStudyRanking } from "@/lib/academic-year";

// GET /api/student/participation-days
export const GET = withAuth(["student"], async (_req: Request, user) => {
  const studentId = user.userId;
  const grade = user.grade;

  const participationDays = await prisma.participationDay.findMany({
    where: { studentId },
    orderBy: { sessionType: "asc" },
  });

  // 월간 참여시간 (달력월)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // 학년도 범위 (3월 ~ 익년 2월)
  const { start: yearStart, end: yearEnd } = getAcademicYearRange(now);

  const [monthlyAttendances, yearlyAttendances, ranking] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        studentId,
        status: "present",
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { durationMinutes: true },
    }),
    prisma.attendance.findMany({
      where: {
        studentId,
        status: "present",
        date: { gte: yearStart, lt: yearEnd },
      },
      select: { durationMinutes: true },
    }),
    grade ? computeGradeStudyRanking(grade, studentId, now) : Promise.resolve(null),
  ]);

  const monthlyMinutes = monthlyAttendances.reduce(
    (sum, a) => sum + (a.durationMinutes ?? 100),
    0,
  );
  const yearlyMinutes = yearlyAttendances.reduce(
    (sum, a) => sum + (a.durationMinutes ?? 100),
    0,
  );
  const monthlyStudyHours = Math.round((monthlyMinutes / 60) * 10) / 10;
  const yearlyStudyHours = Math.round((yearlyMinutes / 60) * 10) / 10;

  const result: Record<
    string,
    {
      isParticipating: boolean;
      mon: boolean;
      tue: boolean;
      wed: boolean;
      thu: boolean;
      fri: boolean;
    }
  > = {};

  for (const p of participationDays) {
    result[p.sessionType] = {
      isParticipating: p.isParticipating,
      mon: p.mon,
      tue: p.tue,
      wed: p.wed,
      thu: p.thu,
      fri: p.fri,
    };
  }

  return NextResponse.json({
    participationDays: result,
    monthlyStudyHours,
    yearlyStudyHours,
    ranking: ranking
      ? {
          rank: ranking.rank,
          totalRanked: ranking.totalRanked,
          topPercent: ranking.topPercent,
        }
      : null,
  });
});
```

**변경점:**
- `yearStart` 계산 블록을 `getAcademicYearRange()`로 교체
- 연간 쿼리의 `date` 조건을 `{ gte: yearStart, lt: yearEnd }`로 변경 (기존 `lte: monthEnd`는 2월 말 이전 조회 시 학년도 끝 이전을 잘라내는 버그 가능 — 이번 기회에 수정)
- `ranking` 병렬 계산 추가, `user.grade` 없으면 null

- [ ] **Step 2: 타입/린트 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/student/participation-days/route.ts
git commit -m "feat: 학생 API에 학년도 유틸 적용 + 랭킹 추가"
```

---

## Task 3: `/api/attendance/weekly` — totals + ranking 응답 추가

**Files:**
- Modify: `src/app/api/attendance/weekly/route.ts`

- [ ] **Step 1: 파일 전체 교체**

`src/app/api/attendance/weekly/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { getAcademicYearRange, computeGradeStudyRanking } from "@/lib/academic-year";

// GET /api/attendance/weekly?studentId=1&date=2026-04-05
export const GET = withAuth(
  ["teacher", "student"],
  async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const studentId = parseInt(searchParams.get("studentId") || "");
    const dateStr = searchParams.get("date");

    if (!studentId || !dateStr) {
      return NextResponse.json({ error: "studentId와 date가 필요합니다." }, { status: 400 });
    }

    // 해당 주의 월~금 계산
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const weekDates: Date[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(d);
    }

    const startDate = weekDates[0];
    const endDate = weekDates[4];

    // 누계 범위
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const { start: yearStart, end: yearEnd } = getAcademicYearRange(now);

    const [
      attendances,
      participationDays,
      attendanceNotes,
      student,
      monthlyAttendances,
      yearlyAttendances,
    ] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          studentId,
          date: { gte: startDate, lte: endDate },
        },
        include: { absenceReason: true },
        orderBy: { date: "asc" },
      }),
      prisma.participationDay.findMany({
        where: { studentId },
      }),
      prisma.attendanceNote.findMany({
        where: { studentId, date: { gte: startDate, lte: endDate } },
      }),
      prisma.student.findUnique({
        where: { id: studentId },
        select: { grade: true },
      }),
      prisma.attendance.findMany({
        where: {
          studentId,
          status: "present",
          date: { gte: monthStart, lte: monthEnd },
        },
        select: { durationMinutes: true },
      }),
      prisma.attendance.findMany({
        where: {
          studentId,
          status: "present",
          date: { gte: yearStart, lt: yearEnd },
        },
        select: { durationMinutes: true },
      }),
    ]);

    const ranking = student?.grade
      ? await computeGradeStudyRanking(student.grade, studentId, now)
      : null;

    const monthlyMinutes = monthlyAttendances.reduce(
      (sum, a) => sum + (a.durationMinutes ?? 100),
      0,
    );
    const yearlyMinutes = yearlyAttendances.reduce(
      (sum, a) => sum + (a.durationMinutes ?? 100),
      0,
    );
    const monthlyHours = Math.round((monthlyMinutes / 60) * 10) / 10;
    const academicYearHours = Math.round((yearlyMinutes / 60) * 10) / 10;

    // 참여설정을 세션별로 매핑
    const dayKeys = ["", "mon", "tue", "wed", "thu", "fri"] as const;
    const participationMap: Record<string, Record<string, boolean>> = {};
    for (const pd of participationDays) {
      participationMap[pd.sessionType] = {
        isParticipating: pd.isParticipating,
        mon: pd.mon, tue: pd.tue, wed: pd.wed, thu: pd.thu, fri: pd.fri,
      };
    }

    const afterSchoolMap: Record<string, Record<string, boolean>> = {};
    for (const pd of participationDays) {
      afterSchoolMap[pd.sessionType] = {
        mon: pd.afterSchoolMon, tue: pd.afterSchoolTue, wed: pd.afterSchoolWed,
        thu: pd.afterSchoolThu, fri: pd.afterSchoolFri,
      };
    }

    const noteMap = new Map<string, string>();
    for (const n of attendanceNotes) {
      noteMap.set(`${n.date.toISOString().split("T")[0]}-${n.sessionType}`, n.note);
    }

    const attMap = new Map<string, typeof attendances[0]>();
    for (const a of attendances) {
      attMap.set(`${a.date.toISOString().split("T")[0]}-${a.sessionType}`, a);
    }

    const weekly = weekDates.map((d) => {
      const dateStr = d.toISOString().split("T")[0];
      const dayOfWeekIdx = d.getDay();
      const dayKey = dayKeys[dayOfWeekIdx] || "";

      const afternoon = attMap.get(`${dateStr}-afternoon`);
      const night = attMap.get(`${dateStr}-night`);

      const afternoonPart = participationMap["afternoon"];
      const nightPart = participationMap["night"];

      const afternoonParticipating = afternoonPart
        ? (afternoonPart.isParticipating && (dayKey ? afternoonPart[dayKey] : false))
        : true;
      const nightParticipating = nightPart
        ? (nightPart.isParticipating && (dayKey ? nightPart[dayKey] : false))
        : true;

      return {
        date: dateStr,
        dayOfWeek: ["일", "월", "화", "수", "목", "금", "토"][d.getDay()],
        afternoon: afternoon
          ? {
              status: afternoon.status,
              reason: afternoon.absenceReason
                ? { type: afternoon.absenceReason.reasonType, detail: afternoon.absenceReason.detail }
                : null,
            }
          : null,
        night: night
          ? {
              status: night.status,
              reason: night.absenceReason
                ? { type: night.absenceReason.reasonType, detail: night.absenceReason.detail }
                : null,
            }
          : null,
        afternoonParticipating,
        nightParticipating,
        afternoonNote: noteMap.get(`${dateStr}-afternoon`) || null,
        nightNote: noteMap.get(`${dateStr}-night`) || null,
        afternoonAfterSchool: (() => {
          const as = afterSchoolMap["afternoon"];
          return as ? (participationMap["afternoon"]?.isParticipating && (dayKey ? as[dayKey] : false)) : false;
        })(),
        nightAfterSchool: (() => {
          const as = afterSchoolMap["night"];
          return as ? (participationMap["night"]?.isParticipating && (dayKey ? as[dayKey] : false)) : false;
        })(),
      };
    });

    return NextResponse.json({
      weekly,
      totals: {
        monthlyMinutes,
        monthlyHours,
        academicYearMinutes: yearlyMinutes,
        academicYearHours,
      },
      ranking: ranking
        ? {
            rank: ranking.rank,
            totalRanked: ranking.totalRanked,
            topPercent: ranking.topPercent,
          }
        : null,
    });
  }
);
```

**변경점:**
- 기존 응답에 `totals`, `ranking` 필드 추가
- 학생 `grade` 조회 + 월간/학년도 누계 쿼리 병렬 실행
- 랭킹은 `student.grade` 조회 결과에 의존하므로 `Promise.all` 밖에서 후속 호출

- [ ] **Step 2: 타입/린트 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/attendance/weekly/route.ts
git commit -m "feat: weekly API에 월간/학년도 누계 + 랭킹 응답 추가"
```

---

## Task 4: 학생 페이지 — 학년도 라벨 + 랭킹 뱃지

**Files:**
- Modify: `src/app/student/page.tsx`

- [ ] **Step 1: 타입과 UI 수정**

`src/app/student/page.tsx` — 전체 내용을 다음으로 교체:

```tsx
"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;
const DAY_LABELS = ["월", "화", "수", "목", "금"] as const;

type DaySettings = {
  isParticipating: boolean;
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
};

type Ranking = {
  rank: number;
  totalRanked: number;
  topPercent: number;
};

type ParticipationData = {
  participationDays: Record<string, DaySettings>;
  monthlyStudyHours: number;
  yearlyStudyHours: number;
  ranking: Ranking | null;
};

export default function StudentParticipationPage() {
  const { data, isLoading } = useSWR<ParticipationData>(
    "/api/student/participation-days",
    fetcher
  );

  const afternoon = data?.participationDays?.afternoon;
  const night = data?.participationDays?.night;

  function renderSession(
    label: string,
    settings: DaySettings | undefined
  ) {
    if (!settings || !settings.isParticipating) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">{label}</h3>
          <p className="text-sm text-gray-400">미참가</p>
        </div>
      );
    }

    const activeDays = DAY_KEYS.filter((key) => settings[key]);

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">{label}</h3>
        <div className="flex gap-2">
          {DAY_KEYS.map((key, i) => {
            const active = settings[key];
            return (
              <div
                key={key}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium ${
                  active
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-300"
                }`}
              >
                {DAY_LABELS[i]}
              </div>
            );
          })}
        </div>
        {activeDays.length > 0 && (
          <p className="mt-2 text-xs text-gray-400">
            주 {activeDays.length}일 참가
          </p>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-400">불러오는 중...</div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">내 참여일정</h2>
      <div className="space-y-4">
        {renderSession("오후자습", afternoon)}
        {renderSession("야간자습", night)}
      </div>

      {data && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">자율학습 참여시간</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-500 mb-1">이번 달</p>
              <p className="text-2xl font-bold text-blue-700">
                {data.monthlyStudyHours.toFixed(1)}
              </p>
              <p className="text-xs text-blue-400 mt-0.5">시간</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <p className="text-xs text-indigo-500 mb-1">학년도 누계</p>
              <p className="text-2xl font-bold text-indigo-700">
                {data.yearlyStudyHours.toFixed(1)}
              </p>
              <p className="text-xs text-indigo-400 mt-0.5">시간</p>
              {data.ranking && (
                <p className="text-[11px] text-amber-600 mt-1 font-semibold">
                  {data.ranking.rank}위 (상위 {data.ranking.topPercent}%)
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!afternoon && !night && (
        <p className="mt-4 text-sm text-gray-400">
          참여일정이 설정되지 않았습니다. 담당 선생님에게 문의하세요.
        </p>
      )}
    </div>
  );
}
```

**변경점:**
- `ParticipationData`에 `ranking: Ranking | null` 필드 추가
- 두 번째 카드 라벨 `"올해 누적"` → `"학년도 누계"`
- 학년도 카드 내부에 랭킹 뱃지 조건부 렌더

- [ ] **Step 2: 타입/린트 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/student/page.tsx
git commit -m "feat: 학생 페이지에 학년도 라벨 + 랭킹 뱃지 추가"
```

---

## Task 5: 출석 페이지 — 팝업 콘텐츠 분리 + 상태 추가

이 태스크는 기존 `renderWeeklyPopup`를 두 함수로 분해하지만 아직 모달은 추가하지 않는다. 데스크톱 동작은 그대로 유지되어야 한다.

**Files:**
- Modify: `src/app/attendance/[grade]/page.tsx`

- [ ] **Step 1: 타입/상태 추가**

`src/app/attendance/[grade]/page.tsx` 파일 상단 interface 영역에 추가 (`WeeklyDay` 인터페이스 바로 뒤):

```ts
interface WeeklyTotals {
  monthlyMinutes: number;
  monthlyHours: number;
  academicYearMinutes: number;
  academicYearHours: number;
}

interface WeeklyRanking {
  rank: number;
  totalRanked: number;
  topPercent: number;
}
```

컴포넌트 본문 내, 기존 `const [weeklyData, setWeeklyData] = useState<WeeklyDay[]>([]);` 바로 아래에 두 상태 추가:

```ts
const [weeklyTotals, setWeeklyTotals] = useState<WeeklyTotals | null>(null);
const [weeklyRanking, setWeeklyRanking] = useState<WeeklyRanking | null>(null);
```

- [ ] **Step 2: `handleInfoClick` 업데이트**

기존 `handleInfoClick` 함수(`setNoteValues(notes);` 포함 부분)의 본문을 다음으로 교체:

```ts
async function handleInfoClick(e: React.MouseEvent, studentId: number, name: string) {
  e.stopPropagation();
  if (selectedSeat === studentId) {
    setSelectedSeat(null);
    setWeeklyTotals(null);
    setWeeklyRanking(null);
    return;
  }
  setSelectedSeat(studentId);
  setWeeklyName(name);
  const res = await fetch(`/api/attendance/weekly?studentId=${studentId}&date=${today}`);
  const result = await res.json();
  setWeeklyData(result.weekly || []);
  setWeeklyTotals(result.totals || null);
  setWeeklyRanking(result.ranking || null);
  const notes: Record<string, string> = {};
  for (const d of (result.weekly || []) as WeeklyDay[]) {
    const noteVal = tab === "afternoon" ? d.afternoonNote : d.nightNote;
    if (noteVal) notes[d.date] = noteVal;
  }
  setNoteValues(notes);
}
```

- [ ] **Step 3: `renderWeeklyPopup` 분해 — 공통 콘텐츠 추출**

기존 `renderWeeklyPopup` 함수 위치에 다음 두 함수로 교체. 기존 본문(말풍선 div + 내부 모두)은 삭제하고 아래로 완전 교체한다:

```tsx
// 주간 팝업/모달 공통 콘텐츠 (래퍼 없음)
function renderWeeklyContent(selectedInThisRow: Seat) {
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
      <div className="grid grid-cols-5 gap-[clamp(2px,0.6vw,4px)] text-center">
        {weeklyData.map((d) => {
          const isToday = d.date === today;
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
        {weeklyData.map((d) => {
          const isToday = d.date === today;
          const participating = tab === "afternoon" ? d.afternoonParticipating : d.nightParticipating;
          const isAfterSchoolDay = tab === "afternoon" ? d.afternoonAfterSchool : d.nightAfterSchool;
          const record = tab === "afternoon" ? d.afternoon : d.night;
          const status = record?.status;
          if (!participating) {
            return (
              <div key={`cell-${d.date}`} className="rounded-[4px] py-[clamp(6px,1.5vw,10px)] px-1 text-[clamp(9px,2.2vw,11px)] font-medium bg-[#e5e7eb] text-[#9ca3af]">-</div>
            );
          }
          if (isAfterSchoolDay && (!status || status === "unchecked")) {
            return (
              <div key={`cell-${d.date}`} className={`rounded-[4px] py-[clamp(6px,1.5vw,10px)] px-1 text-[clamp(9px,2.2vw,11px)] font-medium bg-[#fef9c3] text-[#ca8a04] ${isToday ? "border-2 border-[#2563eb] font-bold text-[clamp(10px,2.5vw,12px)]" : ""}`}>
                방과후
              </div>
            );
          }
          let cellClass = "bg-[#f3f4f6] text-[#9ca3af]";
          let label = "-";
          if (status === "present") { cellClass = "bg-[#bbf7d0] text-[#166534]"; label = "출석"; }
          else if (status === "absent") { cellClass = "bg-[#fecaca] text-[#991b1b]"; label = "결석"; }
          return (
            <div key={`cell-${d.date}`} className={`rounded-[4px] py-[clamp(6px,1.5vw,10px)] px-1 text-[clamp(9px,2.2vw,11px)] font-medium ${cellClass} ${isToday ? "border-2 border-[#2563eb] font-bold text-[clamp(10px,2.5vw,12px)]" : ""}`}>
              {label}
            </div>
          );
        })}
        {weeklyData.map((d) => {
          const participating = tab === "afternoon" ? d.afternoonParticipating : d.nightParticipating;
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
      {weeklyData.some((d) => {
        const r = tab === "afternoon" ? d.afternoon : d.night;
        return r?.reason;
      }) && (
        <div className="mt-1.5 text-[clamp(9px,2.2vw,11px)] text-[#dc2626]">
          {weeklyData
            .filter((d) => (tab === "afternoon" ? d.afternoon : d.night)?.reason)
            .map((d) => {
              const r = (tab === "afternoon" ? d.afternoon : d.night)!.reason!;
              return `${d.dayOfWeek}: ${r.type}${r.detail ? ` (${r.detail})` : ""}`;
            })
            .join(", ")}
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

// 데스크톱 인라인 말풍선 래퍼 (>= lg)
function renderWeeklyPopup(room: Room, selectedInThisRow: Seat) {
  return (
    <div
      className="hidden lg:block relative bg-[#eff6ff] border-2 border-[#2563eb] rounded-lg p-[clamp(8px,2vw,14px)]"
      style={{ marginBottom: "clamp(3px, 0.8vw, 6px)" }}
    >
      <div
        className="absolute -top-[8px] w-[14px] h-[14px] bg-[#eff6ff] border-l-2 border-t-2 border-[#2563eb] rotate-45"
        style={{
          left: `calc(${(selectedInThisRow.colIndex + 0.5) / room.cols * 100}% - 7px)`,
        }}
      />
      {renderWeeklyContent(selectedInThisRow)}
    </div>
  );
}
```

**중요:**
- 기존 `renderWeeklyPopup`는 이름만 유지하고 내부에서 `renderWeeklyContent`를 호출
- 데스크톱 래퍼에 `hidden lg:block` 클래스 추가 → `< 1024px`에서는 이 말풍선이 렌더되지 않음 (Task 6에서 모달이 대체)
- 공통 콘텐츠 함수는 `selectedInThisRow`를 파라미터로 받아 제목 부분 렌더

- [ ] **Step 4: 타입/린트 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 5: 수동 확인 (데스크톱만)**

```bash
npm run dev
```

브라우저(데스크톱 너비 ≥1024px)에서:
- 교사 로그인 → `/attendance/1`
- 학생 좌석의 "i" 클릭 → 기존처럼 말풍선이 아래 행으로 표시
- 말풍선 하단에 "이번 달 / 학년도 / 학년 내 순위" 3칸 블록 노출
- 비고 입력 정상 작동

확인되지 않으면 브라우저 콘솔 에러 확인, 롤백하고 재시도.

- [ ] **Step 6: 커밋**

```bash
git add src/app/attendance/[grade]/page.tsx
git commit -m "feat: 주간 팝업 콘텐츠 분리 + 누계/랭킹 블록 추가"
```

---

## Task 6: 출석 페이지 — 모바일/태블릿 오버레이 모달 추가

**Files:**
- Modify: `src/app/attendance/[grade]/page.tsx`

- [ ] **Step 1: ESC 키 + body scroll lock useEffect 추가**

`src/app/attendance/[grade]/page.tsx`의 `import { useState, useRef, useCallback, memo } from "react";`를 다음으로 변경:

```ts
import { useState, useRef, useCallback, useEffect, memo } from "react";
```

컴포넌트 본문, `handleNoteSave` 함수 **바로 위**에 다음 `useEffect` 추가:

```ts
// 모달(<lg) 표시 중 ESC로 닫기 + body scroll lock
useEffect(() => {
  if (selectedSeat === null) return;

  const prevOverflow = document.body.style.overflow;
  const mql = typeof window !== "undefined" ? window.matchMedia("(max-width: 1023.98px)") : null;

  const lockScroll = () => {
    if (mql?.matches) {
      document.body.style.overflow = "hidden";
    }
  };

  lockScroll();
  mql?.addEventListener?.("change", lockScroll);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setSelectedSeat(null);
      setWeeklyTotals(null);
      setWeeklyRanking(null);
    }
  };
  window.addEventListener("keydown", onKey);

  return () => {
    document.body.style.overflow = prevOverflow;
    window.removeEventListener("keydown", onKey);
    mql?.removeEventListener?.("change", lockScroll);
  };
}, [selectedSeat]);
```

- [ ] **Step 2: 모달 렌더링 — 선택된 좌석 찾기 헬퍼 추가**

`renderWeeklyPopup` 함수 **아래**(컴포넌트 내부)에 다음 헬퍼 함수 추가:

```ts
// 모든 방을 순회하여 selectedSeat 찾기
function findSelectedSeat(): Seat | null {
  if (selectedSeat === null || !data?.rooms) return null;
  for (const room of data.rooms as Room[]) {
    for (const seat of room.seats) {
      if (seat.student?.id === selectedSeat) return seat;
    }
  }
  return null;
}
```

**주의:** `data`의 실제 모양을 먼저 확인하자. 기존 코드에서 `data.rooms`로 접근하는 부분 검색:

```bash
grep -n "data\.rooms\|data?.rooms" src/app/attendance/\[grade\]/page.tsx
```

만약 다른 이름(예: `data.data.rooms`)이라면 해당 경로로 수정. `Seat` 타입을 import/정의되어 있는지 확인.

- [ ] **Step 3: 모달 JSX 추가**

컴포넌트 `return` 문 최상위 JSX 트리 **맨 끝** (`</div>`로 닫히는 최상위 직전)에 다음 추가:

```tsx
{/* 모바일/태블릿 오버레이 모달 (<1024px) */}
{selectedSeat !== null && weeklyData.length > 0 && (() => {
  const seat = findSelectedSeat();
  if (!seat) return null;
  return (
    <div
      className="lg:hidden fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={() => {
        setSelectedSeat(null);
        setWeeklyTotals(null);
        setWeeklyRanking(null);
      }}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-[#eff6ff] border-2 border-[#2563eb] rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="닫기"
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 text-lg font-bold"
          onClick={() => {
            setSelectedSeat(null);
            setWeeklyTotals(null);
            setWeeklyRanking(null);
          }}
        >
          ✕
        </button>
        <div className="pr-6">
          {renderWeeklyContent(seat)}
        </div>
      </div>
    </div>
  );
})()}
```

**배치 주의:** 이 JSX는 `<div>...</div>` 최상위 컴포넌트의 **마지막 자식**으로 들어가야 한다. 기존 `return ( <div ...>` 블록 내부의 마지막 위치에 삽입.

- [ ] **Step 4: 타입/린트 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

만약 `findSelectedSeat`에서 `data.rooms` 타입 에러가 나면, `data`의 실제 타입을 `any` 캐스트하거나 기존 방식(각 room 렌더 중 `room.seats.find`)을 참고해 경로 수정.

- [ ] **Step 5: 수동 확인 — 데스크톱 회귀**

```bash
npm run dev
```

브라우저 너비 ≥1024px:
- "i" 클릭 → 기존 인라인 말풍선 표시 (모달은 보이지 않음)
- 누계/랭킹 블록 노출
- 비고 입력 정상

- [ ] **Step 6: 수동 확인 — 모바일 모달**

브라우저 DevTools로 뷰포트 < 1024px (예: iPhone 12 Pro, iPad Mini 세로) 설정 후:
- 교사 로그인 → `/attendance/1`
- "i" 클릭 → 오버레이 모달 표시, 배경 어둡게, 인라인 말풍선은 안 보임
- 모달 내 주간 출석 그리드 + 비고 입력 + 누계/랭킹 블록 모두 표시
- **닫기 4경로 확인:**
  1. X 버튼 클릭 → 모달 닫힘
  2. 배경(어두운 영역) 클릭 → 닫힘
  3. ESC 키 → 닫힘
  4. 다른 좌석의 "i" 클릭 → 이전 모달 닫히고 새 모달 표시
- 모달 내부 텍스트/input 클릭 → 닫히지 않음
- 비고 input에 텍스트 입력 → 닫을 때 저장됨 (재열기 시 유지)
- 모달 열린 동안 body 스크롤 잠김, 닫으면 복원

**비고 저장 타이밍 검증:** 모달을 닫을 때 input이 자동 blur → `handleNoteSave` 호출. 만약 blur 이벤트가 발생하지 않는 환경이면(일부 모바일 브라우저), 닫기 핸들러에서 현재 `noteValues`를 순회하며 `handleNoteSave`를 명시 호출하는 보강이 필요할 수 있음. 수동 테스트로 먼저 확인.

- [ ] **Step 7: 커밋**

```bash
git add src/app/attendance/[grade]/page.tsx
git commit -m "feat: 모바일/태블릿에서 주간 팝업을 오버레이 모달로 전환"
```

---

## Task 7: 통합 수동 QA + 빌드 검증

- [ ] **Step 1: 풀 빌드**

```bash
npm run build
```

Expected: 성공 (타입 에러/린트 에러 없이 완료)

- [ ] **Step 2: 수동 QA 체크리스트 (스펙 §검증 계획)**

`npm run dev` 후 다음을 순서대로 확인:

1. 데스크톱(≥1024px) 교사 로그인 → `/attendance/1` → "i" 클릭 → 인라인 말풍선 + 3칸 누계 블록
2. 모바일(<1024px) 동일 경로 → "i" → 오버레이 모달 표시
3. 모달 닫기 4경로 (X / 배경 / ESC / 다른 i)
4. 모달 내부 클릭 비전파
5. 비고 저장 (입력 → 모달 닫기 → 재열기 시 유지)
6. 누계 오후+야간 합산 검증: 탭 전환해도 누계 수치 동일
7. 교사 모달 랭킹 표시 (`N위 (상위 P%)`), 누계 0 학생은 `-`
8. 학생 로그인 → `/student` → "학년도 누계" 라벨 + 랭킹 뱃지 노출
9. 누계 0 학생 로그인 → 학생 페이지 랭킹 뱃지 숨김
10. 학년도 경계: 시스템 날짜가 3월 1일 이후인지 확인, 범위가 올바른지(현재 2026-04-11 → 학년도 2026-03-01 ~ 2027-03-01) API 응답 확인

- [ ] **Step 3: 랭킹 정확성 spot-check**

DB에서 학년 1의 학년도 누계 수동 집계:
```sql
SELECT s.id, s.name, SUM(COALESCE(a."durationMinutes", 100)) AS minutes
FROM "Attendance" a
JOIN "Student" s ON s.id = a."studentId"
WHERE s.grade = 1
  AND s."isActive" = true
  AND a.status = 'present'
  AND a.date >= '2026-03-01'
  AND a.date < '2027-03-01'
GROUP BY s.id, s.name
HAVING SUM(COALESCE(a."durationMinutes", 100)) > 0
ORDER BY minutes DESC
LIMIT 20;
```

API 응답의 랭킹과 일치하는지 확인. 동점자 처리(같은 minutes = 같은 rank, 다음은 skip)도 확인.

Railway 프로덕션 DB 접근 방법은 프로젝트에 이미 있는 방식(`DATABASE_URL` 환경변수)을 사용. 로컬 시드 데이터로 검증해도 됨.

- [ ] **Step 4: 최종 푸시**

```bash
git log --oneline -10
git push origin main
```

---

## 완료 기준

- [ ] 모든 7개 태스크 커밋 완료
- [ ] `npm run build` 성공
- [ ] `npm run lint` 경고/에러 없음
- [ ] 스펙 §검증 계획의 10개 항목 모두 수동 확인
- [ ] 원격 `origin/main`에 푸시
- [ ] `.claude/PROJECT_MAP.md` 업데이트 (프로젝트 규칙상 구조 변경 후 수행 — 별도 `project-map-updater` 에이전트 실행)
