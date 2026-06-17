# 권한별 날짜 선택 출결 체크 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/attendance/[grade]` 페이지에서 전체관리자·학년관리자가 날짜를 클릭해 커스텀 달력으로 임의 날짜를 선택하고 해당 날짜의 출결을 조회·체크할 수 있게 한다. 일반 교사는 today 고정.

**Architecture:** 순수 KST 날짜 유틸(`src/lib/calendar.ts`)을 추출해 단위 테스트한다. 그 위에 커스텀 월간 달력 팝오버 컴포넌트(`AttendanceDatePicker`)를 만들고, 출석 페이지에 `useSession` 기반 권한 판별 + `selectedDate` state를 도입해 기존 `today` 사용처를 치환한다. 백엔드는 이미 임의 `date`를 처리하므로 변경 없음.

**Tech Stack:** Next.js 16 (App Router, client component), TypeScript, Tailwind CSS 4, NextAuth v5 (`useSession`), SWR. 테스트는 `node:assert` + `tsx`.

## Global Constraints

- KST 날짜 문자열은 `getFullYear()/getMonth()/getDate()` + 숫자 패딩으로만 생성. `toISOString()` / `toISOString().split("T")[0]` **사용 금지** (UTC 변환으로 KST 날짜 어긋남).
- 신규 React 파일은 클라이언트 컴포넌트면 첫 줄 `"use client";`.
- `prisma` 등 서버 전용 모듈을 클라이언트 컴포넌트에서 import 금지.
- 반응형 규칙 준수: 버튼/라벨 `whitespace-nowrap`, 터치 타겟 충분히 확보, 모바일 패널은 화면 폭 초과 금지.
- 백엔드(`/api/attendance`, `/api/attendance/toggle`, `/api/attendance/weekly`) **변경 없음**.
- 불참신청 일괄승인 관련 로직(`bulkCandidates`, `handleBulkApprove`)은 `today`에 고정 유지 — `selectedDate`로 바꾸지 말 것.
- 테스트 실행: `npx tsx tests/<name>.test.ts`. 빌드 검증: `npm run build`.

---

### Task 1: KST 날짜 유틸 모듈 (`src/lib/calendar.ts`)

**Files:**
- Create: `src/lib/calendar.ts`
- Test: `tests/calendar.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 함수)
- Produces:
  - `getKstTodayString(): string` — 오늘 KST 날짜 `YYYY-MM-DD`
  - `formatDateValue(year: number, month: number, day: number): string` — `YYYY-MM-DD` (month/day 1-base)
  - `parseDateValue(date: string): { year: number; month: number; day: number }`
  - `formatDateLabel(date: string): string` — `2026.6.18 (목)` 형식
  - `shiftMonth(year: number, month: number, delta: number): { year: number; month: number }` — month 1-12
  - `buildMonthCells(year: number, month: number): (string | null)[]` — 1일 요일만큼 선행 `null` 패딩 + 각 날짜 `YYYY-MM-DD`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `tests/calendar.test.ts`:

```ts
import assert from "node:assert/strict";
import {
  getKstTodayString,
  formatDateValue,
  parseDateValue,
  formatDateLabel,
  shiftMonth,
  buildMonthCells,
} from "../src/lib/calendar";

// formatDateValue: 1-base month/day, zero-padded
assert.equal(formatDateValue(2026, 6, 8), "2026-06-08");
assert.equal(formatDateValue(2026, 12, 25), "2026-12-25");

// parseDateValue
assert.deepEqual(parseDateValue("2026-06-08"), { year: 2026, month: 6, day: 8 });

// formatDateLabel: 2026-06-18 은 목요일, 2026-06-21 은 일요일
assert.equal(formatDateLabel("2026-06-18"), "2026.6.18 (목)");
assert.equal(formatDateLabel("2026-06-21"), "2026.6.21 (일)");

// shiftMonth: 연 경계 처리
assert.deepEqual(shiftMonth(2026, 6, 1), { year: 2026, month: 7 });
assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
assert.deepEqual(shiftMonth(2026, 6, -8), { year: 2025, month: 10 });

