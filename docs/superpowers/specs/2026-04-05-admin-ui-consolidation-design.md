# 관리자 UI 통합 설계

> 작성일: 2026-04-05

## 목표

관리자 페이지의 분산된 메뉴(8개)를 5개로 통합하여 관리 효율을 높이고, 좌석배치와 감독배정 UX를 개선한다.

## 변경 범위

### 1. 사용자 관리 (신규 통합 페이지)

**경로**: `/admin/users`  
**기존 4개 페이지 통합**: 학생관리, 교사관리, 서브관리자, 담임배정

#### 탭 구조
| 탭 | 내용 |
|----|------|
| 교사 | 교사 CRUD + 담임배정 + 서브관리자 설정 (인라인 테이블) |
| 1학년 | 학생 관리 (기존 StudentManagement 재사용) |
| 2학년 | 학생 관리 |
| 3학년 | 학생 관리 |

#### 교사 탭 — 인라인 테이블 UI

테이블 컬럼:
| 이름 | 아이디 | 역할 | 담임 | 서브관리자 | 작업 |
|------|--------|------|------|-----------|------|

- **담임 컬럼**: 드롭다운으로 `학년-반` 선택. 변경 시 즉시 API 호출로 `HomeroomAssignment` upsert/delete.
- **서브관리자 컬럼**: 드롭다운으로 학년 선택 (복수 가능). 변경 시 즉시 `SubAdminAssignment` upsert/delete.
- **역할 컬럼**: 뱃지로 표시 (읽기전용, TeacherRole에서 자동 파생).
- **추가/수정**: 기존 모달 유지 (이름, 아이디, 비밀번호만 처리). 담임/서브관리자는 테이블 인라인에서 처리.
- **삭제**: 기존 확인 다이얼로그 유지.

#### 학년 탭

기존 `StudentManagement` 컴포넌트를 `grade` prop으로 재사용. 변경 없음.

### 2. 좌석배치 개편

**경로**: `/admin/seats` (기존 유지)

#### 탭 구조 (6개)
| 탭 | grade | sessionType |
|----|-------|-------------|
| 1학년 오자 | 1 | afternoon |
| 1학년 야자 | 1 | night |
| 2학년 오자 | 2 | afternoon |
| 2학년 야자 | 2 | night |
| 3학년 오자 | 3 | afternoon |
| 3학년 야자 | 3 | night |

#### 동작
- 탭 클릭 → 해당 grade+sessionType의 좌석 배치를 즉시 로드
- SeatingEditor 컴포넌트가 탭 아래에 바로 표시
- 좌석 편집(드래그앤드롭) 후 저장 버튼으로 즉시 반영
- **SeatingPeriod 개념 제거**: 기간 선택 없이 항상 하나의 배치만 존재

#### DB 변경: SeatingPeriod 제거

**삭제 테이블**: `SeatingPeriod` (seating_periods)

**수정 테이블**: `SeatLayout`
- `periodId` 컬럼 제거
- 고유 제약조건 변경: `@@unique([periodId, roomId, rowIndex, colIndex])` → `@@unique([roomId, rowIndex, colIndex])`
- Room → StudySession 관계를 통해 grade + sessionType을 간접 식별 (추가 컬럼 불필요)

**마이그레이션 전략**:
1. 현재 활성(isActive) 기간의 SeatLayout 데이터만 보존
2. periodId 컬럼 제거
3. SeatingPeriod 테이블 삭제

### 3. 감독배정 월간 전환

**경로**: 기존 감독배정 페이지

#### UI 변경
- 주간 캘린더 → **월간 달력 그리드**
- 월 전환: 이전/다음 월 버튼
- 각 날짜 셀에 학년별(1/2/3학년 × 오자/야자) 감독 교사 표시
- 셀 클릭 → 교사 선택 드롭다운으로 배정/변경

#### 날짜 셀 레이아웃
각 날짜 셀에는 최대 6개 슬롯 표시:
```
┌─ 4/7 (월) ─────┐
│ 1학년 오: 김영수 │
│ 1학년 야: 박미선 │
│ 2학년 오: 이철수 │
│ 2학년 야: 정수민 │
│ 3학년 오: 최은지 │
│ 3학년 야: 한지원 │
└────────────────┘
```
- 빈 슬롯은 "미배정" 표시 + 클릭하여 교사 선택
- 배정된 슬롯은 교사명 표시 + 클릭하여 변경/해제
- 주말(토/일)은 비활성 셀로 표시

