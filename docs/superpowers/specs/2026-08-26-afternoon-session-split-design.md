# 오후자습 2블록 분리(오후1·오후2) + 주간 팝업 불참승인 표시 — 설계

> 작성일: 2026-08-26
> 대상: 출석 블록을 쓰는 전 기능 (출석체크, 불참신청, 참여설정, 월간/오늘 출결, Excel, 감독배정, 학생 화면, 시드)

## 배경 / 목표

현재 자율학습은 **오후(100분) / 야간(100분)** 두 세션으로 출석을 계산한다. 오후를 **오후1(50분) / 오후2(50분)** 두 블록으로 나누어 부분 참여·부분 불참을 정확히 기록하고 시간을 50분 단위로 집계한다.

동시에 출석체크 화면의 좌석 우측 **"i" 주간 팝업**이 불참승인을 표시하지 못하는 버그를 고친다. 좌석 그리드는 `AbsenceRequest.approved` 를 별도 조회해 노란색을 칠하지만, 주간 API 는 `Attendance.status` 만 반환해 팝업이 빨간 "결석"으로만 보이고 사유도 영문 enum 으로 노출된다.

## 확정된 결정

| 항목 | 결정 |
|------|------|
| 좌석 배치 | 오후1·오후2 는 **같은 좌석 배치("오후")를 공유**. 좌석배치·인쇄는 오후/야간 2종 유지 |
| 참여설정 | **오후1/오후2 각각** 설정 (참여 요일·방과후). 기존 오후 설정은 두 블록에 복제 |
| 불참신청 | **오후1/오후2 각각** 신청. 신청 1건 = 블록 1개. 학생 화면에 "오후 전체" 편의 선택 제공 |
| 기존 데이터 이관 | 기존 `afternoon` 행을 **`afternoon1` + `afternoon2` 로 복제** (출석·사유·불참신청·비고·참여설정·감독배정). 시간은 50+50 으로 누계 보존 |
| 데이터 모델 | **enum 2개로 분리**: `SeatSessionType { afternoon, night }`(좌석 전용) + `SessionType { afternoon1, afternoon2, night }`(출석 블록) |
| 감독배정 | **학년당 하루 1명** 유지. 내부적으로 3행(오후1/오후2/야간) 자동 생성, 대표행 = `afternoon1` |
| 출석체크 탭 | **4탭**: 오후1 / 오후2 / 야간 / 불참신청 |
| 오후2 편의 | 오후2 탭에 **"오후1 결과 복사"** 버튼. 오후2 미체크 학생에게만 오후1 의 `present`, 사유 없는 `absent` 복사. 사유 있는 결석·미체크는 건너뜀 |
| 주간 팝업 | 오후 탭이면 **오후1·오후2 두 행**, 야간 탭이면 한 행. 불참승인은 그리드와 같은 **노란색 "불참승인"** + 사유 **한글** 표시 |
| 기본 시간 | `afternoon1`/`afternoon2` = 50분, `night` = 100분. `durationMinutes` 가 있으면 그 값 우선(기존 규칙 유지) |

## 비목표 (Non-goals)

- 오후/야간 감독교사 분리 배정.
- 오후1·오후2 시작/종료 시각 표시 (StudySession.timeStart/timeEnd 는 현재 UI 미사용).
- `durationMinutes` 편집 UI.
- 좌석배치·인쇄 로직 변경 (타입 이름 교체만).

---

## 1. 세션 진실 공급원 — `src/lib/sessions.ts` (신규)

서버·클라이언트 공용 순수 모듈. `prisma` 를 import 하지 않는다.

