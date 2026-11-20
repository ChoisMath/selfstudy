# 공유 작업일지

최신 항목을 위에 추가한다. 날짜·도구·변경 이유·파일·실제로 실행한 검증·남은 작업을 기록한다. 기존 상세 이력은 `.claude/PROJECT_MAP.md`, `docs/superpowers/`, `.plans/`, Git 및 Claude 세션 원문에 그대로 남아 있다.

## 2026-11-20 — Claude Code(클라우드) — 디자인 수정 5건: 높이 36px, 담임 불참신청 추가 창, 출석부 (i) 가운데 창

- 요청: ① 로고·"출석부" 줄 버튼 상하 여백 축소 ② 학년관리·담임의 탭·드롭다운·Excel·학생추가 버튼 높이 축소 ③ `/homeroom` "불참사유등록" 탭 제거, 불참신청 탭에 + 버튼 → 오버레이 창으로 추가 ④ 출석부 (i) 정보 영역을 화면 내 같은 위치의 오버레이 창으로 ⑤ 학년관리 head 여백 축소. `/grilling`으로 7건 확인 후 구현.
- 사용자 결정: 모든 화면 36px(로고 줄 44px) — 예전 "조밀한 UI에서도 44px 터치 영역 유지" 결정을 대체 / (+) 추가는 승인된 불참신청으로 기록 / 교시 여러 개 선택 / 대기·반려 건은 승인으로 바꾸고 이미 승인된 건은 그대로 / 과거 불참사유등록 기록은 그대로 / (i) 창은 화면 가운데(배경 어둡게) / 병합은 스크린샷 확인 후.
- 높이: `AdminNav`·`homeroom/layout`(`[--header-h:5rem] lg:[--header-h:2.75rem]`, main `py-4`)·`attendance/layout`(헤더 `min-h-11`)·`globals.css`(`--header-h: 2.75rem`)·`GuideHelpButton`·`NotificationBell`·`grade-admin/[grade]/layout`(main `py-2`)·`page.tsx`(탭 `px-4 py-2`)·`participation/page.tsx`, `components/grade-admin/*`·`StudentManagement`·`ParticipationManagement`·`MonthlyCalendar`·`homeroom/*/page.tsx`·`SeatingEditor` 도구 줄에서 `min-h-11`→`min-h-9`, `h-11 w-11`→`h-9 w-9`, 도구 줄 여백 `mb-4/6`→`mb-3`. 학생 레이아웃·출석 페이지 내부·교실 구조 설정 모달·좌석 액션바는 그대로.
- 담임 불참신청: `app/homeroom/absence-reasons/page.tsx`·`app/api/homeroom/absence-reasons/route.ts` 삭제, 탭 목록에서 제거. `POST /api/homeroom/absence-requests` 추가(자기 반 학생 검증, 트랜잭션으로 블록마다 AbsenceRequest upsert(approved) + Attendance absent + AbsenceReason upsert, 응답 `{created, updated, skipped}`). 신규 `components/homeroom/AbsenceRequestAddModal.tsx`(role=dialog, Escape, 바깥 클릭 닫기), `lib/absence-reasons.ts` `isReasonType`. 목록 페이지에 + 버튼·결과 안내(`role=status`).
- 출석부: `renderWeeklyPopup`(lg 인라인 말풍선) 제거, 가운데 모달의 `lg:hidden` 제거 — 좌석 줄이 밀리지 않는다.
- 도움말: `/help/homeroom` 탭 수(여섯 개)·5단계("불참신청 추가")·알아 둘 점 수정. 스틸 `05-absence-reason.webp`와 교사 안내 영상(`demo-video/src/teacher/*`)은 예전 화면 그대로 — 로컬에서 `/guide-page homeroom`으로 갱신 필요.
- 테스트: 44px·탭 구조를 고정하던 8개(`absence-request-wiring`·`attendance-page-wiring`·`guide-components`·`notification-bell`·`guide-grade-admin`·`guide-seats`·`responsive-tables`·`seating-editor-responsive`)를 새 결정에 맞게 수정(결정 날짜를 주석으로 남김).
- 검증: ① 테스트 45개 전부 통과 ② `tsc --noEmit` 통과 ③ ESLint 0 오류·경고 7건(`<img>`, 기존) ④ `npm run build` 통과 ⑤ 로컬 Postgres + `next dev` + Playwright(1280×800, 375×720): nav 45px(테두리 포함), 담임 폰 헤더 81px, 학년관리 학생 표 시작 150px, 담임 탭에 불참사유등록 없음·옛 주소 404, 빈 제출 시 "학생을 선택하세요.", 오후1·오후2 추가 → 목록에 승인 2건(처리자 이름), 같은 건 재추가 → "1건 추가, 이미 승인된 1건은 그대로", (i) 창이 화면 가운데·스크롤 위치 불변·Escape 닫힘, 가로 넘침 0, 스크립트 오류 0.
- 미실행: 운영 반영(PR·main 병합·배포). DB 마이그레이션 없음. `responsive-ui-reviewer` 에이전트는 이 환경에 없어 375px 스크린샷·넘침 측정으로 대신했다. `.claude/memory/` 가 클라우드에 없어 "44px → 36px" 결정을 자동 메모리에 반영하지 못했다 — 로컬에서 `compact-ui-keep-44px-hit-area.md` 를 갱신할 것.