#### API 변경
- 기존 주간 조회 → 월간 범위 조회로 확장 (`?year=2026&month=4`)
- 배정 생성/수정 API는 동일 구조 유지

### 4. 네비게이션 변경

**AdminNav 메뉴 (8개 → 5개)**:

| 순서 | 메뉴명 | 경로 |
|------|--------|------|
| 1 | 사용자 관리 | `/admin/users` |
| 2 | 좌석배치 | `/admin/seats` |
| 3 | 감독배정 | 기존 경로 유지 |
| 4 | 교체이력 | 기존 경로 유지 |
| 5 | 통계 | 기존 경로 유지 |

### 5. 삭제 대상

#### 페이지
- `src/app/admin/students/page.tsx`
- `src/app/admin/teachers/page.tsx`
- `src/app/admin/sub-admins/page.tsx`
- `src/app/admin/homeroom-assignments/page.tsx`

#### 컴포넌트
- `src/components/seats/SeatingPeriodList.tsx`
- `src/components/seats/SeatingManagement.tsx` (SeatingEditor로 대체)

#### API (검토 후 삭제 또는 유지)
- `/api/grade-admin/[grade]/seating-periods/` — 삭제
- `/api/admin/sub-admins` — 유지 (교사 탭에서 호출)
- `/api/admin/homeroom-assignments` — 유지 (교사 탭에서 호출)

### 6. 학년별 관리(grade-admin) 페이지 연동

#### 좌석배치 탭 개편
- **경로**: `/grade-admin/[grade]/seats`
- 기존 SeatingPeriod 기반 → **[오후자습 | 야간자습]** 2개 탭으로 변경
- 탭 클릭 → 해당 학년+세션의 좌석 편집 화면 즉시 표시
- 관리자 `/admin/seats`와 **동일한 SeatingEditor 컴포넌트** 재사용
- **동일 DB 데이터**: 관리자가 편집한 좌석 = 서브관리자가 보는 좌석 (같은 SeatLayout 테이블)

#### 감독배정 탭 월간 달력 적용
- **경로**: `/grade-admin/[grade]/supervisors`
- 관리자 감독배정과 **동일한 월간 달력 그리드 컴포넌트** 재사용
- 단, 해당 학년만 필터링하여 날짜 셀에 **2개 슬롯만 표시**:
```
┌─ 4/7 (월) ─────┐
│ 오후자습: 김영수 │
│ 야간자습: 박미선 │
└────────────────┘
```
- **동일 DB 데이터**: 관리자의 감독배정과 같은 `SupervisorAssignment` 테이블 사용
- 서브관리자도 자기 학년의 감독 배정/변경 가능

#### 공유 컴포넌트 설계
| 컴포넌트 | props | 관리자 사용 | 학년관리 사용 |
|----------|-------|-----------|-------------|
| `SeatingEditor` | `grade`, `sessionType` | 6개 탭에서 각각 호출 | 2개 탭에서 각각 호출 |
| `MonthlyCalendar` (신규) | `grade?`, `showAllGrades` | `showAllGrades=true` (6슬롯) | `grade=N` (2슬롯) |

### 7. 영향 받는 기존 코드

#### seat-layouts API
- `/api/grade-admin/[grade]/seat-layouts` — period 파라미터 제거, sessionType 파라미터로 변경

#### 출석 조회 API
- `/api/attendance` — SeatingPeriod 기반 좌석 조회 로직을 단순화 (기간 필터 제거)

#### 감독배정 API
- `/api/grade-admin/[grade]/supervisor-assignments` — 월간 조회로 확장 (`?year&month`)
- 관리자 API `/api/admin/supervisor-assignments`도 동일하게 월간 조회 지원

## 유지되는 것

- DB: Teacher, Student, HomeroomAssignment, SubAdminAssignment, TeacherRole 등 기존 정규화 구조
- 인증/인가: 기존 NextAuth v5 + JWT 방식 그대로
- 담임교사/학생 라우트: 변경 없음
- 출석 체크 기능: 변경 없음