```ts
export const SESSION_TYPES = ["afternoon1", "afternoon2", "night"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const SEAT_SESSION_TYPES = ["afternoon", "night"] as const;
export type SeatSessionType = (typeof SEAT_SESSION_TYPES)[number];

export const SESSION_META: Record<SessionType, {
  label: string;        // "오후1 자습" | "오후2 자습" | "야간자습"
  shortLabel: string;   // "오후1" | "오후2" | "야간"
  seatSession: SeatSessionType;
  defaultMinutes: number; // 50 | 50 | 100
}>;

export const SEAT_SESSION_META: Record<SeatSessionType, { label: string }>; // "오후자습" | "야간자습"

/** 감독배정은 (date, grade) 당 SESSION_TYPES 전부에 같은 교사로 생성된다.
 *  달력·요약·Excel 처럼 "하루 1건"으로 봐야 하는 조회는 이 값으로 필터한다. */
export const REPRESENTATIVE_SESSION_TYPE: SessionType = "afternoon1";

export function isSessionType(v: unknown): v is SessionType;
export function isSeatSessionType(v: unknown): v is SeatSessionType;
export function seatSessionOf(s: SessionType): SeatSessionType;
export function sessionTypesOfSeat(seat: SeatSessionType): SessionType[]; // afternoon → [afternoon1, afternoon2]
export function attendanceMinutes(a: { sessionType: SessionType; durationMinutes: number | null }): number;
```

`"afternoon"` / `"night"` 문자열 리터럴과 `100` 상수는 이 모듈 밖에서 쓰지 않는다. Prisma 가 생성하는 `SessionType`/`SeatSessionType` 타입과 값 집합이 같아야 하며, 이를 테스트로 고정한다(§11).

### 사유 라벨 — `src/lib/absence-reasons.ts` (신규)

```ts
export const REASON_LABELS: Record<ReasonType, string> = {
  academy: "학원", afterschool: "방과후", illness: "질병", custom: "기타",
};
```

현재 7개 파일에 같은 맵이 복사돼 있다. 이번 작업에서 수정하는 파일은 이 상수로 교체하고, 손대지 않는 파일은 그대로 둔다.

---

## 2. 스키마 & 마이그레이션

### `prisma/schema.prisma`

```prisma
enum SeatSessionType { afternoon night }
enum SessionType     { afternoon1 afternoon2 night }

model StudySession { type SeatSessionType ... @@unique([type, grade]) }
// Attendance, AbsenceRequest, ParticipationDay, AttendanceNote, SupervisorAssignment:
//   sessionType SessionType  (필드·유니크 키·인덱스 이름 변경 없음)
```

### `prisma/migrations/20260826000000_split_afternoon_session/migration.sql` (수기 작성)

로컬 DB 가 없으므로 SQL 을 직접 작성하고 Railway `start` 의 `prisma migrate deploy` 로 적용한다. Prisma 는 Postgres 마이그레이션 파일 하나를 **단일 트랜잭션**으로 실행하므로 아래 전부가 성공하거나 전부 롤백된다. 새로 만든 enum 타입은 같은 트랜잭션 안에서 바로 사용할 수 있다(`ALTER TYPE ... ADD VALUE` 제약은 해당 없음).

