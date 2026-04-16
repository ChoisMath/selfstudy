# 감독배정 Excel 다운로드 기능 설계

> 작성일: 2026-04-16
> 관련 페이지: `/admin/supervisors`, `/grade-admin/[grade]/supervisors`

## 목표

감독 배정 페이지에 "Excel" 버튼을 추가하여 선택된 월의 감독 배정 달력과 교사별 월별 감독횟수 누계를 하나의 Excel 파일(두 시트)로 다운로드한다.

## 범위

- 학년 관리자 페이지(`/grade-admin/[grade]/supervisors`): 해당 학년만 대상
- 관리자 페이지(`/admin/supervisors`): 전학년 대상
- 기존 `누계` 모달과 `MonthlyCalendar` UI는 그대로 유지. 신규 기능은 Excel 버튼 추가뿐.

## 산출물

### Month 시트 (달력 형태)

- 시트명: `YYYY-MM` (예: `2026-04`)
- 1행: 요일 헤더 `일 월 화 수 목 금 토` (일=빨강, 토=파랑, 평일=회색)
- 이후 주 단위 행. 각 날짜는 **단일 셀 + 줄바꿈**으로 내용을 표현 (`wrapText: true`).
- 셀 높이는 충분히 키워서(관리자 ~80pt, 학년관리자 ~40pt) 내용이 보이게 설정.

**관리자(전학년) 셀 내용 포맷**:

```
12
1: 홍길동
2: 김철수
3: 이영희
```

- 첫 줄: 일(`date.getDate()`) — 굵게
- 2~4줄: 학년별 배정된 교사명. 미배정은 `-`.

**학년 관리자(단일학년) 셀 내용 포맷**:

```
12
홍길동
```

- 미배정 시 2번째 줄 공란.

**공통**:
- 주말(일·토)은 연한 회색 배경, 날짜만 표시(학년 배정 행 없음).
- 달이 시작되기 전/끝난 뒤 빈 칸은 공란+회색 배경.
- 폰트: 일반 11pt, 첫 줄 날짜 bold.
- 정렬: `vertical: top`, `horizontal: center`.
- 열 너비: 14~16 정도.

### 누계 시트

시트명: `누계`

**학년 관리자 버전 컬럼**:

| 교사명 | 3월 | 4월 | ... | 총계 |
|--------|-----|-----|-----|------|

- 대상 교사: `primaryGrade === grade` 인 교사만
- 월 컬럼: 학년도(3월~익년 2월) 중 **실제 배정이 있는 월**만 (UI 모달과 동일)
- 정렬: 가나다순

**관리자 버전 컬럼**:

| 교사명 | 담당학년 | 3월 | 4월 | ... | 총계 |
|--------|----------|-----|-----|-----|------|

- 대상 교사: 전체 교사
- `담당학년`: `primaryGrade` (없으면 공란)
- 정렬: 담당학년(오름차순, null 맨 뒤) → 가나다순
- 월 컬럼: 학년도 중 실제 배정이 있는 월만

**공통 스타일**:
- 헤더 행 bold + 회색 배경.
- 총계 열은 bold.
- 0인 셀은 숫자 `0` 표시.

## API

신규 엔드포인트 2개. 기존 `export-attendance` 패턴을 따름(`ExcelJS`, `withAuth`/`withGradeAuth`).

### `GET /api/grade-admin/[grade]/supervisor-assignments/export?month=YYYY-MM`

- 인가: `withGradeAuth(grade)` — 해당 학년 서브관리자 또는 메인관리자
- `month` 파라미터 생략 시 현재 월 사용
- 응답: xlsx 바이너리 (Content-Disposition: attachment; filename=`${grade}학년_감독배정_YYYY-MM.xlsx`)
- 동작:
  1. 해당 월(1일~말일)의 `SupervisorAssignment where grade=g, sessionType=afternoon` 조회
  2. 학년도(3월~익년 2월) 전체 `SupervisorAssignment where sessionType=afternoon` 조회(누계용)
  3. `Teacher where primaryGrade=grade` 조회
  4. Month 시트 + 누계 시트 생성