## 2026-11-20 — Claude Code(클라우드) — 2026-10-21 디자인 개편(PR #1) 되돌림, 좌석 배치 공유 기능은 유지

- 경위: PR #2(좌석 배치 공유)를 main 에 병합하자 Railway 가 main 을 배포했는데, main 에는 병합만 되고 배포되지 않았던 PR #1(2026-10-21 로그인 재설계·크림/코랄 셸·사용성 개선)이 들어 있어 운영 디자인이 함께 바뀌었다. 병합 전 운영 배포본은 `db6a5dd`였다(Railway 배포 이력으로 확인). 병합 전에 main 과 운영 배포 커밋의 차이를 확인하지 않은 것이 원인 — 다음부터 main 병합 전 `list-deployments`의 `commitHash`와 `origin/main`을 대조한다.
- 요청: 예전 디자인으로 되돌리고 오후·야간 통합 자리배치 기능은 유지.
- 변경: 브랜치를 `origin/main`(d682ab8)에서 다시 시작해 `git revert -m 1 1409316`. 충돌 5개 해결 — 기록 3개(`.claude/HANDOFF.md`·`WORK_LOG.md`는 이력을 지우지 않도록 현재본 유지, `PROJECT_MAP.md`는 개편 전 본문 + 공유 기능 변경 재적용 + 되돌림 이력), `grade-admin/[grade]/page.tsx`·`seats/page.tsx`(개편 전 본문 + `SeatSessionPanel`). `SeatSessionPanel`은 `chrome.chip` 대신 개편 전 좌석 탭의 파란 버튼 클래스(오후 자율학습 / 야간 자율학습)로 다시 작성.
- 범위: PR #1 전체를 되돌렸다 — 색·로그인만이 아니라 그 PR 의 접근성·44px·`alert()`→인라인 알림·Intl 날짜·Dialog 수정도 함께 빠진다(운영이 원래 쓰던 상태로 복귀). 필요한 항목은 Git 이력에서 골라 다시 적용할 수 있다.
- 검증: ① `git diff db6a5dd`의 `src`·`tests`·`public`·`scripts`·`prisma` 변경 파일 목록이 공유 기능(1409316..d682ab8) 파일 32개와 정확히 일치 ② 테스트 45개 전부 통과(`login-page.test.ts`는 되돌림으로 제거) ③ `tsc --noEmit` 통과 ④ ESLint 0 오류·경고 7건(`<img>`, 개편 전 상태와 동일 파일) ⑤ `npm run build` 통과 ⑥ 로컬 Postgres + `next dev` + Playwright: 예전 로그인 화면·학년관리 탭(파란 밑줄)·좌석 탭 버튼 확인, 체크 → "오후·야간자습" 하나·미래홀 도면·출석 API `seatSession=night`·인쇄 제목·학생 카드 → 해제 시 버튼 2개와 오후 교실 복귀, 스크립트 오류 0.
- 미실행: 운영 반영(PR·main 병합·배포)은 사용자 확인 전이라 하지 않았다. DB 마이그레이션 변경 없음(공유 컬럼은 이미 운영에 적용됨).

## 2026-11-20 — Claude Code(클라우드) — 교실 구조 설정에 "야간자율학습 자리 배치와 동일하게 배치" 체크박스

