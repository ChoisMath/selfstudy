# 모바일 "i" 모달 + 자습시간 누계·랭킹 기능

> 작성일: 2026-04-11
> 관련 페이지: `/attendance/[grade]`, `/student`
> 관련 API: `/api/attendance/weekly`, `/api/student/participation-days`

## 배경

출석부 페이지(`/attendance/[grade]`)의 [오후자습]/[야간자습] 탭에서 학생 좌석의 "i" 버튼을 누르면 해당 학생의 주간 출석과 비고 입력란이 **인라인으로 아래 확장**된다. 데스크톱에서는 적절하지만, 모바일/태블릿에서는 화면이 좁아 오히려 사용성이 떨어진다.

또한 감독교사가 학생의 자습 누계를 빠르게 확인할 수 없고, 학생 본인 페이지의 "연간 누계"도 단순 달력년 기준이 아닌 **학년도(매년 3월 ~ 익년 2월)** 기준으로 집계되어야 한다. 학생들의 자습 동기 부여를 위해 학년 내 랭킹 표시도 필요하다.

## 목표

1. `< 1024px` 뷰포트에서 "i" 버튼 클릭 시 오버레이 **모달**로 표시 (기존 콘텐츠 그대로)
2. 모달은 X 버튼 / 배경 클릭 / ESC 키 / 다른 좌석 클릭으로 닫힌다
3. 팝업/모달에 **월간 누계**·**학년도 누계**·**학년 내 랭킹** 추가
4. 학생 본인 페이지(`/student`)에 학년도 기준 라벨 + 랭킹 뱃지 추가
5. 랭킹은 학년도 누계 기준 1종, 학년 내 상대 순위

## 비목표 (Out of Scope)

- 랭킹 캐싱/배치 사전 계산
- 랭킹 히스토리 또는 추이 그래프
- 세션(오후/야간) 개별 랭킹
- 랭킹 변동 표시 (↑↓ 화살표)

## 요구사항

### 모달 동작 (< 1024px)

- `< 1024px` (Tailwind `lg` 미만)에서는 인라인 확장 대신 오버레이 모달 렌더
- `>= 1024px` 에서는 기존 인라인 말풍선 유지
- 같은 콘텐츠(주간 출석 + 비고 입력 + 누계/랭킹)를 양쪽에서 공유
- 닫기 경로 4가지:
  1. 모달 우상단 X 버튼
  2. 배경(오버레이) 영역 클릭
  3. ESC 키
  4. 다른 좌석의 "i" 버튼 클릭(기존 단일 선택 로직 재사용)
- 모달 내부 클릭은 버블링 차단하여 닫히지 않음
- 모달 표시 중에는 `document.body` 스크롤 잠금, 닫힐 때 복원

### 누계·랭킹 계산 규칙

- **대상 기간**
  - 월간: 달력월 (이번 달 1일 ~ 말일)
  - 학년도: 매년 3월 1일 00:00 ~ 익년 3월 1일 00:00 (exclusive)
- **합산 범위**: `Attendance.status = 'present'`인 레코드의 `COALESCE(durationMinutes, 100)`, 오후+야간 합산
- **랭킹 대상**: 학년 내 `isActive = true` 학생 중 **학년도 누계 > 0** 인 학생만
- **정렬·동점**: 누계 내림차순 정렬, **표준 경쟁 순위**(공동 N위면 다음은 N+k위)
- **표시 형식**: `12위 (상위 15%)`
- **상위 %**: `Math.ceil(rank / totalRanked * 100)`
- **누계 0 학생**: 학생 페이지에서는 랭킹 뱃지 숨김, 교사 모달에서는 `"-"` 표시

## 설계

### 아키텍처 개요

```
lib/academic-year.ts  (신설, 단일 진입점)
  ├── getAcademicYearRange(now)
  └── computeGradeStudyRanking(grade, targetStudentId)

/api/attendance/weekly           → totals + ranking 응답 추가
/api/student/participation-days  → ranking 응답 추가, 기존 학년도 로직 유틸로 교체

/attendance/[grade]/page.tsx
  ├── renderWeeklyContent()      (공통 콘텐츠 JSX, 신설)
  ├── renderWeeklyPopupDesktop() (기존 인라인 말풍선, lg:block)
  └── <WeeklyModal />            (lg:hidden, 오버레이)

/student/page.tsx                → "학년도 누계" 라벨 + 랭킹 뱃지
```

