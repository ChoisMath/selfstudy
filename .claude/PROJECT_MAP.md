# 자율학습 출석부 시스템 - 프로젝트 지도

> 마지막 업데이트: 2026-09-08
> 이 파일은 새 세션에서 코드베이스를 빠르게 파악하기 위한 참조 문서입니다.

## 개요

학교 자율학습(오후/야간) 출석 관리 반응형 웹앱.
- **기술 스택**: Next.js 16 (App Router) + Prisma 7 + NextAuth v5 + Tailwind CSS 4 + SWR + @dnd-kit
- **DB**: PostgreSQL (Railway)
- **배포**: https://self.posan.kr (Railway custom domain, 구주소 https://posan.up.railway.app 도 당분간 병행)

## 사용자 역할 (5종)

| 역할 | 로그인 방식 | 주요 기능 | 라우트 |
|------|------------|----------|--------|
| 메인관리자 | ID/PW | 전학년 모든 관리 | `/admin/*` |
| 서브관리자 | ID/PW | 지정 학년 관리 (SubAdminAssignment) | `/grade-admin/[grade]/*` |
| 감독교사 | ID/PW | 출석체크(좌석 토글), 학년전환 | `/attendance/*` |
| 담임교사 | ID/PW | 자기반 관리, 불참승인 | `/homeroom/*` |
| 학생 | 이름+학번(5자리) | 불참신청, 출결조회 | `/student/*` |

## 디렉토리 구조

```
src/
├── app/
│   ├── layout.tsx              # 루트 (Providers 래핑)
│   ├── globals.css             # Tailwind 진입 + `:root --header-h: 3.5rem`(sticky nav h-14) + `@utility table-scroll`(표 래퍼 내부 스크롤포트)
│   ├── page.tsx                # / → admin→/admin, 기타 교사→/attendance
│   ├── providers.tsx           # SessionProvider
│   ├── login/
│   │   ├── page.tsx            # 로그인 UI (교사/학생 탭)
│   │   └── actions.ts          # Server Action (signIn 호출)
│   ├── admin/                  # 메인관리자 전용
│   │   ├── layout.tsx          # AdminNav 포함
│   │   ├── page.tsx            # 전학년 오늘출결 대시보드 (SWR + /api/admin/today-attendance)
│   │   ├── users/page.tsx      # 통합 사용자관리 (교사/1~3학년 탭, 담당학년 드롭다운, 학생 초기화)
│   │   ├── seats/page.tsx      # 6탭 좌석배치 (1~3학년 × 오자/야자) + SeatingEditor
│   │   ├── supervisors/page.tsx # 감독배정 MonthlyCalendar (전학년 6슬롯 모드)
│   │   ├── statistics/page.tsx # 출결 테이블뷰 + Excel 다운로드
│   │   └── swap-history/page.tsx
│   ├── grade-admin/[grade]/    # 서브관리자 (학년별)
│   │   ├── layout.tsx          # AdminNav 포함
│   │   ├── page.tsx            # 6탭 허브 (오늘출결, 학생관리, 참여설정, 좌석배치, 감독배정, 월간출결)
│   │   ├── students/page.tsx
│   │   ├── participation/page.tsx
│   │   ├── seats/page.tsx      # 2탭 (오후자습/야간자습) + SeatingEditor
│   │   ├── seats/print/page.tsx # 인쇄 미리보기 (그룹별 가로/세로 + 체크박스)
│   │   └── supervisors/page.tsx # MonthlyCalendar (단일학년 2슬롯 모드)
│   ├── attendance/             # 감독교사
│   │   ├── layout.tsx          # 모든 교사에게 이동 버튼 (담임교사/감독일정/학년관리) + NotificationBell
│   │   ├── page.tsx            # 자동 학년 라우팅 / 학년 선택
│   │   └── [grade]/page.tsx    # ★ 핵심: 좌석 출석 그리드 (4탭: 오후1/오후2/야간자습/불참신청, 오후 그룹은 buildPrintGroups 공용). 오후2 탭 "오후1 결과 복사" 버튼(`/api/attendance/copy-session`) + 불참신청 관리 UI
│   ├── homeroom/               # 담임교사
│   │   ├── layout.tsx          # 담임 5탭 + 공통 2탭 네비게이션 (세션 로딩 처리) + NotificationBell
│   │   ├── page.tsx            # 자기반 학생 + 주간출석 (날짜당 3셀: 오후1/오후2/야간)
│   │   ├── attendance/page.tsx # 담임 월간출결 테이블 + "시간" 컬럼 + Excel 다운로드 (날짜당 3셀)
│   │   ├── participation/page.tsx  # 참여설정 18열(세션 3 × 참가+5요일)
│   │   ├── absence-reasons/page.tsx
│   │   ├── absence-requests/page.tsx
│   │   ├── schedule/page.tsx   # 월간 달력 그리드 (전체 학년 감독배정 + 교체) + SupervisorSummaryModal 연동
│   │   └── password/page.tsx
│   ├── student/                # 학생
│   │   ├── layout.tsx          # 3개 탭
│   │   ├── page.tsx            # 참여일정 + 참여시간 카드 (월간/연간)
│   │   ├── attendance/page.tsx # 주간/월간 출결
│   │   ├── absence-requests/page.tsx  # 세션 다중선택(오후1/오후2/야간) + "오후 전체" 편의 버튼
│   │   └── batch-absence/page.tsx     # 도우미 학생 전용 — 반 전체 일괄 불참신청, 학생당 세션 버튼 3개
│   └── api/                    # API 라우트 (아래 별도 섹션)
│
├── components/
│   ├── attendance/
│   │   └── AttendanceDatePicker.tsx  # 커스텀 월간 달력 팝오버 (props: value/today/onChange, "오늘로" 버튼, @/lib/calendar 의존)
│   ├── notifications/
│   │   └── NotificationBell.tsx # 공통 네비 알림 벨 (구독 토글 + iOS "홈 화면에 추가" 안내, BellState 분기)
│   ├── admin-shared/
│   │   ├── AdminNav.tsx        # 관리자 네비 (오늘 출결 메뉴 포함, exact match, 서브관리자용 교사 링크) + NotificationBell (grade-admin은 경유 상속)
│   │   ├── ParticipationManagement.tsx  # 참여설정 테이블 (grade prop)
│   │   ├── MonthlyCalendar.tsx  # 월간 감독배정 캘린더 (학년당 1슬롯, 텍스트 검색 교사 선택, 담당학년 우선 그룹). 래퍼 `table-scroll`, 마지막 2주 행은 `CalendarTeacherSelect openUpward`로 드롭다운을 위로
│   │   └── ExcelUploadModal.tsx # 공용 Excel 업로드 모달 (드래그앤드롭, 교사/학생 공용)
│   ├── grade-admin/
│   │   ├── TodayAttendanceDashboard.tsx  # 오늘출결 대시보드 (grade prop, SESSION_TYPES 3카드)
│   │   └── GradeMonthlyAttendance.tsx    # 월간출결 테이블 (grade prop, 짝수반 배경 구분, 날짜당 3셀 + "시간" 컬럼)
│   ├── homeroom/
│   │   └── SupervisorSummaryModal.tsx  # 학년도 기준 교사별 월별 감독횟수 집계 모달 (`/api/homeroom/schedule/summary`, 본인 행 sticky 강조)
│   ├── seats/
│   │   ├── SeatingEditor.tsx       # DndContext + 저장 + 출력 버튼 (props: grade, sessionType). 미배정 목록은 `participatesInSeatSession` 으로 필터. 좌석 해제: `selectedSeat` 선택 → 루트 마지막 자식 `sticky bottom-2` 액션바(배정 해제/취소/Escape), 또는 좌석→미배정 패널 드롭. 충돌 감지 커스텀(패널은 `getBoundingClientRect()` 실시간, 나머지는 패널 제외 `closestCenter`)
│   │   ├── RoomGrid.tsx            # 교실 격자 (droppable/draggable 셀). X(해제) 버튼 없음 — props `selectedSeatKey?`/`onSelectSeat?(SeatRef|null)`(`export type SeatRef`)로 좌석 탭 선택(ring), 핸들 Delete/Backspace도 선택. `preserveSeatWidth` prop: 오후 분기 전용 최소 셀 폭(`MIN_SEAT_WIDTH=52`) — 셀을 찌그러뜨리지 않고 래퍼가 가로 스크롤
│   │   ├── MiraeHallLayout.tsx     # 2학년 야간 미래홀 도면 (fitContent 옵션)
│   │   ├── PrintRoomGrid.tsx       # 인쇄용 읽기전용 좌석 격자 (dnd 없음, 고정 셀 크기)
│   │   ├── SeatPrintGroup.tsx      # 인쇄 그룹 1개 (제목 + kind별 배치 + 교탁)
│   │   ├── PrintPageFitter.tsx     # A4 페이지 박스 + 콘텐츠 실측 후 scale
│   │   └── UnassignedStudents.tsx  # 미배정 학생 풀 (검색/반별 그룹). `export const UNASSIGNED_DROP_ID = "unassigned"` + `useDroppable` — 좌석을 끌어다 놓으면 해제(좌석 드래그 중에만 isOver 링)
│   └── students/
│       └── StudentManagement.tsx   # 학생 목록 + CRUD 모달 + ExcelUploadModal. 모달은 열려 있을 때만 마운트(`{modalOpen && <StudentModal/>}`, 마운트 시 initialData 로 초기화)
│
├── lib/
│   ├── auth.ts         # NextAuth 설정 (Credentials×2 + Google, JWT 콜백)
│   ├── api-auth.ts     # withAuth (+ "teacher" 의사역할: 모든 교사 허용), withGradeAuth, withHomeroomAuth 래퍼
│   ├── calendar.ts     # KST 안전 순수 날짜 유틸 (getKstTodayString/formatDateValue/parseDateValue/formatDateLabel/formatDateWithWeekday/shiftMonth/buildMonthCells, toISOString 미사용)
│   ├── sessions.ts     # ★ 세션 진실 공급원 — SESSION_TYPES(afternoon1/afternoon2/night)/SEAT_SESSION_TYPES(afternoon/night)/SESSION_META/SEAT_SESSION_META/REPRESENTATIVE_SESSION_TYPE("afternoon1")/isSessionType/isSeatSessionType/seatSessionOf/sessionTypesOfSeat/attendanceMinutes/emptySessionRecord. `"afternoon"`/`"night"` 리터럴·`100` 상수는 이 모듈 밖 사용 금지(session-literal-guard 테스트로 고정)
│   ├── absence-reasons.ts  # REASON_TYPES/REASON_LABELS(한글)/reasonLabel — 기존 7곳에 중복되던 사유 라벨 맵의 단일 출처(수정한 파일만 교체)
│   ├── academic-year.ts    # 학년도(3월~익년2월) 범위 계산 + 학년 내 자습시간 랭킹(getGradeRankingMap, 모듈 인메모리 캐시 TTL 60초) — raw SQL로 `COALESCE(duration_minutes, CASE session_type WHEN 'night' THEN 100 ELSE 50 END)` 집계
│   ├── attendance/
│   │   ├── weekly-summary.ts  # buildWeeklyRows/summarizeWeeklyCell/weekDatesOf — 주간 API·"i" 팝업 공용. 셀 상태 우선순위: 비참여 › 불참승인 › 방과후 › 출석 › 결석 › 미체크
│   │   └── copy-session.ts    # planSessionCopy — "오후1 결과 복사" 순수 규칙(대상: 미체크+참여+불참신청無, present 그대로/사유없는 absent만 복사)
│   ├── push/
│   │   ├── reminder-logic.ts  # 메시지 생성·(teacher,grade) dedupe·발송 계획 순수 함수 (planReminders/reminderKey/buildReminderMessage)
│   │   ├── send.ts            # web-push 래퍼: sendToTeacher (교사별 발송 + 404/410 만료 구독 정리)
│   │   └── client.ts          # 브라우저 구독/해제 + VAPID base64 변환 + iOS standalone 감지
│   ├── seats/
│   │   ├── print-groups.ts   # 방 목록 → 인쇄 그룹 분해 (화면/인쇄 공용, 타입은 SeatSessionType)
│   │   ├── print-layout.ts   # A4 기하 상수 + 방향 추천/배율 계산
│   │   └── seat-participation.ts  # participatesInSeatSession: 좌석 세션의 블록 중 하나라도 참여(레코드 없으면 기본 참여)면 자리 필요
│   └── prisma.ts       # PrismaClient 싱글톤 (PrismaPg 어댑터)
│
├── middleware.ts       # 라우트 보호 (getToken + 명시적 cookieName/salt, /homeroom·/attendance 모든 교사 허용)
├── types/next-auth.d.ts # Session/JWT 타입 확장
└── generated/prisma/   # Prisma 자동 생성 (gitignore)

scripts/
└── trigger-supervisor-reminders.mjs  # Railway Cron 서비스가 호출 → APP_URL + Bearer CRON_SECRET 로 /api/cron/supervisor-reminders POST

public/
└── sw.js               # 서비스워커 (CACHE_NAME=selfstudy-v2, install/activate/fetch + push/notificationclick 핸들러)
```

