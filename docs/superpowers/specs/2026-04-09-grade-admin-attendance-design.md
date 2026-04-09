# 학년관리 출결 기능 설계 스펙

> 작성일: 2026-04-09
> 상태: 승인 대기

## 개요

grade-admin 페이지(`/grade-admin/{grade}`)에 **"오늘출결"** 탭과 **"월간출결"** 탭을 추가하고, admin 페이지(`/admin`)의 첫 화면을 **전학년 오늘 출결 대시보드**로 변경한다.

## 기능 1: grade-admin "오늘출결" 탭

### 위치
- `/grade-admin/[grade]/page.tsx`의 탭 목록 맨 앞에 추가
- 탭 순서: **오늘출결** → 학생 관리 → 참여 설정 → 좌석 배치 → 감독 배정

### UI 구조
- 오늘 날짜 표시 (예: "2026년 4월 9일 (목)")
- **오후자습 카드**: 감독교사 이름 배지 + 4개 카운트(출석/결석/사유결석/방과후) + 총 자습대상 수
- **야간자습 카드**: 동일 구조
- 각 카운트는 색상 구분된 카드 형태 (출석=초록, 결석=빨강, 사유결석=주황, 방과후=노랑)

### 데이터 소스
- 새 API: `GET /api/grade-admin/[grade]/today-attendance`
- 인가: `withGradeAuth` (해당 학년 서브관리자 + admin)
- 로직:
  1. 오늘 날짜(KST) 계산 — `getFullYear()/getMonth()/getDate()` 사용 (toISOString 금지)
  2. 오늘 요일 확인 (월~금만 유효, 주말은 빈 응답)
  3. 해당 학년 활성 학생 조회 + ParticipationDay로 자습대상자 필터
  4. Attendance 레코드 조회하여 출석/결석 카운트
  5. AbsenceReason 조회하여 사유결석 카운트 (absent + reason 존재)
  6. afterSchool 필드로 방과후 카운트
  7. SupervisorAssignment 조회하여 감독교사 이름
- 응답 형태:
  ```typescript
  {
    date: string,           // "2026-04-09"
    dayOfWeek: string,      // "목"
    afternoon: {
      supervisor: string | null,
      total: number,        // 자습대상자 수
      present: number,
      absent: number,
      excusedAbsent: number, // 사유결석 (absent + AbsenceReason)
      afterSchool: number,
    },
    night: { /* 동일 구조 */ }
  }
  ```

### 카운트 정의
- **출석**: AttendanceStatus = "present"
- **결석**: AttendanceStatus = "absent" AND AbsenceReason 없음
- **사유결석**: AttendanceStatus = "absent" AND AbsenceReason 존재
- **방과후**: 해당 요일 afterSchool 필드가 true인 참여자
- **총 자습대상**: ParticipationDay.isParticipating = true AND 해당 요일 = true인 학생 수

## 기능 2: grade-admin "월간출결" 탭

### 위치
- `/grade-admin/[grade]/page.tsx`의 탭 목록에 추가
- 탭 순서: 오늘출결 → 학생 관리 → 참여 설정 → 좌석 배치 → 감독 배정 → **월간출결**

### UI 구조
- 월 네비게이션 (◀ 이전월 / 현재월 표시 / 다음월 ▶ / "오늘" 버튼)
- Excel 다운로드 버튼 (초록색)
- 범례 (O=출석, X=결석, △=사유결석, 방=방과후, -=미참여)
- 테이블:
  - 고정 열: 반 / 번 / 이름 (sticky)
  - 스크롤 열: 날짜별 오후/야간 2열씩
  - 학년 전체 학생을 반+번호 순 정렬
  - **짝수반 행은 연한 파란 배경(`#f0f7ff`)으로 구분**
  - 같은 반 내 첫 번째 학생만 "반" 열에 번호 표시, 나머지는 빈칸

### 데이터 소스
- 새 API: `GET /api/grade-admin/[grade]/monthly-attendance?month=YYYY-MM`
- 인가: `withGradeAuth`
- 로직: `/api/homeroom/monthly-attendance`와 동일하되:
  - 담임 배정 기준이 아닌 **학년 전체 활성 학생** 조회
  - 반+번호 순 정렬