```sql
-- 1. 좌석 전용 enum
CREATE TYPE "SeatSessionType" AS ENUM ('afternoon', 'night');
ALTER TABLE "study_sessions"
  ALTER COLUMN "type" TYPE "SeatSessionType" USING ("type"::text::"SeatSessionType");

-- 2. 출석 블록 enum 재생성 (afternoon → afternoon1)
CREATE TYPE "SessionType_new" AS ENUM ('afternoon1', 'afternoon2', 'night');
-- attendance, absence_requests, participation_days, attendance_notes, supervisor_assignments 각각:
ALTER TABLE "attendance" ALTER COLUMN "session_type" TYPE "SessionType_new"
  USING (CASE "session_type"::text WHEN 'afternoon' THEN 'afternoon1' ELSE "session_type"::text END)::"SessionType_new";
-- ... (나머지 4개 테이블 동일)
ALTER TYPE "SessionType" RENAME TO "SessionType_old";
ALTER TYPE "SessionType_new" RENAME TO "SessionType";
DROP TYPE "SessionType_old";

-- 3. afternoon1 → afternoon2 복제
INSERT INTO "participation_days" (student_id, session_type, is_participating, mon, tue, wed, thu, fri,
  after_school_mon, after_school_tue, after_school_wed, after_school_thu, after_school_fri)
SELECT student_id, 'afternoon2', is_participating, mon, tue, wed, thu, fri,
  after_school_mon, after_school_tue, after_school_wed, after_school_thu, after_school_fri
FROM "participation_days" WHERE session_type = 'afternoon1';

-- duration_minutes: NULL 이면 NULL(→ 기본 50), 값이 있으면 반분해 합을 보존
INSERT INTO "attendance" (student_id, session_type, date, status, checked_by, created_at, updated_at,
  duration_minutes, duration_note)
SELECT student_id, 'afternoon2', date, status, checked_by, created_at, updated_at,
  CASE WHEN duration_minutes IS NULL THEN NULL ELSE duration_minutes - duration_minutes / 2 END, duration_note
FROM "attendance" WHERE session_type = 'afternoon1';
UPDATE "attendance" SET duration_minutes = duration_minutes / 2
WHERE session_type = 'afternoon1' AND duration_minutes IS NOT NULL;

-- absence_reasons 는 attendance 1:1 → 새 afternoon2 행에 맞춰 복제
INSERT INTO "absence_reasons" (attendance_id, reason_type, detail, registered_by, created_at)
SELECT a2.id, r.reason_type, r.detail, r.registered_by, r.created_at
FROM "absence_reasons" r
JOIN "attendance" a1 ON a1.id = r.attendance_id AND a1.session_type = 'afternoon1'
JOIN "attendance" a2 ON a2.student_id = a1.student_id AND a2.date = a1.date AND a2.session_type = 'afternoon2';

INSERT INTO "absence_requests" (student_id, session_type, date, reason_type, detail, status, reviewed_by, reviewed_at, created_at)
SELECT student_id, 'afternoon2', date, reason_type, detail, status, reviewed_by, reviewed_at, created_at
FROM "absence_requests" WHERE session_type = 'afternoon1';

INSERT INTO "attendance_notes" (student_id, session_type, date, note, created_by, created_at, updated_at)
SELECT student_id, 'afternoon2', date, note, created_by, created_at, updated_at
FROM "attendance_notes" WHERE session_type = 'afternoon1';

INSERT INTO "supervisor_assignments" (teacher_id, date, grade, session_type, created_at)
SELECT teacher_id, date, grade, 'afternoon2', created_at
FROM "supervisor_assignments" WHERE session_type = 'afternoon1';
-- supervisor_swap_history 는 기존(afternoon1) 행을 계속 참조한다.
```

앱 코드는 `durationMinutes` 를 한 번도 쓰지 않으므로(전부 NULL) 반분 로직은 안전장치다.

### 배포 전·후 체크리스트

1. **Railway 빌드 명령 확인**: `.claude/PROJECT_MAP.md` 배포 정보에 `prisma generate && prisma db push && next build` 로 기록돼 있다. `db push` 가 마이그레이션보다 먼저 실행되면 enum 을 임의로 바꿔 마이그레이션이 실패한다. 대시보드 빌드 명령이 `npm run build`(= `prisma generate && next build`) 인지 확인하고, 아니면 고친 뒤 배포한다.
2. Railway Postgres **스냅샷/`pg_dump`** 확보.
3. `main` 푸시 → start 의 `prisma migrate deploy` 가 적용.
4. 검증 SQL: 5개 테이블 각각 `count(*) FILTER (WHERE session_type='afternoon1') = count(*) FILTER (WHERE session_type='afternoon2')`, `study_sessions.type` 값이 `afternoon|night` 뿐인지.
5. 롤백 = 스냅샷 복원 + 이전 커밋 재배포. API 형태와 소비자가 함께 바뀌므로 **부분 배포 불가, 단일 배포**.

---

## 3. 시간 계산

