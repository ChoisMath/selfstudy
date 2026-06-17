# 권한별 날짜 선택 출결 체크 — 설계

> 작성일: 2026-06-18
> 대상: `/attendance/[grade]` 출석 그리드 페이지

## 배경 / 목표

출석 그리드 페이지(`/attendance/[grade]`)는 현재 KST 기준 "오늘"로 날짜가 고정되어 있다.
일반 감독교사에게는 today 고정이 적절하지만, **전체관리자(메인관리자)와 학년 관리자(서브관리자)**는
날짜를 클릭해 달력에서 임의 날짜를 선택하고, 해당 날짜의 출결을 조회·체크할 수 있어야 한다.

## 확정된 결정

| 항목 | 결정 |
|------|------|
| 권한 범위 | 전체관리자 + 모든 서브관리자 → **어느 학년 페이지에서든** 날짜 변경 가능. 일반 교사는 today 고정 |
| 날짜 범위 | **제한 없음** (과거·오늘·미래 모두 선택 가능) |
| 달력 UI | **앱 스타일 커스텀 팝오버** (네이티브 date input 아님) |

## 권한 판별 (클라이언트)

페이지에 `useSession()`을 추가한다.

```ts
const { data: session } = useSession();
const roles = session?.user?.roles;
const subAdminGrades = session?.user?.subAdminGrades ?? [];
const canChangeDate = roles?.includes("admin") || subAdminGrades.length > 0;
```

- `canChangeDate === true` → 날짜 바가 클릭 가능(▾ 캐럿 + 팝오버)
- `false`(일반 감독/담임교사) → 현재처럼 today 고정, 날짜 텍스트는 비클릭 span

## 상태 모델

- `today` (KST 실제 오늘, 기존 계산 유지): 기본값 + "오늘" 비교용으로 **유지**
- `selectedDate` (신규 state, 초기값 = `today`): 조회·토글·주간팝업에 쓰는 **활성 날짜**
- `selectedDateFormatted` (computed): `selectedDate` 문자열에서 `2026.6.18 (목)` 형식 생성

### `today` → `selectedDate` 교체 지점

1. `/api/attendance` SWR 키의 `date`
2. `handleToggle` 요청 body의 `date`
3. `handleInfoClick` 주간 조회(`/api/attendance/weekly`)의 `date`
4. 주간 팝업 `isToday` 비교: `d.date === today` → `d.date === selectedDate` (선택일 컬럼 강조)

### `today` 그대로 유지하는 지점 (날짜 선택과 분리)

- 불참신청 일괄승인 후보 필터 `bulkCandidates` (`request.date === today`)
- `handleBulkApprove` 요청 body의 `date`

> 근거: 일괄승인은 "오늘 감독으로 배정된 교사"의 당일 기능(`/api/supervisor-assignments/my-today` 검증 기반)이므로
> 날짜 선택 기능과 독립적으로 today에 고정한다. 불참신청 탭 목록 자체는 grade+status 기준이라 날짜 선택의 영향을 받지 않는다.

### 날짜 변경 시 정리

`onChange(newDate)` 시:
- `setSelectedDate(newDate)`
- `setSelectedSeat(null)`
- `setActivatedStudents(new Set())`
- `weeklyCacheRef.current.clear()` (이전 날짜의 주간 캐시 무효화)

## 신규 컴포넌트: `AttendanceDatePicker`

경로: `src/components/attendance/AttendanceDatePicker.tsx` (`"use client"`)

### Props

```ts
interface AttendanceDatePickerProps {
  value: string;              // 선택된 날짜 YYYY-MM-DD
  onChange: (date: string) => void;
  today: string;             // 오늘 날짜 YYYY-MM-DD (마커용)
  onClose: () => void;       // 외부 클릭/선택/ESC 시 닫기
}
```

### 구성

