# 역할별 안내 영상 — 계획 4: 학년관리자 편 (목업 · 장면 · 영상 · 안내 페이지 2개)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학년관리자 안내 영상 `GradeAdminGuide`(18장면, 모두 PC 브라우저)를 렌더하고, 같은 장면 스틸로 `/help/grade-admin`·`/help/seats` 안내 페이지와 학년관리 화면·좌석 편집기의 `?` 버튼을 만든다. 세 편 중 마지막이므로 마무리(기준 문서 7절, PROJECT_MAP, YouTube id 안내)도 여기서 끝낸다.

**Architecture:** 계획 2·3에서 만든 공용 기반을 그대로 쓴다(`app-mocks/*`, `pc-helpers`, 가이드 빌딩 블록, `AdminNav`류 셸은 새로 만든다). 오케스트레이터가 공유 파일을 선점하고, 목업 4묶음을 병렬로, 장면 4묶음을 병렬로 만든 뒤 스틸·페이지 2개·렌더로 마무리한다. 음성은 이미 승인받았다(65문장 370초).

**Tech Stack:** Remotion 4.0.518, Tailwind 4.2.2 색상(`app-mocks/tw.ts`), Next.js 16 MDX, `node:assert` 계약 테스트.

**Spec:** `docs/superpowers/specs/2026-09-17-role-guide-videos-design.md` 7절(학년관리자 영상), 4절(구조)
**선행:** 계획 2 완료, 계획 3 완료, `demo-video/src/grade-admin/narration.ts` + 음성

## Global Constraints

계획 2·3과 같다(목업 충실도, `tween`만·`lineAt` 타이밍, 목업은 순수 표시 컴포넌트, PC 논리 뷰포트 1248×570을 1.25배로, 데이터는 `src/grade-admin/data.ts` 한 곳에서 `app-mocks/data.ts` 파생, 확인 루프는 스틸을 Read로 보기, `demo-video/out/` 삭제 금지, 자기 파일만 커밋, 트레일러 정확히 `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`, TTS 실행 금지).

추가:
- 학년관리 화면은 **탭이 라우트가 아니라 클라이언트 상태**다(URL은 `/grade-admin/1` 고정). 목업·장면 모두 이 동작을 따른다.
- 인쇄 미리보기(`/grade-admin/1/seats/print`)만 **새 탭**이다. 장면에서 새 탭 전환을 브라우저 탭으로 표현한다.

## 병렬 실행 지도

| 단계 | 태스크 | 담당 | 파일(소유) | 선행 |
|---|---|---|---|---|
| 기반 | 1 | 서브에이전트 1(단독) | `src/grade-admin/{data.ts,timing.ts,GradeAdminVideo.tsx,scenes.ts,scenes/*Scene.tsx 스텁 18}`, `src/app-mocks/gallery/{grade-students,grade-participation,grade-seats,grade-supervisor}.tsx`, `gallery/index.ts`, `src/Root.tsx` | 계획 2·3 |
| 목업 | 2 셸·오늘출결 · 3 학생관리·Excel · 4 좌석 편집기·교실 구조·인쇄 · 5 감독 배정 달력·월간출결 | 병렬 4 | 태스크별 목업 + 자기 갤러리 파일 | 1 |
| 장면 | 6 Intro~StudentExcel · 7 Helper~ParticipationBulk · 8 SeatsTour~SeatPrint · 9 SupervisorAssign~Outro | 병렬 4 | 자기 장면 파일 | 2~5 |
| 마무리 | 10 스틸 2페이지 → 11 안내 페이지 2개·`?` 버튼 2곳 → 12 렌더·최종 검수·문서 | 순차 | 아래 각 태스크 | 9 |

---

### Task 1: 학년관리자 편 기반 (단독)