### `GET /api/admin/supervisors/export?month=YYYY-MM`

- 인가: `withAuth(["admin"])`
- 응답: `감독배정_전학년_YYYY-MM.xlsx`
- 동작:
  1. 해당 월의 전학년 `SupervisorAssignment where sessionType=afternoon` 조회
  2. 학년도 전체 `SupervisorAssignment where sessionType=afternoon` 조회
  3. 전체 `Teacher` 조회 (primaryGrade 포함)
  4. Month 시트 + 누계 시트 생성

## 공통 헬퍼

`src/lib/excel/supervisor-export.ts` 신설:

- `buildSupervisorWorkbook(options)` — Month 시트 + 누계 시트를 가진 `ExcelJS.Workbook` 반환
- 옵션:
  - `mode: "grade" | "all"`
  - `year: number, monthIdx: number` (0-based)
  - `grade?: number` (mode=grade 시)
  - `assignmentsInMonth: Array<{date: Date; grade: number; teacherId: number}>`
  - `assignmentsInSchoolYear: Array<{date: Date; teacherId: number}>`
  - `teachers: Array<{id, name, primaryGrade}>`
  - `teachersById: Map<number, {name: string}>`

두 API는 DB 쿼리만 담당, 시트 생성은 헬퍼에 위임.

## 프론트엔드 변경

### `MonthlyCalendar.tsx`

기존 prop에 `excelHref?: string` 추가. 존재하면 월 네비게이션 헤더에 "Excel" 버튼 렌더.

클릭 시:
```tsx
const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
window.location.href = `${excelHref}?month=${monthStr}`;
```

버튼 스타일은 기존 `누계` 버튼(회색 테두리 + 작은 글씨)과 동일한 톤, 색만 살짝 달리 (녹색 계열).

### `grade-admin/[grade]/supervisors/page.tsx`

```tsx
<MonthlyCalendar
  grade={grade}
  apiBasePath={`/api/grade-admin/${grade}/supervisor-assignments`}
  excelHref={`/api/grade-admin/${grade}/supervisor-assignments/export`}
/>
```

### `admin/supervisors/page.tsx`

```tsx
<MonthlyCalendar
  showAllGrades
  apiBasePath=""
  excelHref="/api/admin/supervisors/export"
/>
```

`누계` 버튼과 `Excel` 버튼을 같은 우측 정렬 행에 나란히 배치.

## 테스트 체크리스트

- [ ] 학년 관리자 페이지에서 Excel 버튼 → 학년 필터링된 파일 다운로드
- [ ] 관리자 페이지에서 Excel 버튼 → 전학년 파일 다운로드
- [ ] Month 시트: 해당 월 달력이 7열 그리드로 올바르게 그려지는지 (월초 요일 오프셋, 월말 빈칸)
- [ ] Month 시트: 관리자 버전 셀에 1/2/3학년 교사명이 모두 표시되는지
- [ ] Month 시트: 미배정 셀은 `-` 로 표시
- [ ] Month 시트: 주말은 회색 배경 + 교사명 없음
- [ ] 누계 시트: 학년도 시작(3월)부터 실제 배정 있는 월만 컬럼으로
- [ ] 누계 시트: 학년 관리자 버전은 해당 학년 담당 교사만 표시
- [ ] 누계 시트: 관리자 버전에 담당학년 컬럼 존재
- [ ] 누계 시트: 총계 = 월별 합계와 일치
- [ ] 파일명이 한글 + 월 정보 포함 (URL 인코딩 처리)
- [ ] 서브관리자가 다른 학년의 export 엔드포인트 호출 시 403
- [ ] `month` 파라미터 생략 시 현재 월 사용

## 비기능

- 쿼리 횟수: 월별 쿼리 + 학년도 쿼리 + 교사 쿼리 = 3개, 모두 `Promise.all` 가능
- `sessionType=afternoon`만 조회(오후/야간 동일 교사 가정 유지, 기존 summary API와 동일)
- 파일 크기: 한 달(평일 ~22일) × 7열 + 누계(수십 행) → 20KB 미만 예상
