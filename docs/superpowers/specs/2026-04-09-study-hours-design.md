# 월간 자율학습 참여시간 표시 기능 설계

> 작성일: 2026-04-09

## 개요

학생의 자율학습(오후/야간) 출석 기록을 기반으로 월간 참여시간을 계산하여 표시한다.
- 오후자율학습 / 야간자율학습 각 100분
- 출석(`present`) 시 기본 100분 인정, 부분참여 시 `durationMinutes`로 오버라이드
- 표시 단위: 시간, 소수점 1자리 (예: `3.3`)

## 데이터 모델 변경

### Attendance 모델 필드 추가

```prisma
model Attendance {
  // ...기존 필드
  durationMinutes  Int?      @map("duration_minutes")   // null = 기본 100분
  durationNote     String?   @db.VarChar(200) @map("duration_note")  // 부분참여 사유
}
```

- `present` 상태에서만 시간 계산에 포함
- `durationMinutes`가 `null`이면 100분, 값이 있으면 해당 값 사용
- 현 단계에서 부분참여 수정 UI는 만들지 않음 (필드만 준비)

## 시간 계산 공통 로직

```typescript
const totalMinutes = presentAttendances.reduce(
  (sum, a) => sum + (a.durationMinutes ?? 100), 0
);
const studyHours = Math.round(totalMinutes / 60 * 10) / 10; // 소수점 1자리
```

## API 변경

### 1. grade-admin monthly-attendance (`/api/grade-admin/[grade]/monthly-attendance`)

- 기존 응답의 각 student 객체에 `studyHours: number` 필드 추가
- 해당 월의 `present` 출석 기록에서 계산
- 이미 attendances를 포함 조회하고 있으므로 추가 쿼리 불필요, map 단계에서 계산

### 2. homeroom monthly-attendance (`/api/homeroom/monthly-attendance`)

- 동일하게 각 student 객체에 `studyHours: number` 필드 추가

### 3. student participation-days (`/api/student/participation-days`)

- 응답에 `monthlyStudyHours: number` (현재 월 기준) 추가
- 응답에 `yearlyStudyHours: number` (학년도 3월~현재) 추가
- 2개의 추가 쿼리 필요 (COUNT + SUM 수준, 인덱스 활용으로 경량)

## 프론트엔드 변경

### 1. GradeMonthlyAttendance.tsx (학년관리자 월간출결)

- 테이블 헤더 가장 우측에 **"시간"** 컬럼 추가
- 각 학생 행의 마지막 셀에 `studyHours` 표시 (예: `3.3`)
- 스타일: 고정 너비, 우측 정렬, 파란색 계열 폰트

### 2. homeroom/attendance/page.tsx (담임 월간출결)

- 각 학급 테이블 헤더 가장 우측에 **"시간"** 컬럼 추가
- 각 학생 행 마지막에 `studyHours` 표시
- tfoot 합계 행에 학급 평균 시간 표시

### 3. student/page.tsx (학생 참여일정)

- 기존 참여일정(오후/야간 요일 카드) 아래에 **참여시간 카드** 추가
- 카드 내용:
  - **이번 달**: `○○.○ 시간` (월간)
  - **올해 누적**: `○○○.○ 시간` (연간, 3월~현재)
- 기존 디자인 톤과 일치하는 카드 UI

## 범위 외 (추후 구현)

- 관리자/담임이 특정 출석의 `durationMinutes`를 수정하는 UI
- `durationNote` 사유 입력 UI
- Excel 다운로드에 참여시간 컬럼 포함