**Files:** Create `demo-video/src/grade-admin/{data.ts,timing.ts,GradeAdminVideo.tsx,scenes.ts}` + 스텁 18개 `scenes/<SceneId>Scene.tsx`; Create 갤러리 4파일; Modify `gallery/index.ts`, `src/Root.tsx`

**Interfaces (Produces):**
- `timing.ts`(teacher/student과 같은 형태), `GRADE_ADMIN_SCENES`, `GRADE_ADMIN_GUIDE_CONFIG`(`audioDir: "narration/grade-admin"`, `stepTotal: 16`), `GradeAdminVideo`
- 스텁 step/label(Intro·Outro 제외, 스펙 7절 순서): Enter 1 학년관리 열기 · Today 2 오늘출결 · StudentsList 3 학생 목록 · StudentAdd 4 학생 추가 · StudentExcel 5 Excel 업로드 · Helper 6 도우미 · Participation 7 참여 설정 · ParticipationBulk 8 일괄 설정 · SeatsTour 9 좌석 화면 · ClassroomConfig 10 교실 구조 · SeatAssign 11 좌석 배정 · SeatEdit 12 교환·해제 · SeatPrint 13 출력 · SupervisorAssign 14 감독 배정 · SupervisorTotals 15 감독 누계 · Monthly 16 월간출결
- `data.ts`(1학년 기준, `app-mocks/data.ts` 파생):
  - `GRADE = 1`, 관리자 본인 = `ME`(박지훈, 1학년 관리자 겸 담임)
  - `TODAY_STATS`: 오후1·오후2·야간별 `{ supervisor, present, absent, excused, afterSchool, total }` — `AFTERNOON1_RESULT`·`ABSENCE_REQUESTS`와 모순 없게 계산
  - `STUDENT_ROWS`: 36명(반·번호·이름·학번·상태·도우미) + 비활성 1명 예시, 도우미는 1-3 7번 하준서(계획 3 학생과 동일 인물)
  - `NEW_STUDENT` = `{ classNumber: 2, number: 13, name: "정다온" }`(추가 예시, 학번 10213 자동)
  - `EXCEL_RESULT` = `{ success: 34, failed: 2, rows: [{ row: 12, reason: "번호 중복" }, { row: 27, reason: "이름 없음" }] }`
  - `PARTICIPATION_ROWS`: 학년 전체(반 필터용) — 계획 2의 담임 반 데이터를 포함하고 나머지 반은 같은 규칙으로 생성
  - `CLASSROOM_CONFIG_EXAMPLE` = `{ classNumber: 7, corridorSide: "right", layoutType: "division", divisions: 3, rowsPerDivision: [3, 3, 3], seatCount: 18 }`
  - `SEAT_EDITOR`: 오후 3학급(1-1·1-2·1-3) 좌석 배치 + 미배정 4명(참가 학생만), 야간 방 2개
  - `PRINT_GROUPS`: 학급 3개(체크 상태·가로/세로)
  - `SUPERVISOR_MONTH`: 계획 2의 `SUPERVISOR_SEPT`를 재사용(같은 달력), 배정 예시 = 9/28 1학년 → 윤서진
  - `MONTHLY_ROWS`: 학년 전체 월간출결(반별 그룹, 날짜당 3칸, 시간 열)

- [ ] Step 1: `data.ts` → Step 2: timing/video/scenes/스텁 18 → Step 3: 갤러리 4파일·index·Root 등록 → Step 4: `npm run lint`, `npx remotion compositions | grep GradeAdmin`, 스텁 스틸 1장 Read 확인 → Step 5: 커밋 `Add grade-admin guide scaffolding and fixture data`

---

### Task 2: 학년관리 셸 · 오늘출결 목업 (병렬)

