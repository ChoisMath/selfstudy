# 월간 자율학습 참여시간 표시 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생의 자율학습 출석 기록 기반으로 월간/연간 참여시간을 계산하여 학년관리자, 담임, 학생 페이지에 표시한다.

**Architecture:** 기존 Attendance 모델에 `durationMinutes`(부분참여 오버라이드)와 `durationNote`(사유) 필드를 추가한다. 3개 기존 API 응답에 studyHours 계산 필드를 추가하고, 3개 프론트엔드 컴포넌트에 시간 컬럼/카드를 추가한다.

**Tech Stack:** Prisma 7, Next.js 16 App Router, TypeScript, SWR, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-04-09-study-hours-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `prisma/schema.prisma` | Attendance 모델에 durationMinutes, durationNote 추가 |
| Modify | `src/app/api/grade-admin/[grade]/monthly-attendance/route.ts` | studyHours 계산 추가 |
| Modify | `src/app/api/homeroom/monthly-attendance/route.ts` | studyHours 계산 추가 |
| Modify | `src/app/api/student/participation-days/route.ts` | monthlyStudyHours, yearlyStudyHours 추가 |
| Modify | `src/components/grade-admin/GradeMonthlyAttendance.tsx` | 테이블 우측 "시간" 컬럼 |
| Modify | `src/app/homeroom/attendance/page.tsx` | 테이블 우측 "시간" 컬럼 + 학급 평균 |
| Modify | `src/app/student/page.tsx` | 참여시간 카드 (월간 + 연간) |

---

### Task 1: Prisma 스키마 변경 + DB 동기화

**Files:**
- Modify: `prisma/schema.prisma:188-207` (Attendance 모델)

- [ ] **Step 1: Attendance 모델에 필드 추가**

`prisma/schema.prisma`의 Attendance 모델, `updatedAt` 줄 아래에 추가:

```prisma
  durationMinutes Int?      @map("duration_minutes")
  durationNote    String?   @db.VarChar(200) @map("duration_note")
```

변경 후 Attendance 모델의 필드 순서:
```
id, studentId, sessionType, date, status, checkedBy, createdAt, updatedAt, durationMinutes, durationNote
```

- [ ] **Step 2: Prisma generate + DB push**

```bash
npx prisma generate && npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: Attendance 모델에 durationMinutes, durationNote 필드 추가"
```

---

### Task 2: grade-admin monthly-attendance API에 studyHours 추가

**Files:**
- Modify: `src/app/api/grade-admin/[grade]/monthly-attendance/route.ts`

- [ ] **Step 1: Attendance include에 durationMinutes 포함 확인**

현재 `include: { absenceReason: { select: { reasonType: true } } }` — durationMinutes는 Attendance의 직접 필드이므로 자동 포함됨. 추가 수정 불필요.

- [ ] **Step 2: student map에 studyHours 계산 추가**

`src/app/api/grade-admin/[grade]/monthly-attendance/route.ts`에서 `return { id: student.id, ...` 블록(line 80~96) 앞에 studyHours 계산을 추가한다.

기존 코드:
```typescript
      return {
        id: student.id,
        name: student.name,
```

변경:
```typescript
      const totalMinutes = student.attendances
        .filter((a) => a.status === "present")
        .reduce((sum, a) => sum + (a.durationMinutes ?? 100), 0);
      const studyHours = Math.round((totalMinutes / 60) * 10) / 10;

      return {
        id: student.id,
        name: student.name,
```

return 객체 끝에 `studyHours` 추가. 기존 `participationDays` 뒤에:
```typescript
        }),
        studyHours,
      };
```

- [ ] **Step 3: 로컬에서 API 응답 확인**

```bash
curl "http://localhost:3000/api/grade-admin/1/monthly-attendance?month=2026-04" | jq '.students[0].studyHours'
```