## API 라우트 요약

### 출석 (`/api/attendance/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/attendance?date&session&grade` | 좌석+출석 현황 조회 (`session`은 `SessionType`, 좌석/교실은 `seatSessionOf(session)`으로 조회. 학생별 `hasPendingAbsenceRequest` 포함) |
| POST | `/api/attendance/toggle` | 출석 상태 순환 토글 (`sessionType`을 `isSessionType`으로 검증) |
| PUT | `/api/attendance/[id]` | 상태 직접 수정 (`sessionType` 검증 추가) |
| POST | `/api/attendance/copy-session` | **신규.** `{grade,date,from,to}`(같은 좌석 세션의 서로 다른 블록만) — `from`(보통 오후1) 결과를 `to`(오후2) 미체크·참여·불참신청無 학생에게 복사(`planSessionCopy`). 응답 `{copied,skipped}` |
| GET | `/api/attendance/weekly?studentId&date` | 주간 출석. `weekly[].sessions: Record<SessionType,…>`(status/reason/participating/afterSchool/note/`isApprovedAbsence`/`approvedReason`) — 승인된 `AbsenceRequest`를 주간 범위로 조회해 팝업에 불참승인 노란색+한글 사유 반영. `totals`/`ranking` 형태 불변 |
| GET | `/api/attendance/absence-requests?grade&status` | 학년별 불참신청 목록 조회 (감독교사용) |
| POST | `/api/attendance/absence-requests/bulk-approve` | 감독교사 배정 검증 후 해당 날짜/학년/세션의 pending 불참신청 일괄승인 |
| GET/PUT | `/api/attendance/notes?studentId&date` | 요일별 비고 조회/수정 (upsert/삭제). GET 응답 `{ [date]: Partial<Record<SessionType,string>> }` |

### 담임 (`/api/homeroom/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `students` | 자기반 학생+주간출석 |
| GET/PUT | `participation-days` | 참여설정 조회/수정. GET `students[].sessions: Record<SessionType, DaySettings>`(18열), PUT 검증 `isSessionType` |
| POST | `absence-reasons` | 불참사유 등록 (트랜잭션, `sessionType` 검증 추가) |
| GET | `absence-requests` | 반 학생 불참신청 목록 |
| PUT | `absence-requests/[id]` | 승인/반려 (트랜잭션, 모든 교사 허용) |
| GET | `schedule` | 전체 학년 감독배정 (본인 포함), `REPRESENTATIVE_SESSION_TYPE`로 필터 |
| GET | `schedule/summary?grade` | **신규(맵 누락분 반영).** 학년도(3월~익년2월) 기준 교사별 월별 감독횟수 집계, `REPRESENTATIVE_SESSION_TYPE`만 카운트. `SupervisorSummaryModal` 소비 |
| GET | `monthly-attendance` | 담임 월간 출결 데이터. `dates[date]: Partial<Record<SessionType,{status,reason?}>>`, "시간" 컬럼은 `attendanceMinutes()` |
| GET | `export-attendance` | 담임 출결 Excel 다운로드 (날짜당 3셀: 오후1/오후2/야간) |

### 학년관리 (`/api/grade-admin/[grade]/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET/POST | `students` | 학생 목록/등록 |
| PUT/DELETE | `students/[id]` | 학생 수정/삭제 |
| POST | `students/bulk-upload` | Excel 일괄업로드 (기존 비활성화 + 새 생성) |
| GET/PUT | `participation-days` | 참여설정. GET `students[].sessions: Record<SessionType, DaySettings>`(세션 3 × 참가+5요일 = 18열), PUT 검증 `isSessionType` |
| GET/POST | `seat-layouts` | 좌석 배치 조회/저장(트랜잭션, roomId 기반, `sessionType`은 `SeatSessionType` — `isSeatSessionType` 검증) |
| GET/POST | `supervisor-assignments` | 감독 배정 (POST: `SESSION_TYPES` 3행 동시 upsert, 응답 `{ assignment: 대표행(afternoon1), assignments: [3행] }`) |
| DELETE | `supervisor-assignments/[id]` | 배정 해제 (3행 동시 삭제) |
| GET | `today-attendance` | 학년별 오늘 출결 현황. `sessions: Record<SessionType, SessionStats>`(출석/결석/사유결석/방과후 집계) |
| GET | `monthly-attendance?month=YYYY-MM` | 학년 전체 월간 출결 데이터. `dates[date]: Partial<Record<SessionType,{status,reason?}>>` |
| GET | `export-attendance?month=YYYY-MM` | 학년 전체 월간 출결 Excel 다운로드 (날짜당 3셀) |
| GET | `supervisor-assignments/export?month=YYYY-MM` | 학년 감독배정 Excel (Month+누계 시트), `REPRESENTATIVE_SESSION_TYPE`로 필터 |

### 학생 (`/api/student/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET/POST | `absence-requests` | 불참신청 조회/생성. POST 입력 `sessionTypes: SessionType[]`(1개 이상, "오후 전체" 지원) → `createMany({skipDuplicates})`, 응답 `{created,skipped}` |
| GET | `attendance?type&date/month` | 주간/월간 출결 (3세션 루프) |
| GET | `participation-days` | 참여일정. `monthlyStudyHours`/`yearlyStudyHours`는 `attendanceMinutes()` 합산 |
| GET | `batch-absence` | **신규(맵 누락분 반영).** 도우미 학생 전용 — 같은 반 학생별 오늘 `participating: Record<SessionType,boolean>` + `existingRequests: Partial<Record<SessionType,string>>` |
| POST | `batch-absence` | **신규(맵 누락분 반영).** 도우미 학생이 반 전체 불참신청 일괄 등록. `sessionType`은 `isSessionType` 검증, `createMany({skipDuplicates})`, 응답 `{created,total,skipped}` |