**Files:** Create `demo-video/src/grade-admin/mocks/{GradeAdminShellMock,TodayDashboardMock}.tsx`; Modify `gallery/grade-students.tsx`
**Source:** `src/components/admin-shared/AdminNav.tsx`(sticky h-14, 로고 "출석부", `{g}학년 데이터관리`, 우측 담임교사/감독일정 칩·벨·이름·로그아웃), `src/app/grade-admin/[grade]/page.tsx`(6탭 밑줄 스타일, 탭 라벨 `오늘출결`·`학생 관리`·`참여 설정`·`좌석 배치`·`감독 배정`·`월간출결`), `src/components/grade-admin/TodayAttendanceDashboard.tsx`(세션 카드 3장, 이모지 제목, 감독 배지, 숫자 타일 4개와 색, "총 자습대상: N명")
**Produces:** `GradeAdminShellMock({ tab, tabPressAt?, showHelp?, scrollY?, children })`, `gradeAdminTabPoint(tab)`, `GRADE_ADMIN_BODY: Rect`, `TodayDashboardMock({ width })`, `todayRect(key)`, `AttendanceTopBarMock({ width, gradePressAt? })` + `attendanceTopBarRect(key)` (키: `logo`·`help`·`gradeAdmin`·`homeroom`·`bell`·`name`·`logout`)
갤러리: `GradeAdmin-Shell-Today`, `GradeAdmin-TopBar`

`AttendanceTopBarMock` 은 `src/app/attendance/layout.tsx` 의 헤더를 PC 폭(1248)으로 그린 것이다. Enter 장면이 초록 "1학년 관리" 칩(`text-green-700 bg-green-50 border-green-200`, `min-h-11`, `px-3`, `text-xs`)을 눌러 학년 데이터관리로 넘어가는 데 필요하다 — 교사 편 목업은 전부 폰 폭이라 재사용할 수 없다. 칩 순서는 앱과 같게: `?` · 1학년 관리 · 담임교사 · 벨 · 박지훈 · 로그아웃.

---

### Task 3: 학생 관리 표 · 추가 모달 · Excel 모달 목업 (병렬)

**Files:** Create `demo-video/src/grade-admin/mocks/{StudentTableMock,StudentModalMock,ExcelUploadMock}.tsx`; Modify `gallery/grade-participation.tsx` (태스크 2가 `grade-students.tsx` 를 쓰므로 이 태스크는 `grade-participation.tsx` 만 건드린다 — 태스크 1이 두 파일을 미리 만든다)
**Source:** `src/components/students/StudentManagement.tsx`(툴바 반 select·Excel·+ 학생 추가, 표 8열, 상태·도우미 배지, 수정/삭제/복원), `src/components/admin-shared/ExcelUploadModal.tsx`(템플릿 다운로드·드롭존·업로드·결과 표)
**Produces:** `StudentTableMock({...})`, `studentTableRect(key)`, `StudentModalMock({...})`, `studentModalRect(key)`, `ExcelUploadMock({...})`, `excelRect(key)`
갤러리: `GradeAdmin-Students`, `GradeAdmin-StudentModal`, `GradeAdmin-Excel`

---

### Task 4: 좌석 편집기 · 교실 구조 모달 · 인쇄 미리보기 목업 (병렬)

**Files:** Create `demo-video/src/grade-admin/mocks/{SeatEditorMock,ClassroomConfigMock,SeatPrintMock}.tsx`; Modify `gallery/grade-seats.tsx`
**Source:** `src/components/seats/SeatingEditor.tsx`(세션 버튼, 헤더 3버튼, 학급 격자 + 미배정 패널, 드래그 칩, 선택 ring, 하단 액션바), `RoomGrid.tsx`, `UnassignedStudents.tsx`, `ClassroomConfigModal.tsx`(목록 표·추가 폼·미리보기·경고), `src/app/grade-admin/[grade]/seats/print/page.tsx`(툴바 그룹 체크·가로/세로·인쇄·닫기, A4 페이지), `SeatPrintGroup.tsx`
**Produces:** `SeatEditorMock({...})`, `seatEditorRect(key)`, `seatCellRect(roomId,row,col)`, `ClassroomConfigMock({...})`, `classroomConfigRect(key)`, `SeatPrintMock({...})`, `seatPrintRect(key)`
갤러리: `GradeAdmin-Seats`, `GradeAdmin-ClassroomConfig`, `GradeAdmin-SeatPrint`

