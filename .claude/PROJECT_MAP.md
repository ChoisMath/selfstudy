# 자율학습 출석부 시스템 - 프로젝트 지도

> 마지막 업데이트: 2026-05-01
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
│   │   └── supervisors/page.tsx # MonthlyCalendar (단일학년 2슬롯 모드)
│   ├── attendance/             # 감독교사
│   │   ├── layout.tsx          # 모든 교사에게 이동 버튼 (담임교사/감독일정/학년관리)
│   │   ├── page.tsx            # 자동 학년 라우팅 / 학년 선택
│   │   └── [grade]/page.tsx    # ★ 핵심: 좌석 출석 그리드 (3탭: 오후자습/야간자습/불참신청) + 불참신청 관리 UI
│   ├── homeroom/               # 담임교사
│   │   ├── layout.tsx          # 담임 5탭 + 공통 2탭 네비게이션 (세션 로딩 처리)
│   │   ├── page.tsx            # 자기반 학생 + 주간출석
│   │   ├── attendance/page.tsx # 담임 월간출결 테이블 + "시간" 컬럼 + Excel 다운로드
│   │   ├── participation/page.tsx
│   │   ├── absence-reasons/page.tsx
│   │   ├── absence-requests/page.tsx
│   │   ├── schedule/page.tsx   # 월간 달력 그리드 (전체 학년 감독배정 + 교체)
│   │   └── password/page.tsx
│   ├── student/                # 학생
│   │   ├── layout.tsx          # 3개 탭
│   │   ├── page.tsx            # 참여일정 + 참여시간 카드 (월간/연간)
│   │   ├── attendance/page.tsx # 주간/월간 출결
│   │   └── absence-requests/page.tsx
│   └── api/                    # API 라우트 (아래 별도 섹션)
│
├── components/
│   ├── admin-shared/
│   │   ├── AdminNav.tsx        # 관리자 네비 (오늘 출결 메뉴 포함, exact match, 서브관리자용 교사 링크)
│   │   ├── ParticipationManagement.tsx  # 참여설정 테이블 (grade prop)
│   │   ├── MonthlyCalendar.tsx  # 월간 감독배정 캘린더 (학년당 1슬롯, 텍스트 검색 교사 선택, 담당학년 우선 그룹)
│   │   └── ExcelUploadModal.tsx # 공용 Excel 업로드 모달 (드래그앤드롭, 교사/학생 공용)
│   ├── grade-admin/
│   │   ├── TodayAttendanceDashboard.tsx  # 오늘출결 대시보드 (grade prop, 세션별 출석현황)
│   │   └── GradeMonthlyAttendance.tsx    # 월간출결 테이블 (grade prop, 짝수반 배경 구분, "시간" 컬럼)
│   ├── seats/
│   │   ├── SeatingEditor.tsx       # DndContext + 저장 (props: grade, sessionType)
│   │   ├── RoomGrid.tsx            # 교실 격자 (droppable/draggable 셀)
│   │   └── UnassignedStudents.tsx  # 미배정 학생 풀 (검색/반별 그룹)
│   └── students/
│       └── StudentManagement.tsx   # 학생 목록 + CRUD 모달 + ExcelUploadModal
│
├── lib/
│   ├── auth.ts         # NextAuth 설정 (Credentials×2 + Google, JWT 콜백)
│   ├── api-auth.ts     # withAuth (+ "teacher" 의사역할: 모든 교사 허용), withGradeAuth, withHomeroomAuth 래퍼
│   └── prisma.ts       # PrismaClient 싱글톤 (PrismaPg 어댑터)
│
├── middleware.ts       # 라우트 보호 (getToken + 명시적 cookieName/salt, /homeroom·/attendance 모든 교사 허용)
├── types/next-auth.d.ts # Session/JWT 타입 확장
└── generated/prisma/   # Prisma 자동 생성 (gitignore)
```

## API 라우트 요약

### 출석 (`/api/attendance/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/attendance?date&session&grade` | 좌석+출석 현황 조회 (학생별 `hasPendingAbsenceRequest` 포함) |
| POST | `/api/attendance/toggle` | 출석 상태 순환 토글 |
| GET | `/api/attendance/weekly?studentId&date` | 주간 출석 + 참여설정 + 비고 |
| GET | `/api/attendance/absence-requests?grade&status` | 학년별 불참신청 목록 조회 (감독교사용) |
| POST | `/api/attendance/absence-requests/bulk-approve` | 감독교사 배정 검증 후 해당 날짜/학년/세션의 pending 불참신청 일괄승인 |
| GET/PUT | `/api/attendance/notes?studentId&date` | 요일별 비고 조회/수정 (upsert/삭제) |

### 담임 (`/api/homeroom/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `students` | 자기반 학생+주간출석 |
| GET/PUT | `participation-days` | 참여설정 조회/수정 (afterSchool 포함) |
| POST | `absence-reasons` | 불참사유 등록 (트랜잭션) |
| GET | `absence-requests` | 반 학생 불참신청 목록 |
| PUT | `absence-requests/[id]` | 승인/반려 (트랜잭션, 모든 교사 허용) |
| GET | `schedule` | 전체 학년 감독배정 (본인 포함) |
| GET | `monthly-attendance` | 담임 월간 출결 데이터 |
| GET | `export-attendance` | 담임 출결 Excel 다운로드 |