### 관리자 (`/api/admin/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET/POST | `teachers` | 교사 목록/등록 (primaryGrade + homeroom/subAdmin) |
| PUT/DELETE | `teachers/[id]` | 교사 수정/삭제 (primaryGrade 업데이트) |
| GET | `teachers/template` | 교사 Excel 템플릿 (담당학년 컬럼 포함) |
| POST | `teachers/bulk-upload` | 교사 Excel 일괄업로드 (담당학년 처리) |
| GET/POST/DELETE | `sub-admins` | 서브관리자 지정 |
| GET/POST/DELETE | `homeroom-assignments` | 담임배정 (배정 시 TeacherRole "homeroom" 자동 부여/해제) |
| GET | `supervisor-swap-history` | 감독교체이력 |
| GET | `statistics?from&to&grade&class` | 출결통계. `dates[date]: Partial<Record<SessionType,{status,reason?}>>` |
| GET | `export-excel?from&to&grade` | Excel 다운로드 (날짜당 3셀) |
| GET | `students/template` | 업로드 템플릿 |
| POST | `students/reset` | 학생 전체 초기화 |
| GET | `today-attendance` | 전학년 오늘 출결 현황. `sessions: Record<SessionType, SessionStats>` × 1~3학년 |
| GET | `supervisors/export?month=YYYY-MM` | 전학년 감독배정 Excel (Month+누계 시트), `REPRESENTATIVE_SESSION_TYPE`로 필터 |

### 기타
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/supervisor-assignments/my-today` | 오늘 감독배정 확인 |
| PUT | `/api/supervisor-assignments/[id]` | 감독교체 (모든 블록 동시, 모든 교사 허용) |
| GET | `/api/teachers` | 교사 목록 (primaryGrade 포함) |
| POST | `/api/auth/change-password` | 비밀번호 변경 |

### 푸시 알림 (`/api/push/`, `/api/cron/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/push/subscribe` | 교사 푸시 구독 저장 (endpoint 기준 upsert), withAuth(["teacher"]) |
| POST | `/api/push/unsubscribe` | endpoint 기준 구독 삭제(deleteMany), withAuth(["teacher"]) |
| POST | `/api/cron/supervisor-reminders` | Bearer CRON_SECRET 보안 cron. KST 오늘 감독배정 조회 → (teacher,grade) dedupe → SupervisorReminderLog로 중복 방지 → web-push 발송. 응답 `{processed, planned, sent}` |

## 데이터 모델 (16개 모델, 6개 enum)

```
Student ──< Attendance (+ durationMinutes?, durationNote?) >── Teacher (checker)
  │              │            sessionType: SessionType (afternoon1/afternoon2/night)
  │              └── AbsenceReason >── Teacher (registrar)
  │
  ├──< ParticipationDay (afternoon1/afternoon2/night × 월~금 + afterSchool월~금)
  ├──< AttendanceNote >── Teacher (creator)
  ├──< AbsenceRequest >── Teacher (reviewer)
  └──< SeatLayout >── Room >── StudySession
         (unique: roomId + rowIndex + colIndex)
         StudySession.type: SeatSessionType (afternoon/night) — 좌석 배치·인쇄 전용, 오후1·오후2 는 같은 "오후" 좌석을 공유

Teacher (+ primaryGrade: nullable int) ──< TeacherRole (admin/supervisor/homeroom)
  ├──< HomeroomAssignment (grade, classNumber)
  ├──< SubAdminAssignment (grade)
  ├──< SupervisorAssignment (date, grade, sessionType — 배정 시 3행(afternoon1/afternoon2/night) 동시 생성, 같은 교사)
  ├──< SupervisorSwapHistory (original/replacement)
  ├──< AttendanceNote (creator)
  ├──< PushSubscription (endpoint unique, onDelete: Cascade)
  └──< SupervisorReminderLog (grade, date, onDelete: Cascade)

PushSubscription: teacherId, endpoint(@unique, Text), p256dh, auth, userAgent?(VarChar 255), createdAt
SupervisorReminderLog: teacherId, grade, date(@db.Date), sentAt — @@unique([teacherId, grade, date]) 로 하루 1회 발송 멱등성
```

**삭제된 모델**: SeatingPeriod (기간 개념 제거, SeatLayout이 Room을 통해 직접 grade+sessionType 결정)

### 주요 Enum
- `Role`: admin, supervisor, homeroom
- `SeatSessionType`: afternoon, night — `StudySession.type` 전용 (좌석 배치·인쇄), 오후1·오후2 는 "afternoon" 좌석을 공유
- `SessionType`: afternoon1, afternoon2, night — `Attendance`/`AbsenceRequest`/`ParticipationDay`/`AttendanceNote`/`SupervisorAssignment.sessionType` (출석 블록 단위). 진실 공급원은 `src/lib/sessions.ts`
- `AttendanceStatus`: unchecked, present, absent
- `ReasonType`: academy, afterschool, illness, custom
- `RequestStatus`: pending, approved, rejected

## 핵심 비즈니스 로직

### 1. 출석 토글 (`/api/attendance/toggle`)
- 순환: unchecked → present → absent → unchecked
- unchecked 전환 시 레코드 삭제, 나머지는 upsert

### 2. 불참승인 트랜잭션 (`/api/homeroom/absence-requests/[id]`)
- 승인 시: AbsenceRequest.status→approved + Attendance upsert(absent) + AbsenceReason create
- 반려 시: AbsenceRequest.status→rejected만
- 일괄승인(`POST /api/attendance/absence-requests/bulk-approve`)은 감독교사 배정(`teacherId + date + grade + sessionType`)을 서버에서 검증한 뒤 pending만 트랜잭션으로 승인

### 3. 좌석 배치 저장 (`/api/grade-admin/[grade]/seat-layouts`)
- 트랜잭션: 기존 SeatLayout 삭제 → 새로 일괄 생성
- periodId 불필요, roomId 기반으로 직접 조회/저장

### 4. 출석 그리드 — 비참여 좌석 처리 (`/attendance/[grade]`)
- API에서 `ParticipationDay`의 `isParticipating` + 요일 필드(`mon`~`fri`)로 `isParticipating` 결정
- 비참여 좌석: 회색(`#e5e7eb`, opacity-60), 탭 클릭 무시
- 길게 터치(500ms): `activatedStudents` Set에 추가 → 하늘색(활성화) → 탭으로 출석 토글 가능
- 이미 출석 기록이 있는 비참여 학생은 활성 상태로 표시
- ⚠ KST 날짜는 `getFullYear()/getMonth()/getDate()`로 생성 (`toISOString()` 사용 금지). 날짜 유틸은 `@/lib/calendar` 사용

### 4-1. 출석 그리드 — 권한별 날짜 선택 (`/attendance/[grade]`)
- `useSession`으로 권한 판별: `canChangeDate = roles.includes("admin") || subAdminGrades.length > 0` (전체관리자/학년관리자만 임의 날짜 선택 가능, 일반 교사는 today 고정)
- `selectedDate` state(기본 `today = getKstTodayString()`). 날짜 바 클릭 → `AttendanceDatePicker` 팝오버에서 임의 날짜 선택 → 해당 날짜 출결 조회/체크
- 조회 SWR(`/api/attendance`)/토글(`/api/attendance/toggle`)/주간 팝업(`/api/attendance/weekly`)은 `selectedDate` 사용. 불참신청 일괄승인(`bulkCandidates`, `handleBulkApprove`)은 `today` 고정 유지
- 날짜 변경 시 선택 좌석/활성화/누계/주간 캐시 초기화. `selectedDate !== today`면 "오늘 아님" 배지 표시
- 팝오버는 날짜 행 `overflow-x-auto` 바깥(sticky 컨테이너 직속 자식, `absolute z-[120]`)에 렌더해 클리핑 방지. 백드롭 클릭/ESC로 닫힘
- 백엔드 변경 없음 — `/api/attendance`, `/api/attendance/toggle`, `/api/attendance/weekly`가 이미 임의 `date` 파라미터 처리

### 5. 출석 그리드 — 불참신청 탭 (`/attendance/[grade]`)
- 4번째 탭 "불참신청"(오후1/오후2/야간 다음): 감독교사가 해당 학년의 불참신청 목록을 조회/승인/반려
- `/api/attendance/absence-requests?grade&status`로 학년별 신청 조회
- `/api/homeroom/absence-requests/[id]` PUT으로 승인/반려 처리 (모든 교사 허용)
- `일괄승인` 버튼: 오늘 해당 학년 감독으로 배정된 세션의 pending 불참신청만 후보로 표시, 확인 모달에서 학생/날짜/시간/사유/상세 테이블을 가로 스크롤 방식으로 보여준 뒤 승인
- 일괄승인 성공 시 불참신청 목록, pending 배지, 좌석 데이터 SWR을 갱신
- 좌석 그리드의 빨간 "*"로 대기 중인 불참신청 학생 시각적 식별

### 6. 학번 파싱
- 5자리: A(학년) + BC(반) + DE(번호), 예: 20102 = 2학년 1반 2번