// buildMonthCells: 2026-06-01 은 월요일 → 선행 null 1개, 30일
const cells = buildMonthCells(2026, 6);
assert.equal(cells.length, 31); // 1 padding + 30 days
assert.equal(cells[0], null);
assert.equal(cells[1], "2026-06-01");
assert.equal(cells[cells.length - 1], "2026-06-30");

// getKstTodayString: YYYY-MM-DD 형식
assert.match(getKstTodayString(), /^\d{4}-\d{2}-\d{2}$/);

console.log("calendar util checks passed");
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `npx tsx tests/calendar.test.ts`
Expected: FAIL (모듈/함수 미존재 — `Cannot find module '../src/lib/calendar'`)

- [ ] **Step 3: 최소 구현 작성**

Create `src/lib/calendar.ts`:

```ts
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDateValue(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDateValue(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

export function getKstTodayString(): string {
  const kstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return formatDateValue(kstNow.getFullYear(), kstNow.getMonth() + 1, kstNow.getDate());
}

export function formatDateLabel(date: string): string {
  const { year, month, day } = parseDateValue(date);
  const weekday = new Date(year, month - 1, day).getDay();
  return `${year}.${month}.${day} (${WEEKDAYS[weekday]})`;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const zeroBased = month - 1 + delta;
  const newYear = year + Math.floor(zeroBased / 12);
  const newMonth = ((zeroBased % 12) + 12) % 12 + 1;
  return { year: newYear, month: newMonth };
}

export function buildMonthCells(year: number, month: number): (string | null)[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(formatDateValue(year, month, d));
  return cells;
}
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `npx tsx tests/calendar.test.ts`
Expected: PASS (`calendar util checks passed`)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/calendar.ts tests/calendar.test.ts
git commit -m "$(cat <<'EOF'
Add KST-safe calendar date utilities

날짜 선택 달력에 쓸 순수 날짜 유틸 + 단위 테스트

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 커스텀 달력 팝오버 컴포넌트 (`AttendanceDatePicker`)

**Files:**
- Create: `src/components/attendance/AttendanceDatePicker.tsx`
- Test: `tests/attendance-date-picker.test.ts`

**Interfaces:**
- Consumes: `src/lib/calendar.ts`의 `buildMonthCells`, `parseDateValue`, `shiftMonth` (Task 1)
- Produces: default export `AttendanceDatePicker`
  - Props: `{ value: string; today: string; onChange: (date: string) => void }`
  - `value`/`today`는 `YYYY-MM-DD`. 날짜 셀 또는 "오늘로" 클릭 시 `onChange(date)` 호출(닫기는 부모 책임).

- [ ] **Step 1: 실패하는 contract 테스트 작성**

Create `tests/attendance-date-picker.test.ts`:

```ts
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const componentPath = "src/components/attendance/AttendanceDatePicker.tsx";
assert.ok(existsSync(join(root, componentPath)), "AttendanceDatePicker 컴포넌트가 존재해야 함");

const src = read(componentPath);
assert.ok(src.startsWith('"use client"'), "클라이언트 컴포넌트여야 함");
assert.match(src, /from\s+"@\/lib\/calendar"/, "calendar 유틸을 import 해야 함");
assert.ok(!src.includes("toISOString"), "toISOString 사용 금지 (KST 안전)");
assert.match(src, /오늘로/, "'오늘로' 버튼이 있어야 함");
assert.match(src, /onChange/, "onChange prop을 사용해야 함");

console.log("AttendanceDatePicker contract checks passed");
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `npx tsx tests/attendance-date-picker.test.ts`
Expected: FAIL (`AttendanceDatePicker 컴포넌트가 존재해야 함`)

- [ ] **Step 3: 컴포넌트 구현**

Create `src/components/attendance/AttendanceDatePicker.tsx`:

