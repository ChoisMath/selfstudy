# 자율학습 출석부 시스템 - 프로젝트 지도

> 마지막 업데이트: 2026-04-05
> 이 파일은 새 세션에서 코드베이스를 빠르게 파악하기 위한 참조 문서입니다.

## 개요

학교 자율학습(오후/야간) 출석 관리 반응형 웹앱.
- **기술 스택**: Next.js 16 (App Router) + Prisma 7 + NextAuth v5 + Tailwind CSS 4 + SWR + @dnd-kit
- **DB**: PostgreSQL (Railway)
- **배포**: https://selfstudy-production.up.railway.app

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
│   ├── page.tsx                # / → 역할별 리다이렉트
│   ├── providers.tsx           # SessionProvider
│   ├── login/
│   │   ├── page.tsx            # 로그인 UI (교사/학생 탭)
│   │   └── actions.ts          # Server Action (signIn 호출)
│   ├── admin/                  # 메인관리자 전용
│   │   ├── layout.tsx          # AdminNav 포함
│   │   ├── page.tsx            # → /admin/users 리다이렉트
│   │   ├── users/page.tsx      # 통합 사용자관리 (교사/1~3학년 탭, 담당학년 드롭다운, 학생 초기화)
│   │   ├── seats/page.tsx      # 6탭 좌석배치 (1~3학년 × 오자/야자) + SeatingEditor
│   │   ├── supervisors/page.tsx # 감독배정 MonthlyCalendar (전학년 6슬롯 모드)
│   │   ├── statistics/page.tsx # 출결 테이블뷰 + Excel 다운로드
│   │   └── swap-history/page.tsx
│   ├── grade-admin/[grade]/    # 서브관리자 (학년별)
│   │   ├── layout.tsx          # AdminNav 포함
│   │   ├── page.tsx            # 허브 (SeatingEditor + MonthlyCalendar)
│   │   ├── students/page.tsx
│   │   ├── participation/page.tsx
│   │   ├── seats/page.tsx      # 2탭 (오후자습/야간자습) + SeatingEditor
│   │   └── supervisors/page.tsx # MonthlyCalendar (단일학년 2슬롯 모드)
│   ├── attendance/             # 감독교사
│   │   ├── layout.tsx          # 모든 교사에게 이동 버튼 (담임교사/감독일정/학년관리)
│   │   ├── page.tsx            # 자동 학년 라우팅 / 학년 선택
│   │   └── [grade]/page.tsx    # ★ 핵심: 좌석 출석 그리드 (seat-responsive 디자인)
│   ├── homeroom/               # 담임교사
│   │   ├── layout.tsx          # 담임 5탭 + 공통 2탭 네비게이션 (세션 로딩 처리)
│   │   ├── page.tsx            # 자기반 학생 + 주간출석
│   │   ├── attendance/page.tsx # 담임 월간출결 테이블 + Excel 다운로드
│   │   ├── participation/page.tsx
│   │   ├── absence-reasons/page.tsx
│   │   ├── absence-requests/page.tsx
│   │   ├── schedule/page.tsx   # 월간 달력 그리드 (전체 학년 감독배정 + 교체)
│   │   └── password/page.tsx
│   ├── student/                # 학생
│   │   ├── layout.tsx          # 3개 탭
│   │   ├── page.tsx            # 참여일정
│   │   ├── attendance/page.tsx # 주간/월간 출결
│   │   └── absence-requests/page.tsx
│   └── api/                    # API 라우트 (아래 별도 섹션)
│
├── components/
│   ├── admin-shared/
│   │   ├── AdminNav.tsx        # 관리자 네비 (세션 로딩 처리, 서브관리자용 교사 링크)
│   │   ├── ParticipationManagement.tsx  # 참여설정 테이블 (grade prop)
│   │   ├── MonthlyCalendar.tsx  # 월간 감독배정 캘린더 (학년당 1슬롯, 텍스트 검색 교사 선택, 담당학년 우선 그룹)
│   │   └── ExcelUploadModal.tsx # 공용 Excel 업로드 모달 (드래그앤드롭, 교사/학생 공용)
│   ├── seats/
│   │   ├── SeatingEditor.tsx       # DndContext + 저장 (props: grade, sessionType)
│   │   ├── RoomGrid.tsx            # 교실 격자 (droppable/draggable 셀)
│   │   └── UnassignedStudents.tsx  # 미배정 학생 풀 (검색/반별 그룹)
│   └── students/
│       └── StudentManagement.tsx   # 학생 목록 + CRUD 모달 + ExcelUploadModal
│
├── lib/
│   ├── auth.ts         # NextAuth 설정 (Credentials×2 + Google, JWT 콜백)
│   ├── api-auth.ts     # withAuth, withGradeAuth, withHomeroomAuth 래퍼
│   └── prisma.ts       # PrismaClient 싱글톤 (PrismaPg 어댑터)
│
├── middleware.ts       # 라우트 보호 (getToken + 명시적 cookieName/salt, /homeroom 모든 교사 허용)
├── types/next-auth.d.ts # Session/JWT 타입 확장
└── generated/prisma/   # Prisma 자동 생성 (gitignore)
```

## API 라우트 요약

### 출석 (`/api/attendance/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/attendance?date&session&grade` | 좌석+출석 현황 조회 |
| POST | `/api/attendance/toggle` | 출석 상태 순환 토글 |
| GET | `/api/attendance/weekly?studentId&date` | 주간 출석 + 참여설정 |

### 담임 (`/api/homeroom/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `students` | 자기반 학생+주간출석 |
| GET/PUT | `participation-days` | 참여설정 조회/수정 |
| POST | `absence-reasons` | 불참사유 등록 (트랜잭션) |
| GET | `absence-requests` | 반 학생 불참신청 목록 |
| PUT | `absence-requests/[id]` | 승인/반려 (트랜잭션) |
| GET | `schedule` | 전체 학년 감독배정 (본인 포함) |
| GET | `monthly-attendance` | 담임 월간 출결 데이터 |
| GET | `export-attendance` | 담임 출결 Excel 다운로드 |