### 7. 감독 푸시 알림 (web-push)
- **구독**: 교사가 NotificationBell 클릭 → `Notification.requestPermission()` → `pushManager.subscribe` → `POST /api/push/subscribe`(endpoint upsert). 해제는 `POST /api/push/unsubscribe` + 브라우저 `subscription.unsubscribe()`
- **발송 트리거**: Railway 별도 Cron 서비스가 `scripts/trigger-supervisor-reminders.mjs` 실행 → `POST /api/cron/supervisor-reminders`(Bearer CRON_SECRET)
- **발송 계획**: cron이 KST 오늘 SupervisorAssignment 조회 → `planReminders`가 (teacherId,grade)로 dedupe(블록별 행(오후1·오후2·야간) 3행 → 1건) + `SupervisorReminderLog` 기존 발송분 제외 → 남은 건만 `sendToTeacher` 발송 후 로그 생성
- **멱등성**: `SupervisorReminderLog @@unique([teacherId,grade,date])`로 같은 날 재실행해도 중복 발송 방지
- **만료 구독 정리**: `sendToTeacher`가 404/410 응답 시 해당 PushSubscription 삭제
- **iOS 대응**: standalone(PWA 설치) 아닌 iOS는 푸시 미지원 → NotificationBell이 "홈 화면에 추가" 안내 표시
- **메시지 형식**: `{이름}선생님, {날짜(요일)} 에 {학년}학년 자율학습 감독교사 이십니다. 잘 부탁드립니다.` (`formatDateWithWeekday` → "2026-06-25(목)")

### 8. 세션 블록 분리 (오후1/오후2/야간) — `src/lib/sessions.ts`
- 좌석 세션(`SeatSessionType`: afternoon/night, `StudySession.type`)과 출석 블록(`SessionType`: afternoon1/afternoon2/night, `Attendance` 등)은 별개 enum. `seatSessionOf(session)`으로 블록→좌석 매핑, `sessionTypesOfSeat(seat)`으로 역매핑(오후 → `[afternoon1, afternoon2]`)
- 기본 소요시간은 `SESSION_META[t].defaultMinutes`(afternoon1/afternoon2 = 50분, night = 100분), `durationMinutes`가 있으면 그 값 우선(`attendanceMinutes()`가 유일한 계산 지점)
- 감독배정은 (date,grade)당 `SESSION_TYPES` 3행이 항상 같은 교사 — "하루 1건"으로 다뤄야 하는 조회(담임 일정, 감독횟수 요약, 감독 Excel, 달력 슬롯)는 `REPRESENTATIVE_SESSION_TYPE`("afternoon1")로 필터
- `"afternoon"`/`"night"` 문자열 리터럴과 `100`/`?? 100` 매직넘버는 `src/lib/sessions.ts`와 좌석 컨텍스트 파일(좌석·인쇄, 출석 화면의 `seatSession` 분기, 학생 신청의 "오후 전체") 밖에서 금지 — `tests/session-literal-guard.test.ts`가 src 전체를 스캔해 회귀 차단
- 좌석 편집기의 참여 판정은 `participatesInSeatSession`(`src/lib/seats/seat-participation.ts`, 블록 중 하나라도 참여) — 좌석 세션 값을 `ParticipationDay.sessionType`과 직접 비교하면 오후는 항상 불일치하므로 금지. `tests/seat-participation.test.ts`가 회귀 차단

### 9. "오후1 결과 복사" (`POST /api/attendance/copy-session`)
- 대상: from/to가 공유하는 좌석 세션에 배정된 학생 중 — to 블록에 이미 출석 기록이 없고, to 블록+해당 요일 참여 중이고, to 블록에 pending/approved 불참신청이 없는 학생만
- from이 `present` → `present` 그대로 복사; `absent`이고 사유 없음 → `absent` 복사; 그 외(미체크, 사유 있는 결석)는 건너뜀. 이미 체크된 to 레코드는 어떤 경우에도 덮어쓰지 않음
- 규칙은 순수 함수 `planSessionCopy()`(`src/lib/attendance/copy-session.ts`)로 분리, API는 후보 조회 + `attendance.createMany({skipDuplicates:true})`만 담당. 오후2 탭에서만 노출, 감독 배정 여부는 요구하지 않음(`["teacher"]` 권한)

### 10. "i" 주간 팝업 — 불참승인 표시 (`src/lib/attendance/weekly-summary.ts`)
- `summarizeWeeklyCell()` 우선순위: 비참여("-") › 불참승인("불참승인", 노랑 `#fef9c3`) › 방과후(상태 미체크일 때만, 노랑) › 출석(초록) › 결석(빨강) › 미체크("-") — 좌석 그리드(SeatCell)와 동일한 우선순위
- 오후 탭이면 오후1·오후2 두 행, 야간 탭이면 한 행(`sessionTypesOfSeat(seatSessionOf(tab))` 순서). 비고 입력은 현재 탭 블록 기준으로 저장
- 주간 API가 승인된 `AbsenceRequest`를 같은 주간 범위로 함께 조회해 `isApprovedAbsence`/`approvedReason`을 제공 — 과거엔 `Attendance.status`만 봐서 팝업이 빨간 "결석"+영문 사유로만 보이던 버그를 수정(그리드는 이미 정상 동작 중이었음)

## 인증/인가 흐름

```
[로그인] → Server Action (actions.ts) → signIn() → JWT 발급 (JWE, A256CBC-HS512)
    ↓                                        쿠키: __Secure-authjs.session-token (HTTPS)
[미들웨어] ← getToken(cookieName, salt 명시) (Edge Runtime 호환)
    ↓ 경로별 역할 검사                  ⚠ auth() 래퍼는 Prisma 의존으로 Edge 불가
[API] ← withAuth / withGradeAuth / withHomeroomAuth
```

- 교사 JWT: 8시간, 학생 JWT: 2시간
- `trustHost: true` (Railway 프록시 대응)
- `AUTH_URL`, `AUTH_TRUST_HOST` 환경변수 설정
- **"teacher" 의사역할**: `withAuth(["teacher"])`는 모든 교사(역할 무관) 허용
- **리다이렉트**: admin→`/admin`, 기타 교사→`/attendance`, 학생→`/student`
- **담임배정 자동 동기화**: homeroom-assignments POST/DELETE 시 TeacherRole("homeroom") 자동 부여/삭제

## 주의사항 / 특이 패턴

- `react-hooks/set-state-in-effect`는 eslint 오류(빌드 게이트 아님)이며 "이전 값 저장 후 렌더 중 상태 조정" 패턴으로 대응 — `eslint-disable` 금지. 검수(tsc/eslint/build)는 `~/dev/selfstudy` 로컬 클론에서 실행(Google Drive 트리는 I/O로 정지)
- 표 래퍼는 `overflow-x-auto table-scroll`(`globals.css` `@utility`, `--header-h` 기반 내부 스크롤포트) + thead `sticky top-0 z-20` / thead 안 인덱스 th `z-30` / 본문 인덱스 td `z-10` 관행 — 래퍼에 `overflow-x-auto`만 두면 높이 제한이 없어 sticky thead가 붙지 않음. 새 표는 이 구조를 따르고 `tests/responsive-tables.test.ts`의 `TABLE_FILES`에 추가. 헤더가 다른 레이아웃은 루트에 `[--header-h:…]` 재정의(학생 `7.625rem`)
- `RoomGrid`에는 X(해제) 버튼이 없음 — 해제는 좌석 탭→선택→`SeatingEditor` 하단 액션바, 또는 좌석→`UnassignedStudents` 패널 드롭(`UNASSIGNED_DROP_ID`). `tests/responsive-tables.test.ts`·`tests/seating-editor-responsive.test.ts`가 클래스/식별자를 src 스캔으로 고정하므로 관련 클래스(`min-h-11`, `z-20`, `table-scroll`, `ring-2 ring-blue-500` 등) 변경 시 테스트도 함께 갱신

## 수정 이력 (주요 변경)