| 위치 | 변경 |
|------|------|
| `api/attendance/weekly`, `api/homeroom/monthly-attendance`, `api/grade-admin/[grade]/monthly-attendance`, `api/student/participation-days` | `a.durationMinutes ?? 100` → `attendanceMinutes(a)` |
| `src/lib/academic-year.ts` raw SQL | `COALESCE(a.duration_minutes, 100)` (2곳) → `COALESCE(a.duration_minutes, CASE a.session_type WHEN 'night' THEN 100 ELSE 50 END)` |

과거 오후 100분 = 오후1 50 + 오후2 50 이므로 월간·학년도 누계와 랭킹은 변하지 않는다. 랭킹 캐시(TTL 60초)는 그대로.

---

## 4. API 계약

원칙: 응답에서 `afternoon`/`night` 를 **객체 키나 필드 접두사로 쓰지 않는다**. `Record<SessionType, …>` 또는 `sessionType` 필드를 가진 배열로 일반화한다. 입력의 `sessionType` 은 `isSessionType()`(좌석 API 는 `isSeatSessionType()`) 으로 검증하고 실패 시 400.

### 4.1 변경 API

| API | 새 응답/입력 |
|-----|-------------|
| `GET /api/attendance?date&session&grade` | `session` 은 `SessionType`. 좌석/교실은 `seatSessionOf(session)` 으로 `StudySession` 조회, `participationDays`·`attendance`·`supervisorAssignment`·`absenceRequest` 는 블록 기준. 응답 형태 불변 |
| `GET /api/attendance/weekly` | `weekly[].sessions: Record<SessionType, { status: string \| null; reason: {type, detail} \| null; participating: boolean; afterSchool: boolean; note: string \| null; isApprovedAbsence: boolean; approvedReason: {type, detail} \| null }>`. **승인된 `AbsenceRequest` 를 주간 범위로 함께 조회**. `totals`/`ranking` 불변 |
| `GET /api/attendance/notes` | `{ [date]: Partial<Record<SessionType, string>> }` (현재 소비자 없음, 형태만 일반화) |
| `POST /api/attendance/toggle`, `PUT /api/attendance/[id]`, `POST /api/homeroom/absence-reasons` | `sessionType` 검증 추가 |
| `GET /api/grade-admin/[grade]/today-attendance`, `GET /api/admin/today-attendance` | `afternoon/night` → `sessions: Record<SessionType, SessionStats>` |
| `GET /api/grade-admin/[grade]/monthly-attendance`, `GET /api/homeroom/monthly-attendance`, `GET /api/admin/statistics` | `dates[date]: Partial<Record<SessionType, { status: string; reason?: string }>>` |
| `GET/PUT /api/grade-admin/[grade]/participation-days`, `GET/PUT /api/homeroom/participation-days` | GET `students[].sessions: Record<SessionType, DaySettings>`; PUT 검증을 `isSessionType` 으로 |
| `GET /api/student/participation-days`, `GET /api/student/attendance` | 이미 `sessionType` 키 → 소비자만 3세션 루프 |
| `GET /api/student/batch-absence` | `students[].participating: Record<SessionType, boolean>`, `existingRequests: Partial<Record<SessionType, RequestStatus>>` |
| `POST /api/student/batch-absence` | `validSessionTypes` → `isSessionType` |
| `POST /api/student/absence-requests` | `sessionType: string` → **`sessionTypes: SessionType[]`** (1개 이상). `createMany({ skipDuplicates })`, 응답 `{ created, skipped }` |
| `POST /api/grade-admin/[grade]/supervisor-assignments` | `SESSION_TYPES` 전부 upsert. 응답 `{ assignment: 대표행, assignments: [3행] }` |
| `GET /api/homeroom/schedule`, `GET /api/homeroom/schedule/summary`, `GET /api/admin/supervisors/export`, `GET /api/grade-admin/[grade]/supervisor-assignments/export` | `"afternoon"` 필터 → `REPRESENTATIVE_SESSION_TYPE` |
| `GET /api/grade-admin/[grade]/seat-layouts?sessionType=` | `isSeatSessionType` 검증 (값 집합 불변) |
| Excel `export-attendance` ×2, `admin/export-excel` | §7 |