```tsx
"use client";

import { useState } from "react";
import { buildMonthCells, parseDateValue, shiftMonth } from "@/lib/calendar";

const WEEKDAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

interface AttendanceDatePickerProps {
  value: string; // YYYY-MM-DD
  today: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

export default function AttendanceDatePicker({ value, today, onChange }: AttendanceDatePickerProps) {
  const initial = parseDateValue(value);
  const [view, setView] = useState({ year: initial.year, month: initial.month });
  const cells = buildMonthCells(view.year, view.month);

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-xl p-3 w-[clamp(260px,80vw,320px)]">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}
          className="w-9 h-9 flex items-center justify-center rounded-md text-[#475569] hover:bg-[#f1f5f9]"
          aria-label="이전 달"
        >
          ‹
        </button>
        <span className="font-bold text-sm text-[#1e293b] whitespace-nowrap">
          {view.year}년 {view.month}월
        </span>
        <button
          type="button"
          onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-md text-[#475569] hover:bg-[#f1f5f9]"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAY_HEADERS.map((w, i) => (
          <div
            key={w}
            className={`text-center text-[11px] font-semibold py-1 ${
              i === 0 ? "text-[#ef4444]" : i === 6 ? "text-[#2563eb]" : "text-[#94a3b8]"
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, idx) => {
          if (!date) return <div key={`pad-${idx}`} />;
          const { day } = parseDateValue(date);
          const isSelected = date === value;
          const isToday = date === today;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onChange(date)}
              className={`aspect-square min-h-9 rounded-md text-[13px] font-medium transition-colors ${
                isSelected
                  ? "bg-[#2563eb] text-white"
                  : isToday
                    ? "border-2 border-[#2563eb] text-[#2563eb] hover:bg-[#eff6ff]"
                    : "text-[#1e293b] hover:bg-[#f1f5f9]"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-[#f1f5f9] flex justify-center">
        <button
          type="button"
          onClick={() => onChange(today)}
          className="px-4 py-1.5 rounded-md text-xs font-semibold text-[#2563eb] bg-[#eff6ff] hover:bg-[#dbeafe] whitespace-nowrap min-h-9"
        >
          오늘로
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `npx tsx tests/attendance-date-picker.test.ts`
Expected: PASS (`AttendanceDatePicker contract checks passed`)

- [ ] **Step 5: 커밋**

```bash
git add src/components/attendance/AttendanceDatePicker.tsx tests/attendance-date-picker.test.ts
git commit -m "$(cat <<'EOF'
Add AttendanceDatePicker calendar popover

앱 스타일 커스텀 월간 달력 팝오버 (제한 없는 날짜 선택)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 출석 페이지 통합 (`/attendance/[grade]/page.tsx`)

**Files:**
- Modify: `src/app/attendance/[grade]/page.tsx`
- Test: `tests/attendance-date-picker.test.ts` (페이지 배선 검증 추가)

**Interfaces:**
- Consumes: `getKstTodayString`, `formatDateLabel` (Task 1), `AttendanceDatePicker` (Task 2), `useSession` (next-auth/react)
- Produces: 없음 (최종 기능)

- [ ] **Step 1: contract 테스트에 페이지 배선 검증 추가 (실패 확인용)**

Append to `tests/attendance-date-picker.test.ts` (마지막 `console.log` 위에 삽입):

```ts
const page = read("src/app/attendance/[grade]/page.tsx");
assert.match(page, /useSession/, "페이지가 useSession으로 권한 판별");
assert.match(page, /AttendanceDatePicker/, "달력 컴포넌트를 렌더해야 함");
assert.match(page, /selectedDate/, "selectedDate state를 써야 함");
assert.match(page, /date=\$\{selectedDate\}/, "조회 SWR 키가 selectedDate 사용");
assert.match(page, /date:\s*selectedDate/, "출석 토글이 selectedDate 사용");
assert.match(page, /date:\s*today/, "일괄승인은 today 유지");
assert.ok(!page.includes("toISOString"), "페이지에 toISOString 사용 금지");
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `npx tsx tests/attendance-date-picker.test.ts`
Expected: FAIL (`페이지가 useSession으로 권한 판별` 등 — 아직 페이지 미수정)

- [ ] **Step 3: import 및 날짜/세션 state 도입**

`src/app/attendance/[grade]/page.tsx` 상단 import에 추가 (기존 `import useSWR from "swr";` 아래):

```tsx
import { useSession } from "next-auth/react";
import AttendanceDatePicker from "@/components/attendance/AttendanceDatePicker";
import { getKstTodayString, formatDateLabel } from "@/lib/calendar";
```

함수 본문에서 기존 블록(196–201줄 부근):

```tsx
  const kstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const today = `${kstNow.getFullYear()}-${String(kstNow.getMonth() + 1).padStart(2, "0")}-${String(kstNow.getDate()).padStart(2, "0")}`;
  const todayFormatted = (() => {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${kstNow.getFullYear()}.${kstNow.getMonth() + 1}.${kstNow.getDate()} (${days[kstNow.getDay()]})`;
  })();
```

을 아래로 교체:

```tsx
  const today = getKstTodayString();
  const [selectedDate, setSelectedDate] = useState(today);
  const selectedDateFormatted = formatDateLabel(selectedDate);

  const { data: session } = useSession();
  const canChangeDate =
    session?.user?.roles?.includes("admin") || (session?.user?.subAdminGrades?.length ?? 0) > 0;
  const [showDatePicker, setShowDatePicker] = useState(false);

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setSelectedSeat(null);
    setActivatedStudents(new Set());
    setWeeklyTotals(null);
    setWeeklyRanking(null);
    weeklyCacheRef.current.clear();
    setShowDatePicker(false);
  }
```

- [ ] **Step 4: `today` → `selectedDate` 치환 (조회/토글/주간)**

(1) 출석 조회 SWR 키 (203–207줄 부근):

```tsx
  const { data, mutate } = useSWR(
    tab !== "absence" ? `/api/attendance?date=${selectedDate}&session=${tab}&grade=${grade}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
```

(2) `handleToggle` 내부 fetch body (292줄 부근) `date: today` → `date: selectedDate`:

```tsx
        body: JSON.stringify({ studentId, sessionType: tab, date: selectedDate, currentStatus: current }),
```

(3) `handleInfoClick` 주간 조회 (388줄 부근) `date=${today}` → `date=${selectedDate}`:

```tsx
    const res = await fetch(`/api/attendance/weekly?studentId=${studentId}&date=${selectedDate}`);
```

(4) `renderWeeklyContent` 안의 `isToday` 비교 **2곳** (534, 549줄 부근) `d.date === today` → `d.date === selectedDate`:

```tsx
            const isToday = d.date === selectedDate;
```

> ⚠ `bulkCandidates` 필터의 `request.date === today` (240줄 부근)와 `handleBulkApprove` body의 `date: today` (714줄 부근)는 **변경하지 말 것**.

- [ ] **Step 5: 날짜 바 버튼화 + 팝오버 렌더**

(1) sticky 컨테이너(837줄 부근)에 `relative` 추가:

```tsx
      <div className="sticky top-0 z-[100] bg-[#f1f5f9] px-3 pt-2 max-w-[960px] mx-auto relative">
```

(2) 날짜 바 안의 기존 날짜 span(846–848줄 부근):

```tsx
          <span className="text-[clamp(13px,3.5vw,16px)] font-bold whitespace-nowrap shrink-0">
            {todayFormatted}
          </span>
```

을 아래로 교체:

```tsx
          {canChangeDate ? (
            <button
              type="button"
              onClick={() => setShowDatePicker((v) => !v)}
              className="text-[clamp(13px,3.5vw,16px)] font-bold whitespace-nowrap shrink-0 flex items-center gap-1 hover:opacity-90"
            >
              {selectedDateFormatted}
              <span className="text-[11px] leading-none">▾</span>
            </button>
          ) : (
            <span className="text-[clamp(13px,3.5vw,16px)] font-bold whitespace-nowrap shrink-0">
              {selectedDateFormatted}
            </span>
          )}
          {selectedDate !== today && (
            <span className="shrink-0 text-[10px] bg-white/20 px-1.5 py-0.5 rounded whitespace-nowrap">
              오늘 아님
            </span>
          )}
```

(3) 탭 묶음 `</div>` 직후, sticky 컨테이너 닫는 `</div>`(922줄 부근) 바로 앞에 팝오버 + click-catcher 추가:

```tsx
        {canChangeDate && showDatePicker && (
          <>
            <div
              className="fixed inset-0 z-[110]"
              aria-hidden="true"
              onClick={() => setShowDatePicker(false)}
            />
            <div className="absolute z-[120] left-3 top-[3.25rem]">
              <AttendanceDatePicker value={selectedDate} today={today} onChange={handleDateChange} />
            </div>
          </>
        )}
```

- [ ] **Step 6: 달력 팝오버 ESC 닫기 effect 추가**

`selectedSeat` ESC effect(399줄 부근) 아래에 추가:

```tsx
  useEffect(() => {
    if (!showDatePicker) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDatePicker(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDatePicker]);
```

- [ ] **Step 7: contract 테스트 통과 확인**

Run: `npx tsx tests/attendance-date-picker.test.ts`
Expected: PASS (`AttendanceDatePicker contract checks passed`)

- [ ] **Step 8: 빌드(타입체크) 통과 확인**

Run: `npm run build`
Expected: 컴파일/타입 에러 없이 빌드 성공. (lint는 PROJECT_MAP 기준 기존 unrelated 에러가 있을 수 있으나, 본 작업 신규 파일에서 **새 에러가 없어야** 함.)

- [ ] **Step 9: 수동 검증**

dev 서버(`npm run dev`)에서:
1. admin 계정(admin/admin1234)으로 `/attendance/2` 접속 → 날짜에 ▾ 표시, 클릭 시 달력 팝오버 표시.
2. 과거 날짜 선택 → 그리드/감독명/카운트가 해당 날짜로 갱신, "오늘 아님" 배지 표시.
3. 좌석 탭 → 해당 날짜 출석 토글 저장 확인. "오늘로" 클릭 시 today 복귀, 배지 사라짐.
4. 일반 교사 계정(teacher1-1/pass1234)으로 접속 → 날짜에 ▾ 없음, 클릭 불가, today 고정.
5. 모바일 폭(<640px)에서 팝오버가 화면을 넘지 않고 외부 탭/ESC로 닫힘.

- [ ] **Step 10: 커밋**

```bash
git add "src/app/attendance/[grade]/page.tsx" tests/attendance-date-picker.test.ts
git commit -m "$(cat <<'EOF'
Enable date selection for admins on attendance grid

전체관리자/학년관리자는 날짜 클릭→달력으로 임의 날짜 출결 조회·체크.
일반 교사는 today 고정. 일괄승인은 today 유지.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## 마무리 작업 (구현 완료 후)

- [ ] `responsive-ui-reviewer` 에이전트로 신규/수정 UI 파일 점검 (`AttendanceDatePicker.tsx`, `attendance/[grade]/page.tsx`).
- [ ] `project-map-updater` 에이전트로 `.claude/PROJECT_MAP.md` 동기화 (신규 컴포넌트/유틸 반영).

## Self-Review 결과

- **Spec 커버리지**: 권한 판별(Task 3 Step 3), selectedDate 모델 + 치환(Step 3–4), today 유지 지점(Step 4 경고 + 테스트 assertion), 커스텀 팝오버(Task 2), 날짜 바 버튼화 + 클리핑 방지 위치(Step 5), 날짜 변경 정리(handleDateChange), KST 안전 연산(Task 1 + Global Constraints), 백엔드 무변경(명시) — 모두 태스크 존재.
- **Placeholder 스캔**: "TBD/적절히 처리" 등 없음. 모든 코드 step에 전체 코드 포함.
- **타입 일관성**: `AttendanceDatePicker` props `{ value, today, onChange }` — Task 2 정의와 Task 3 호출부 일치. calendar 함수 시그니처 Task 1 정의와 import 사용처 일치.