---

### Task 5: 감독 배정 달력 · 월간출결 목업 (병렬)

**Files:** Create `demo-video/src/grade-admin/mocks/{SupervisorCalendarMock,GradeMonthlyMock}.tsx`; Modify `gallery/grade-supervisor.tsx`
**Source:** `src/components/admin-shared/MonthlyCalendar.tsx`(← 이달/이번달/Excel/다음달 →, 7열 달력, 평일 칸 검색 입력, 드롭다운 그룹·검색·미배정, 저장 중 노랑), `src/components/homeroom/SupervisorSummaryModal.tsx`(누계 모달 — 계획 2의 `SupervisorSummaryMock` 재사용 가능하면 재사용하고 보고서에 적는다), `src/components/grade-admin/GradeMonthlyAttendance.tsx`(← 월 → + Excel, 범례 토글, sticky 3열, 날짜당 3칸, 시간 열, 짝수 반 배경)
**Produces:** `SupervisorCalendarMock({...})`, `supervisorCalendarRect(key)`, `GradeMonthlyMock({...})`, `gradeMonthlyRect(key)`
갤러리: `GradeAdmin-Supervisor`, `GradeAdmin-Monthly`

---

### Task 6~9: 장면 18개 (병렬 4묶음)

**Files (태스크별 소유, 남의 장면 파일 금지):**
- **T6** `scenes/{Intro,Enter,Today,StudentsList,StudentAdd,StudentExcel}Scene.tsx`
- **T7** `scenes/{Helper,Participation,ParticipationBulk}Scene.tsx`
- **T8** `scenes/{SeatsTour,ClassroomConfig,SeatAssign,SeatEdit,SeatPrint}Scene.tsx`
- **T9** `scenes/{SupervisorAssign,SupervisorTotals,Monthly,Outro}Scene.tsx`

**공통 절차 (네 태스크 모두 동일)**
1. `demo-video/src/grade-admin/narration.ts` 에서 자기 장면의 `lines` 를 읽는다(문장 번호 = 0-based 인덱스). **원고는 고치지 않는다.**
2. 아래 표의 "화면 동작"을 문장 시간 안에 배치한다. 시간은 `lineAt(scene, line, ratio)` 로만 잡는다.
3. PC 장면이므로 `<BrowserFrame url={`${APP_HOST}/grade-admin/1`} tabTitle="포산고 자율학습"><PcViewport>…</PcViewport></BrowserFrame>`, 좌표 변환은 `pcAbs`/`pcRectAbs`. 본문은 `GradeAdminShellMock` 안 `GRADE_ADMIN_BODY` 에 놓는다.
4. `node scripts/frame-at.mjs grade-admin <SceneId> <line> <ratio>` 로 프레임을 렌더하고 **Read 도구로 PNG를 열어** 확인·보정한다. 커서가 대상 중심에 오는지, 주석이 캡션 띠(≈y 950–1030)·STEP 배지(≈x 60–420, y 16–56)를 침범하지 않는지 본다. 출력은 `out/check/<태스크>-*.png`.
5. `npm run lint` 통과 → 자기 장면 파일만 커밋.

**장면 표** (문장 수는 `narration-durations.json` 기준)