변경 없음(통과만): `absence-requests` 조회 ×3, `absence-requests/[id]` 승인, `bulk-approve`, `supervisor-assignments/[id]` 삭제·교체, `my-today`, `cron/supervisor-reminders`, `push/*`.

### 4.2 신규 `POST /api/attendance/copy-session`

`withAuth(["teacher"])`. 입력 `{ grade: number; date: "YYYY-MM-DD"; from: SessionType; to: SessionType }` — `seatSessionOf(from) === seatSessionOf(to)` 이고 `from !== to` 여야 한다(현재 UI 는 `afternoon1 → afternoon2` 만 보냄).

규칙은 순수 함수 `planSessionCopy()` (`src/lib/attendance/copy-session.ts`) 로 분리한다.

```ts
type CopyInput = {
  seatedStudentIds: number[];                       // from/to 가 공유하는 좌석 세션에 배정된 학생
  fromAttendance: Map<studentId, { status; hasReason: boolean }>;
  toAttendance: Set<studentId>;                     // to 블록에 이미 레코드가 있는 학생 (status 무관)
  toParticipating: Set<studentId>;                  // to 블록 + 해당 요일 참여 학생
  toBlockedByRequest: Set<studentId>;               // to 블록에 pending/approved 불참신청 있는 학생
};
type CopyPlan = { toCreate: { studentId; status: "present" | "absent" }[]; skipped: number };
```

- 대상: `seatedStudentIds` 중 `toAttendance` 에 없고, `toParticipating` 에 있고, `toBlockedByRequest` 에 없는 학생.
- `from` 이 `present` → `present`; `absent` 이고 `hasReason === false` → `absent`; 그 외(미체크, 사유 있는 결석) → 건너뜀.
- 서버는 계획을 `attendance.createMany({ checkedBy: 요청 교사 })` 로 저장, 응답 `{ copied, skipped }`.
- 이미 체크된 `to` 레코드는 어떤 경우에도 덮어쓰지 않는다.

---

## 5. 감독교사 출석체크 화면 `src/app/attendance/[grade]/page.tsx`

### 탭
- `type Tab = SessionType | "absence"`, 기본 `"afternoon1"`. 버튼 라벨 `SESSION_META[t].shortLabel` + "불참신청"(pending 배지). `whitespace-nowrap`, 탭 행은 `overflow-x-auto`.
- 좌석 조회 `/api/attendance?session=${tab}`; 도면 분기 `grade === 2 && seatSessionOf(tab) === "night"` → `MiraeHallLayout`; `seatSessionOf(tab) === "afternoon"` → `buildPrintGroups(rooms, "afternoon", grade)`.
- 탭 전환 시 기존과 동일하게 선택 좌석·활성화·주간 캐시 초기화. 주간 캐시 키는 `studentId` 그대로(응답이 3세션을 모두 담으므로 탭 간 재사용 가능).

### "오후1 결과 복사" 버튼
- 오후2 탭(`tab === "afternoon2"`)의 날짜 바 우측에만 렌더. `min-h-11`.
- 클릭 → `confirm("오후1 출석 결과를 오후2 미체크 학생에게 복사할까요?")` → `POST /api/attendance/copy-session` (`date` = 화면의 `selectedDate`, `from: "afternoon1"`, `to: "afternoon2"`) → `alert("n명 복사, m명 건너뜀")` → 좌석 SWR `mutate()`.
- 감독교사 배정 여부는 요구하지 않는다(토글과 같은 `["teacher"]` 권한).