- 요청: `/grade-admin/2` 좌석 배치의 교실 구조 설정 모달에 체크박스를 두고, 체크하면 오후자습부터 야간자습까지 같은 페이지로 구성. `/grilling`으로 결정 8건을 확인한 뒤 구현. 브랜치 `claude/confident-newton-jfb1qh`.
- 사용자 결정: ① 실시간 공유(오후가 야간 좌석 배치를 참조, 복사 아님) ② 모든 학년 모달에 표시·학년별 설정 ③ 기존 오후 학급 교실·배정은 삭제하지 않고 보관, 해제 시 복귀 ④ 좌석 화면 세션 버튼은 "오후·야간자습" 하나로 합침 ⑤ 출석체크는 오후1·오후2·야간 탭과 교시별 기록 유지, 배치만 동일 ⑥ 야간 좌석 부족·야간 교실 구조 편집은 이번 범위 밖 ⑦ 학생 좌석 확인 카드도 탭 없이 하나 ⑧ 도움말은 글만 수정(스틸·영상은 남은 작업).
- 스키마: `StudySession.sharesNightLayout Boolean @default(false) @map("shares_night_layout")`(오후 세션 행에서만 사용). 마이그레이션 `prisma/migrations/20261120000000_add_shares_night_layout/`(ADD COLUMN 1줄, 기존 데이터 변경 없음).
- 서버: `src/lib/sessions.ts`에 `effectiveSeatSession`·`seatSessionLabel`·`SHARED_SEAT_SESSION_LABEL`, `src/lib/seats/shared-layout.ts`의 `isNightLayoutShared(grade)`. 좌석을 읽는 4개 경로(`seat-layouts` GET, `/api/attendance` GET, `copy-session`, `/api/student/seats`)가 모두 이것으로 좌석 세션을 정한다 — 하나라도 빠지면 보관 중인 오후 좌석이 다시 보인다. 응답에 `sharesNightLayout`(seat-layouts·classrooms·student/seats)과 `seatSession`(attendance) 추가. 신규 `PUT /api/grade-admin/[grade]/seat-sharing`(`withGradeAuth`, 플래그만 갱신). classrooms POST/PUT/DELETE 는 공유 중 409(`SHARED_LAYOUT_LOCK_ERROR`).
- 화면: `ClassroomConfigModal` 상단 체크박스(확인 창 후 즉시 적용, 공유 중 학급 추가·수정·삭제 비활성, 불러오기 전에는 그리지 않음), `SeatingEditor`(`layoutSeat`=응답 세션 타입으로 배치 분기, 공유 중 설정 버튼·안내 배너·`participatesInSharedSeatLayout`), 신규 `SeatSessionPanel`(세션 칩 + 편집기 — 학년관리 좌석 탭과 `/grade-admin/[grade]/seats`의 중복 제거, 편집기와 같은 SWR 키 `seatLayoutsUrl`을 읽어 모달 토글 시 칩이 함께 바뀜. `sessionType`은 공유 중에도 바꾸지 않는다 — 키가 바뀌면 열려 있는 모달이 닫힘), 출석 페이지 `seatSession`을 응답 우선으로, `SeatCheckCard` 공유 중 단일 표시, 인쇄 페이지·`SeatPrintGroup`(prop `sessionType`→`sessionLabel`). `/help/seats/content.mdx` 본문·tip·알아 둘 점 1항목.
- 테스트: 신규 `tests/shared-night-layout.test.ts`(순수 로직 + 스키마·마이그레이션 + 4개 읽기 경로·토글·잠금·화면 배선). 구현 문자열을 고정하던 기존 6개(`attendance-page-wiring`·`classroom-wiring`·`guide-seats`·`seat-print-wiring`·`session-literal-guard`·`student-schedule-wiring`)를 새 구조에 맞게 수정.
- 검증: ① `npx tsx tests/*.test.ts` 46개 전부 통과 ② `npx tsc --noEmit` 통과 ③ `npx eslint` 0 오류·경고 6건(기존 `<img>`) ④ `npm run build` 통과 ⑤ 로컬 Postgres 16: `prisma db push` + 시드 후, 새 컬럼을 DROP 하고 마이그레이션 SQL 을 psql 로 다시 적용해 `boolean not null default false` 확인 ⑥ `next dev` + Playwright(1280px·375px): 관리자로 2학년 체크 → 모달 유지·학급 버튼 비활성·칩 "오후·야간자습"·미래홀 도면·오후만 참가 학생이 미배정 목록에 표시, 공유 중 classrooms POST 409, afternoon 요청에 night 세션 반환, 인쇄 제목 "2학년 오후·야간자습 — 미래홀", 출석 API 오후1·오후2·야간 모두 같은 교실(야간 불참 학생은 야간에서만 불참 표시), 학생(송예진) 좌석 카드 단일 표시, 해제 후 오후 14개 방 복귀·야간 배정 유지, 3학년 on/off, 학년관리자가 아닌 교사 403, 잘못된 본문 400, 가로 넘침 0, 스크립트 오류 0.
- 미실행·주의: 운영 배포·운영 DB 마이그레이션은 하지 않았다. 저장소의 마이그레이션 이력은 빈 DB 에서 처음부터 재생되지 않는다(`20260826000000_split_afternoon_session`이 없는 `attendance_notes` 테이블을 참조 — 기존 문제, 이번에 건드리지 않음). 지정 에이전트 `prisma-migration-guardian`·`responsive-ui-reviewer`·`project-memory-keeper`는 이 환경에 없어 같은 점검(마이그레이션 SQL 직접 적용 확인, 375px 스크린샷·넘침 측정, 인계·일지 직접 작성)을 직접 했다. `.claude/memory/` 링크도 클라우드에는 없어 자동 메모리는 갱신하지 않았다. `project-map-updater`로 `.claude/PROJECT_MAP.md` 갱신.
- 별도 커밋: 세션 시작 전부터 있던 `package-lock.json` 변경(패키지 25곳에 `"dev": true` 표시 추가, 버전 변경 없음)을 사용자 지시로 커밋했다.
- 남은 작업: `.claude/HANDOFF.md` "다음 단계" 참조(운영 확인, `/guide-page seats` 스틸·영상 갱신).

## 2026-10-21 — Claude Code(클라우드) — 2단계: 출석체크·담임·관리자·학생 화면 사용성 개선