### `lib/academic-year.ts`

```ts
export function getAcademicYearRange(now = new Date()): { start: Date; end: Date } {
  // 3월 시작, 익년 3월 1일 exclusive
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

export async function computeGradeStudyRanking(
  grade: number,
  targetStudentId: number,
): Promise<RankingResult | null>;
```

**구현 상세**
- `prisma.$queryRaw`로 학년 내 학생별 학년도 누계 집계:
  ```sql
  SELECT s.id AS "studentId",
         SUM(COALESCE(a."durationMinutes", 100))::int AS minutes
  FROM "Attendance" a
  INNER JOIN "Student" s ON s.id = a."studentId"
  WHERE s.grade = $1
    AND s."isActive" = true
    AND a.status = 'present'
    AND a.date >= $2
    AND a.date < $3
  GROUP BY s.id
  HAVING SUM(COALESCE(a."durationMinutes", 100)) > 0
  ```
- 파라미터는 `Prisma.sql` 템플릿 태그로 바인딩
- 결과를 `minutes` 내림차순 정렬 후 표준 경쟁 순위 부여
- `targetStudentId`가 결과에 없으면 `null` 반환

### `/api/attendance/weekly` 응답 확장

기존 응답에 다음 필드 추가:

```ts
{
  weekly: [...],  // 기존 그대로
  totals: {
    monthlyMinutes: number,
    monthlyHours: number,        // 소수점 1자리
    academicYearMinutes: number,
    academicYearHours: number,
  },
  ranking: { rank: number; totalRanked: number; topPercent: number } | null
}
```

**구현**
- 학생 `grade` 조회 1회 (기존 쿼리에 `include: { student: { select: { grade: true } } }` 추가)
- 월간/학년도 집계 쿼리 + 랭킹 계산을 `Promise.all`로 병렬

### `/api/student/participation-days` 응답 확장

```ts
{
  participationDays: {...},     // 기존
  monthlyStudyHours: number,    // 기존
  yearlyStudyHours: number,     // 기존 (학년도 기준, 이미 정확)
  ranking: { rank; totalRanked; topPercent } | null  // 신규
}
```

- 기존 학년도 계산 블록을 `getAcademicYearRange()` 호출로 교체
- 학생의 `grade`가 JWT 토큰에 없으면 `prisma.student.findUnique({ select: { grade: true } })` 1회 추가

### `/attendance/[grade]/page.tsx` 리팩터

**분리할 함수**
- `renderWeeklyContent()`: 주간 그리드 + 비고 input + 누계/랭킹 블록 (래퍼 없음)
- `renderWeeklyPopupDesktop(room, seat)`: 기존 말풍선 래퍼 + 화살표 + `renderWeeklyContent()`

**모달 컴포넌트** (페이지 최상위 div의 형제로 렌더)
```tsx
{selectedSeat && weeklyData.length > 0 && (
  <div
    className="lg:hidden fixed inset-0 z-50 flex items-center justify-center p-4"
    onClick={() => setSelectedSeat(null)}
  >
    <div className="absolute inset-0 bg-black/50" />
    <div
      className="relative bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800"
        onClick={() => setSelectedSeat(null)}
        aria-label="닫기"
      >
        ✕
      </button>
      {renderWeeklyContent()}
    </div>
  </div>
)}
```

**부수 효과**
- `useEffect`: 모달 열린 동안 `document.body.style.overflow = 'hidden'`, cleanup 복원
- `useEffect`: 모달 열린 동안 `keydown` 리스너로 ESC 감지 → `setSelectedSeat(null)`
- 두 `useEffect` 모두 의존성 `[selectedSeat]`