### "i" 주간 팝업 (`renderWeeklyContent`)
- 조립 로직을 `src/lib/attendance/weekly-summary.ts` 의 순수 함수 `summarizeWeeklyCell()` 로 분리:
  ```ts
  type CellView = { kind: "not-participating" | "approved-absence" | "after-school" | "present" | "absent" | "unchecked"; label: string };
  ```
  우선순위: `participating === false` → "-"(회색) › `isApprovedAbsence` → "불참승인"(노랑 `#fef9c3`/`#ca8a04`) › `afterSchool && (!status || unchecked)` → "방과후"(노랑) › `present` → "출석"(초록) › `absent` → "결석"(빨강) › 그 외 "-".
- 레이아웃: 요일 헤더 1행 → 블록 상태 행(`sessionTypesOfSeat(seatSessionOf(tab))` 순서: 오후 탭이면 오후1·오후2 두 행, 야간 탭이면 한 행; 각 행 첫 칸에 `shortLabel`) → 비고 입력 1행(현재 탭 블록의 `note`, 저장 API 는 `sessionType: tab`). 그리드는 6열(라벨 + 5요일).
- 사유 줄: 각 블록의 `approvedReason ?? reason` 을 `"{요일} {shortLabel}: {REASON_LABELS[type]}{detail ? ` (${detail})` : ""}"` 로 나열.
- 누계·랭킹 블록 불변.

### 불참신청 탭
- 라벨 `SESSION_META[r.sessionType].label`. 일괄승인은 배정된 세션 전부(`assignedSessionTypes`)를 이미 순회하므로 3블록 자동 대응.

---

## 6. 불참신청 화면

| 화면 | 변경 |
|------|------|
| `student/absence-requests/page.tsx` | 세션 버튼 3개(오후1/오후2/야간) **다중 선택** + "오후 전체" 버튼(오후1+오후2 토글). 전송 `sessionTypes`. 목록 라벨 `shortLabel`. 사유 라벨 `REASON_LABELS` |
| `student/batch-absence/page.tsx` | 학생당 `SessionButton` 3개, 행 상태 `selected: Record<SessionType, boolean>`, 제출 시 선택된 블록마다 1건 |
| `homeroom/absence-reasons/page.tsx` | `SESSION_OPTIONS` → `SESSION_TYPES.map` |
| `homeroom/absence-requests/page.tsx`, `attendance/[grade]` 불참신청 탭, `admin/swap-history` | 세션 라벨 맵 → `SESSION_META` |

승인/반려/일괄승인 트랜잭션은 블록 단위로 이미 동작하므로 변경 없음.

---

## 7. 참여설정 · 출결표 · Excel · 대시보드 · 학생 화면

- **참여설정** (`ParticipationManagement.tsx`, `grade-admin/[grade]/participation`, `homeroom/participation`): 세션 블록 3개 × (참가 + 5요일) = 18열, `SESSION_TYPES.map`. 헤더 `SESSION_META[t].label`. 기존 sticky header·첫 열·`overflow-x-auto` 유지.
- **월간출결** (`GradeMonthlyAttendance.tsx`, `homeroom/attendance`, `admin/statistics`): 날짜당 3셀, 2단 헤더 두 번째 행 `shortLabel` ×3, 날짜 헤더 `colSpan=3`. 합계(출석/결석/참여) 카운터는 세션 루프로 일반화.
- **담임 주간표** (`homeroom/page.tsx`): 날짜당 3셀 + 푸터 집계 루프.
- **Excel** (`grade-admin export-attendance`, `homeroom export-attendance`, `admin export-excel`): `headerRow2.push(...SESSION_TYPES.map(shortLabel))`, 날짜 열 시작 `4 + i * 3`, 병합 3칸, 행 값 3개.
- **오늘출결** (`TodayAttendanceDashboard.tsx`, `admin/page.tsx`): `SESSION_TYPES.map` 으로 카드/행 3개.
- **학생** (`student/page.tsx`, `student/attendance/page.tsx`): 3세션 루프, 월간 달력 점 3개, 라벨 `shortLabel`.
- **감독 일정** (`homeroom/schedule/page.tsx`, `MonthlyCalendar.tsx`): 슬롯 `sessionType: REPRESENTATIVE_SESSION_TYPE`, 캐시 키 `${date}-${grade}-${REPRESENTATIVE_SESSION_TYPE}`. 라벨 "학년별 1명 오후+야간" → "학년별 1명(오후1·오후2·야간)".