- 요청: 로그인 톤 확정 후 "이 톤으로 2단계 진행". `/web-design-guidelines`(Vercel Web Interface Guidelines, 리뷰 시점에 원문 fetch)로 출석체크·담임·관리자·학년관리자 화면을 점검하고 같은 토큰으로 개선. 브랜치 `claude/upbeat-volta-8a7ixx`.
- 점검: 서브에이전트 2개가 `src/app/{attendance,homeroom,admin,grade-admin}` + 관련 컴포넌트를 가이드라인 전 규칙으로 읽어 `file:line` 목록 약 120건 보고. 주요 유형: 44px 미만 터치 대상(py-1/py-1.5 버튼, 화살표, 누계, 승인/반려, 행 select), 아이콘 버튼 `aria-label` 누락, 라벨 없는 input/select/checkbox, 모달의 role/Escape/포커스/overscroll 누락, `alert()`, 수기 날짜 포맷과 `new Date("YYYY-MM-DD")` UTC 파싱, `transition-all`, "...", `<div onClick>`.
- 공용 기반(직접): `src/components/ui/chrome.ts`(셸·탭·칩·버튼·입력·알림·카드 클래스), `src/components/ui/Dialog.tsx`(접근 가능한 모달), `src/lib/format-date.ts`(Intl ko-KR/Asia/Seoul). 출석·담임·관리자·학년관리자·학생 레이아웃과 `AdminNav`·`GuideHelpButton`·`NotificationBell`을 크림·코랄 셸로 통일, AdminNav 는 폰에서 담임처럼 2행 탭(`[--header-h:6.25rem]`), `navLink` 에서 display 제거(`hidden lg:inline-flex` 와 충돌해 폰에 첫 링크가 보이던 문제). `layout.tsx` themeColor·manifest 를 `#fff7ea`로. 로딩 문구 "..."→"…" 일괄(25파일).
- 출석 그리드(직접, `src/app/attendance/[grade]/page.tsx`): SeatCell 을 래퍼 div + 본체 `<button>`(aria-label=이름·학급·상태, min-h-11, touch-manipulation, focus-visible 링, Shift+Enter→`onActivateToggle` 로 길게 누르기 대안) + 형제 정보 버튼(20–26px, aria-label)으로 재구성(중첩 버튼 없음). 상단 바 그라데이션 코랄, 날짜 버튼 aria-expanded/haspopup, 카운터 tabular-nums, 블록 탭 role=tablist/tab, 필터 chip aria-pressed·44px, 일괄승인·승인/반려 44px + aria-label, 불참 목록 날짜 `formatMonthDay`, 주간 팝업 "N월 N주차" `formatWeekOfMonth`, 비고 input aria-label·autoComplete off, 일괄승인·학년 모달 Escape 효과 + aria-labelledby + overscroll-contain, 좌석 로딩("불러오는 중…")·오류("다시 시도") 상태(`seatsError`). `AttendanceDatePicker` role=dialog, 셀 aria-label/aria-pressed/aria-current, 월 제목 Intl, 코랄 선택색. 테스트 핀(`aspect-square min-h-11`, onClick 직후 className, z-[150] 오버레이)은 유지.
- 담임 7화면 + `SupervisorSummaryModal`(서브에이전트): 툴팁 span→버튼, 주/월 화살표 aria-label·44px, Excel 내려받기 상태, 범례 토글 aria-expanded, 참여설정 체크박스/요일 버튼 aria-label·aria-pressed, 불참사유 fieldset/legend + htmlFor, 불참신청 승인/반려 44px·날짜 Intl, 감독일정 교체 모달 dialog 속성·포커스 트랩·Escape(테스트가 패딩 문자열을 고정해 Dialog 컴포넌트 대신 인라인 구현)·검색 콤보박스 ARIA, 비밀번호 name/autoComplete/첫 오류 포커스, 감독 누계 모달을 Dialog 로 재구성. `alert()`→`aria-live` 인라인 알림.
- 관리자·학년관리자 16화면(서브에이전트): 오늘출결 `grid-cols-2 sm:grid-cols-4`·tabular-nums·fetch ok 검사, 사용자관리 탭 tablist·교사 모달 Dialog+`<form>`+autocomplete·행 select aria-label 44px·행 저장 표시/오류 알림, 통계 폼 라벨·빈 상태·Excel 비활성·오류 알림, 교체이력 `table-scroll` 래퍼·오류, 좌석·감독 탭/토글 44px·aria, 참여설정 라벨·aria, 월간출결 화살표 aria·Intl, Excel 업로드 모달 Dialog 재구성(드롭존을 label+sr-only input 으로 키보드 접근).
- 검증: ① `npx eslint`(전체) 0 오류·경고 6건(기존 `<img>`) ② `npx tsc --noEmit` 통과 ③ `tests/*.test.ts` 45개 전부 통과 ④ 로컬 `next dev`(더미 DATABASE_URL) + `next-auth/jwt` `encode` 로 만든 개발용 세션 쿠키(관리자+담임+감독 역할 / 감독만)로 Playwright 스크린샷 13화면 × 375·1280px: HTTP 200, 가로 넘침 0, 44px 미만 실제 대상 0(라디오 sr-only input 1px 만 검출), 페이지 스크립트 오류 0. DB 가 없어 데이터 표시 상태는 미확인(오류·빈 상태 화면으로 셸 확인) ⑤ 프로덕션 빌드: 아래 줄.
- 빌드: 전체 변경 후 `npx next build`(더미 DATABASE_URL·AUTH_SECRET) 종료 코드 0 — 컴파일·정적 페이지 생성 완료, 기존 middleware→proxy deprecation 경고만. 배포 미실행.
- 기록: `project-map-updater`·`responsive-ui-reviewer` 에이전트 대신 직접 지도 갱신·Playwright 점검. 서브에이전트가 `git stash`/`pop` 으로 원인 확인 1회(작업 트리 복원 확인). `pkill -f` 자기 종료 문제는 스크립트 파일 + `$PPID` 제외로 회피.
- 남은 작업: URL 상태 동기화, 탭 화살표 키, 교사 행 select 되돌리기, 실제 데이터 환경 시각 확인, 학생 화면 본문 점검. 배포는 사용자 승인 후.