Expected: 숫자 값 (출석 기록이 있으면 `> 0`, 없으면 `0`)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/grade-admin/[grade]/monthly-attendance/route.ts
git commit -m "feat: grade-admin monthly-attendance API에 studyHours 필드 추가"
```

---

### Task 3: homeroom monthly-attendance API에 studyHours 추가

**Files:**
- Modify: `src/app/api/homeroom/monthly-attendance/route.ts`

- [ ] **Step 1: student map에 studyHours 계산 추가**

`src/app/api/homeroom/monthly-attendance/route.ts`에서 `return { id: student.id, ...` 블록(line 80~104) 앞에 동일한 studyHours 계산을 추가한다.

기존 코드:
```typescript
      return {
        id: student.id,
        name: student.name,
```

변경:
```typescript
      const totalMinutes = student.attendances
        .filter((a) => a.status === "present")
        .reduce((sum, a) => sum + (a.durationMinutes ?? 100), 0);
      const studyHours = Math.round((totalMinutes / 60) * 10) / 10;

      return {
        id: student.id,
        name: student.name,
```

return 객체 끝에 `studyHours` 추가. 기존 `participationDays` 뒤에:
```typescript
        }),
        studyHours,
      };
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/homeroom/monthly-attendance/route.ts
git commit -m "feat: homeroom monthly-attendance API에 studyHours 필드 추가"
```

---

### Task 4: student participation-days API에 참여시간 추가

**Files:**
- Modify: `src/app/api/student/participation-days/route.ts`

- [ ] **Step 1: 월간/연간 참여시간 쿼리 추가**

`src/app/api/student/participation-days/route.ts`에서 기존 `participationDays` 쿼리 아래에 추가한다.

기존 코드 (`const participationDays = await prisma.participationDay.findMany(...)` 뒤, `const result` 앞):

```typescript
  // 월간 참여시간 계산
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  monthStart.setHours(0, 0, 0, 0);
  monthEnd.setHours(23, 59, 59, 999);

  // 연간 참여시간 계산 (학년도: 3월~)
  const yearStart = now.getMonth() >= 2
    ? new Date(now.getFullYear(), 2, 1)   // 3월 이후 → 올해 3월 1일
    : new Date(now.getFullYear() - 1, 2, 1); // 1~2월 → 작년 3월 1일
  yearStart.setHours(0, 0, 0, 0);

  const [monthlyAttendances, yearlyAttendances] = await Promise.all([
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
        date: { gte: yearStart, lte: monthEnd },
      },
      select: { durationMinutes: true },
    }),
  ]);

  const monthlyMinutes = monthlyAttendances.reduce(
    (sum, a) => sum + (a.durationMinutes ?? 100), 0
  );
  const yearlyMinutes = yearlyAttendances.reduce(
    (sum, a) => sum + (a.durationMinutes ?? 100), 0
  );
  const monthlyStudyHours = Math.round((monthlyMinutes / 60) * 10) / 10;
  const yearlyStudyHours = Math.round((yearlyMinutes / 60) * 10) / 10;
```

- [ ] **Step 2: 응답에 참여시간 필드 추가**

기존 return:
```typescript
  return NextResponse.json({ participationDays: result });
```

변경:
```typescript
  return NextResponse.json({
    participationDays: result,
    monthlyStudyHours,
    yearlyStudyHours,
  });
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/student/participation-days/route.ts
git commit -m "feat: student participation-days API에 월간/연간 참여시간 추가"
```

---

### Task 5: GradeMonthlyAttendance 테이블에 "시간" 컬럼 추가

**Files:**
- Modify: `src/components/grade-admin/GradeMonthlyAttendance.tsx`

- [ ] **Step 1: StudentData 타입에 studyHours 추가**

기존 타입 (line 16~27):
```typescript
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
```

변경 — `participationDays` 뒤에 추가:
```typescript
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
  studyHours: number;
};
```

- [ ] **Step 2: thead 첫 번째 tr에 "시간" 헤더 추가**

날짜 헤더 map 뒤(line 134 `})`의 닫는 괄호 뒤), `</tr>` 앞에:
```tsx
                  <th className="px-2 py-2 text-center font-medium text-gray-600 border-l border-gray-300 min-w-[48px]">시간</th>
```

- [ ] **Step 3: thead 두 번째 tr(오/야 서브헤더)에 빈 셀 추가**

두 번째 `<tr>` (line 136~146)의 dates map 뒤, `</tr>` 앞에:
```tsx
                  <th className="border-l border-gray-300" />
```

- [ ] **Step 4: tbody 각 학생 행에 시간 셀 추가**

dates map 뒤, `</tr>` 앞에 (line 232 `})`의 닫는 괄호 뒤):
```tsx
                        <td className="px-2 py-1.5 text-center text-sm font-bold text-blue-600 border-l border-gray-300">
                          {student.studyHours > 0 ? student.studyHours.toFixed(1) : "-"}
                        </td>