---

## 8. 감독배정

- POST: `SESSION_TYPES` 전부 `upsert`(같은 교사). DELETE(`deleteMany({grade,date})`)와 교체(`findMany({grade,date,teacherId})` → 전부 update)는 이미 N행에 안전 — 주석만 갱신.
- 하루 1건으로 봐야 하는 조회(담임 일정, 요약 카운트, 감독 Excel ×2, 달력 슬롯)는 `REPRESENTATIVE_SESSION_TYPE` 로 필터.
- 푸시 알림 `planReminders` 의 (teacher, grade) dedupe 는 3행에도 그대로 동작. 주석 `// 오후+야간 2행 → 1건` 갱신, 테스트 픽스처 3행.

---

## 9. 좌석 · 인쇄

`SeatingEditor`, `SeatPrintGroup`, `seats/print/page.tsx`, `lib/seats/print-groups.ts`, `admin/seats`, `grade-admin/[grade]/seats`, `grade-admin/[grade]/page.tsx`, `seat-layouts` API: `"afternoon" | "night"` 타입 → `SeatSessionType`, 라벨 → `SEAT_SESSION_META`. 로직·라우트 파라미터(`?session=afternoon|night`, `?sessionType=`) 불변.

---

## 10. 시드 · 스크립트 · 도움말

- `prisma/seed.ts`: 학생당 `ParticipationDay` 3행(`SESSION_TYPES`), `StudySession.type` 은 `SeatSessionType`(오후 16:30–18:20 유지), 감독배정 루프 `SESSION_TYPES`.
- `prisma/scripts/add-afternoon-mirae-rooms.ts`, `update-room-sizes.ts`: `SessionType.afternoon` → `SeatSessionType.afternoon`.
- `src/app/help/content.mdx`: "오후 자습과 야간 자습" → "오후1·오후2·야간 자습" 등 문구 갱신. `HelpDemos.tsx` `SessionSummary` 카드 3개.
- `.claude/PROJECT_MAP.md`: enum·모델·API 표·수정 이력 갱신(`project-map-updater`).

---

## 11. 테스트 (`npx tsx tests/<name>.test.ts`, `node:assert/strict`)

| 파일 | 검증 |
|------|------|
| `tests/sessions.test.ts` (신규) | `SESSION_TYPES`/`SEAT_SESSION_TYPES` 가 `prisma/schema.prisma` 의 `enum SessionType`/`enum SeatSessionType` 블록을 파싱한 값과 동일(생성물 비의존), `seatSessionOf`/`sessionTypesOfSeat` 왕복, `attendanceMinutes`(null→50/100, 값 우선), 타입가드 |
| `tests/copy-session-logic.test.ts` (신규) | `planSessionCopy`: present 복사, 사유 없는 absent 복사, 사유 있는 absent·미체크 건너뜀, 이미 체크된 to 보존, 비참여·불참신청 학생 제외 |
| `tests/weekly-summary.test.ts` (신규) | `summarizeWeeklyCell` 우선순위: 불참승인 > 방과후 > 출석 > 결석 > 미체크; 비참여 "-" |
| `tests/session-split-migration.test.ts` (신규) | 마이그레이션 SQL 문자열 계약: `SeatSessionType` 생성, 5개 테이블 `SessionType_new` 전환, `'afternoon2'` INSERT 5종 + `absence_reasons` 조인 복제, `DROP TYPE "SessionType_old"` |
| `tests/session-literal-guard.test.ts` (신규) | `src/**` 스캔: `"afternoon"`/`'afternoon'` 리터럴은 `src/lib/sessions.ts` 와 좌석 컨텍스트 파일 허용 목록 밖에서 금지; `?? 100` 금지 |
| `tests/supervisor-bulk-absence-approval.test.ts` | `SessionType` 3종, "다른 세션 미승인" 케이스를 `afternoon1` vs `afternoon2` 로 |
| `tests/seat-print-groups.test.ts` | 타입만 `SeatSessionType` |
| `tests/reminder-logic.test.ts` | 픽스처 (teacher, grade) 당 3행 → 1건 |