### 2026-09-08: 반응형 위반 정리(핸드오프 §4.2) + 좌석 해제 44px 설계
- **계획 문서**: `.plans/2026-09-08-responsive-cleanup-final.md`(초안·리뷰·사후검토 문서 동반). DB/API 변경 없음 — src 24파일 수정 + 테스트 1개 신규/1개 갱신
- **`src/app/globals.css` 신설 관행**: `:root { --header-h: 3.5rem }`(sticky nav `h-14`) + `@utility table-scroll { max-height: calc(100dvh - var(--header-h)); overflow: auto }`. 표 래퍼는 `overflow-x-auto table-scroll`로 내부 스크롤포트를 만들어 sticky thead가 붙게 함 — `overflow-x: auto`만 있으면 래퍼가 스크롤포트가 되는데 높이 제한이 없어 sticky가 무효였음. 학생 레이아웃은 헤더가 높아 루트에 `[--header-h:7.625rem]` 재정의
- **z 서열 관행(thead 단위 sticky)**: 본문 인덱스 td `z-10` < thead `z-20`(stacking context) < thead 안 인덱스 th `z-30`(thead 컨텍스트 로컬 — 형제 th보다 위라는 뜻, 바깥 td와 비교되지 않음). 적용 표 7곳: `MonthlyCalendar`(헤더 div), `ParticipationManagement`, `GradeMonthlyAttendance`, `StudentManagement`, `homeroom/participation`, `grade-admin/[grade]/participation`, `student/attendance`. sticky 셀은 불투명 배경 명시, 행 hover는 `tr group` + td `group-hover:bg-gray-50`
- **44px 터치 타겟(§6)**: 버튼 `min-h-11`(화살표류 `+min-w-11`); 체크박스는 시각 크기 유지 + `<label className="… h-11 w-11">` 히트 영역(방과후 label은 `mx-auto mt-2 flex` 블록 — `inline-flex`면 참여 버튼 옆에 놓여 겹침); 참여설정 colgroup 36→52px; 감독일정 슬롯 행 전체가 button(`rowClass` `min-h-11`, `aria-label`); 날짜 팝오버 `w-[min(100vw-1.5rem,344px)]`; 네비 링크/로그아웃 `inline-flex min-h-11 items-center`; 출석 그리드 팝업 닫기 `w-11 h-11`
- **레이아웃**: `min-h-screen`→`min-h-dvh` 7파일(admin/grade-admin/homeroom/student/attendance 레이아웃, login, help), main `px-2 md:px-3 lg:px-4`(모바일 8px = §1 범위)
- **좌석 해제 설계 변경(hover 전용 X 버튼 제거)**: `RoomGrid` props `onRemoveStudent` 제거 → `selectedSeatKey?: string|null`, `onSelectSeat?: (seat: SeatRef|null) => void`(`export type SeatRef = {roomId,row,col}`). 좌석 탭(바깥 droppable div `onClick` — dnd-kit 활성화 5px 전 click은 전달됨, 빈 좌석 탭은 null) → 선택 ring(`ring-2 ring-blue-500 ring-offset-1`) → `SeatingEditor` 루트 마지막 자식 `sticky bottom-2 z-40` 액션바(`배정 해제` autoFocus / `취소` / Escape, xl은 `sm:mr-auto sm:w-96`로 격자 열 정렬). 같은 좌석 재탭·드래그 시작·데이터 재로드·해제 후 선택 초기화. 데스크탑은 좌석→`UnassignedStudents` 패널 드롭(`export const UNASSIGNED_DROP_ID = "unassigned"`, `useDroppable`). 충돌 감지: 패널은 `getBoundingClientRect()` 실시간 판정(xl:sticky 패널은 dnd-kit 캐시 rect와 autoScroll 시 어긋나 해제 대신 교환 발생), 나머지는 패널을 제외한 `closestCenter`. 핸들 Delete/Backspace → 선택. `HelpDemos`의 `onRemoveStudent` 제거
- **`MonthlyCalendar`**: `CalendarTeacherSelect`에 `openUpward` prop — 마지막 2주 행은 드롭다운을 `bottom-full mb-0.5`로 위로 펼쳐 `table-scroll` 래퍼 하단 클리핑 회피(중간 행은 기존과 동일)
- **테스트**: 신규 `tests/responsive-tables.test.ts`(globals/레이아웃/표 7곳/버튼/모달/팝오버를 src 스캔으로 고정, `TABLE_FILES` 목록), `tests/seating-editor-responsive.test.ts`의 해제 버튼 단언 → 새 설계 단언(onSelectSeat/ring/UNASSIGNED_DROP_ID/getBoundingClientRect/closestCenter 패널 제외/Escape)으로 교체 — 총 30개
- **검수 결과**: 테스트 30/30, eslint 오류 0(경고 7 `no-img-element`), tsc 0, `next build` 성공. 커밋 전 상태(사용자 확인 대기, `main` = 프로덕션)
- **남긴 후속 과제**: 좌석 격자 `gap-1`(4px, §6 8px 미달 — 미래홀 도면 기하 회귀 위험으로 보류, 드래그가 주 인터랙션), 범위 밖 동일 패턴 표(`homeroom/attendance`, `homeroom/page`, `homeroom/absence-requests`, `admin/users`, `student/batch-absence`, `admin/statistics`), `MonthlyCalendar` 콤보박스 input 높이, `AttendanceDatePicker` 셀 간격 2px

### 2026-09-08: 오후 좌석 편집기 미배정 목록 참여 필터 회귀 수정
- **증상**: `/grade-admin/[grade]/seats`·`/admin/seats`의 "오후 자율학습" 탭 미배정 목록에 전체 학생이 표시. 원인은 `SeatingEditor`의 참여 필터가 좌석 세션 값(`"afternoon"`)을 `ParticipationDay.sessionType`(afternoon1/afternoon2/night)과 직접 비교 — 2026-08-26 오후 분리 이후 항상 불일치해 "기본 참여"로 떨어짐(야간은 양쪽 enum에 `"night"`가 있어 우연히 정상)
- **신규 lib**: `src/lib/seats/seat-participation.ts` — `participatesInSeatSession(participationDays, seat)`: `sessionTypesOfSeat(seat)`의 블록 중 하나라도 참여(레코드 없으면 기본 참여)면 true. 오후 좌석 = 오후1·오후2 중 하나라도 참여하면 자리 필요
- **수정**: `SeatingEditor.tsx`의 `allStudents` 필터가 이 헬퍼를 사용
- **테스트**: `tests/seat-participation.test.ts` — 순수 규칙 7건 + 배선 가드(SeatingEditor가 `p.sessionType === sessionType` 직접 비교로 회귀하지 않는지 src 스캔)

### 2026-09-08: lint/tsc 정리 + 좌석 편집기 반응형 보강
- **eslint 오류 5건 제거(동작 보존)**: `set-state-in-effect` 4곳 — `homeroom/schedule/page.tsx`(TeacherSearchSelect 하이라이트 리셋), `MonthlyCalendar.tsx`(CalendarTeacherSelect), `AttendanceDatePicker.tsx`(value→view 동기화)는 "이전 값 저장 후 렌더 중 상태 조정" 패턴으로 교체, `StudentManagement.tsx`는 `StudentModal`의 `isOpen` prop+useEffect 리셋을 제거하고 `{modalOpen && <StudentModal/>}`로 열려 있을 때만 마운트. `react-hooks/immutability` 1곳 — `GradeMonthlyAttendance.tsx`의 렌더 중 재할당 `prevClassNumber`를 `students[index-1]` 비교로 대체
- **eslint 경고 38건 제거**: `no-unused-vars` 32건(API 라우트 15개 파일의 미사용 `req`/`user` 인자, `prisma/seed.ts` `adminTeacher`, `attendance/[grade]/page.tsx` `totalSeats`, `attendance/page.tsx` `setAssignedGrade`, `student/attendance/page.tsx` `getMonday`, `MiraeHallLayout.tsx` `ROOM_AREAS`·`classNumbers`, map 콜백 `i` 3곳), `exhaustive-deps` 6건(`students`/`teachers`/`allStudents`의 `?? []`를 useMemo로 — ParticipationManagement, grade-admin/homeroom participation 페이지, homeroom schedule, StudentManagement). 남은 경고는 `@next/next/no-img-element` 7건뿐(의도적 유지)
- **tsc 오류 5건 제거(테스트 파일만)**: `tests/help-mdx.test.ts` 정규식 `s` 플래그 → `[\s\S]`(target ES2017), `tests/supervisor-bulk-absence-approval.test.ts` 가짜 prisma `supervisorAssignment` 행에 `id` 추가(`ApprovalPrisma` 타입 일치)
- **좌석 편집기 반응형(responsive-ui 규칙)**: `SeatingEditor` 저장 버튼 `min-h-11 whitespace-nowrap`, 드래그 칩·제목 `whitespace-nowrap`, 오후 그룹 래퍼 `overflow-x-auto`, 격자 컬럼 `min-w-0`; `RoomGrid`에 `preserveSeatWidth` prop 신설(`minmax(52px,1fr)`, `MIN_SEAT_WIDTH=52` — 오후 분기에서만 켜서 모바일에서 셀이 39px로 찌그러지는 대신 래퍼가 가로 스크롤, 미래홀/야간 기본 분기는 영향 없음); `UnassignedStudents` `max-h-[60vh]` → `60dvh`
- **테스트**: `tests/seating-editor-responsive.test.ts` 신규(저장 버튼/드래그 칩/제목 nowrap, 오후 래퍼 overflow-x-auto, 60dvh를 src 스캔으로 고정) — 총 29개
- **검수 환경**: Google Drive 트리에서는 tsc/eslint/build가 I/O로 정지 → `~/dev/selfstudy` 로컬 클론(`git clone`+`npm ci`+`npx prisma generate`)에서 검수. 결과: eslint 오류 0/경고 7(img), tsc 0, 테스트 29/29, `next build` 성공

