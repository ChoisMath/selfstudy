# 감독교사 불참신청 승인 기능 설계

> 작성일: 2026-04-08

## 개요

감독교사의 출석부 페이지(`/attendance/[grade]`)에 "불참신청" 탭을 추가하여, 감독교사가 해당 학년의 불참신청을 직접 승인/반려할 수 있도록 한다. 또한 출석 그리드에서 승인 대기 중인 학생을 시각적으로 표시한다.

## 현재 상태

- 학생이 `/student/absence-requests`에서 불참신청 제출
- 담임교사가 `/homeroom/absence-requests`에서 승인/반려
- 감독교사는 불참신청에 접근할 수 없음
- 출석 그리드에서 승인 대기 학생을 식별할 수 없음

## 변경 사항

### 1. 새 API: `GET /api/attendance/absence-requests`

**용도**: 감독교사가 특정 학년의 불참신청 목록 조회

**파라미터**:
- `grade` (필수): 학년 (1~3)
- `status` (선택): pending / approved / rejected (기본: 전체)

**인가**: `withAuth(["teacher"])` — 모든 교사 허용

**응답**: 기존 `homeroom/absence-requests` API와 동일한 구조
```json
{
  "requests": [
    {
      "id": number,
      "student": { "id", "name", "grade", "classNumber", "studentNumber" },
      "sessionType": "afternoon" | "night",
      "date": "YYYY-MM-DD",
      "reasonType": "academy" | "afterschool" | "illness" | "custom",
      "detail": string | null,
      "status": "pending" | "approved" | "rejected",
      "reviewer": { "id", "name" } | null,
      "reviewedAt": ISO string | null,
      "createdAt": ISO string
    }
  ]
}
```

**쿼리 로직**: `AbsenceRequest` where `student.grade = grade` AND `student.isActive = true`, 선택적 `status` 필터, `createdAt DESC` 정렬.

### 2. 기존 API 수정: `PUT /api/homeroom/absence-requests/[id]`

**변경**: 인가를 `withHomeroomAuth` → `withAuth(["teacher"])`로 확장

**이유**: 감독교사도 승인/반려할 수 있어야 함. 담임교사와 감독교사 모두 사용하며, 먼저 처리한 쪽이 반영됨. 이미 pending이 아닌 요청은 기존 로직에서 거부됨.

**기존 담임교사 접근**: 변경 없이 계속 사용 가능.

### 3. 기존 API 수정: `GET /api/attendance`

**변경**: 응답의 각 학생 객체에 `hasPendingAbsenceRequest: boolean` 필드 추가

**로직**: 해당 날짜 + 세션타입에 해당 학생의 AbsenceRequest가 `status = "pending"`인지 확인. 효율을 위해 해당 학년+날짜+세션의 pending 요청을 한 번에 조회 후 Map으로 룩업.

### 4. 프론트엔드: `/attendance/[grade]/page.tsx`

#### 4-1. 탭 확장

- 기존: `"오후자습" | "야간자습"` 2탭
- 변경: `"오후자습" | "야간자습" | "불참신청"` 3탭
- 불참신청 탭에 pending 건수 빨간 배지 표시 (0이면 숨김)

#### 4-2. 출석 그리드 "*" 표시

- `hasPendingAbsenceRequest: true`인 학생의 이름 앞에 빨간색 볼드 `*` 표시
- 클릭 동작 없음 (단순 시각적 표시)
- 오후자습/야간자습 탭 모두에서 해당 세션의 pending 요청이 있으면 표시

#### 4-3. 불참신청 탭 내용

- **필터 버튼**: 대기중(건수) / 승인 / 반려 — 기본 "대기중"
- **카드형 목록**: 학생명, 학년-반-번, 날짜, 세션, 사유, 상세
- **승인/반려 버튼**: pending 상태에서만 표시
- **처리 흐름**: 승인/반려 → `PUT /api/homeroom/absence-requests/[id]` → SWR mutate로 불참신청 목록 + 출석 데이터 갱신
- **데이터 소스**: `GET /api/attendance/absence-requests?grade={grade}`

### 5. 변경하지 않는 것

- `homeroom/absence-requests/page.tsx` — 담임교사 기존 기능 유지
- `student/absence-requests/page.tsx` — 학생 불참신청 기능 유지
- AbsenceRequest 스키마 — 변경 없음
- `GET /api/homeroom/absence-requests` — 담임교사 전용 조회 유지

## 데이터 흐름

```
학생 → POST /api/student/absence-requests → AbsenceRequest(pending)
                                                    ↓
                                    ┌───────────────┴───────────────┐
                                    ↓                               ↓
                           담임교사 조회                      감독교사 조회
                    GET /api/homeroom/                GET /api/attendance/
                    absence-requests                  absence-requests?grade=N
                                    ↓                               ↓
                                    └───────────────┬───────────────┘
                                                    ↓
                                    PUT /api/homeroom/absence-requests/[id]
                                    (먼저 처리한 쪽이 반영, 중복 처리 방지)
                                                    ↓
                                    승인: Attendance(absent) + AbsenceReason
                                    반려: status → rejected
```

## 출석 그리드 표시 로직

```
GET /api/attendance → 각 학생에 hasPendingAbsenceRequest 포함
    ↓
좌석 셀 렌더링 시:
    if (hasPendingAbsenceRequest) → 이름 앞에 빨간 "*" 표시
    기존 색상 로직(출석/결석/미체크/비참여/방과후)은 그대로 유지
```
