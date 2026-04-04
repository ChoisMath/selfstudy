# Google Stitch Prompt - 자율학습 출석부 시스템 (v3)

## Prompt (한국어)

```
학교 자율학습 출석부 관리 웹앱을 만들어주세요. 모바일 우선 반응형 디자인이며, Tailwind CSS 스타일을 사용합니다.

## 전체 구조
- 로그인 화면: "교사 로그인" / "학생 로그인" 탭 분리
- 교사 로그인: ID + 비밀번호, "Google로 로그인" 버튼
- 학생 로그인: 이름 + 학번(5자리, 예: 20102)
- 로그인 후 역할(관리자/감독교사/담임교사/학생)에 따라 다른 화면

## 1. 감독교사 - 출석체크 화면

### 학년 선택 모달 (로그인 직후)
- 감독 배정된 학년이 있으면 자동으로 해당 학년 표시, 없으면 모달 표시
- 모달: "출석 확인할 학년 선택" 제목, 1학년/2학년/3학년 3개 큰 버튼
- 배정된 학년 버튼에 "(배정됨)" 라벨과 파란 강조

### 고정 상단 바 (position: sticky)
- 한 행: 날짜(예: "2026.4.4 (금)") | 구분선 | 감독교사명 | 학년 표시 | 출석/결석/미체크 카운트 | [다른학년] 버튼
- [다른학년] 버튼: 탭하면 학년 선택 모달 다시 표시
- 배경: 파란 그라데이션, 모바일에서 가로 스크롤 가능, 스크롤바 숨김

### 탭 (상단 바 아래, 함께 sticky)
- "오후자습" / "야간자습"

### 출석 콘텐츠
- 교실별 카드가 세로 나열 (한 페이지 스크롤, 서브탭 없음)
- 각 카드: 교실명 + 좌석수, 내부에 격자 좌석
- 각 좌석: 학생 이름(굵게) + 반번호 + 우측 상단에 작은 ℹ 아이콘
- 좌석 색상: 미체크=#dbeafe, 출석=#bbf7d0, 결석=#fecaca
- 좌석 탭: 미체크→출석→결석→미체크 순환
- ℹ 아이콘 탭: 좌석 행 아래에 주간 출석 팝업 (오늘 요일 굵게+파란 강조)
- 불참신청 승인된 학생 좌석: 노란 테두리 또는 별도 아이콘으로 구분

## 2. 담임교사 - 학생관리 화면

### 학생 목록
- 자기 반 학생 리스트 (이름, 번호, 주간 출석현황)
- 각 학생 클릭 시 상세

### 참여설정
- 오후자습 참가여부 ON/OFF 토글
- 야간자습 참가여부 ON/OFF 토글
- 참가하는 경우: 월~금 각각 토글 (오후/야간 별도)

### 불참사유 등록
- 날짜 선택 + 세션(오후/야간) + 사유(학원/방과후/질병/직접입력)

### 불참신청 관리
- 학생이 제출한 불참 신청 목록
- 각 항목: 학생명, 날짜, 세션, 사유, [승인] [반려] 버튼
- 배지: 미처리 신청 수 표시

### 감독일정 교체
- 내 감독 일정 목록 + [교체] 버튼
- 교체 모달: 대상 교사 선택 + 사유 입력

## 3. 학생 화면

### 참여일정 확인
- 내 참여 요일 표시 (오후/야간 각각)

### 불참 신청
- [불참 신청하기] 버튼 → 날짜 + 세션(오후/야간) + 사유 선택 + 제출
- 신청 내역 리스트: 날짜, 세션, 사유, 상태(대기중/승인/반려)

## 4. 관리자 화면

### 학생/교사 관리
- 학생 명단 CRUD + [Excel 일괄 업로드] 버튼 + [템플릿 다운로드]
- 교사 명단 CRUD + [Excel 일괄 업로드] 버튼
- Excel 업로드 시 미리보기 테이블 (오류 행 빨간 하이라이트)
- 학생 등록 시 참여설정 (오후/야간 참가여부 + 요일)

### 감독교사 일정
- 달력 또는 주간 테이블 형태
- 날짜별/학년별 감독교사 배정 (드래그 또는 선택)
- 교체 이력 확인 (원래 교사 → 교체된 교사, 날짜, 사유)

### 좌석 배치
- 학년 선택 → 세션(오후/야간) 선택
- 배치 기간 관리 (3-4월, 5-6월 등)
- 학생 명단에서 좌석으로 드래그&드롭

### 출결 관리
- 일별 뷰: 날짜 선택 → 학년 탭 → 좌석배치도 출석현황 (읽기전용)
- 테이블 뷰: 학년/반/기간 필터 → 학생별 출석 테이블 (O=출석, X=결석, -=미참가)
- [Excel 다운로드] 버튼

## 디자인 톤
- 깔끔하고 전문적인 UI (교육용)
- 주 색상: #2563eb (파란), 보조: #16a34a (출석), #dc2626 (결석)
- 배경: #f1f5f9, 카드: 흰색+그림자, 둥근 모서리
```

## Prompt (영어 버전)

```
Build a school self-study attendance management web app. Mobile-first responsive, Tailwind CSS.

## Structure
- Login: "Teacher" / "Student" tabs
- Teacher: ID + password, "Sign in with Google"
- Student: name + student number (5 digits, e.g., 20102)
- Role-based views: Admin / Supervisor / Homeroom Teacher / Student

## 1. Supervisor Teacher - Attendance

### Grade Selection Modal (on login)
- If assigned as supervisor today → auto-show that grade
- If not assigned → show modal with 3 large buttons: Grade 1/2/3
- Assigned grade button highlighted with "(Assigned)" label

### Sticky Top Bar
- Single row: Date | Supervisor name | Grade | Present/Absent/Unchecked counts | [Switch Grade] button
- [Switch Grade] reopens grade selection modal
- Blue gradient bg, horizontally scrollable on mobile

### Tabs (also sticky): "Afternoon Study" / "Night Study"

### Attendance Content
- Classroom cards stacked vertically (no sub-tabs)
- Each card: room name + seat count, grid seat layout inside
- Each seat: student name (bold) + class number + small ℹ icon top-right
- Seat colors: Unchecked=#dbeafe, Present=#bbf7d0, Absent=#fecaca
- Tap seat: cycle Unchecked→Present→Absent→Unchecked
- Tap ℹ: weekly attendance popup below seat row (today highlighted)
- Pre-approved absence students: yellow border or badge on seat

## 2. Homeroom Teacher - Student Management

- Student list with weekly attendance
- Participation settings: afternoon ON/OFF, night ON/OFF, per-day toggles
- Absence reason registration: date + session + reason (Academy/After-school/Illness/Custom)
- Student absence request list: approve/reject buttons, pending count badge
- Supervisor schedule swap: my schedule + [Swap] button → select teacher + reason

## 3. Student View

- My participation schedule display
- Absence request: date + session + reason → submit
- Request history: date, session, reason, status (Pending/Approved/Rejected)

## 4. Admin

- Student/Teacher CRUD + [Excel Bulk Upload] + [Download Template]
- Upload preview table with error highlighting
- Supervisor schedule: calendar/weekly table, per-grade assignment
- Swap history view (original → replacement, date, reason)
- Seat layout editor: grade + session → period management → drag-and-drop
- Attendance views: daily (seat map), table (grade/class/period), Excel download

## Design
- Clean, professional educational UI
- Primary: #2563eb, Present: #16a34a, Absent: #dc2626
- Background: #f1f5f9, Cards: white + shadow, rounded corners
```