- 응답 형태:
  ```typescript
  {
    students: Array<{
      id: number,
      name: string,
      grade: number,
      classNumber: number,
      studentNumber: number,
      attendance: Record<string, { afternoon?: string, night?: string }>,
      // key: "2026-04-01", value: { afternoon: "present"|"absent"|null, night: ... }
      absenceReasons: Record<string, { afternoon?: string, night?: string }>,
      // key: date, value: { afternoon: "academy"|"illness"|..., night: ... }
      participation: { isParticipating: boolean, mon: boolean, ... },
      afterSchool: { mon: boolean, tue: boolean, ... }
    }>,
    dates: string[],  // 해당 월 평일 날짜 배열
  }
  ```

### Excel 다운로드
- 새 API: `GET /api/grade-admin/[grade]/export-attendance?month=YYYY-MM`
- 인가: `withGradeAuth`
- 로직: `/api/homeroom/export-attendance`와 동일하되:
  - **하나의 시트**에 학년 전체 학생 포함
  - 반+번호 순 정렬
  - 짝수반 행에 연한 파란 배경(ExcelJS fill)
  - 시트명: `{grade}학년 월간출결`
- 파일명: `{grade}학년_월간출결_{YYYY-MM}.xlsx`

## 기능 3: admin 전학년 오늘 출결 대시보드

### 위치
- `/admin/page.tsx`를 리다이렉트에서 대시보드 페이지로 변경
- AdminNav에 "오늘 출결" 메뉴 항목 추가 (맨 앞, `/admin` 경로)

### UI 구조
- 오늘 날짜 표시 (예: "2026년 4월 9일 (목) 자습 현황")
- 1~3학년 카드 세로 나열
- 각 학년 카드 안에:
  - 학년 제목
  - 오후 행: 감독교사 배지 + 4개 카운트(출석/결석/사유결석/방과후) + 대상인원
  - 야간 행: 동일 구조
- grade-admin 오늘출결과 동일한 카드 스타일이지만 밀도를 높인 컴팩트 레이아웃

### 데이터 소스
- 새 API: `GET /api/admin/today-attendance`
- 인가: `withAuth(["admin"])`
- 로직: grade-admin today-attendance와 동일한 로직을 1~3학년에 대해 반복
- 응답 형태:
  ```typescript
  {
    date: string,
    dayOfWeek: string,
    grades: Array<{
      grade: number,
      afternoon: { supervisor, total, present, absent, excusedAbsent, afterSchool },
      night: { supervisor, total, present, absent, excusedAbsent, afterSchool }
    }>
  }
  ```

## 라우트 및 네비게이션 변경

### AdminNav 변경
- admin 모드: "오늘 출결"(`/admin`) 메뉴를 맨 앞에 추가
- `/admin` 경로의 active 판별은 **exact match** (`pathname === "/admin"`) 사용 — 하위 경로(`/admin/users` 등)와 구분
- 기존 메뉴: 사용자 관리, 좌석 배치, 감독 배정, 교체 이력, 출결 통계 유지

### grade-admin 탭 변경
- 기존 4탭 앞에 "오늘출결", 뒤에 "월간출결" 추가
- 최종 탭 순서: 오늘출결 / 학생 관리 / 참여 설정 / 좌석 배치 / 감독 배정 / 월간출결

## 새로운 API 요약

| 메서드 | 경로 | 인가 | 설명 |
|--------|------|------|------|
| GET | `/api/grade-admin/[grade]/today-attendance` | withGradeAuth | 학년별 오늘 출결 현황 |
| GET | `/api/grade-admin/[grade]/monthly-attendance?month=YYYY-MM` | withGradeAuth | 학년 전체 월간 출결 |
| GET | `/api/grade-admin/[grade]/export-attendance?month=YYYY-MM` | withGradeAuth | 학년 전체 월간 출결 Excel |
| GET | `/api/admin/today-attendance` | withAuth(["admin"]) | 전학년 오늘 출결 현황 |

## 기존 코드 변경

| 파일 | 변경 내용 |
|------|----------|
| `src/app/grade-admin/[grade]/page.tsx` | 탭 2개 추가 (오늘출결, 월간출결) |
| `src/app/admin/page.tsx` | 리다이렉트 → 대시보드 페이지로 교체 |
| `src/components/admin-shared/AdminNav.tsx` | admin 메뉴에 "오늘 출결" 항목 추가 |

## 제외 사항

- 학생 개인별 리스트, 반별 세부 현황은 포함하지 않음
- 실시간 폴링 없음 (SWR revalidateOnFocus만 사용)
- 월간출결의 반별 탭 전환 없음 (하나의 테이블로 전체 표시)