### 학년관리 (`/api/grade-admin/[grade]/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET/POST | `students` | 학생 목록/등록 |
| PUT/DELETE | `students/[id]` | 학생 수정/삭제 |
| POST | `students/bulk-upload` | Excel 일괄업로드 (기존 비활성화 + 새 생성) |
| GET/PUT | `participation-days` | 참여설정 (afterSchool 포함) |
| GET/POST | `seat-layouts` | 좌석 배치 조회/저장(트랜잭션, roomId 기반) |
| GET/POST | `supervisor-assignments` | 감독 배정 (POST: 오후+야간 동시 생성) |
| DELETE | `supervisor-assignments/[id]` | 배정 해제 (오후+야간 동시 삭제) |
| GET | `today-attendance` | 학년별 오늘 출결 현황 (세션별 출석/결석/사유결석/방과후 집계) |
| GET | `monthly-attendance?month=YYYY-MM` | 학년 전체 월간 출결 데이터 |
| GET | `export-attendance?month=YYYY-MM` | 학년 전체 월간 출결 Excel 다운로드 |
| GET | `supervisor-assignments/export?month=YYYY-MM` | 학년 감독배정 Excel (Month+누계 시트) |

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
| GET/POST/DELETE | `homeroom-assignments` | 담임배정 (배정 시 TeacherRole "homeroom" 자동 부여/해제) |
| GET | `supervisor-swap-history` | 감독교체이력 |
| GET | `statistics?from&to&grade&class` | 출결통계 |
| GET | `export-excel?from&to&grade` | Excel 다운로드 |
| GET | `students/template` | 업로드 템플릿 |
| POST | `students/reset` | 학생 전체 초기화 |
| GET | `today-attendance` | 전학년 오늘 출결 현황 (1~3학년 세션별 집계) |
| GET | `supervisors/export?month=YYYY-MM` | 전학년 감독배정 Excel (Month+누계 시트) |

### 기타
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/supervisor-assignments/my-today` | 오늘 감독배정 확인 |
| PUT | `/api/supervisor-assignments/[id]` | 감독교체 (오후+야간 동시, 모든 교사 허용) |
| GET | `/api/teachers` | 교사 목록 (primaryGrade 포함) |
| POST | `/api/auth/change-password` | 비밀번호 변경 |

## 데이터 모델 (14개 모델, 6개 enum)

```
Student ──< Attendance (+ durationMinutes?, durationNote?) >── Teacher (checker)
  │              │
  │              └── AbsenceReason >── Teacher (registrar)
  │
  ├──< ParticipationDay (afternoon/night × 월~금 + afterSchool월~금)
  ├──< AttendanceNote >── Teacher (creator)
  ├──< AbsenceRequest >── Teacher (reviewer)
  └──< SeatLayout >── Room >── StudySession
         (unique: roomId + rowIndex + colIndex)

Teacher (+ primaryGrade: nullable int) ──< TeacherRole (admin/supervisor/homeroom)
  ├──< HomeroomAssignment (grade, classNumber)
  ├──< SubAdminAssignment (grade)
  ├──< SupervisorAssignment (date, grade, sessionType)
  ├──< SupervisorSwapHistory (original/replacement)
  └──< AttendanceNote (creator)
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
- 일괄승인(`POST /api/attendance/absence-requests/bulk-approve`)은 감독교사 배정(`teacherId + date + grade + sessionType`)을 서버에서 검증한 뒤 pending만 트랜잭션으로 승인

### 3. 좌석 배치 저장 (`/api/grade-admin/[grade]/seat-layouts`)
- 트랜잭션: 기존 SeatLayout 삭제 → 새로 일괄 생성
- periodId 불필요, roomId 기반으로 직접 조회/저장

### 4. 출석 그리드 — 비참여 좌석 처리 (`/attendance/[grade]`)
- API에서 `ParticipationDay`의 `isParticipating` + 요일 필드(`mon`~`fri`)로 `isParticipating` 결정
- 비참여 좌석: 회색(`#e5e7eb`, opacity-60), 탭 클릭 무시
- 길게 터치(500ms): `activatedStudents` Set에 추가 → 하늘색(활성화) → 탭으로 출석 토글 가능
- 이미 출석 기록이 있는 비참여 학생은 활성 상태로 표시
- ⚠ KST 날짜는 `getFullYear()/getMonth()/getDate()`로 생성 (`toISOString()` 사용 금지)

### 5. 출석 그리드 — 불참신청 탭 (`/attendance/[grade]`)
- 3번째 탭 "불참신청": 감독교사가 해당 학년의 불참신청 목록을 조회/승인/반려
- `/api/attendance/absence-requests?grade&status`로 학년별 신청 조회
- `/api/homeroom/absence-requests/[id]` PUT으로 승인/반려 처리 (모든 교사 허용)
- `일괄승인` 버튼: 오늘 해당 학년 감독으로 배정된 세션의 pending 불참신청만 후보로 표시, 확인 모달에서 학생/날짜/시간/사유/상세 테이블을 가로 스크롤 방식으로 보여준 뒤 승인
- 일괄승인 성공 시 불참신청 목록, pending 배지, 좌석 데이터 SWR을 갱신
- 좌석 그리드의 빨간 "*"로 대기 중인 불참신청 학생 시각적 식별

### 6. 학번 파싱
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
- **"teacher" 의사역할**: `withAuth(["teacher"])`는 모든 교사(역할 무관) 허용
- **리다이렉트**: admin→`/admin`, 기타 교사→`/attendance`, 학생→`/student`
- **담임배정 자동 동기화**: homeroom-assignments POST/DELETE 시 TeacherRole("homeroom") 자동 부여/삭제

## 수정 이력 (주요 변경)

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
