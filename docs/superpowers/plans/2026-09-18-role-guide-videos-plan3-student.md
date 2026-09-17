# 역할별 안내 영상 — 계획 3: 학생 편 (목업 · 장면 · 영상 · 안내 페이지)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생 안내 영상 `StudentGuide`(11장면, 모두 폰)를 렌더하고, 같은 장면 스틸로 `/help/student` 안내 페이지와 학생 화면의 `?` 버튼을 만든다.

**Architecture:** 계획 2에서 만든 공용 기반(`app-mocks/*`, `PhoneFrame`, `phone-helpers`, 가이드 빌딩 블록)을 그대로 쓴다. 오케스트레이터가 공유 파일(장면 스텁·컴포지션 등록·학생 데이터)을 먼저 선점하고, 학생 화면 목업 3묶음을 병렬로 만든 뒤, 장면 2묶음을 병렬로 채우고, 스틸·페이지·렌더로 마무리한다. 음성은 이미 승인받았다(계획 1 태스크 6).

**Tech Stack:** Remotion 4.0.518, Tailwind 4.2.2 색상(`app-mocks/tw.ts`), Next.js 16 MDX, `node:assert` 계약 테스트.

**Spec:** `docs/superpowers/specs/2026-09-17-role-guide-videos-design.md` 6절(학생 영상), 4절(구조)
**선행:** 계획 2 완료(공용 목업·빌딩 블록·`/help` 레이아웃), `demo-video/src/student/narration.ts`와 음성(`public/narration/student/`, 44문장 238.7초, 사용자 승인)

## Global Constraints

계획 2와 같다. 요약:
- **목업 충실도**: 지정한 실제 앱 파일의 레이아웃·문구·색·크기를 옮긴다. 색은 `src/app-mocks/tw.ts`(앱과 같은 Tailwind 4.2.2 oklch) + 앱 코드에 적힌 hex 그대로. 없는 요소를 지어내지 않는다.
- **모션**: `src/anim.ts`의 `tween`만(선형 보간 금지), 등장 2~3속성·스태거, 퇴장이 등장보다 빠르게, 시점은 `lineAt`. UI 목업 장면에 그레인·비네트·색 보정·배경 메시·Ken Burns 금지(인트로·아웃트로 예외).
- **목업 컴포넌트**: 순수 표시. 상태는 props, 연출은 `pressAt`·`typeFrom`·`openAt` 같은 프레임 번호 prop. 라벨은 `whiteSpace: "nowrap"`. 커서·주석용 좌표 함수(`<name>Point`/`<name>Rect`)를 export.
- **좌표**: 폰 본문 390×752, `PHONE_X`/`PHONE_Y`에 배치, `phoneAbs`/`phoneRectAbs`로 화면 좌표 변환. 캡션 띠(≈y 950–1030)와 STEP 배지(좌상단)를 침범하지 않는다.
- **데이터**: 학생 편 가상 데이터는 `demo-video/src/student/data.ts` 한 곳(교사 편 `app-mocks/data.ts`를 읽어 파생, 그 파일은 수정 금지).
- **확인 루프**: `node scripts/frame-at.mjs student <Id> <line> <ratio>` → `npx remotion still Student-<Id> out/check/<tag>.png --frame=<f>` → **Read 도구로 이미지 확인** → 수정. `demo-video/out/`의 파일을 지우지 않는다.
- **커밋**: 자기 파일만 `git add <paths> && git commit -m "…" -- <paths>`(index.lock이면 재시도), 제목/본문/트레일러 사이 빈 줄, 마지막 줄은 정확히 `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`. `git add -A`/`.`/`commit -a`/stash/reset/push 금지. TTS(`narrate.mjs`) 실행 금지.
- 앱 코드 반응형 규칙(라벨 `whitespace-nowrap`, 문단 `break-keep`, 터치 타겟 `min-h-11`)은 안내 페이지 작업에도 적용.

## 병렬 실행 지도

| 단계 | 태스크 | 담당 | 파일(소유) | 선행 |
|---|---|---|---|---|
| 기반 | 1 | 서브에이전트 1(단독) | `src/student/{data.ts,timing.ts,StudentVideo.tsx,scenes.ts,scenes/*Scene.tsx 스텁 11}`, `src/app-mocks/gallery/student-schedule.tsx`·`student-absence.tsx`·`student-batch.tsx`, `src/Root.tsx` | 계획 2 |
| 목업 | 2 셸·일정·시간·좌석 · 3 신청·목록·기록 · 4 일괄신청 | 병렬 3 | 태스크별 목업 파일 + 자기 갤러리 항목 | 1 |
| 장면 | 5 Intro~Seat · 6 AbsenceApply~Outro | 병렬 2 | 자기 장면 파일 | 2~4 |
| 마무리 | 7 스틸·안내 페이지·`?` 버튼 → 8 렌더·검수 | 순차 | 아래 각 태스크 | 6 |