`npm run build` 로 타입 검사(응답 형태 변경이 소비자에 전파됐는지) 를 최종 확인한다.

---

## 12. 리스크

| 리스크 | 대응 |
|--------|------|
| Railway 빌드 명령의 `prisma db push` | 배포 전 대시보드 확인·제거 (§2 체크리스트 1) |
| 마이그레이션 중 실패 | 단일 트랜잭션 → 자동 롤백. 스냅샷으로 2중 안전 |
| 유니크 충돌(복제 시 이미 afternoon2 존재) | 신규 enum 값이므로 배포 전에는 존재 불가. 마이그레이션은 1회만 실행됨 |
| API 형태 변경 누락 소비자 | `npm run build` 타입 검사 + `session-literal-guard` 테스트 |
| 표 폭 증가(18열, 날짜당 3셀) | 기존 `overflow-x-auto` + sticky 규칙 유지, `responsive-ui-reviewer` 실행 |
| 오후2 복사가 실제 결석을 가림 | 미체크 학생에게만, 사유 없는 상태만 복사. 감독교사 확인 다이얼로그 |

---

## 13. 파일 변경 요약

**신규**
- `src/lib/sessions.ts`, `src/lib/absence-reasons.ts`
- `src/lib/attendance/copy-session.ts`, `src/lib/attendance/weekly-summary.ts`
- `src/app/api/attendance/copy-session/route.ts`
- `prisma/migrations/20260826000000_split_afternoon_session/migration.sql`
- `tests/sessions.test.ts`, `tests/copy-session-logic.test.ts`, `tests/weekly-summary.test.ts`, `tests/session-split-migration.test.ts`, `tests/session-literal-guard.test.ts`

**수정 — 스키마/lib**: `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/scripts/*.ts`(2), `src/lib/academic-year.ts`, `src/lib/absence-request-bulk-approval.ts`, `src/lib/push/reminder-logic.ts`(주석), `src/lib/seats/print-groups.ts`, `src/lib/excel/supervisor-export.ts`(주석)

**수정 — API (25)**: `attendance/{route,weekly,notes,toggle,[id]}`, `grade-admin/[grade]/{today-attendance,monthly-attendance,export-attendance,participation-days,seat-layouts,supervisor-assignments,supervisor-assignments/export}`, `homeroom/{schedule,schedule/summary,monthly-attendance,export-attendance,participation-days,absence-reasons}`, `student/{participation-days(계산),absence-requests,batch-absence}`, `admin/{today-attendance,statistics,export-excel,supervisors/export}`

**수정 — 페이지/컴포넌트 (26)**: `attendance/[grade]/page.tsx`, `grade-admin/[grade]/{page,seats/page,seats/print/page,participation/page}`, `homeroom/{page,attendance,participation,absence-requests,absence-reasons,schedule}`, `student/{page,attendance,absence-requests,batch-absence}`, `admin/{page,statistics,seats,swap-history}`, `components/admin-shared/{MonthlyCalendar,ParticipationManagement}`, `components/grade-admin/{TodayAttendanceDashboard,GradeMonthlyAttendance}`, `components/seats/{SeatingEditor,SeatPrintGroup}`, `components/help/HelpDemos.tsx`

**수정 — 문서/테스트**: `src/app/help/content.mdx`, `.claude/PROJECT_MAP.md`, `tests/{supervisor-bulk-absence-approval,seat-print-groups,reminder-logic}.test.ts`