| id | 문장 | 화면 동작 |
|---|---|---|
| Intro | 2 | 제목 카드 "학년관리자 사용 안내" + 6탭 칩이 차례로 나타난다. 교사·학생 편 Intro와 같은 구성. |
| Enter | 3 | 0 출석부 헤더(폰 아닌 PC 출석부 상단)의 초록 "1학년 관리" 버튼 상자 · 1 누름 → `GradeAdminShellMock tab="today"` 로 전환 · 2 탭 줄 전체 상자, 6탭 라벨을 하나씩 짚는다. |
| Today | 3 | 0 세 카드 전체 상자 · 1 오후1 카드의 감독 배지와 숫자 타일 4개를 확대 카드로 · 2 "총 자습대상" 줄 상자. |
| StudentsList | 3 | 0 `tab="students"` 로 전환(탭 누름) → 표 · 1 반 select 누름 → 1반만 표시, 표 머리 8열 상자 · 2 수정·삭제 버튼 상자 + 비활성 행의 복원 버튼 확대. |
| StudentAdd | 3 | 0 "+ 학생 추가" 누름 → `StudentModalMock` · 1 반 2 · 번호 13 · 이름 "정다온" 입력 → 학번 10213 자동 표시(확대 카드) · 2 "추가" 누름 → 모달 닫힘, 표에 새 행 강조. |
| StudentExcel | 6 | 0 툴바 상자 · 1 "Excel" 누름 → `ExcelUploadMock`, "템플릿 다운로드" 누름 · 2 양식 인셋(학년·반·번호·이름 4열 예시) · 3 드롭존에 파일 드롭 애니메이션 ← **도움말 스틸** · 4 "업로드" 누름 → 결과 표(성공 34 · 실패 2 + 사유) · 5 경고 주석 "반·번호가 같으면 새 학생으로 바뀝니다". |
| Helper | 3 | 0 표의 도우미 열 상자 · 1 하준서 행의 도우미 버튼 누름 → 보라색 전환 · 2 보라 상태를 유지한 채 화면 오른쪽에 학생 폰 인셋(`PhoneFrame` 축소)으로 4탭 중 "일괄신청" 강조 ← **도움말 스틸**. |
| Participation | 6 | 0 `tab="participation"` 전환 → 표 · 1 "담임은 자기 반만 / 학년관리자는 전체" 주석 · 2 참가 체크박스 열 상자 · 3 요일 버튼 하나를 눌러 파랑↔회색 토글 · 4 방과후 체크 켜기 + 출석부 인셋에 노란 좌석 ← **도움말 스틸** · 5 "누르는 즉시 저장" 주석 + 비참가 학생의 회색 좌석 인셋. |
| ParticipationBulk | 3 | 0 반 select 누름 → 1반 · 1 시간 머리 체크박스 누름 → confirm 다이얼로그 → 확인 → 그 반 참가 일괄 켜짐 · 2 합계 행 확대 카드. |
| SeatsTour | 3 | 0 `tab="seats"` 전환 → `SeatEditorMock`, 오후/야간 버튼 상자 · 1 왼쪽 격자와 오른쪽 미배정 패널을 각각 상자로 ← **도움말 스틸** · 2 헤더 3버튼(교실 구조 설정·출력·저장) 상자. |
| ClassroomConfig | 6 | 0 "교실 구조 설정" 누름 → `ClassroomConfigMock` 목록 · 1 "학급 추가" 누름 → 폼, 반 7 · 복도 오른쪽 · 2 배치 유형 분단형/단독형 두 버튼 상자 · 3 분단 3 · 행 3 입력 → 미리보기에 책상 18개와 "총 18석", 아래 칠판 라벨 ← **도움말 스틸** · 4 "저장" 누름 → 편집 화면에 7반 교실 추가 · 5 기존 교실 구조 변경 → `NativeDialogMock` 초기화 경고. |
| SeatAssign | 4 | 0 미배정 패널 상자 + "참가 학생만" 주석 · 1 오후/야간 기준 주석 · 2 검색창에 "하준" 입력 → 목록 필터 · 3 학생 칩을 좌석으로 드래그(경로 애니메이션) → 좌석에 이름 표시 ← **도움말 스틸**. |
| SeatEdit | 3 | 0 배정된 두 좌석 간 드래그 → 두 이름이 서로 바뀜 · 1 좌석 누름 → 하단 액션바 "배정 해제" 누름 → 빈 좌석 + 미배정 패널에 복귀 · 2 "저장 (2개 교실 변경)" 버튼 상자(교환·해제 결과가 보이는 상태) ← **도움말 스틸** → 누름. |
| SeatPrint | 4 | 0 "출력" 누름 → 브라우저 탭이 하나 더 생기고 `SeatPrintMock` 인쇄 미리보기로 전환 · 1 학급 체크박스 3개 + 가로/세로 토글 누름(미리보기 방향 전환) ← **도움말 스틸** · 2 A4 페이지 미리보기 상자 · 3 "저장한 배치만 인쇄됩니다" 경고 주석. |
| SupervisorAssign | 5 | 0 첫 탭으로 돌아와 `tab="supervisor"` 전환 → 달력 ← **도움말 스틸**(문장 1) · 1 9/28 칸 누름 → 검색 드롭다운, "윤서진" 입력 → 선택 → 칸이 파랑 · 2 "그날 오후1·오후2·야간 모두" 주석 · 3 드롭다운 다시 열어 "미배정" 항목 상자 · 4 "교체는 각 선생님이 감독일정에서" 주석 + 교사 감독일정 인셋. |
| SupervisorTotals | 2 | 0 "누계" 누름 → `SupervisorSummaryMock` 월별 횟수·총계 · 1 "Excel" 누름 → 엑셀 인셋(월 시트·누계 시트 탭 두 개). |
| Monthly | 4 | 0 `tab="monthly"` 전환 → 표 ← **도움말 스틸**(문장 1) · 1 범례 토글 펼침 → O·X·세모·방·회색 뜻 확대 카드 · 2 마지막 시간 열 상자 · 3 ← → 화살표와 Excel 버튼 상자 → Excel 누름. |
| Outro | 2 | 0 학기 초 순서 카드 5장(명단 등록 → 도우미 → 참여 설정 → 좌석 배치 → 감독 배정)이 차례로 · 1 `?` 버튼과 `self.posan.kr/help` 주소. 교사·학생 편 Outro와 같은 배경 메시. |