**누계/랭킹 표시 블록** (공통 콘텐츠 하단)
```tsx
<div className="mt-3 pt-3 border-t border-[#bfdbfe] grid grid-cols-3 gap-2 text-center">
  <div>
    <p className="text-[10px] text-gray-500">이번 달</p>
    <p className="text-sm font-bold text-blue-700">{totals.monthlyHours.toFixed(1)}h</p>
  </div>
  <div>
    <p className="text-[10px] text-gray-500">학년도</p>
    <p className="text-sm font-bold text-indigo-700">{totals.academicYearHours.toFixed(1)}h</p>
  </div>
  <div>
    <p className="text-[10px] text-gray-500">학년 내 순위</p>
    {ranking ? (
      <p className="text-sm font-bold text-amber-600">
        {ranking.rank}위{" "}
        <span className="text-[10px] text-gray-500">(상위 {ranking.topPercent}%)</span>
      </p>
    ) : (
      <p className="text-xs text-gray-400">-</p>
    )}
  </div>
</div>
```

**상태 추가**
- `totals`, `ranking` 상태를 weekly fetch 응답에서 함께 설정

### `/student/page.tsx` 변경

- `ParticipationData` 타입에 `ranking` 필드 추가
- 두 번째 카드 라벨: `"올해 누적"` → `"학년도 누계"`
- 학년도 카드 하단에 랭킹 뱃지:
  ```tsx
  {data.ranking && (
    <p className="text-[11px] text-amber-600 mt-1 font-semibold">
      {data.ranking.rank}위 (상위 {data.ranking.topPercent}%)
    </p>
  )}
  ```

## 파일 변경 목록

**신규 (1개)**
- `src/lib/academic-year.ts`

**수정 (4개)**
- `src/app/api/attendance/weekly/route.ts`
- `src/app/api/student/participation-days/route.ts`
- `src/app/attendance/[grade]/page.tsx`
- `src/app/student/page.tsx`

## 검증 계획 (수동)

1. **데스크톱 (≥1024px)**: "i" 클릭 → 기존 인라인 말풍선 표시, 누계 3칸 블록 노출
2. **모바일 (<1024px)**: "i" 클릭 → 오버레이 모달 표시, 배경 어둡게, body 스크롤 잠김
3. **모달 닫기 4경로**: X 버튼 / 배경 클릭 / ESC / 다른 좌석 클릭 — 모두 동작
4. **모달 내부 클릭**: 닫히지 않음, 비고 input 포커스 가능
5. **비고 저장**: 모달 내 비고 입력 후 blur/닫기 시 저장
6. **누계 표시**: 월간·학년도 시간 표시, 탭 전환과 무관 (오후+야간 합산)
7. **교사 모달 랭킹**: `N위 (상위 P%)` 표시, 누계 0 학생은 `"-"`
8. **학생 페이지**: "학년도 누계" 라벨 반영, 랭킹 뱃지 표시
9. **학생 누계 0**: 랭킹 뱃지 숨김
10. **학년도 경계**: 2027-02-28 조회 시 2026-03~2027-02 범위, 2027-03-01 조회 시 새 학년도 범위

## 리스크·주의사항

- **SQL 인젝션**: `$queryRaw` 파라미터는 `Prisma.sql` 템플릿 태그로 바인딩
- **타임존**: 서버 KST 가정, `new Date(y, 2, 1)` 로컬 시각 생성 (프로젝트 기존 관행)
- **Student.isActive**: 졸업/전학생은 랭킹 대상에서 자동 제외됨
- **body scroll lock**: cleanup에서 반드시 원복 (unmount, 닫기 시)
- **z-index**: 현재 페이지에 다른 오버레이 없음 → `z-50`로 충분
- **모달 내 비고 input onBlur 저장**: 모달 닫기 시 input이 먼저 blur되어 저장 이벤트가 발생하는지 수동 확인 필요 — 이슈 있으면 언마운트 직전 강제 저장 로직 추가
- **성능**: 모달 열 때마다 랭킹 쿼리 호출이지만 학년당 수백 행 집계, SWR `dedupingInterval: 5000`로 중복 억제

## 결정 사항 요약

| 항목 | 결정 |
|------|------|
| 모바일/태블릿 breakpoint | `< 1024px` (Tailwind `lg`) |
| 랭킹 기간 | 학년도 1종 |
| 랭킹 합산 | 오후+야간 합산 |
| 동점 처리 | 표준 경쟁 순위 |
| 표시 형식 | `12위 (상위 15%)` |
| 랭킹 대상 | 학년도 누계 > 0 인 재적 학생 |
| 누계 0 학생 | 학생 페이지 숨김, 교사 모달 `"-"` |
| 교사 모달 누계 | 오후+야간 합산, 탭과 무관 |