- 월 네비게이션 헤더: `‹ 2026년 6월 ›` (이전/다음 달)
- 요일 헤더: 일~토
- 날짜 셀 그리드: 7열, 해당 월 1일 요일에 맞춰 빈 셀 패딩
- 선택일 강조(파란 배경 `#2563eb`/흰 글씨), 오늘 날짜 마커(테두리)
- `[ 오늘로 ]` 버튼: `today`로 이동 + 닫기
- 날짜 범위 제한 없음

### KST 안전 날짜 연산 (필수)

- YYYY-MM-DD 문자열 생성은 `getFullYear()/getMonth()/getDate()` + 숫자 패딩으로만.
- `toISOString()` / `toISOString().split("T")[0]` **사용 금지** (UTC 변환으로 KST 날짜가 어긋남 — PROJECT_MAP 교훈).
- 셀 날짜 비교는 YYYY-MM-DD 문자열 동등 비교로 수행.
- 요일 계산: `new Date(year, month-1, day)` (컴포넌트 분해 생성)의 `getDay()` 사용 — 달력 일자가 시프트되지 않음.

## 날짜 바 UI 변경 (`/attendance/[grade]/page.tsx`)

- `canChangeDate`일 때: 날짜 텍스트를 버튼으로 전환(▾ 캐럿 추가). 클릭 시 팝오버 토글(`showDatePicker` state).
- `canChangeDate` 아닐 때: 기존 `<span>` 그대로(클릭 불가).
- `selectedDate !== today`이면 작은 "오늘 아님" 표시(pill 또는 텍스트)로 현재 보고 있는 날짜가 오늘이 아님을 환기.

### 팝오버 위치 / 클리핑 방지

- 날짜 행 컨테이너는 `overflow-x-auto`이므로, 팝오버를 그 안에 두면 잘린다.
- 팝오버는 **sticky 상단 바 컨테이너의 직속 자식**(스크롤 컨테이너 바깥)에 `absolute`로 렌더한다.
- 외부 클릭/ESC 닫기: 전체화면 투명 click-catcher(`fixed inset-0`) + `keydown` Escape 핸들러.
- z-index: sticky 바가 `z-[100]`이므로 click-catcher `z-[110]`, 팝오버 패널 `z-[120]`.

## 반응형 (responsive-ui 규칙 준수)

- 달력 셀: 7열 그리드, 모바일에서 패널 폭(~280–320px)에 맞춰 채움. 터치 타겟 확보(셀 높이 충분히).
- 버튼/날짜 라벨 `whitespace-nowrap`.
- 모바일에서 팝오버 패널이 화면 폭을 넘지 않도록 `max-w` + 좌측 정렬, 필요 시 화면 안쪽으로 클램프.
- 작업 완료 후 `responsive-ui-reviewer` 에이전트로 점검.

## 백엔드

**변경 없음.**

- `GET /api/attendance`, `POST /api/attendance/toggle`, `GET /api/attendance/weekly` 모두 이미 `date` 파라미터를 그대로 처리하며 `withAuth(["teacher"])`로 모든 교사를 허용한다.
- 날짜 권한은 클라이언트 UI 노출로만 제어한다. 일반 교사는 today 고정이므로 임의 날짜 요청이 발생하지 않는다.
- (참고: 서버 측 날짜 권한 강제는 본 작업 범위 밖. 필요 시 별도 작업으로 분리.)

## 변경 파일 요약

| 파일 | 변경 |
|------|------|
| `src/components/attendance/AttendanceDatePicker.tsx` | 신규 — 커스텀 월간 달력 팝오버 |
| `src/app/attendance/[grade]/page.tsx` | `useSession`, `selectedDate` state, 날짜 바 버튼화, 팝오버 연결, `today`→`selectedDate` 치환 |

## 비목표 (Out of Scope)

- 서버 측 날짜별 쓰기 권한 강제
- 불참신청 일괄승인의 날짜 선택 연동 (today 고정 유지)
- 다른 역할(담임/학생) 페이지의 날짜 선택