## 2026-10-21 — Claude Code(클라우드) — 로그인 페이지를 밝고 따뜻한 톤으로 조정

- 요청: 첫 navy 시안에 대해 "조금 더 밝고 따뜻하게, 학생들이 귀엽다고 느끼고 자습에 참여하고 싶게". 브랜치 `claude/upbeat-volta-8a7ixx`.
- 변경: `globals.css` 토큰을 navy 계열에서 크림 `#fff7ea`·피치·버터 배경, 코랄 `#c2410c` 기본(흰 글자 대비 5.2), 코코아 `#43302b` 본문(대비 11.6), 민트·하늘·피부·볼터치·나무 색으로 교체(`navy*` 토큰 제거, `primary*`·`peach`·`butter`·`sunny`·`mint`·`sky`·`skin`·`blush`·`wood*`·`cocoa`·`check` 추가). `LoginScene.tsx`: 둥근 얼굴 컴포넌트(머리·눈·볼터치·미소, 교사는 머리 묶음), 민트 후드·하늘색 가디건, 나무 책상, 코랄 스탠드(왼쪽으로 이동), 머그컵 + 김 3가닥, 햇살·반짝임 배경, 연필을 노랑·분홍으로. 생성기에 `steam`·`blink`·`blinkLate` 키프레임 추가 후 재생성. `page.tsx`: 피치→버터→크림 그라데이션 패널, 흰 반투명 장면 카드, 코랄 CTA·탭, 둥근 2xl/3xl 모서리, 문구("오늘도 차분하게, 함께 자습해요.", "반가워요!", "책상 앞에선 집중 모드 / 출석은 톡, 한 번이면 끝"). `tests/login-page.test.ts` 토큰 단언을 `--color-primary`로 갱신.
- 검증: ESLint·`tsc --noEmit`·`tests/login-page.test.ts` 통과. 로컬 dev + Playwright: 375·1024·1440px, 가로 넘침 없음, 44px 미만 대상 없음, 콘솔 오류 없음, 애니메이션 43개 running / 일시정지 paused / 감속 모션 0개, 새 서버 첫 로드에서 hydration 경고 없음. 프로덕션 빌드는 이번 조정 후 다시 돌리지 않음(직전 빌드 통과, 변경은 CSS 토큰·SVG·클래스).
- 남은 작업: 사용자 확인 후 2단계(출석체크·교사·관리자 `/web-design-guidelines` 검토·개선). 배포 미실행.

## 2026-10-21 — Claude Code(클라우드) — 로그인 페이지 재설계 + 학습·출석 모션그래픽