---

### Task 1: 학생 편 기반 (단독)

**Files:**
- Create: `demo-video/src/student/data.ts`, `timing.ts`, `StudentVideo.tsx`, `scenes.ts`, 스텁 11개 `scenes/<SceneId>Scene.tsx`
- Create: `demo-video/src/app-mocks/gallery/student-schedule.tsx`, `student-absence.tsx`, `student-batch.tsx` (각각 빈 `ENTRIES`; 병렬 목업 태스크가 서로 다른 파일을 갖도록 나눈다)
- Modify: `demo-video/src/Root.tsx`(본편 `StudentGuide` + `Folder name="Student"` + 갤러리 index에 student 묶음), `demo-video/src/app-mocks/gallery/index.ts`

**Interfaces (Produces):**
- `timing.ts`: setup-check/teacher와 같은 형태, `StudentSceneId`
- `STUDENT_SCENES: SceneDef[]`(스펙 6절 순서), `STUDENT_GUIDE_CONFIG: GuideConfig`(`audioDir: "narration/student"`, `stepTotal: 9`), `StudentVideo`
- 스텁: `export const <Id>Scene: React.FC<DemoProps>` — Intro·Outro는 step 없음, 나머지 step/label:

| Scene | step | label | Scene | step | label |
|---|---|---|---|---|---|
| Login | 1 | 로그인 | AbsenceApply | 5 | 불참 신청 |
| Tour | 2 | 화면 구성 | Record | 6 | 출결기록 |
| Schedule | 3 | 참여일정 | AbsenceList | 7 | 불참목록 |
| StudyHours | 4 | 참여시간 | Batch | 8 | 일괄신청 |
| Seat | 4 | 좌석 확인 | | | |

(Seat는 StudyHours와 같은 4단계로 묶지 말고 별도 단계로 둔다 → StudyHours 4, Seat 5, AbsenceApply 6, Record 7, AbsenceList 8, Batch 9, `stepTotal: 9`.)

- `data.ts` (학생 편 가상 세계 — `app-mocks/data.ts`의 `STUDENTS`·`AFTERNOON_CLASSROOMS`·`TODAY` 등을 읽어 파생):
  - `ME_STUDENT` = 1학년 3반 7번 하준서(`studentById(307)`), 학번 표기 `10307`, 헤더 표기 `1-3-07`
  - `PARTICIPATION`: 오후1 = 월~금 전부, 오후2 = 월·화·목·금(수 제외), 야간 = 화·목만. 행 라벨 아래 "주 5일/주 4일/주 2일"
  - `STUDY_HOURS` = `{ month: 12.5, year: 86.7, rank: "12위 (상위 8%)" }`(교사 편 `WEEKLY_INFO`와 같은 학생이 아니므로 값은 이 학생 기준으로 두되, 교사 편과 숫자가 겹쳐도 무방)
  - `MY_SEAT` = 1-3반 교실(분단2, 2행 1열 상당) — `AFTERNOON_CLASSROOMS`의 3반 배치에서 하준서 자리, 야간은 `NIGHT_ROOMS` 중 1학년 방. 오후 카드 제목 "1-3반", "내 자리: N행 M열"
  - `ABSENCE_FORM_EXAMPLE` = `{ weekday: "월", date: "2026-09-21", dateLabel: "9/21(월)", nextWeek: true, sessions: ["afternoon1"], reason: "academy" }`
  - `MY_REQUESTS`(불참목록, 최신순): 9/21(월) 오후1 학원 대기중 · 9/17(목) 오후2 질병 승인 · 9/12(금) 야간 기타("가족 행사") 반려
  - `MY_RECORD`: 이번 주(9/14~9/18) 오후1·오후2·야간 × 월~금 O/X/- 표와 결석 사유 1건("9/15 오후1: 학원"), 이번 달(9월) 달력 점 데이터
  - `BATCH_CLASSMATES`: 1-3반 12명 각각 오늘 오후1·오후2·야간 참여 여부와 기존 신청 여부(2명은 "신청됨")
  - 헬퍼: `weekdayLabels`, `sessionLabels` 등 필요한 최소한