```

- [ ] **Step 5: 브라우저에서 확인**

`/grade-admin/1` → "월간출결" 탭 → 테이블 가장 우측에 "시간" 컬럼이 표시되는지 확인.

- [ ] **Step 6: Commit**

```bash
git add src/components/grade-admin/GradeMonthlyAttendance.tsx
git commit -m "feat: GradeMonthlyAttendance 테이블에 참여시간 컬럼 추가"
```

---

### Task 6: 담임 월간출결 테이블에 "시간" 컬럼 추가

**Files:**
- Modify: `src/app/homeroom/attendance/page.tsx`

- [ ] **Step 1: StudentData 타입에 studyHours 추가**

기존 타입 (line 16~27):
```typescript
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
```

변경 — `participationDays` 뒤에 추가:
```typescript
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
  studyHours: number;
};
```

- [ ] **Step 2: thead 첫 번째 tr(날짜 헤더)에 "시간" 헤더 추가**

날짜 헤더 map 뒤 (line 179 `})`의 닫는 괄호 뒤), `</tr>` 앞에:
```tsx
                        <th className="px-2 py-2 text-center font-medium text-gray-600 border-l border-gray-300 min-w-[48px]">시간</th>
```

- [ ] **Step 3: thead 두 번째 tr(오/야 서브헤더)에 빈 셀 추가**

두 번째 `<tr>` (line 181~189)의 dates map 뒤, `</tr>` 앞에:
```tsx
                        <th className="border-l border-gray-300" />
```

- [ ] **Step 4: tbody 각 학생 행에 시간 셀 추가**

dates map 뒤, `</tr>` 앞에 (line 275 Fragment 닫는 뒤):
```tsx
                            <td className="px-2 py-1.5 text-center text-sm font-bold text-blue-600 border-l border-gray-300">
                              {student.studyHours > 0 ? student.studyHours.toFixed(1) : "-"}
                            </td>
```

- [ ] **Step 5: tfoot 합계 행에 학급 평균 시간 추가**

tfoot의 dates map 뒤, `</tr>` 앞에 (line 315 Fragment 닫는 뒤):
```tsx
                          <td className="px-2 py-2 text-center text-[10px] font-bold text-blue-600 border-l border-gray-300">
                            {(() => {
                              const avg = classStudents.reduce((s, st) => s + st.studyHours, 0) / classStudents.length;
                              return avg > 0 ? avg.toFixed(1) : "-";
                            })()}
                          </td>
```

- [ ] **Step 6: 브라우저에서 확인**

`/homeroom/attendance` → 테이블 가장 우측에 "시간" 컬럼 + 합계 행에 평균이 표시되는지 확인.

- [ ] **Step 7: Commit**

```bash
git add src/app/homeroom/attendance/page.tsx
git commit -m "feat: 담임 월간출결 테이블에 참여시간 컬럼 추가"
```

---

### Task 7: 학생 참여일정 페이지에 참여시간 카드 추가

**Files:**
- Modify: `src/app/student/page.tsx`

- [ ] **Step 1: ParticipationData 타입에 참여시간 필드 추가**

기존 타입 (line 20~22):
```typescript
type ParticipationData = {
  participationDays: Record<string, DaySettings>;
};
```

변경:
```typescript
type ParticipationData = {
  participationDays: Record<string, DaySettings>;
  monthlyStudyHours: number;
  yearlyStudyHours: number;
};
```

- [ ] **Step 2: 참여시간 카드 UI 추가**

기존 코드 (line 82~96)의 `return (` 블록에서 `<div className="space-y-4">` 닫는 `</div>` 뒤, `{!afternoon && !night && (` 앞에 참여시간 카드를 추가한다:

```tsx
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
              <p className="text-xs text-indigo-500 mb-1">올해 누적</p>
              <p className="text-2xl font-bold text-indigo-700">
                {data.yearlyStudyHours.toFixed(1)}
              </p>
              <p className="text-xs text-indigo-400 mt-0.5">시간</p>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 3: 브라우저에서 확인**

학생 로그인 후 `/student` → 오후/야간 참여일정 카드 아래에 참여시간 카드(이번 달 + 올해 누적)가 표시되는지 확인.

- [ ] **Step 4: Commit**

```bash
git add src/app/student/page.tsx
git commit -m "feat: 학생 참여일정 페이지에 참여시간 카드 추가"
```