- 요청: 로그인·출석체크·교사·관리자 전체 사용성 개선의 1단계. `ui-ux-pro-max`로 로그인 페이지를 학습 분위기의 전문적인 디자인으로 바꾸고, 학생이 학습하고 교사가 출석체크하는 모션그래픽 삽입. 포산고 로고·로그인 기능 유지. 브랜치 `claude/upbeat-volta-8a7ixx`.
- 디자인 근거: `search.py --design-system` 1차 결과(Claymorphism·Baloo 2)는 아동용이라 기각, 재질의로 Minimalism & Swiss(기본 `#1E3A5F` navy, 보조 `#2563EB`, 배경 `#F8FAFC`, 강조 `#059669`)를 채택. 장면의 좌석 색은 출석 그리드의 `#dbeafe`(미체크)·`#bbf7d0`(출석)을 그대로 사용. UX 검색 근거: 접근 가능한 인증(autocomplete·붙여넣기 허용), 비밀번호 표시 토글, 감속 모션, 움직이는 콘텐츠의 일시정지 제어.
- 변경 파일: `src/app/login/page.tsx`(재작성: lg 2열, tablist 탭 + 화살표 키, 마지막 탭 localStorage, 단일 submit 핸들러, autocomplete, 비밀번호 토글, `role="alert"` + 첫 입력칸 포커스, 44px 이상 터치 영역, `useSyncExternalStore`로 날짜·저장 탭), `src/app/login/LoginScene.tsx`(신규 SVG 장면), `src/app/login/login-scene.module.css`(신규·자동 생성), `scripts/login-scene-css.mjs`(신규 생성기: 좌석 12칸 순차 탭·물결·체크·진행 막대, 노트 5줄 필기, 2관절 팔 역기구학, 시계·스탠드, 12초 루프), `src/app/globals.css`(`@theme static` 토큰 12개), `tests/login-page.test.ts`(신규), `.claude/PROJECT_MAP.md`·`.claude/HANDOFF.md`.
- 유지한 것: `actions.ts`와 formData 키(`loginId`·`password`·`name`·`studentCode`), 성공 시 `window.location.href = "/"`, `/posan.svg` 로고(`next/image`, svg 라 자동 unoptimized), `/help` 링크.
- 검증: ① `npx eslint src/app/login/ tests/login-page.test.ts scripts/login-scene-css.mjs` 통과(처음 `react-hooks/set-state-in-effect` 오류 → `useSyncExternalStore`로 수정) ② `npx tsc --noEmit` 통과(테스트의 정규식 `s` 플래그가 target ES2017 에서 오류 → 제거) ③ `tsx tests/login-page.test.ts` 통과 ④ 로컬 `next dev`(더미 DATABASE_URL) + Playwright(`/opt/node-tools` playwright-core, `/opt/pw-browsers/chromium`): 375·1024·1440px 스크린샷, 가로 넘침 없음, 44px 미만 대상 없음, 콘솔 오류 없음, 애니메이션 36개 running / 일시정지 시 paused / `reducedMotion: reduce`에서 0개, 학생 탭 로그인 실패 시 `role=alert` 표시 + 이름 칸 포커스 ⑤ 파일 수정 중 HMR 로 서버 번들이 낡아 hydration 경고가 1회 보였으나 서버 재시작 후 재현 없음 ⑥ 프로덕션 빌드 결과는 아래 줄.
- 빌드: `npx next build`(더미 DATABASE_URL·AUTH_SECRET) 종료 코드 0 — Prisma generate·컴파일·정적 페이지 67개 생성, `/login` 정적(○). 기존 middleware→proxy deprecation 경고만 있음. 배포 미실행.
- 기록: `project-map-updater` 에이전트 대신 `.claude/PROJECT_MAP.md`를 직접 갱신(login 트리·scripts·주의사항·수정 이력). `responsive-ui-reviewer` 에이전트는 이 환경에 없어 위 Playwright 점검으로 대체.
- 주의: `pkill -f 'next dev …'` 를 Bash 도구 명령 안에 쓰면 패턴이 래퍼 셸 argv 에 들어가 자기 자신을 죽인다(exit 144) → 스크립트 파일로 분리하고 `$$`·`$PPID` 제외.
- 남은 작업: `/web-design-guidelines`로 출석체크·교사·관리자 화면 사용성 검토·개선(2단계). 배포는 사용자 승인 후.

## 2026-10-21 — Claude Code(클라우드) — 클라우드 세션용 스킬·SessionStart 훅·MCP 설정 추가

- 요청: ChoisMath/MathChois 공개 레포의 설정 핸드아웃대로 디자인 스킬 3종·MCP 런처·`.mcp.json`을 가져오고, `.claude/settings.json`·`.claude/hooks/session-start.sh`는 이 레포 스택에 맞게 새로 작성. 브랜치 `claude/peaceful-galileo-lxzu81`.
- 가져온 파일: `.claude/skills/{frontend-design,ui-ux-pro-max,web-design-guidelines}/`, `.claude/mcp/launch.mjs`, `.mcp.json`(기존 파일 없어 그대로 생성). `.gitignore`에 `__pycache__/`·`*.pyc` 추가.
- 새로 작성: `.claude/settings.json`(enabledMcpjsonServers·SessionStart 훅·skill-creator 플러그인), `.claude/hooks/session-start.sh`(원격 세션에서만 `npm install --no-audit --no-fund` → `npx prisma generate`(src/generated/prisma 가 git 제외라 tsc·eslint 에 필요) → `PW_CHROMIUM_EXECUTABLE` export → MCP prefetch). `demo-video/` 의존성은 설치하지 않는다.
- 검증: ① `CLAUDE_CODE_REMOTE=true ./.claude/hooks/session-start.sh` 종료 코드 0(726 패키지, Prisma Client 7.6.0 생성, MCP 2종 prefetch), 재실행 멱등, 변수 미설정 시 즉시 종료, stdout 비어 있음 ② `npx eslint src/lib/calendar.ts` 통과 ③ `npx tsx tests/calendar.test.ts` 통과 ④ 세 스킬 frontmatter(name·description) 원본과 동일, 세션 스킬 목록에 인식됨 ⑤ `search.py --help` 및 `--domain style` 검색 정상.
- 주의: `npm install` 이 `package-lock.json` 의 optional 패키지 `dev` 플래그만 바꾸므로 되돌리고 커밋에서 제외. `project-map-updater` 에이전트 대신 `.claude/PROJECT_MAP.md` 트리 블록을 직접 갱신. 앱 코드·배포 변경 없음.
- 남은 작업: 기본 브랜치에 머지되면 이후 모든 새 클라우드 세션에 훅·스킬·MCP 설정이 적용된다. PR 은 사용자 요청 전까지 만들지 않는다.