오케스트레이터가 dispatch 때 `scene-notes.md`(연속성 재정·목업 API 표·도움말 스틸 프레임·보고 계약)를 함께 준다.

**도움말 스틸 프레임(계획)**
- `/help/grade-admin`(9단계): `01-enter` Enter 1,0.7 · `02-today` Today 1,0.7 · `03-students` StudentsList 1,0.7 · `04-student-add` StudentAdd 1,0.8 · `05-excel` StudentExcel 3,0.6 · `06-helper` Helper 2,0.6 · `07-participation` Participation 4,0.6 · `08-supervisor` SupervisorAssign 0,<비율은 T10 이 고름 — 월 이동 줄이 보이고 주석 라벨이 프레임 안에 온전히 들어오는 시점> · `09-monthly` Monthly 1,0.7
- `/help/seats`(5단계): `01-editor` SeatsTour 1,0.7 · `02-classroom` ClassroomConfig 3,0.7 · `03-assign` SeatAssign 3,0.7 · `04-edit` SeatEdit 2,0.6 · `05-print` SeatPrint 1,0.7

---

### Task 10: 스틸 2페이지

`demo-video/src/stills/{grade-admin,seats}.ts` 작성 → `node scripts/guide-stills.mjs --page grade-admin`·`--page seats` → 모든 WebP를 Read로 확인·보정(장당 150KB, 페이지 2MB 이하) → 픽셀 크기 기록 → 커밋.

**확정된 프레임 목록** (검수를 거쳐 도움말 스틸로 합격 판정된 것. 모두 브라우저 크롭 1280×657, `tall` 없음)

