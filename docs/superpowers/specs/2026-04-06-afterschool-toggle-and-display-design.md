# 방과후 학생 출석 동작 개선 설계

> 날짜: 2026-04-06
> 상태: 확정

## 개요

방과후 학생에 대한 출석 동작을 전면 개선한다:

1. **출석 그리드**: 방과후 학생은 3단계 토글(방과후→출석→결석) + 배경 노란색 고정 + 테두리 색상으로 상태 구분
2. **상단 카운트**: "방과후 N명" 추가
3. **주간 팝업**: 방과후 상태를 텍스트+색상으로 표시
4. **담임 학생관리**: 방과후 상태 + 불참사유 + 감독교사 비고를 주간 출석에 표시
5. **담임 월간출결**: 방과후 상태를 텍스트+색상으로 표시 + 불참사유 표시

## 1. 출석 그리드 — 방과후 학생 토글 변경

### 현재 동작
- 모든 학생: `unchecked → present → absent → unchecked`
- 방과후 학생: 노란색 배경, 일반 토글과 동일

### 변경 후 동작

**토글 순서 (방과후 학생만):**
- `방과후(unchecked) → present → absent → 방과후(unchecked)`
- API 레벨 변경 없음 — 기존 toggle API가 unchecked→present→absent→unchecked 순환하므로 그대로 사용
- 프론트엔드에서 `isAfterSchool && status === 'unchecked'`이면 "방과후"로 표시

**좌석 스타일 (방과후 학생):**
- 배경: 항상 `#fef9c3` (노란색) 고정
- 테두리로 상태 구분:
  - 방과후(기본/unchecked): `border-[#facc15]` (노란 테두리)
  - 출석(present): `border-[#22c55e]` (초록 테두리)
  - 결석(absent): `border-[#ef4444]` (빨간 테두리)
- 좌석 내 라벨: "방과후" / "출석" / "결석"

**비방과후 학생:** 기존과 동일 (배경색으로 상태 구분)

### 상단 카운트 바 변경

현재: `출석 N | 결석 N | 미체크 N`
변경: `출석 N | 결석 N | 미체크 N | 방과후 N`

- 방과후 카운트: `isAfterSchool && (status === 'unchecked' || !attendances[id])` — 방과후 기본 상태인 학생
- 방과후 학생이 출석으로 전환 → 출석 카운트에 포함, 방과후에서 제외
- 방과후 학생이 결석 → 결석 카운트에 포함, 방과후에서 제외
- 미체크 카운트에서 방과후 학생 제외 (방과후 학생은 미체크가 아닌 "방과후" 상태)

### 파일
- `src/app/attendance/[grade]/page.tsx` — 좌석 색상 로직, 토글 표시, 카운트 계산

## 2. 주간 팝업 — 방과후 상태 표시

### 현재 동작
- 출석/결석/미체크("-")를 색상 셀로 표시

### 변경 후
- 방과후 학생의 기본 상태 셀: 노란색 배경(`#fef9c3`) + "방과후" 텍스트
- 출석으로 전환된 경우: 초록색 배경(`#bbf7d0`) + "출석"
- 결석인 경우: 빨간색 배경(`#fecaca`) + "결석"

### API 변경
- `GET /api/attendance/weekly` 응답에 `isAfterSchool` 플래그 추가 (요일별)
- 기존 `afternoonParticipating`/`nightParticipating`과 동일 패턴으로 `afternoonAfterSchool`/`nightAfterSchool` 추가

### 파일
- `src/app/api/attendance/weekly/route.ts` — afterSchool 플래그 추가
- `src/app/attendance/[grade]/page.tsx` — 주간 팝업 렌더링 수정

## 3. 담임 학생관리 (`/homeroom`) — 방과후 + 비고 표시

### 현재 동작
- 주간 출석: 요일×세션별 작은 컬러 도트 (초록/빨강/회색)
- 비참여: "-" 표시

### 변경 후
- 방과후 학생의 기본 상태: 노란색 도트 + 툴팁 "방과후"
- 출석: 초록 도트 (기존)
- 결석: 빨간 도트 (기존)
- 불참사유 등록된 경우: 도트 옆에 사유 아이콘 또는 텍스트
- **감독교사 비고**: 비고가 있는 날에 작은 메모 아이콘 표시, hover/클릭 시 비고 내용 표시

### API 변경
- `GET /api/homeroom/students` 응답에 추가:
  - 각 학생의 `participationDays`에 `afterSchool*` 필드 포함
  - 주간 `attendanceNotes` 데이터 포함
  - 주간 `absenceReasons` 데이터 포함

### 파일
- `src/app/api/homeroom/students/route.ts` — afterSchool, notes, reasons 포함
- `src/app/homeroom/page.tsx` — 방과후 표시, 비고 표시, 사유 표시

## 4. 담임 월간출결 (`/homeroom/attendance`) — 방과후 + 사유 표시

### 현재 동작
- 날짜 셀: O(출석), X(결석), -(미체크/비참여)
- 불참사유 데이터는 API에서 반환하지만 UI에 미표시

### 변경 후
- 방과후 기본 상태: 노란색 배경 + "방" 텍스트
- 출석: 초록 배경 + "O"
- 결석: 빨간 배경 + "X"
- 불참사유: 셀에 사유 약어 표시 (학: 학원, 방: 방과후, 질: 질병, 기: 기타)
  - 현재 API가 `afternoonReason`/`nightReason`을 이미 반환하므로 UI 렌더링만 추가

### API 변경
- `GET /api/homeroom/monthly-attendance` 응답에 `participationDays`의 `afterSchool*` 필드 포함
- `isAfterSchool` 플래그를 날짜별로 계산하여 포함하거나, 프론트엔드에서 계산

### 파일
- `src/app/api/homeroom/monthly-attendance/route.ts` — afterSchool 필드 포함
- `src/app/homeroom/attendance/page.tsx` — 방과후 셀 표시, 사유 표시

## 영향 범위

### 스키마 변경: 없음

### API 변경
| API | 변경 내용 |
|-----|----------|
| `GET /api/attendance/weekly` | `afternoonAfterSchool`/`nightAfterSchool` 플래그 추가 |
| `GET /api/homeroom/students` | afterSchool 필드 + attendanceNotes + absenceReasons 포함 |
| `GET /api/homeroom/monthly-attendance` | afterSchool 필드 포함 |

### UI 변경
| 파일 | 변경 내용 |
|------|----------|
| `src/app/attendance/[grade]/page.tsx` | 방과후 좌석 테두리 색상, 토글 표시, 카운트 바, 주간 팝업 |
| `src/app/homeroom/page.tsx` | 방과후 도트, 비고 표시, 사유 표시 |
| `src/app/homeroom/attendance/page.tsx` | 방과후 셀, 사유 약어 표시 |