### 학년관리 (`/api/grade-admin/[grade]/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET/POST | `students` | 학생 목록/등록 |
| PUT/DELETE | `students/[id]` | 학생 수정/삭제 |
| POST | `students/bulk-upload` | Excel 일괄업로드 (기존 비활성화 + 새 생성) |
| GET/PUT | `participation-days` | 참여설정 |
| GET/POST | `seat-layouts` | 좌석 배치 조회/저장(트랜잭션, roomId 기반) |
| GET/POST | `supervisor-assignments` | 감독 배정 (POST: 오후+야간 동시 생성) |
| DELETE | `supervisor-assignments/[id]` | 배정 해제 (오후+야간 동시 삭제) |

### 학생 (`/api/student/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET/POST | `absence-requests` | 불참신청 조회/생성 |
| GET | `attendance?type&date/month` | 주간/월간 출결 |
| GET | `participation-days` | 참여일정 |

### 관리자 (`/api/admin/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET/POST | `teachers` | 교사 목록/등록 (primaryGrade + homeroom/subAdmin) |
| PUT/DELETE | `teachers/[id]` | 교사 수정/삭제 (primaryGrade 업데이트) |
| GET | `teachers/template` | 교사 Excel 템플릿 (담당학년 컬럼 포함) |
| POST | `teachers/bulk-upload` | 교사 Excel 일괄업로드 (담당학년 처리) |
| GET/POST/DELETE | `sub-admins` | 서브관리자 지정 |
| GET/POST/DELETE | `homeroom-assignments` | 담임배정 |
| GET | `supervisor-swap-history` | 감독교체이력 |
| GET | `statistics?from&to&grade&class` | 출결통계 |
| GET | `export-excel?from&to&grade` | Excel 다운로드 |
| GET | `students/template` | 업로드 템플릿 |
| POST | `students/reset` | 학생 전체 초기화 |

### 기타
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/supervisor-assignments/my-today` | 오늘 감독배정 확인 |
| PUT | `/api/supervisor-assignments/[id]` | 감독교체 (오후+야간 동시, 모든 교사 허용) |
| GET | `/api/teachers` | 교사 목록 (primaryGrade 포함) |
| POST | `/api/auth/change-password` | 비밀번호 변경 |

## 데이터 모델 (13개 모델, 6개 enum)

```
Student ──< Attendance >── Teacher (checker)
  │              │
  │              └── AbsenceReason >── Teacher (registrar)
  │
  ├──< ParticipationDay (afternoon/night × 월~금)
  ├──< AbsenceRequest >── Teacher (reviewer)
  └──< SeatLayout >── Room >── StudySession
         (unique: roomId + rowIndex + colIndex)

Teacher (+ primaryGrade: nullable int) ──< TeacherRole (admin/supervisor/homeroom)
  ├──< HomeroomAssignment (grade, classNumber)
  ├──< SubAdminAssignment (grade)
  ├──< SupervisorAssignment (date, grade, sessionType)
  └──< SupervisorSwapHistory (original/replacement)
```

**삭제된 모델**: SeatingPeriod (기간 개념 제거, SeatLayout이 Room을 통해 직접 grade+sessionType 결정)

### 주요 Enum
- `Role`: admin, supervisor, homeroom
- `SessionType`: afternoon, night
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

### 3. 좌석 배치 저장 (`/api/grade-admin/[grade]/seat-layouts`)
- 트랜잭션: 기존 SeatLayout 삭제 → 새로 일괄 생성
- periodId 불필요, roomId 기반으로 직접 조회/저장

### 4. 학번 파싱
- 5자리: A(학년) + BC(반) + DE(번호), 예: 20102 = 2학년 1반 2번

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

## 수정 이력 (주요 변경)

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
- **서비스**: selfstudy + Postgres
- **빌드**: `prisma generate && prisma db push && next build`
- **시작**: `prisma migrate deploy && next start`
- **배포 브랜치**: `main` (로컬 `master` → `git push origin master:main`)
- **PORT**: 8080
- **환경변수**: DATABASE_URL (reference: ${{Postgres.DATABASE_URL}}), NEXTAUTH_SECRET, NEXTAUTH_URL, AUTH_URL, AUTH_TRUST_HOST, NODE_ENV

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