- [ ] **Step 1: `data.ts` 작성** — 위 값. 순수 데이터·순수 함수만, 난수 금지.
- [ ] **Step 2: `timing.ts`·`StudentVideo.tsx`·`scenes.ts`·스텁 11개** — `src/teacher/`의 같은 파일을 형태만 따라 쓴다(내용 복사 아님).
- [ ] **Step 3: `Root.tsx`·`gallery/index.ts` 등록** — 기존 SetupCheck·Teacher 등록은 그대로.
- [ ] **Step 4: 확인** — `cd demo-video && npm run lint`, `npx remotion compositions | grep Student`(`StudentGuide` + 11개), `node scripts/frame-at.mjs student Login 0 0.5`, `npx remotion still Student-Login out/check/s1-stub.png --frame=<f>`를 Read로 확인(배경·STEP 1/9 배지·자막).
- [ ] **Step 5: 커밋** — `-- demo-video/src/student demo-video/src/app-mocks/gallery/student-schedule.tsx demo-video/src/app-mocks/gallery/student-absence.tsx demo-video/src/app-mocks/gallery/student-batch.tsx demo-video/src/app-mocks/gallery/index.ts demo-video/src/Root.tsx`, 메시지 `Add student guide scaffolding and fixture data`

---

### Task 2: 학생 셸·참여일정·참여시간·좌석 목업 (병렬)

**Files:** Create `demo-video/src/student/mocks/{StudentShellMock,ParticipationCardMock,StudyHoursCardMock,SeatCheckCardMock}.tsx`; Modify `gallery/student-schedule.tsx`
**Source:** `src/app/student/layout.tsx`(헤더: 로고·이름·`(1-3-07)`·로그아웃, 탭 줄 참여일정/출결기록/불참목록[+일괄신청], 활성 탭 `bg-gray-50 text-blue-600 border-b-2`), `src/app/student/page.tsx`(제목 "내 참여일정", 카드 순서), `src/components/student/ParticipationScheduleCard.tsx`(3행 격자, 파란 참여 칸 `bg-blue-100 text-blue-700`, 미참여 `bg-gray-100 text-gray-300`, 오늘 열 `border-2`, "오늘" 캡션, "다음주" 9px), 참여시간 카드(`student/page.tsx` 87-112: "자율학습 참여시간", 이번 달 `bg-blue-50`, 학년도 누계 `bg-indigo-50`, 순위 `amber-600`), `src/components/student/SeatCheckCard.tsx` + `src/components/seats/StudentSeatGrid.tsx` + `ClassroomFrameMock`(계획 2)

**Interfaces (Produces):**
```ts
export type StudentTab = "schedule" | "record" | "absences" | "batch";
export const StudentShellMock: React.FC<{ width: number; height: number; tab: StudentTab; showBatchTab?: boolean; showHelp?: boolean; tabPressAt?: { tab: StudentTab; at: number }; scrollY?: number; children: React.ReactNode }>;
export const studentShellPoint: (key: `tab_${StudentTab}` | "logout" | "help" | "name") => Point;
export const STUDENT_BODY: Rect;

export const ParticipationCardMock: React.FC<{ width: number; cellPressAt?: { session: Session; weekday: number; at: number } }>;
export const participationCellRect: (session: Session, weekday: number, width: number) => Rect;

export const StudyHoursCardMock: React.FC<{ width: number }>;
export const studyHoursRect: (key: "month" | "year" | "rank", width: number) => Rect;

export const SeatCheckCardMock: React.FC<{ width: number; tab: "afternoon" | "night"; tabPressAt?: number }>;
export const seatCheckRect: (key: "tabs" | "mySeat" | "title" | "corridor", width: number, tab: "afternoon" | "night") => Rect;
```
갤러리(390×752, 셸 포함): `Student-Schedule`(참여일정 3카드), `Student-Shell-Helper`(일괄신청 탭 있는 상태), `Student-Seat-Night`.

- [ ] 소스 읽기 → 구현 → 갤러리 스틸 확인(Read) → `npm run lint` → 커밋, 메시지 `Add student shell, schedule, hours, and seat mocks`

---

### Task 3: 불참 신청·불참목록·출결기록 목업 (병렬)

