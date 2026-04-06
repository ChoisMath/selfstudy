# 방과후참가 토글 + 요일별 비고 입력 설계

> 날짜: 2026-04-06
> 상태: 확정

## 개요

두 가지 독립 기능을 추가한다:

1. **방과후참가 토글**: 참여설정 페이지에서 학생별·요일별·세션별로 방과후 수업 참가 여부를 설정. 방과후 참가 학생은 출석 그리드에서 불참승인(노란색)과 동일하게 표시.
2. **요일별 비고 입력**: 출석 그리드의 주간 팝업에 요일별 비고(메모) 입력란을 추가. 출석 기록과 독립적으로 저장.

## 기능 1: 방과후참가 토글

### 스키마 변경

`ParticipationDay` 모델에 5개 Boolean 필드 추가:

```prisma
model ParticipationDay {
  // 기존 필드...
  afterSchoolMon Boolean @default(false)
  afterSchoolTue Boolean @default(false)
  afterSchoolWed Boolean @default(false)
  afterSchoolThu Boolean @default(false)
  afterSchoolFri Boolean @default(false)
}
```

- 세션별(오후/야간) 독립 설정 — 기존 `@@unique([studentId, sessionType])` 유지
- `isParticipating: false`이거나 해당 요일이 `false`이면 방과후 체크박스 비활성화

### UI 변경

#### 참여설정 테이블 (`ParticipationManagement.tsx` + `homeroom/participation/page.tsx`)

- 각 요일 셀 구조를 **참여 버튼(위) + 방과후 체크박스(아래)**로 변경
- 헤더에 3번째 행 추가: 각 요일 아래 "방과후" 라벨 (주황색, `#ea580c`)
- 방과후 체크박스: `accent-color: #ea580c`
- 참여가 꺼진 요일은 방과후 체크박스도 `disabled`

#### 출석 그리드 (`attendance/[grade]/page.tsx`)

- 출석 API 응답에 `isAfterSchool` 플래그 추가 (해당 요일의 `afterSchoolXxx` 값)
- `isAfterSchool: true`인 학생: 기존 `isApprovedAbsence`와 동일한 노란색(`#fef9c3`, border `#facc15`) 표시
- 좌석 내 "방과후" 라벨 표시 (7px, `#ca8a04`)
- 방과후 학생도 출석 토글은 **차단하지 않음** — 감독교사가 필요시 상태 변경 가능

### API 변경

#### `GET /api/attendance` 응답 확장

student 객체에 `isAfterSchool: boolean` 추가:
- `ParticipationDay`의 해당 세션 + 해당 요일의 `afterSchoolXxx` 값 확인

#### `PUT /api/homeroom/participation-days` + `PUT /api/grade-admin/[grade]/participation-days`

요청 body에 `afterSchoolMon ~ afterSchoolFri` 필드 추가:
- 기존 upsert 로직에 5개 필드 포함
- 일괄 업데이트(bulk)에서는 방과후 필드 미포함 (개별 학생별로만 설정)

#### `GET` 응답 확장

`DaySettings` 타입에 방과후 필드 추가:
```typescript
type DaySettings = {
  isParticipating: boolean;
  mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean;
  afterSchoolMon: boolean; afterSchoolTue: boolean; afterSchoolWed: boolean;
  afterSchoolThu: boolean; afterSchoolFri: boolean;
};
```

### 출석 카운트 처리

- 방과후 학생은 `isParticipating: true`이므로 기존 출석 카운트(미체크/출석/결석)에 포함
- 방과후 표시는 순수 시각적 구분 — 출석 상태 순환(unchecked→present→absent)에 영향 없음

## 기능 2: 요일별 비고 입력

### 새 모델

```prisma
model AttendanceNote {
  id          Int         @id @default(autoincrement())
  studentId   Int
  sessionType SessionType
  date        DateTime    @db.Date
  note        String      @db.VarChar(100)
  createdBy   Int
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  student     Student     @relation(fields: [studentId], references: [id])
  creator     Teacher     @relation(fields: [createdBy], references: [id])

  @@unique([studentId, sessionType, date])
  @@index([studentId, date])
}
```

- 출석 기록(`Attendance`)과 독립 — 출석 없이도 비고 작성 가능
- `note` 최대 100자
- `createdBy`: 작성한 교사 ID

### 새 API

#### `GET /api/attendance/notes?studentId={id}&date={date}`

- Auth: `["teacher"]`
- 해당 학생의 주간(월~금) 비고 조회
- 응답: `{ notes: { [date: string]: { afternoon: string | null, night: string | null } } }`

#### `PUT /api/attendance/notes`

- Auth: `["teacher"]`
- Body: `{ studentId, sessionType, date, note }`
- `note`가 빈 문자열이면 레코드 삭제, 아니면 upsert
- 응답: `{ success: true }`

### UI 변경

#### 주간 팝업 (`attendance/[grade]/page.tsx` → `renderWeeklyPopup`)

- 기존 출석 상태 행 아래에 비고 input 행 추가
- 각 요일별 `<input type="text" placeholder="비고" />`
- 내용이 있는 input: 주황색 테두리(`#ea580c`), 주황 배경(`#fff7ed`)
- blur 시 자동 저장 (PUT 호출)
- 빈 값으로 비우면 비고 삭제

#### 데이터 로드

- "i" 클릭 시 기존 `weekly` API와 함께 `notes` API 병렬 호출
- `weeklyNotes` state로 관리

### 비고 입력 상호작용

1. 팝업 열림 → notes API로 기존 비고 로드
2. input에 텍스트 입력
3. blur 이벤트 → PUT API 호출 (낙관적 업데이트)
4. 저장 성공 → state 유지, 실패 → 원래 값 복원 + alert

## 영향 범위

### 스키마
- `ParticipationDay`: 5개 필드 추가
- `AttendanceNote`: 새 모델
- `Student`, `Teacher`: relation 추가

### 파일 변경
| 파일 | 변경 내용 |
|------|----------|
| `prisma/schema.prisma` | ParticipationDay 필드 추가, AttendanceNote 모델 추가 |
| `src/components/admin-shared/ParticipationManagement.tsx` | 방과후 체크박스 열 추가 |
| `src/app/homeroom/participation/page.tsx` | 방과후 체크박스 열 추가 |
| `src/app/api/homeroom/participation-days/route.ts` | 방과후 필드 읽기/쓰기 |
| `src/app/api/grade-admin/[grade]/participation-days/route.ts` | 방과후 필드 읽기/쓰기 |
| `src/app/api/attendance/route.ts` | isAfterSchool 플래그 추가 |
| `src/app/api/attendance/notes/route.ts` | 새 파일 (GET/PUT) |
| `src/app/attendance/[grade]/page.tsx` | 방과후 표시 + 비고 입력 팝업 |

### 파일 신규
| 파일 | 설명 |
|------|------|
| `src/app/api/attendance/notes/route.ts` | 비고 CRUD API |