## 2026-09-19 — Codex — 승인된 세션 변경 푸시·배포 완료

- 승인: 사용자가 이번 세션 전체 변경의 푸시·배포를 승인함. 아래 기록 연결·영상 후처리·YouTube 링크 교체 변경을 함께 커밋·푸시함.
- 사전 검증: 루트 앱 `npm run build` 통과(Prisma generate·Next.js 16 컴파일·TypeScript·정적 페이지 67개). 기존 middleware deprecation 경고만 확인. `git diff --check` 통과.
- 원격 확인: fetch 후 로컬 `HEAD`와 `origin/main`이 `c47c076`으로 일치함을 확인. 이는 새 커밋·푸시 전 상태임.
- 푸시: 변경 커밋 `468fe25c4a522b628e66c0a5e9226a5bb72c6ea1`을 `origin/main`에 푸시 성공.
- 배포: Railway `production`의 `selfstudy` 배포 `26ee3631-3384-4b0c-acd6-45ec6fd5349a`가 `SUCCESS`이며 `commitHash`가 위 변경 커밋과 일치함을 확인.
- 운영 확인: `https://self.posan.kr/help/{student,attendance,homeroom,grade-admin,seats}` 5곳 모두 TLS 검증을 적용한 curl 요청에서 리다이렉트 없이 HTTP 200. 실제 응답 iframe이 순서대로 `554VD2s8G1E`, `a2BRtp_1Yqo`, `a2BRtp_1Yqo?start=313`, `VOlUOgOuNwE`, `VOlUOgOuNwE?start=206`과 일치. YouTube 동영상 자체 재생 검증은 미실행.
- 남은 작업: 승인된 앱 푸시·배포·운영 반영 확인 완료. 추가 요청 작업 없음.

## 2026-09-19 — Codex — 사용 가이드 YouTube 연결 교체 완료

- 요청: 학생 `554VD2s8G1E`, 교사 `a2BRtp_1Yqo`, 학년관리자 `VOlUOgOuNwE` 영상으로 가이드 연결 교체.
- 변경: `src/components/guide/videos.ts`의 영상 ID 3개와 `src/app/help/homeroom/content.mdx`의 시작 시각 313초, `src/app/help/seats/content.mdx`의 시작 시각 206초 반영. 수정본 영상의 장면 시작 시각에 맞춤.
- 검증: 기존 `guide-components`·`attendance`·`homeroom`·`student`·`grade-admin`·`seats` 테스트 6개를 `./node_modules/.bin/tsx`로 실행해 모두 통과. `videos.ts` 대상 ESLint와 앱 변경 3개 파일의 `git diff --check` 통과. `src` 검색으로 예전 영상 ID 3개 잔존 0개와 사용자 지정 새 ID 3개 반영 확인.
- 검증 한계: 네트워크를 통한 YouTube 재생·배포 검증은 수행하지 않음.
- 범위: 로컬 앱의 연결 설정 변경. YouTube 업로드·앱 빌드·배포는 수행하지 않음. 앞선 음원·MP4 작업 당시 YouTube를 변경하지 않았다는 아래 이력은 그대로 유효함.
- 남은 작업: 요청된 로컬 연결 설정 변경과 검증 완료. 추가 요청 작업 없음.

## 2026-09-19 — Codex — 안내 영상 문장 끝 페이드·여백 수정 완료