### 2026-08-26: 오후자습 2블록 분리(오후1·오후2) + 주간 팝업 불참승인 표시
- **설계 스펙**: `docs/superpowers/specs/2026-08-26-afternoon-session-split-design.md`
- **Enum 분리**: `SeatSessionType { afternoon night }`(`StudySession.type` 전용, 오후1·오후2 좌석 공유) + `SessionType { afternoon1 afternoon2 night }`(Attendance/AbsenceRequest/ParticipationDay/AttendanceNote/SupervisorAssignment). 마이그레이션 `prisma/migrations/20260826000000_split_afternoon_session/migration.sql`(수기 작성, 단일 트랜잭션) — 5개 테이블 `afternoon`→`afternoon1` 전환 후 `afternoon2`로 복제(참여설정/출석/사유/불참신청/비고/감독배정), `duration_minutes`는 반분해 합 보존
- **신규 lib**: `src/lib/sessions.ts`(SESSION_TYPES/SESSION_META/SEAT_SESSION_META/REPRESENTATIVE_SESSION_TYPE/isSessionType/isSeatSessionType/seatSessionOf/sessionTypesOfSeat/attendanceMinutes/emptySessionRecord — 진실 공급원), `src/lib/absence-reasons.ts`(REASON_TYPES/REASON_LABELS/reasonLabel), `src/lib/attendance/weekly-summary.ts`(buildWeeklyRows/summarizeWeeklyCell/weekDatesOf), `src/lib/attendance/copy-session.ts`(planSessionCopy)
- **신규 API**: `POST /api/attendance/copy-session` `{grade,date,from,to}` → `{copied,skipped}` — 오후1 결과를 오후2 미체크 학생에게 복사
- **API 응답 형태 변경**: weekly → `weekly[].sessions: Record<SessionType,…>`(+`isApprovedAbsence`/`approvedReason`); notes GET → `Record<date, Partial<Record<SessionType,string>>>`; today-attendance ×2 → `sessions: Record<SessionType,SessionStats>`; monthly-attendance ×2 + admin statistics → `dates[date]: Partial<Record<SessionType,{status,reason?}>>`; participation-days GET ×2 → `students[].sessions: Record<SessionType,DaySettings>`; student absence-requests POST → `sessionTypes: SessionType[]` → `{created,skipped}`; student batch-absence GET → `participating: Record<SessionType,boolean>`; supervisor-assignments POST → 3행 upsert, `assignment`=대표행(afternoon1); homeroom schedule/summary·감독 Excel ×2 → `REPRESENTATIVE_SESSION_TYPE` 필터
- **화면**: 출석체크 `/attendance/[grade]` 탭 3개(오후/야간/불참신청) → 4개(오후1/오후2/야간/불참신청), 오후2 탭 "오후1 결과 복사" 버튼, "i" 주간 팝업이 오후1·오후2 두 행 + 불참승인 노란색·한글 사유; 참여설정 표 18열(세션 3×참가+5요일); 월간출결·통계·Excel 날짜당 3셀; 오늘출결 카드 3개; 학생 불참신청 다중 선택 + "오후 전체"; 도우미 일괄신청 학생당 3버튼; 담임 사유등록 3옵션
- **시간 계산**: `attendanceMinutes(a)`(afternoon1/afternoon2=50분, night=100분, durationMinutes 우선), `src/lib/academic-year.ts` raw SQL을 `COALESCE(duration_minutes, CASE session_type WHEN 'night' THEN 100 ELSE 50 END)`로 변경 — 학년도 누계·랭킹 값은 오후1+오후2=기존 오후 100분과 동일해 불변
- **시드**: `prisma/seed.ts` 학생당 `ParticipationDay` 3행, 감독배정 3행
- **테스트 신규 12개**: `sessions`, `session-split-migration`, `attendance-api-wiring`, `weekly-summary`, `copy-session-logic`, `attendance-page-wiring`, `absence-request-wiring`, `participation-wiring`, `monthly-attendance-wiring`, `today-dashboard-wiring`, `session-literal-guard`(+기존 `supervisor-bulk-absence-approval`/`seat-print-groups`/`reminder-logic` 픽스처 갱신). `session-literal-guard`는 src 전체에서 `"afternoon"` 리터럴을 좌석 컨텍스트 허용 목록 밖에서 금지
- **비목표**: 오후/야간 감독교사 분리 배정, 오후1·오후2 시작/종료 시각 UI, `durationMinutes` 편집 UI, 좌석배치·인쇄 로직 자체 변경(타입 이름 교체만)
- **배포 주의**: Railway 대시보드 빌드 명령에 `prisma db push`가 남아있으면 마이그레이션 적용 전에 enum을 임의로 바꿔 배포가 실패한다 — 반드시 `npm run build`(=`prisma generate && next build`)로 정정 후 배포. 마이그레이션 적용은 start의 `prisma migrate deploy`. API 형태와 소비자가 함께 바뀌므로 부분 배포 불가(단일 배포), 배포 전 Postgres 스냅샷 확보

### 2026-08-13: 좌석배치 인쇄(출력)
- **신규 lib `src/lib/seats/`**: `print-groups.ts`(방 이름 접두사 기반 그룹 분해, kind = divisions-row/divisions-column/hall/stack), `print-layout.ts`(A4 기하 상수, `suggestOrientation` = 폭/높이 ≥ 1 이면 가로, `computeFitScale`)
- **신규 컴포넌트 3개**: `PrintRoomGrid`(dnd 없는 읽기전용 격자 — RoomGrid 는 훅 때문에 DndContext 밖에서 못 씀), `SeatPrintGroup`(제목 + 분단 배치 + 교탁), `PrintPageFitter`(offsetWidth/Height 실측 → `transform: scale` 로 A4 채움)
- **신규 라우트**: `/grade-admin/[grade]/seats/print?session=` — 새 탭 인쇄 미리보기. 그룹별 체크박스 + 가로/세로 토글, 방향은 `localStorage["seatPrintOrientation:{grade}:{session}"]` 에 저장
- **혼합 방향 인쇄**: CSS 명명 페이지(`@page portraitPage/landscapePage` + `page:` 속성). Chrome·Edge 110+ 필요
- **수정**: `SeatingEditor`(출력 버튼 + 인라인 그룹핑 → `buildPrintGroups` 통합), `attendance/[grade]/page.tsx`(오후자습 탭 인라인 그룹핑 → `buildPrintGroups` 통합 — 감독 화면·편집기·인쇄물의 좌석 배열이 갈라지지 않도록 단일 규칙 공유), `MiraeHallLayout`(`fitContent` 프롭으로 minWidth·가로스크롤 해제)
- **회귀 가드**: `tests/seat-print-wiring.test.ts` 가 src 전체를 스캔해 접두사 그룹핑 인라인 복사본 재등장을 차단
- **인쇄 단위**: 오후자습 = 학급별 1페이지, 야간자습 = 도면/나열 전체 1페이지
- DB 스키마·API·환경변수 변경 없음

### 2026-06-25: 감독 푸시 알림 (feat/supervisor-push-notifications)
- **신규 Prisma 모델 2개**: `PushSubscription`(teacherId, endpoint @unique, p256dh, auth, userAgent?, createdAt — onDelete:Cascade), `SupervisorReminderLog`(teacherId, grade, date, sentAt — @@unique([teacherId,grade,date]))로 하루 1회 발송 멱등성. Teacher에 역참조 `pushSubscriptions`, `reminderLogs` 추가. 마이그레이션 `20260625000000_add_push_notifications`
- **신규 lib `src/lib/push/`**: `reminder-logic.ts`(planReminders/reminderKey/buildReminderMessage 순수 함수, (teacher,grade) dedupe), `send.ts`(web-push 래퍼 sendToTeacher + 404/410 만료 구독 정리), `client.ts`(브라우저 구독/해제 + VAPID base64 변환 + iOS standalone 감지)
- **신규 컴포넌트**: `src/components/notifications/NotificationBell.tsx` — 공통 네비 알림 벨, BellState(unsupported/ios-install/default/subscribed/denied) 분기, iOS "홈 화면에 추가" 안내. 교사 레이아웃(`attendance/layout.tsx`, `homeroom/layout.tsx`)과 `AdminNav.tsx`(grade-admin은 경유 상속)에 배치
- **신규 API 3개**: `POST /api/push/subscribe`(endpoint upsert), `POST /api/push/unsubscribe`(deleteMany), `POST /api/cron/supervisor-reminders`(Bearer CRON_SECRET, KST 오늘 감독배정 조회 → dedupe → 로그 멱등 → web-push 발송)
- **신규 스크립트**: `scripts/trigger-supervisor-reminders.mjs` — Railway Cron 서비스가 APP_URL + CRON_SECRET 으로 cron 엔드포인트 호출
- **수정**: `src/app/layout.tsx`(themeColor를 `viewport` export로 분리, Next 16 deprecation), `public/sw.js`(push/notificationclick 핸들러 추가, CACHE_NAME v2), `src/lib/calendar.ts`(`formatDateWithWeekday(date)` → "2026-06-25(목)"), `package.json`(web-push, @types/web-push 추가)
- **신규 환경변수**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`(mailto:), `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `CRON_SECRET`
- **배포**: Railway 별도 Cron 서비스 — 스케줄 `0 22 * * *`(UTC=07:00 KST), Start Command `node scripts/trigger-supervisor-reminders.mjs`, env `APP_URL` + `CRON_SECRET`

### 2026-06-18: 권한별 날짜 선택 출결 체크 (feat/attendance-date-picker)
- **신규 유틸**: `src/lib/calendar.ts` — KST 안전 순수 날짜 함수 모음. `getKstTodayString()`, `formatDateValue(y,m,d)`, `parseDateValue(date)`, `formatDateLabel(date)`(`2026.6.18 (목)` 형식), `shiftMonth(y,m,delta)`, `buildMonthCells(y,m)`. `toISOString()` 미사용으로 KST 새벽 시간대 전날 반환 버그 회피
- **신규 컴포넌트**: `src/components/attendance/AttendanceDatePicker.tsx` — 커스텀 월간 달력 팝오버. props `{ value, today, onChange }`(YYYY-MM-DD). 월 네비게이션 + 요일 헤더 + 날짜 셀 + "오늘로" 버튼, `@/lib/calendar` 의존
- **출석 페이지 수정**: `src/app/attendance/[grade]/page.tsx`
  - `useSession`으로 권한 판별 → `canChangeDate = roles.includes("admin") || subAdminGrades.length > 0`. 전체관리자/학년관리자는 날짜 바 클릭으로 달력 팝오버를 열어 임의 날짜 선택, 일반 교사는 today 고정(텍스트만 표시)
  - `selectedDate` state(기본 today) 도입. 조회 SWR/토글/주간 팝업이 `selectedDate` 사용. 불참신청 일괄승인은 `today` 고정 유지
  - 날짜 변경 시 선택 좌석/활성화/누계/주간 캐시 초기화, `selectedDate !== today`면 "오늘 아님" 배지
  - 팝오버는 날짜 행 `overflow-x-auto` 바깥(sticky 컨테이너 직속 자식)에 렌더해 클리핑 방지
- **백엔드 변경 없음**: `/api/attendance`, `/api/attendance/toggle`, `/api/attendance/weekly`가 이미 임의 `date` 파라미터 처리
- **테스트**: `tests/calendar.test.ts`(날짜 유틸 단위), `tests/attendance-date-picker.test.ts`(컴포넌트/페이지 배선 contract)