**Files:** Create `demo-video/src/student/mocks/{AbsenceFormMock,AbsenceListMock,RecordMock}.tsx`; Modify `gallery/student-absence.tsx`
**Source:** `src/components/student/AbsenceRequestForm.tsx`(제목 "불참 신청하기"·닫기, 날짜 input, 세션 버튼 4개 + [전체] 점선, 도움말 문구, 사유 4열, 상세 사유는 기타일 때만, 버튼 "신청하기"/"신청 중..."), `src/app/student/page.tsx`(성공 배너 "불참 신청이 접수되었습니다." + "불참목록 보기"), `src/app/student/absence-requests/page.tsx`(안내문, 카드, 대기중/승인/반려 배지 색), `src/app/student/attendance/page.tsx`(이번 주/이번 달 토글, 주간 표 O/X/-, 결석 사유 줄, 월간 달력 점·범례)

**Interfaces (Produces):**
```ts
export const AbsenceFormMock: React.FC<{ width: number; date: string; sessions: Session[]; allPressAt?: number; sessionPressAt?: { session: Session; at: number }; reason: AbsenceReasonType; reasonPressAt?: { reason: AbsenceReasonType; at: number }; detail?: { text: string; typeFrom: number }; submitPressAt?: number; busy?: boolean; disabledSessions?: Session[] }>;
export const absenceFormRect: (key: "date" | `session_${Session}` | "all" | `reason_${AbsenceReasonType}` | "detail" | "submit", width: number) => Rect;
export const SuccessBannerMock: React.FC<{ width: number; from: number }>;

export const AbsenceListMock: React.FC<{ width: number; highlight?: { id: number; from: number } }>;
export const absenceListRect: (key: "notice" | `card_${number}` | `badge_${number}`, width: number) => Rect;

export const RecordMock: React.FC<{ width: number; view: "week" | "month"; togglePressAt?: { view: "week" | "month"; at: number }; navPressAt?: { dir: "prev" | "next"; at: number } }>;
export const recordRect: (key: "toggle_week" | "toggle_month" | "table" | "reasons" | "calendar" | "legend" | "nav_prev" | "nav_next", width: number, view: "week" | "month") => Rect;
```
갤러리: `Student-AbsenceForm`(월요일·오후1 선택, 사유 학원), `Student-AbsenceList`, `Student-Record-Week`, `Student-Record-Month`.

- [ ] 소스 읽기 → 구현 → 갤러리 스틸 확인 → `npm run lint` → 커밋, 메시지 `Add student absence form, list, and record mocks`

---

### Task 4: 일괄신청 목업 (병렬)

**Files:** Create `demo-video/src/student/mocks/BatchAbsenceMock.tsx`; Modify `gallery/student-batch.tsx`
**Source:** `src/app/student/batch-absence/page.tsx`(제목 "일괄 불참신청" + 오늘 날짜, 표 헤더 [전체선택]·번호·이름·자습유형·사유, 행 체크박스와 `opacity-50`, 세션 버튼 3개 상태 4종(비활성·신청됨·선택 가능 `sky`·선택됨 `red`), 사유 버튼 3개(학원·방과후·질병)와 상세사유 입력, "일괄신청" 버튼과 alert "N건 신청 완료")

**Interfaces (Produces):**
```ts
export const BatchAbsenceMock: React.FC<{ width: number; height: number; checked: number[]; sessionPicks: Record<number, Session[]>; reason: "academy" | "afterschool" | "illness"; detail?: { text: string; typeFrom: number }; rowPressAt?: { studentNo: number; at: number }; sessionPressAt?: { studentNo: number; session: Session; at: number }; submitPressAt?: number; busy?: boolean; scrollY?: number }>;
export const batchRect: (key: `row_${number}` | `check_${number}` | `session_${number}_${Session}` | `reason_${string}` | "submit" | "header", width: number, scrollY?: number) => Rect;
```
갤러리: `Student-Batch`(2명 체크, 오후1·야간 선택, 사유 학원).

- [ ] 소스 읽기 → 구현 → 갤러리 스틸 확인 → `npm run lint` → 커밋, 메시지 `Add student batch absence mock`

---

### Task 5: 장면 — Intro · Login · Tour · Schedule · StudyHours · Seat (병렬)
### Task 6: 장면 — AbsenceApply · Record · AbsenceList · Batch · Outro (병렬)

두 태스크 공통 절차 — 각자 `demo-video/src/student/scenes/<Id>Scene.tsx` 스텁만 교체한다(`scenes.ts`·`Root.tsx`·목업·`data.ts` 수정 금지; 목업 버그는 고치지 말고 보고서에 적는다).