- 요청: `demo-video/out/{teacher,student,grade-admin}-guide.mp4`에서 문장 끝이 갑자기 끊기는 느낌 수정.
- 구현·재처리 완료: 교사 82개·학생 44개·학년관리자 65개, 총 191문장의 마지막 0.5초에 `qsin` 페이드아웃을 적용하고 1초 후행 무음을 추가. 기존 문장 간격 0.2초를 유지해 약 1.2초 쉼. 기존 raw WAV를 재사용해 원고·화면 내용·목소리 유지.
- 변경 파일: `demo-video/scripts/narrate.mjs`에 `--reprocess` 경로 추가, 후처리 설정과 `fadeOut`·`processingVersion` 캐시 반영. 문장 `.lines/`·장면 MP3와 3편의 길이 JSON 갱신. `demo-video/README.md`·`.plans/2026-09-19-narration-tail.md`·`.claude/PROJECT_MAP.md`에 절차와 구조 반영.
- 재생성 방지: 전체 raw WAV·manifest·원고 일치 여부를 먼저 확인하는 재처리 전용 경로 사용. TTS·Voicebox·STT를 호출하지 않고 기존 전사·유사도 유지.
- 백업·출력 상태: `demo-video/out/before-audio-tail-20260919-180746/`에 기존 영상과 재처리 대상 산출물 백업. 3개 임시 MP4 렌더가 모두 종료 코드 0으로 완료됐고 검증 후 요청된 원래 파일명으로 교체. 원본 3편의 백업 해시 일치 확인.
- 원본 보존 검증: raw WAV 191개 SHA256, 3편의 `NARRATION`·`SPOKEN`, `review.tsv` 바이트 일치. manifest 191개의 기존 필드도 변경 대상인 `trailing`을 제외하고 보존.
- 음원 수치 검증: 191문장 길이 증가 0.498980~0.500363초, 모든 문장의 마지막 0.9초 PCM RMS·peak 모두 0. 페이드 955구간의 `qsin` 기대 gain과 실측 RMS gain 최대 차이 0.006681. 문장 191개·장면 50개 JSON 길이는 MP3 실측과 반올림 오차 범위에서 일치. 모든 검사 통과, 실패 0. 상세 결과는 `demo-video/out/audio-tail-qa/{README.md,report.json}`.
- 코드 검증: `demo-video`의 `npm test`(JavaScript 19개·Python 7개), `npm run lint`(ESLint·TypeScript), `npm run build`(Remotion bundle) 통과.
- 영상 검증: 3편 모두 `ffmpeg -xerror` 전체 디코딩·프레임 수·길이·스트림 검사 통과. 대표 프레임을 직접 확인하고 첫 20초 오디오의 긴 여백을 점검. 모두 1920×1080·30fps·H.264/AAC. 사람의 청취 검증은 미실행.
- 최종 산출물: `teacher-guide.mp4` 510.165333초·15,304프레임·53,138,511바이트, `student-guide.mp4` 267.669333초·8,029프레임·23,949,146바이트, `grade-admin-guide.mp4` 413.632초·12,408프레임·50,620,229바이트. 길이는 MP4 컨테이너 기준이며 30fps 영상 타임라인과 소폭 차이가 있음. 메타데이터는 `demo-video/out/audio-tail-qa/final-videos.json`, 새 장면 시작 시각은 같은 폴더의 `chapters.md`.
- 변경하지 않은 범위: YouTube 영상·앱 소스·배포. 앱 테스트·앱 빌드·배포는 미실행이며 위 테스트와 빌드는 `demo-video` 범위.
- 남은 작업: 요청된 코드·음원·3개 최종 영상 수정 완료. 추가 요청 작업 없음.

## 2026-09-19 — Codex — Claude Code와 기록 연결

- 요청: 기존 Claude 작업 맥락을 Codex에서 이어 쓰고, 다시 Claude에서도 같은 기록으로 이어가기.
- 변경: 루트 `AGENTS.md`에 공통 읽기·갱신 절차 추가, `CLAUDE.md`의 기존 import 유지, `.codex/`에 공통 원본 링크와 연결 안내 추가, `.claude/HANDOFF.md`·이 작업일지 신설. `.gitignore`에서 외부 메모리·세션·규칙을 가리키는 이 Mac 전용 링크 3개를 제외. `project-map-updater`가 원본 `.claude/PROJECT_MAP.md`에 공유 기록 구조를 반영.
- 메모리: 기존 Claude 자동 메모리 10개를 복사하지 않고 동일 디렉터리로 연결. 세션 원문은 기존 위치를 유지하고 참고 경로만 제공.
- 보존 검증: 기존 자동 메모리 10개와 세션 JSONL 314개, 총 324개 파일의 SHA256이 작업 전후 일치. 기존 `AGENTS.md`의 Next.js 규칙 블록과 `CLAUDE.md` 본문 보존 확인. 앱 소스·Prisma·설정·기존 계획·검토 기록과 Claude 훅은 변경하지 않음.
- 링크 검증: 심볼릭 링크 7개의 존재와 대상 확인. 지도·인계·일지의 원본과 Codex 경로가 같은 inode이며, 두 메모리 경로와 내부 10개 파일도 `samefile` 일치. 외부 로컬 링크 3개는 Git에서 제외되고 공유 문서·상대 링크는 제외되지 않음을 확인.
- Codex 검증: CLI 0.141.0에서 `codex debug prompt-input` 종료 코드 0. 공통 진입 지침·인계·작업일지·메모리 지침·기존 Next.js 규칙의 실제 프롬프트 포함 5개 확인 통과. 최초 `--strict-config` 병용은 `debug` 미지원 오류가 발생해 옵션을 제거한 위 명령으로 정상 검증.
- Claude 검증 범위: 기존 `CLAUDE.md`의 `@AGENTS.md` import와 별도 override 없는 기본 자동 메모리 경로를 정적으로 확인. 새 Claude 대화 실행 검증은 미실행.
- 기타 검증: `git diff --check` 통과. 앱 테스트·빌드·배포는 미실행.
- 남은 작업: 연결 구성·지도 갱신 완료. 새 기능 개발 요청은 아직 없음. 이후 도구 전환 시 최신 공통 지침·인계·작업일지·관련 메모리를 다시 읽고 이어감.