### 2026-05-01: `/help` MDX 사용설명서 전환
- **커밋**: `6cca687 Convert help page to MDX manual` (`main` -> `origin/main`)
- **목표**: 공개 `/help` 페이지를 단일 대형 client page에서 `page.tsx` 서버 shell + `content.mdx` 문서 본문 구조로 전환
- **MDX 설정**:
  - 패키지 추가: `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `@types/mdx`
  - `next.config.ts`: `createMDX` 적용, `pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"]`
  - `mdx-components.tsx`: App Router MDX 필수 file convention 추가, 문서용 기본 HTML 스타일 매핑
- **라우트 구조**:
  - `src/app/help/page.tsx`: `"use client"` 제거, 공개 도움말 헤더와 본문 컨테이너만 담당하는 server component
  - `src/app/help/content.mdx`: 설치/로그인, 학생, 감독교사, 담임교사, 학년관리, 관리자, 문제 해결 문서 본문
- **도움말 데모 계층**:
  - `src/components/help/HelpDemos.tsx` 추가
  - 실제 인증/session/router/API 호출 없이 mock data만 사용하는 public demo island
  - 포함 데모: `TodayAttendanceDemo`, `SeatLayoutDemo`, `UnassignedStudentsDemo`, `ExcelUploadDemo`
  - 좌석 데모는 기존 `MiraeHallLayout`, `RoomGrid`, `UnassignedStudents`를 `DndContext` 안에서 mock data로 렌더링
  - Excel 데모는 실제 `ExcelUploadModal` 대신 API 호출 없는 presentational modal mock으로 구성
- **회귀 테스트**:
  - `tests/help-mdx.test.ts` 추가
  - `/help/page.tsx`가 server component인지, MDX를 import/render하는지, `content.mdx`가 데모를 포함하는지 검증
  - `HelpDemos.tsx`에 `/api/`, `useSession`, `useRouter` 문자열이 없는지 검증
- **검증 결과**:
  - `npx.cmd tsx tests/help-mdx.test.ts` 통과
  - `npm.cmd run build` 통과, `/help`는 static route로 생성
  - 로컬 dev 확인에서 `/help`가 로그인 없이 HTTP 200 반환 및 MDX/데모 텍스트 렌더링
  - `npm.cmd run lint`는 기존 unrelated lint error 때문에 실패 상태 유지
- **주의사항**:
  - 검증 중 dev server가 만든 stale `.next/dev/types/routes.d.ts`가 깨져 build typecheck를 막은 적이 있음. dev server 중지 후 `.next/dev/types` 삭제로 해결.
  - 기존 unrelated dirty files(`.claude/settings.local.json`, `.superpowers/`, 오래된 docs, `scripts/`)는 이 커밋에 포함하지 않음.

### 2026-04-30: 감독교사 불참신청 일괄승인
- **신규 API**: `POST /api/attendance/absence-requests/bulk-approve` — `teacherId + date + grade + sessionType` 감독배정 검증 후 pending 불참신청만 일괄승인
- **신규 헬퍼**: `src/lib/absence-request-bulk-approval.ts` — 승인 대상 조회, 트랜잭션 처리, Attendance upsert(absent), AbsenceReason upsert를 담당
- **감독 UI**: `/attendance/[grade]` 불참신청 탭에 `일괄승인` 버튼과 확인 모달 추가
- **확인 모달 테이블**: 학생/날짜/시간/사유/상세 컬럼, `whitespace-nowrap` + `overflow-x-auto`로 모바일에서도 줄바꿈 없이 가로 스크롤
- **테스트**: `tests/supervisor-bulk-absence-approval.test.ts` — 배정된 감독교사만 승인 가능, rejected/approved/다른 날짜·학년·세션은 미변경 검증
- **커밋**: `48cffc0` 스펙, `45ede3a` 계획, `1011833` 구현

### 2026-04-16: 감독배정 Excel 다운로드 기능
- **신규 API 2개**: `/api/admin/supervisors/export`, `/api/grade-admin/[grade]/supervisor-assignments/export`
- **공통 헬퍼**: `src/lib/excel/supervisor-export.ts` (Month 달력 시트 + 누계 시트 빌더)
- **UI**: MonthlyCalendar에 `excelHref` prop 추가 → 월 네비게이션 옆 Excel 버튼
- **Month 시트**: 7열 달력, 단일 셀 + 줄바꿈(wrapText)으로 학년별 교사명 표시
- **누계 시트**: 학년도(3~2월) 중 실제 배정 있는 월만 컬럼, 관리자 버전에는 담당학년 컬럼 추가

### 2026-04-09: 월간 자율학습 참여시간 표시 기능
- **스키마 변경**: Attendance 모델에 `durationMinutes`(Int?), `durationNote`(String?) 필드 추가 — 부분참여 오버라이드 대비
- **API 확장 3개**: grade-admin monthly-attendance(`studyHours`), homeroom monthly-attendance(`studyHours`), student participation-days(`monthlyStudyHours`, `yearlyStudyHours`)
- **프론트엔드 3곳**: GradeMonthlyAttendance 테이블 "시간" 컬럼, 담임 월간출결 "시간" 컬럼 + 학급 평균, 학생 참여일정 참여시간 카드(월간/연간)
- **계산 로직**: present 출석 × COALESCE(durationMinutes, 100분) → 시간 단위 소수점 1자리

### 2026-04-09: 학년별/전학년 오늘출결 대시보드 + 월간출결
- **신규 API 4개**: grade-admin today-attendance, monthly-attendance, export-attendance + admin today-attendance
- **신규 컴포넌트 2개**: `TodayAttendanceDashboard` (오늘출결 대시보드), `GradeMonthlyAttendance` (월간출결 테이블, 짝수반 배경 구분)
- **admin/page.tsx**: 리다이렉트 → 전학년 오늘출결 대시보드로 변경
- **grade-admin 탭 확장**: 4탭 → 6탭 (오늘출결, 학생관리, 참여설정, 좌석배치, 감독배정, 월간출결)
- **AdminNav**: "오늘 출결" 메뉴 추가 (`/admin` exact match)

### 2026-04-08: 감독교사 불참신청 관리 기능
- **신규 API**: `GET /api/attendance/absence-requests?grade&status` — 학년별 불참신청 목록 조회 (모든 교사 허용)
- **API 권한 변경**: `PUT /api/homeroom/absence-requests/[id]` — 인가를 `["homeroom", "admin"]`에서 `["teacher"]`로 변경, 감독교사도 승인/반려 가능
- **출석 API 확장**: `GET /api/attendance` 응답에 학생별 `hasPendingAbsenceRequest` boolean 필드 추가
- **출석 그리드 UI**: `attendance/[grade]/page.tsx`에 3번째 "불참신청" 탭 추가 — 해당 학년 불참신청 목록 조회+승인/반려 UI
- **좌석 인디케이터**: 대기 중인 불참신청이 있는 학생 좌석에 빨간 "*" 표시

### 2026-04-06: 2차 전체 성능 최적화
- **DB 인덱스 6개 추가**: Attendance(`checkedBy`), AbsenceReason(`registeredBy`), AbsenceRequest(`reviewedBy`), SupervisorSwapHistory(`originalTeacherId`, `replacementTeacherId`), TeacherRole(`role`). AttendanceNote 중복 인덱스 제거
- **배치 처리**: 교사/학생 일괄업로드 루프 create → `createMany` 전환 (N→1 DB round trip). 학생 업로드는 `Promise.all` update + `createMany` 분리
- **Over-fetching 제거**: 7개 API에서 `absenceReason` select 추가 (reasonType만 조회). 교사 목록 API `include`→`select` 전환 (passwordHash DB 레벨 제외)
- **커넥션 풀**: PrismaPg 어댑터에 명시적 풀 설정 (max:10, idleTimeout:30s, connectionTimeout:5s)
- **프론트엔드**: 출석 페이지 `refreshInterval` 30초 폴링 제거→`revalidateOnFocus`, `SeatCell` React.memo 컴포넌트 추출 (100+셀 리렌더링 방지), `handlePointerDown` useRef 최적화, SWR `shouldRetryOnError` 4xx 재시도 방지 추가
- **인증 최적화**: 교사 로그인 2단계 분리 (비밀번호 검증용 최소 쿼리 → 성공 시에만 전체 정보 로드)
- **VarChar 제약**: Student.name, Teacher.name, Room.name, StudySession.name/timeStart/timeEnd, AbsenceReason.detail, AbsenceRequest.detail, SupervisorSwapHistory.reason에 길이 제한 추가
- **기타**: export-attendance 학급 그룹핑 `.filter()`→Map 전환 (O(N*C)→O(N))

### 2026-04-06: 방과후참가 토글 + 요일별 비고 입력
- **ParticipationDay 확장**: `afterSchoolMon~afterSchoolFri` 5개 Boolean 필드 추가 (기본 false)
  - 세션별(오후/야간) 독립 설정, 참여+해당요일 켜진 상태에서만 활성화
- **AttendanceNote 신규 모델**: studentId + sessionType + date (unique), note VARCHAR(100), createdBy
  - 출석 기록과 독립적으로 비고 저장 가능
- **참여설정 UI**: 각 요일 셀에 참여 버튼(위) + 방과후 체크박스(아래) 구조
  - 영향 파일: `ParticipationManagement.tsx`, `homeroom/participation/page.tsx`