**Consumes:** `src/student/timing.ts`(`lineAt`·`lineStart`·`lineEnd`), `src/student/data.ts`, 태스크 2~4 목업과 좌표 함수, `src/teacher/scenes/phone-helpers.tsx`(폰 배치·탭 커서·좌석 확대 카드 — 학생 장면에서도 재사용), `src/components/{PhoneFrame,Cursor,Annotation,FlashNotice}.tsx`, `phone.ts`, `LoginMock`(계획 2, 학생 탭)
**참고 구현:** `demo-video/src/teacher/scenes/{LoginScene,SeatColorsScene,AbsenceTabScene}.tsx`

**장면별 화면 동작** — 스펙 6절 표의 "화면 상태" 칸이 기준. 문장 n이 말하는 대상을 그 문장 시간(`lineAt(id, n, 0.1~0.9)`) 안에 커서·누름·주석으로 보여준다. 추가 규칙:

| 장면 | 반드시 보여줄 것 |
|---|---|
| Intro | 제목 "학생 사용 안내", 목차 칩 5개(로그인·참여일정·불참 신청·출결기록·일괄신청) 스태거. 배경 메시 허용 |
| Login | 폰 주소창에 `self.posan.kr` 타이핑(0) → 학생 로그인 탭 누름(1) → 이름 "하준서"·학번 "10307" 타이핑(2) → 학번 도움말 문구 주석(3) → 로그인 누름·참여일정 화면(4) |
| Tour | 헤더의 이름·학번 주석(0) → 탭 3개 순차 주석(1) |
| Schedule | 격자 전체 박스(0) → 행 라벨 3개와 열 월~금 주석(1) → 파란 칸·회색 칸·오늘 테두리 각각 주석(2) → "담임 선생님께" FlashNotice(3) |
| StudyHours | 참여시간 카드로 스크롤(0) → 이번 달·학년도 누계 박스(0~1) → 계산 규칙 주석(1) → 순위 줄 박스(2) |
| Seat | 좌석 카드로 스크롤(0) → 오후자습 탭 상태에서 내 자리 강조 + 3× 확대 카드(1) → 야간자습 탭 누름(1 끝) → "내 자리: N행 M열"·복도·창문·교탁 주석(2) |
| AbsenceApply | 참여일정 격자에서 월요일 오후1 칸 누름(0) → 같은 화면이 신청서로 전환(1) → 날짜·시간 미리 채움 주석(2) → "다음주" 칸 주석(3) → 시간 추가 선택·[전체] 누름(4) → 사유 학원 선택, 기타 선택 시 상세 사유 칸이 나타나는 모습(5) → 신청하기 누름 → 성공 배너(6) → 지난 날짜 비활성·닫기 버튼 주석(7) |
| Record | 출결기록 탭 누름(0) → 주간 표 O·X·- 각각 주석(1) → 결석 사유 줄 박스(2) → "이번 달" 누름 → 달력 점(3) → 이전 주/달 화살표 주석(4) |
| AbsenceList | 불참목록 탭 누름(0) → 카드 3장, 대기중·승인·반려 배지 각각 주석(1) → "취소 불가·담임 선생님께" FlashNotice(2) |
| Batch | 도우미 학생 화면에서 일괄신청 탭이 하나 더 있는 모습(0) → "다시 로그인해야 보입니다" 주석(1) → 같은 반 명단과 오늘 날짜 주석(2) → 학생 2명 체크 → 시간 버튼·사유 선택(3) → 일괄신청 누름 → "2건 신청 완료" 알림(4) → 신청이 친구 이름으로 들어감 주석(5) |
| Outro | "되도록 본인이 직접" 강조 카드(0~1) → 화면의 `?` 버튼과 도움말 주소(2). 배경 메시 허용 |

**절차 (장면마다):** 스펙 6절 해당 행·위 표·원고 문장 번호 확인 → `Stage`(목업 조합, 프레임별 상태) + 커서·주석 작성 → 문장마다 `node scripts/frame-at.mjs student <Id> <n> 0.6` 프레임 스틸을 뽑아 **Read로 확인**하고 수정 → `npm run lint` → 자기 장면 파일만 커밋(`Build student guide scenes: <Id 목록>`).

**도움말 스틸 프레임**(태스크 7에서 쓰므로 완결 상태여야 함): Login 4,0.6 · Schedule 2,0.7 · StudyHours 1,0.7 · Seat 2,0.6 · AbsenceApply 6,0.6 · Record 1,0.7 · AbsenceList 1,0.7 · Batch 4,0.6