`/help/grade-admin` 9단계
| 파일 | 장면·문장·비율 | 화면 |
|---|---|---|
| `01-enter` | Enter 1,0.7 | 학년 데이터관리 6탭 |
| `02-today` | Today 1,0.7 | 오늘출결 카드와 숫자 타일 |
| `03-students` | StudentsList 1,0.7 | 학생 표(2반 필터) |
| `04-student-add` | StudentAdd 1,0.8 | 학생 추가 모달, 학번 10213 자동 |
| `05-excel` | StudentExcel 3,0.6 | **Excel 업로드 결과**(성공 34·실패 2) — 캡션을 "업로드 결과"로 쓴다 |
| `06-helper` | Helper 2,0.6 | 보라 도우미 배지 + 학생 폰 인셋 |
| `07-participation` | Participation 4,0.6 | 방과후 체크 + 출석부 인셋 |
| `08-supervisor` | **SupervisorAssign 0,0.7** | 감독 배정 달력(월 이동 줄·Excel·누계 포함) |
| `09-monthly` | Monthly 1,0.7 | 월간출결 표와 범례 |

`/help/seats` 5단계
| 파일 | 장면·문장·비율 | 화면 |
|---|---|---|
| `01-editor` | SeatsTour 1,0.7 | 좌석 격자 + 미배정 패널 |
| `02-classroom` | ClassroomConfig 3,0.7 | 구조 설정 미리보기(18석) |
| `03-assign` | SeatAssign 3,0.7 | 드래그로 배정된 좌석 |
| `04-edit` | SeatEdit 2,0.6 | 저장 (2개 교실 변경) |
| `05-print` | SeatPrint 1,0.7 | 인쇄 미리보기 |

주의: `03-assign`·`04-edit`·`05-print` 는 **같은 좌석의 주인이 서로 같아야 한다**(수정 라운드에서 맞췄다). 스틸을 뽑은 뒤 세 장을 나란히 열어 확인할 것.

### Task 11: `/help/grade-admin` · `/help/seats` · `?` 버튼

- Create `src/app/help/grade-admin/{page.tsx,content.mdx}`, `src/app/help/seats/{page.tsx,content.mdx}`
- Modify `src/app/grade-admin/[grade]/page.tsx`(탭 줄 오른쪽 끝에 `<GuideHelpButton href="/help/grade-admin" />`), `src/components/seats/SeatingEditor.tsx`("좌석 편집" 제목 줄에 `<GuideHelpButton href="/help/seats" />`), `src/app/help/content.mdx`(학년관리 절에 링크 2줄)
- Test: `tests/guide-grade-admin.test.ts`, `tests/guide-seats.test.ts`(계획 2의 guide-attendance 계약 + WebP 크기·`tall` 검사; 이 두 페이지는 모두 가로 스틸이라 `tall`은 없어야 한다)
- 구성: `/help/grade-admin` 챕터 3개(현황·명단·운영), `/help/seats` 챕터 2개(구조와 배정·출력) + `GuideNotice`(Excel 재업로드 주의, 구조 변경 시 좌석 초기화, 저장 후 출력)
- 검수: 두 테스트 + 기존 가이드 테스트 + `tsc` + `lint` + `build`(두 페이지 static) + 로그아웃 상태 375·768·1280px 확인

### Task 12: 렌더 · 최종 검수 · 문서

- [ ] `npx remotion render GradeAdminGuide out/grade-admin-guide.mp4`(예상 약 6분 30초) → 장면 경계 프레임 확인 → 720p 미리보기 전달
- [ ] `responsive-ui-reviewer`로 두 페이지와 `?` 버튼 2곳 점검 → 위반 수정·재검수
- [ ] `.claude/GUIDE_PAGES.md` 7절에 grade-admin·seats 행 추가, `project-map-updater`로 PROJECT_MAP 갱신
- [ ] 세 편 마무리 안내: 사용자에게 mp4 3개 경로와 YouTube 업로드 후 `videos.ts`에 넣을 키(`teacher`·`student`·`gradeAdmin`), 각 안내 페이지의 `start` 값 확인 방법을 정리해 전달