- **출석 그리드**: 방과후 학생 노란색(`#fef9c3`) 표시 + "방과후" 라벨 (불참승인과 동일 색상)
  - 출석 API에서 `isAfterSchool` 플래그 계산, 출석 토글은 차단하지 않음
- **주간 팝업 비고**: "i" 클릭 시 주간 출석 팝업 아래 요일별 비고 input 행 추가
  - blur 시 자동 저장, 빈 값이면 삭제, 기존 비고는 주황색 테두리 표시
- **API 추가**: `GET/PUT /api/attendance/notes` (주간 비고 조회/upsert/삭제)
- **API 수정**: `weekly` API에 `afternoonNote`/`nightNote` 포함, participation-days API에 afterSchool 필드 포함

### 2026-04-06: KST 날짜 버그 수정 + 비참여 좌석 표시
- **KST 날짜 계산 버그**: `toISOString()`이 UTC 변환하여 KST 새벽 시간대에 전날 날짜 반환 → `getFullYear()/getMonth()/getDate()`로 직접 문자열 생성
  - 영향 파일: `attendance/[grade]/page.tsx`, `student/absence-requests/page.tsx`
  - **교훈**: `toISOString().split("T")[0]`은 UTC 날짜를 반환하므로 KST 날짜가 필요한 곳에서 절대 사용하지 말 것
- **비참여 좌석 회색 표시**: `isParticipating: false`인 학생 좌석을 회색 음영(`#e5e7eb`, opacity-60)으로 표시
- **길게 터치 활성화**: 비참여 좌석 500ms 길게 터치 → 활성화(하늘색) → 탭으로 출석 토글 가능
- **요일별 참여 체크**: 출석 API에서 `ParticipationDay`의 요일 필드(`mon`~`fri`)를 확인하여 해당 요일 비참여 학생 식별
- **출석 토글 403 수정**: `attendance/toggle` API를 `withAuth(["supervisor", "admin"])` → `withAuth(["teacher"])`로 변경, 모든 교사 출석 토글 허용
- **에러 처리**: `handleToggle`에 `res.ok` 체크 추가, API 에러 시 무시

### 2026-04-06: 교사 역할 접근 단순화
- **withAuth "teacher" 의사역할**: api-auth.ts에 "teacher" 역할 추가 — 모든 교사(role 무관) 허용
- **미들웨어**: /attendance/* 접근을 모든 교사에게 개방
- **루트 리다이렉트 단순화**: page.tsx에서 admin→/admin, 나머지 교사→/attendance
- **담임배정 자동 역할**: homeroom-assignments API에서 담임 배정 시 TeacherRole("homeroom") 자동 부여, 해제 시 자동 삭제
- **API 역할 변경**: attendance, weekly, my-today, toggle API → ["teacher"]
- **attendance layout**: 관리자 네비 버튼 추가

### 2026-04-05: 전체 성능 최적화
- **API 알고리즘**: 6개 API `.find()` in loop → Map O(1) 룩업 변환 (export-excel, statistics, monthly-attendance, export-attendance, weekly, participation-days)
- **DB 인덱스**: 4개 복합 인덱스 추가 — Student `[grade, isActive]`, Room `[sessionId, sortOrder]`, SeatLayout `[studentId]`, AbsenceRequest `[status, studentId]`
- **쿼리 병렬화**: attendance API 3개 독립 쿼리 `Promise.all`, absence-requests 2→1 쿼리 통합, teachers/students API `select` 최적화
- **트랜잭션**: bulk-upload bcrypt를 트랜잭션 외부로 분리, Prisma 로깅 설정
- **SWR**: providers.tsx에 글로벌 `SWRConfig` 추가 (`revalidateOnFocus: false`, `dedupingInterval: 5000`)
- **React 렌더링**: RoomGrid/UnassignedStudents/CalendarTeacherSelect `React.memo`, SeatingEditor `useCallback` + 안정적 빈 Map 상수, MiraeHallLayout 스타일 상수화
- **클라이언트 최적화**: StudentManagement SWR 키 고정 + `useMemo` 필터링, ParticipationManagement 낙관적 업데이트
- **동적 임포트**: SeatingEditor, MonthlyCalendar, StudentManagement, ParticipationManagement에 `next/dynamic` 적용

### 2026-04-05: 교사 기능 확장 + 감독배정 통합
- **담임 월간출결**: `/homeroom/attendance` 신규 (월간 테이블 + Excel 다운로드), API 2개 추가 (monthly-attendance, export-attendance)
- **감독배정 통합**: 오후/야간 → 학년당 하루 1명 (양쪽 동시 처리). MonthlyCalendar 학년당 1슬롯, 텍스트 검색 교사 선택
- **감독일정 재작성**: `/homeroom/schedule` 월간 달력 그리드 (전체 학년 표시 + 교체)
- **Teacher.primaryGrade**: 담당학년 필드 추가 (교사 API, 템플릿, 일괄업로드 반영)
- **학생 관리**: bulk-upload 기존 비활성화+새 생성 방식, 학생 전체 초기화 API 추가
- **middleware**: /homeroom 접근 모든 교사 허용
- **UI 개선**: whitespace-nowrap + 가로 스크롤 + 고정열, AdminNav 세션 로딩, attendance layout 이동 버튼
- **빌드 명령**: `prisma generate && prisma db push && next build`

### 2026-04-05: 관리자 UI 통합 (feat/admin-ui-consolidation)
- **학생/교사/서브관리자/담임배정 4페이지** → `/admin/users` 1페이지로 통합 (교사/1~3학년 탭)
- **AdminNav 메뉴** 8개 → 5개 (사용자관리, 좌석배치, 감독배정, 교체이력, 통계)
- **SeatingPeriod 모델 삭제**: 기간 개념 제거, SeatLayout이 Room→StudySession을 통해 grade+sessionType 결정
- **감독배정**: 주간캘린더(SupervisorManagement) → 월간캘린더(MonthlyCalendar)로 교체
- **좌석배치**: SeatingManagement/SeatingPeriodList 삭제, SeatingEditor를 직접 사용 (props: grade+sessionType)
- **Excel 업로드**: BulkUpload → ExcelUploadModal (드래그앤드롭, 교사/학생 공용)
- **교사 API**: template/bulk-upload 엔드포인트 신규 추가

### 2026-04-05: 미들웨어 세션 인식 실패 수정
- **증상**: 로그인 성공 후 모든 보호 경로에서 307 → `/login` 리다이렉트 (앱 사용 불가)
- **원인**: Auth.js v5가 쿠키 접두사를 `next-auth` → `authjs`로 변경. `getToken()`이 기본 cookieName/salt로 쿠키를 찾지 못함
- **수정**: `middleware.ts`에서 `getToken()` 호출 시 HTTPS는 `__Secure-authjs.session-token`, HTTP는 `authjs.session-token`으로 `cookieName`과 `salt`를 명시
- **추가 발견**: Railway 배포 브랜치가 `main`인데 코드가 `master`에 push되고 있었음 → `master:main` force push로 해결
- **교훈**: Auth.js v5 (next-auth@5.x)에서 `getToken()` 사용 시 반드시 `cookieName`과 `salt` 명시 필요. Railway 환경에서는 `AUTH_SECRET`이 아닌 `NEXTAUTH_SECRET`만 설정됨

## 배포 정보

- **Railway 프로젝트**: courageous-motivation
- **서비스**: selfstudy + Postgres + Cron(감독 알림)
- **빌드**: `prisma generate && next build` (⚠ Railway 대시보드의 빌드 명령에 `prisma db push`가 남아 있으면 반드시 제거할 것 — 마이그레이션 적용 전에 enum을 임의로 바꿔 `prisma migrate deploy`가 실패한다. 스키마 변경은 오직 마이그레이션으로만)
- **마이그레이션 실패 시 롤백**: 스냅샷 복원 → `npx prisma migrate resolve --rolled-back <migration>` 으로 `_prisma_migrations` 의 실패 기록 제거 → 이전 커밋 재배포. 이 단계 없이는 이전 커밋도 `migrate deploy` 가 P3009 로 거부됨.
- **시작**: `prisma migrate deploy && next start`
- **배포 브랜치**: `main` (로컬 `master` → `git push origin master:main`)
- **PORT**: 8080
- **환경변수**: DATABASE_URL (reference: ${{Postgres.DATABASE_URL}}), NEXTAUTH_SECRET, NEXTAUTH_URL, AUTH_URL, AUTH_TRUST_HOST, NODE_ENV
- **푸시 알림 환경변수**: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT(mailto:), NEXT_PUBLIC_VAPID_PUBLIC_KEY, CRON_SECRET
- **Cron 서비스** (감독 알림): 스케줄 `0 22 * * *` (UTC=07:00 KST), Start Command `node scripts/trigger-supervisor-reminders.mjs`, env `APP_URL` + `CRON_SECRET`

## 시드 데이터 (테스트 계정)

- **관리자**: admin / admin1234
- **교사**: teacher1-1 ~ teacher3-3 / pass1234
- **학생**: 이름 + 학번 5자리 (예: 김서현 / 10101)

## 실제 교실 구조 (시드 기준)

**오후자습** (자율관: 교실, 16:30-18:20):
- X-4반 교실: 5열×3행 (15석)
- X-5반 교실: 5열×3행 (15석)
- X-6반 교실: 4열×3행 (12석)

**야간자습** (미래홀, 19:20-21:00):
- 미래예술실2: 4열×5행 (20석)
- 미래202: 3열×2행 (6석)
- 미래아띠존: 4열×2행 (8석)
- 미래201: 3열×2행 (6석)
- 미래예술실1: 5열×10행 (50석)