---

### Task 7: 스틸 · `/help/student` · `?` 버튼 (순차)

**Files:**
- Create: `demo-video/src/stills/student.ts`; 생성 `public/guide/student/*.webp`
- Create: `src/app/help/student/page.tsx`, `content.mdx`
- Modify: `src/app/student/layout.tsx`(헤더 로그아웃 앞에 `<GuideHelpButton href="/help/student" />`), `src/app/help/content.mdx`(학생 기능 절에 링크 한 줄), `.claude/GUIDE_PAGES.md` 7절(진행 현황에 student 행)
- Test: `tests/guide-student.test.ts`(`tests/guide-attendance.test.ts`와 같은 계약 + WebP 크기·`tall` 검사)

- 스틸 목록(폰 크롭 `PHONE_CROP`, `resize: 640`): `01-login` Login 4,0.6 · `02-schedule` Schedule 2,0.7 · `03-hours` StudyHours 1,0.7 · `04-seat` Seat 2,0.6 · `05-absence-form` AbsenceApply 6,0.6 · `06-record` Record 1,0.7 · `07-absence-list` AbsenceList 1,0.7 · `08-batch` Batch 4,0.6
- 페이지: `GuideArticle` + `GuideVideo videoKey="student"` + `GuideToc`(확인·신청·도우미) + 챕터 3개 — `check`(1 로그인 · 2 참여일정 · 3 참여시간 · 4 좌석 확인), `apply`(5 불참 신청 · 6 출결기록 · 7 불참목록), `helper`(8 일괄신청) + `GuideNotice tone="yellow"`: ["본인 신청", "불참 신청은 되도록 본인이 직접 하고, 어쩔 수 없을 때만 학급 도우미에게 부탁하세요."], ["지난 날짜", "이미 지난 날짜에는 신청할 수 없습니다."], ["취소", "낸 신청은 학생이 취소할 수 없으니 잘못 신청했다면 담임 선생님께 말씀드리세요."]
- 설명은 스펙 6절 내레이션을 2~4문장으로 다듬는다. 이미지 `alt`는 화면 설명 한 줄, 폰 이미지는 `tall: true`(640×1342).

- [ ] Step 1: 스틸 목록 작성 → `node scripts/guide-stills.mjs --page student` → 모든 WebP를 Read로 확인·보정(장당 150KB, 페이지 2MB 이하)
- [ ] Step 2: 실패하는 테스트 작성(`tests/guide-student.test.ts`) → 실패 확인
- [ ] Step 3: 페이지·MDX·`?` 버튼·허브 링크 작성 → 테스트 통과
- [ ] Step 4: `npx tsx tests/guide-student.test.ts && npx tsx tests/guide-components.test.ts && npx tsx tests/help-mdx.test.ts && npx tsx tests/responsive-tables.test.ts && npx tsc --noEmit && npm run lint && npm run build`(`/help/student`가 static인지)
- [ ] Step 5: `npx next dev -p 3105` + Playwright로 로그아웃 상태 375·768·1280px 스크린샷 확인(가로 스크롤 없음, 줄바꿈 없음, 폰 이미지 320px 이하) → 서버 종료
- [ ] Step 6: `.claude/GUIDE_PAGES.md` 7절 갱신 → 커밋 `Add the student guide page with help button`

---

### Task 8: 렌더·검수 (오케스트레이터)

- [ ] Step 1: `cd demo-video && npx remotion render StudentGuide out/student-guide.mp4`, 길이 확인(원고 238.7초 + 11×1초 − 10×0.4초 ≈ 245.7초)
- [ ] Step 2: 장면 경계 프레임을 `ffmpeg -ss`로 뽑아 Read로 확인(음성·자막·화면 일치 표본 3곳)
- [ ] Step 3: 720p 미리보기(`ffmpeg … -vf scale=1280:720 -crf 30`)를 만들어 사용자에게 전달(원본은 30MB 상한을 넘을 수 있음)
- [ ] Step 4: `responsive-ui-reviewer`로 `/help/student`·`src/app/student/layout.tsx` 점검 → 위반은 같은 세션에서 수정·재검수
- [ ] Step 5: `project-map-updater`로 PROJECT_MAP 갱신(계획 4에서 한 번에 할 수도 있음 — 중복 갱신 피하려면 계획 4로 미룬다)
