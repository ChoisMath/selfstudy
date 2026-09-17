# 학생 참여일정 개편 · 요일 클릭 불참 신청 · 좌석 확인 — 설계

> 작성일: 2026-09-17
> 대상: 학생 화면 `/student`(참여일정), `/student/absence-requests`(불참목록), 신규 `GET /api/student/seats`

## 배경 / 목표

학생 화면(`/student`)은 참여일정을 세션(오후1·오후2·야간)마다 별도 카드로 보여 주고, 불참 신청은 "불참신청" 탭의 [불참 신청하기] 버튼으로 폼을 열어 진행한다. 학생이 자기 좌석을 확인할 방법은 없다. 이번 작업은 다음 세 가지를 달성한다.

1. **참여일정을 한 카드 안의 3행 격자**로 합친다. 인덱스 열에 오후1/오후2/야간, 월~금 셀은 참여 요일만 색으로 표시(현재 색상 유지), 오늘 요일 열은 진한 테두리로 강조.
2. **불참 신청 진입점을 참여일정 격자로 옮긴다.** 활성 요일 셀을 누르면 같은 자리에서 "불참 신청하기" 폼으로 전환되고, 그 요일의 날짜와 그 행의 세션이 기본값이 된다. "불참신청" 탭은 "불참목록"으로 바꾸고 신청 버튼을 없앤다. 폼의 [오후 전체]는 [전체]가 되어 그 날짜에 자신이 활성인 세션 전부를 선택한다. 사유 4개는 한 행, 상세 사유는 '기타'일 때만 표시.
3. **좌석 확인 카드**를 참여시간 카드 아래에 추가한다. 오후/야간 탭으로 나누어, 학급 교실 배정이면 학급 이름과 그 학급의 좌석 전체를, 별도 교실(미래혜윰·미래홀 등) 배정이면 그 교실의 좌석 전체를 내 자리 강조와 함께 보여 준다.

## 확정된 결정

| 항목 | 결정 |
|------|------|
| 폼 위치 | `/student` 페이지 안에서 상태로 전환(URL 변화 없음). [닫기]·신청 완료 시 참여일정으로 복귀 |
| 요일 클릭 기본 날짜 | **오늘 포함 "다음 돌아오는 그 요일"**. 이번 주에 아직 안 지났으면 이번 주, 지났거나 주말이면 다음 주. 다음 주로 넘어간 셀에는 작은 "다음주" 표시 |
| 기본 세션 | 클릭한 행의 세션 1개가 미리 선택 |
| [전체] 버튼 | 선택한 날짜의 요일에 활성인 세션 전부를 토글. 비활성 세션 버튼은 `disabled` |
| 상세 사유 | '기타' 선택 시에만 textarea 표시·전송. 필수 여부는 현재처럼 선택(검증 변경 없음) |
| 신청 완료 후 | 참여일정으로 복귀 + 상단 안내 배너("불참 신청이 접수되었습니다") + 불참목록 링크. 배너는 다음 폼 열기 또는 페이지 이탈 시 사라짐(별도 닫기 버튼 없음) |
| 좌석 데이터 | 학생 전용 `GET /api/student/seats` 신설. 내 `SeatLayout` 기준으로 오후/야간 그룹을 서버가 구성 |
| 좌석 그룹 범위 | Room에 `classroomId`가 있으면 그 Classroom의 Room(분단) 전부. 없으면 같은 세션에서 **이름 접두사가 같은 Room 묶음**(`roomPrefix`, 예: `오후미래혜윰1 분단1·2`, 야간 `미래202` 한 방). 야간 미래홀 전체 도면은 그리지 않음 |
| 좌석 이름 노출 | 같은 교실 학생들의 이름·반-번호를 표시(자리 찾기 용이). 내 자리는 파란 배경 강조 |
| 도우미 일괄신청 탭 | 변경 없음 |
| 서버 검증 | 불참 신청 POST API 변경 없음(`sessionTypes[]`, 과거 날짜 거부, 중복 skip) |

## 비목표 (Non-goals)

- 불참 신청 API·승인 흐름·도우미 일괄신청 변경
- 출결기록 탭, 감독/담임/관리자 화면 변경
- 좌석 배치 편집, 야간 미래홀 도면(`MiraeHallLayout`) 재사용
- 브라우저 뒤로가기로 폼 닫기(URL 상태 없음), 새로고침 시 폼 유지
- 상세 사유 필수화, 신청 취소 기능
- 도움말(`/help`) 갱신 — 학생 신청 절차 설명이 없어 대상 아님

---

## 1. 화면 설계

### 1.1 참여일정 카드 (`ParticipationScheduleCard`)

```
┌──────────────────────────────────────┐
│ 내 참여일정                            │
│ 오후1   [월]  [화]  [수]  [목]  [금]    │  셀 안에 요일 글자(헤더 행 없음). 파랑 = 참여, 회색 = 비참여, [수] = 오늘 테두리
│ 주 5일                                 │
│ 오후2   [월]   화   [수]   목   [금]    │
│ 주 3일                                 │
│ 야간     월    화    수    목    금     │  전부 회색
│ 미참가                                 │
│               오늘                     │  ← 오늘 열에만 캡션 (주말엔 행 생략)
└──────────────────────────────────────┘
```

- 격자: `grid grid-cols-[auto_repeat(5,1fr)] gap-2`(인접 터치 타겟 8px). 행 순서는 `SESSION_TYPES`(오후1·오후2·야간).
- 인덱스 셀: `SESSION_META[t].shortLabel` + 아래 캡션(`text-[10px]`) — 참가 세션은 "주 N일", 미참가(레코드 없음 또는 `isParticipating=false`)는 "미참가".
- 요일 셀: 요일 글자(`text-sm font-medium`) 표시. `min-h-11`, `rounded-lg`, `whitespace-nowrap`.
  - 활성(참가 세션이고 그 요일 `true`): `<button type="button">`, `bg-blue-100 text-blue-700`, 탭 시 `onSelectDay(sessionType, date)`.
  - 비활성: `<div>`, `bg-gray-100 text-gray-300`, 클릭 없음.
  - 모든 셀은 `border-2`를 갖고 기본은 `border-transparent`(오늘 강조 시 크기가 튀지 않도록).
- 오늘 강조: 오늘(KST)이 월~금이면 그 열의 3행 셀 모두 `border-2` — 활성 `border-blue-700`, 비활성 `border-gray-400`. 격자 아래 한 행을 더 두어 오늘 열에만 "오늘"(`text-[10px] font-semibold text-blue-700`) 캡션. 주말엔 강조·캡션 없음.
- 셀의 날짜: `nextDateForWeekday(today, weekday)`. 이번 주 날짜(`addDays(이번 주 월요일, i)`)와 다르면 글자 아래 `text-[9px] leading-none` "다음주" 표시. 버튼 `title`/`aria-label`에 날짜 포함(예: "오후1 9/23(수) 불참 신청").
- 데이터가 전혀 없으면(3세션 모두 레코드 없음) 카드 아래 기존 문구 "참여일정이 설정되지 않았습니다. 담당 선생님에게 문의하세요." 유지.

### 1.2 불참 신청 폼 (`AbsenceRequestForm`, 같은 자리 전환)

- `/student/page.tsx`의 `draft` 상태(`{ date, sessionTypes }`)가 있으면 참여일정 내용(제목·카드·참여시간·좌석) 대신 폼만 렌더. 열릴 때 `window.scrollTo({ top: 0 })`.
- 폼 헤더: 제목 "불참 신청하기" + 오른쪽 [닫기](`min-h-11`) → `onClose()` → `draft=null`.
- 날짜: `<input type="date" min={today}>`. 초기값 `initialDate`.
- 세션: `SESSION_TYPES` 버튼 3개(`flex-1 min-h-11 whitespace-nowrap`) + [전체].
  - `activeTypes = activeSessionTypesOn(participationDays, date)`.
  - 비활성 세션 버튼은 `disabled` + 회색(`bg-gray-50 text-gray-300 border-gray-200`).
  - [전체]: `activeTypes`가 모두 선택돼 있으면 선택 해제, 아니면 `activeTypes` 전체 선택. `activeTypes`가 비면 `disabled`.
  - 날짜 변경 시 `sessionTypes`에서 비활성 세션을 제거. `activeTypes`가 비면(주말·미참가) 안내 "해당 날짜에는 참여 일정이 없습니다."
  - 안내 문구 "여러 시간을 함께 선택할 수 있습니다." 유지.
- 사유: `REASON_TYPES`/`REASON_LABELS`(`@/lib/absence-reasons`) 순서대로 4버튼, `grid grid-cols-4 gap-2`, 각 `min-h-11 whitespace-nowrap`. 기본 `academy`.
- 상세 사유: `reasonType === "custom"`일 때만 textarea 표시(placeholder "상세 사유를 입력해주세요", `rows=2`). 전송 시 `custom`이고 비어 있지 않을 때만 `detail` 포함.
- 제출: `POST /api/student/absence-requests` `{ date, sessionTypes, reasonType, detail? }`(현재와 동일). 클라이언트 검증: 날짜 없음 / 세션 0개 → 기존 오류 문구. 성공(201) → `onSubmitted()`. 실패 → 응답 `error` 문구를 폼 상단 빨간 박스에 표시(현재와 동일).
- 제출 버튼 "신청하기"(`w-full min-h-11`), 제출 중 "신청 중..." + `disabled`.

### 1.3 불참목록 페이지 · 탭

- `student/layout.tsx` 탭 라벨 `불참신청` → `불참목록`(href 유지 `/student/absence-requests`).
- `student/absence-requests/page.tsx`: 제목 "불참목록". [불참 신청하기] 버튼, 폼, 폼 관련 state/핸들러 전부 제거. 목록 렌더링(상태 배지, 날짜/요일, 사유)은 그대로. 목록 위에 안내 한 줄: "불참 신청은 참여일정 탭에서 요일을 눌러 할 수 있습니다." + `/student` 링크. "신청 내역" 소제목은 제거(페이지 제목과 중복).

### 1.4 좌석 확인 카드 (`SeatCheckCard`)

```
┌──────────────────────────────────────┐
│ 좌석 확인            [오후자습][야간자습] │
│ 2-4반 · 18석                          │
│ 내 자리: 분단2 · 3행 1열               │
│ 복 ┌분단1─┐ ┌분단2─┐ ┌분단3─┐ 창       │
│ 도 │ 홍 김 │ │ ■ 이 │ │ 박 최 │ 문     │
│    │ ...  │ │ ... │ │ ... │          │
│ ─────────────── 교탁 ───────────────  │
└──────────────────────────────────────┘
```

- 위치: 참여시간 카드 바로 아래. 제목 "좌석 확인", 오른쪽에 탭 2개(`SEAT_SESSION_TYPES`, 라벨 `SEAT_SESSION_META[t].label`, `min-h-11 whitespace-nowrap`). 기본 탭은 그룹이 있는 첫 세션, 둘 다 없으면 오후. 데이터가 비동기로 오므로 `picked` 상태(사용자 선택, 초기 `null`)와 파생값 `tab = picked ?? firstWithGroup ?? "afternoon"`으로 계산한다(effect 에서 setState 하지 않음).
- 그룹 헤더: `group.title` + 배정 좌석 수 "N석". 그 아래 "내 자리: {분단/방 라벨} · {row+1}행 {col+1}열"(단일 Room 그룹이면 방 라벨 생략).
- `kind === "classroom"`: `overflow-x-auto` 래퍼 안에 `ClassroomFrame(corridorSide, variant="screen")`, 분단들은 `grid gap-1 grid-template-columns: repeat(n, 1fr)` 가로 배치. 분단이 2개 이상이면 각 격자 위에 `divisionLabel(room.name)` 캡션. 교탁은 `ClassroomFrame` 기본 표시.
- `kind === "room"`: `overflow-x-auto` 래퍼 안에 Room을 세로 스택. Room이 2개 이상이면 각 격자 위에 `divisionLabel` 캡션. `GAP_CONFIG[room.name]`이 있으면 행 간격 적용(야간 미래혜윰실 블록 구분). 교탁 표시는 오후 세션만(야간 미래홀은 교탁 없음).
- 좌석 격자 `StudentSeatGrid`(읽기 전용, dnd-kit 없음): `grid gap-1`, `gridTemplateColumns: repeat(cols, minmax(52px, 1fr))`(폭이 부족하면 래퍼가 가로 스크롤). 셀 `min-h-11 rounded border text-xs whitespace-nowrap overflow-hidden text-ellipsis`.
  - 배정 셀: `bg-white border-gray-200`, 위에 `text-[10px] text-gray-400` "반-번호", 아래 이름.
  - 내 자리: `bg-blue-600 text-white border-blue-700 font-bold`, `aria-current="true"`.
  - 빈 좌석: `bg-gray-50 border-gray-100`, 내용 없음.
- 상태 문구: 로딩 "불러오는 중...", 실패 "좌석 정보를 불러오지 못했습니다.", 그룹 `null`이면 — 그 좌석 세션의 블록(`sessionTypesOfSeat(seat)`) 중 하나라도 `participationDays[t]?.isParticipating`이면 "배정된 좌석이 없습니다.", 하나도 없으면 "{오후자습|야간자습} 미참가"(레코드 없음은 미참가 — 참여일정 카드와 같은 규칙).

---

## 2. 날짜 · 참여 계산 규칙

`src/lib/calendar.ts`에 추가(문자열 `YYYY-MM-DD`, 로컬 날짜 파싱, 타임존 무관):

| 함수 | 동작 |
|------|------|
| `weekdayOf(date)` | `0(일)~6(토)` |
| `addDays(date, days)` | 월·연 경계 처리 |
| `nextDateForWeekday(fromDate, weekday)` | `fromDate` 이후(포함) 가장 가까운 해당 요일 날짜. `(weekday - weekdayOf(from) + 7) % 7`일 뒤 |

`src/lib/participation-days.ts` 신규:

| 항목 | 동작 |
|------|------|
| `WEEKDAY_KEYS = ["mon","tue","wed","thu","fri"]`, `WEEKDAY_LABELS` | 요일 키·한글 라벨 |
| `DaySettings` 타입 | `{ isParticipating, mon, tue, wed, thu, fri }` (participation-days API 응답과 동일) |
| `weekdayKeyOf(date)` | 월~금이면 키, 주말이면 `null` |
| `isActiveOn(settings, key)` | `!!settings && settings.isParticipating && settings[key]`. 레코드 없음은 **비활성**(화면의 회색 표시와 일치) |
| `activeSessionTypesOn(days, date)` | 주말 → `[]`, 아니면 `SESSION_TYPES` 중 `isActiveOn` 인 것 |
| `activeDayCount(settings)` | 참가 세션의 요일 수 |

오늘은 `getKstTodayString()`(KST). 이번 주 월요일 = `addDays(today, -((weekdayOf(today) + 6) % 7))`.

---

## 3. API — `GET /api/student/seats`

- 인증: `withAuth(["student"])`. 다른 학생·교사 정보 조회 불가(내 `userId` 기준만).
- 응답 `StudentSeatsResponse = Record<SeatSessionType, StudentSeatGroup | null>`

```ts
type StudentSeatGroup = {
  title: string;                       // "2-4반" | "오후미래혜윰1" | "미래202"
  kind: "classroom" | "room";
  corridorSide: CorridorSide | null;   // classroom 만
  rooms: {
    id: number; name: string; cols: number; rows: number; sortOrder: number;
    seats: { rowIndex: number; colIndex: number;
             student: { id: number; name: string; classNumber: number; studentNumber: number } | null }[];
  }[];
  mySeat: { roomId: number; rowIndex: number; colIndex: number };
};
```

- 조회 절차
  1. `seatLayout.findMany({ where: { studentId }, include: { room: { include: { classroom: true, session: { select: { type, grade } } } } } })`.
  2. `SEAT_SESSION_TYPES` 각각에 대해 `room.session.type`이 일치하는 첫 레코드(방 `sortOrder`, `rowIndex`, `colIndex` 순 정렬 후) 선택. 없으면 `null`.
  3. 내 Room과 같은 `sessionId`의 Room 전부를 `classroom` 포함으로 조회(`sessionRooms`)한 뒤, 순수 함수 `selectSeatGroupRooms(myRoom, sessionRooms, grade)`(`src/lib/seats/student-seat-group.ts`)로 그룹 결정:
     - `myRoom.classroomId != null` → `sessionRooms` 중 같은 `classroomId`, `kind: "classroom"`, `title: classroomTitle(grade, classroom.classNumber)`, `corridorSide`.
     - 아니면 → `classroomId == null` 이고 `roomPrefix(name)`이 같은 Room, `kind: "room"`, `title: roomPrefix(myRoom.name)`, `corridorSide: null`.
     - 정렬: `sortOrder`, `id`.
     - `grade`는 `room.session.grade` 사용(학생 세션의 grade 가 아니라 StudySession 기준).
  4. 그룹 Room들의 `seatLayout`을 `student(select id,name,classNumber,studentNumber)` 포함으로 조회해 `seats` 구성.
- 오류: 인증 실패는 `withAuth` 규약(401/403). 그 외 예외는 500(프레임워크 기본).
- 성능: 학생 1명당 쿼리 ≤ 1 + 2×2. 캐시 없음(SWR 기본 재검증).

---

## 4. 컴포넌트 · 파일 구성

| 파일 | 역할 | 의존 |
|------|------|------|
| `src/app/student/page.tsx` (수정) | SWR `participation-days`, `today`, `draft`/`notice` 상태, 폼 전환, 카드 배치 | 아래 3 컴포넌트 |
| `src/components/student/ParticipationScheduleCard.tsx` (신규) | 3행 격자. props `{ participationDays, today, onSelectDay(sessionType, date) }` | `lib/calendar`, `lib/participation-days`, `lib/sessions` |
| `src/components/student/AbsenceRequestForm.tsx` (신규) | 폼 전체(헤더·닫기 포함). props `{ initialDate, initialSessionTypes, today, participationDays, onClose, onSubmitted }` | `lib/participation-days`, `lib/absence-reasons`, `lib/sessions` |
| `src/components/student/SeatCheckCard.tsx` (신규) | SWR `/api/student/seats`, 탭, 그룹 렌더. props `{ participationDays }` | `ClassroomFrame`, `StudentSeatGrid`, `GAP_CONFIG`, `divisionLabel`, `sessionTypesOfSeat` |
| `src/components/seats/StudentSeatGrid.tsx` (신규) | 읽기 전용 격자. props `{ room, mySeat, gapAfterRows? }` | — |
| `src/lib/participation-days.ts` (신규) | §2 헬퍼 | `lib/calendar`, `lib/sessions` |
| `src/lib/seats/student-seat-group.ts` (신규) | `selectSeatGroupRooms`, 응답 타입 | `lib/seats/print-groups`(`roomPrefix`, `classroomTitle`), `lib/seats/classroom-config` |
| `src/app/api/student/seats/route.ts` (신규) | §3 | `prisma`, `withAuth`, `student-seat-group` |
| `src/lib/calendar.ts` (수정) | `weekdayOf`, `addDays`, `nextDateForWeekday` | — |
| `src/app/student/layout.tsx` (수정) | 탭 라벨 | — |
| `src/app/student/absence-requests/page.tsx` (수정) | 목록 전용 | — |
| `.claude/PROJECT_MAP.md` (수정) | 라우트·API·컴포넌트·테스트 반영 | `project-map-updater` |

`page.tsx`의 기존 `DAY_KEYS`/`DAY_LABELS`/`DaySettings`/`renderSession`은 제거하고 `lib/participation-days`로 대체한다. 다른 화면의 동일 상수는 이번 범위 밖(그대로 둠).

---

## 5. 데이터 흐름

1. `/student` 로드 → `GET /api/student/participation-days`(기존) → `ParticipationScheduleCard`·`SeatCheckCard`(참여 힌트)·참여시간 카드에 전달. `SeatCheckCard`는 별도로 `GET /api/student/seats`.
2. 활성 셀 탭 → `onSelectDay(t, nextDateForWeekday(today, wd))` → `draft = { date, sessionTypes: [t] }` → 폼 렌더.
3. 폼에서 날짜/세션/사유 변경 → 제출 → `POST /api/student/absence-requests` → 201 → `onSubmitted()` → `draft=null`, `notice` 설정 → 참여일정 복귀. `/student/absence-requests`는 자체 SWR로 목록을 다시 받는다(별도 mutate 불필요).
4. [닫기] → `onClose()` → `draft=null`, 입력값 폐기.

---

## 6. 에러 처리

- 폼: 서버 `error` 문구 그대로 표시(과거 날짜, 중복 409 등). 네트워크 실패 시 "신청에 실패했습니다."
- 좌석 카드: SWR `error` → 실패 문구, 재시도는 SWR 기본 정책.
- 참여일정 데이터 없음: 격자는 전부 회색 + 기존 안내 문구. 이 경우 어떤 셀도 클릭되지 않으므로 신청 진입점이 없다 — 참여설정이 없는 학생은 현재도 신청 대상이 아니므로 허용.

---

## 7. 테스트 계획

실행: `npx tsx tests/<file>.test.ts` (기존 관행, 소스 스캔 + 순수 함수 단위 테스트).

| 테스트 | 내용 |
|--------|------|
| `tests/calendar.test.ts` (확장) | `weekdayOf`, `addDays`(월/연 경계), `nextDateForWeekday`(같은 요일 → 당일, 지난 요일 → 다음 주, 토·일 → 다음 주 월) |
| `tests/participation-days.test.ts` (신규) | `weekdayKeyOf` 주말 `null`, `activeSessionTypesOn`(주말 `[]`, 레코드 없음 비활성, `isParticipating=false` 비활성, 요일 조합), `activeDayCount` |
| `tests/student-seat-group.test.ts` (신규) | classroom 그룹(같은 classroomId 전부, 정렬, 제목 "2-4반", corridorSide), 접두사 그룹(`오후미래혜윰1 분단1·2`만, `오후미래혜윰2` 제외), 야간 단일 방, classroom Room 은 접두사 그룹에서 제외 |
| `tests/student-schedule-wiring.test.ts` (신규) | 레이아웃 탭 "불참목록"·"불참신청" 없음; 목록 페이지에 `불참 신청하기`/`AbsenceRequestForm` 없음; `page.tsx`가 3 컴포넌트 사용; 격자 `grid-cols-[auto_repeat(5,1fr)]`·`min-h-11`·`nextDateForWeekday`; 폼 `grid-cols-4`·`reasonType === "custom"` 조건 렌더·세션 버튼 `disabled`·[전체]; 좌석 카드 `ClassroomFrame`·`overflow-x-auto`·`minmax(52px`; API `withAuth(["student"]` |
| `tests/absence-request-wiring.test.ts` (수정) | 학생 폼 검사 대상을 `components/student/AbsenceRequestForm.tsx`로 변경. "오후 전체"·`sessionTypesOfSeat("afternoon")` 단정 제거 → "전체"·`activeSessionTypesOn` 단정 |
| `tests/participation-wiring.test.ts` (수정) | `renderSession` 단정 → `ParticipationScheduleCard.tsx`의 `SESSION_TYPES.map` 단정 |
| `tests/session-literal-guard.test.ts` (수정) | 허용목록에서 `app/student/absence-requests/page.tsx` 제거, `components/student/SeatCheckCard.tsx`(기본 탭 폴백 `"afternoon"`) 추가. 그 외 신규 파일은 리터럴을 쓰지 않는다 |

추가 검증: `npx tsc --noEmit`, `npm run lint`, `tests/*.test.ts` 전부 통과. 로컬 DB가 없으므로 브라우저 확인은 배포 후 실서버(`https://self.posan.kr`, 학생 테스트 계정)에서 한다.

---

## 8. 반응형 · 접근성 체크 (rules/responsive-ui.md)

- 모든 셀·탭·버튼 `min-h-11`(44px). 참여일정 셀(클릭 대상)은 `gap-2`(8px). 좌석 격자의 `gap-1`은 클릭 대상이 아니며 기존 좌석 화면과 같은 보류 항목.
- 라벨·이름 `whitespace-nowrap`; 이름은 `overflow-hidden text-ellipsis` + `title`.
- 좌석 격자·학급 프레임은 `overflow-x-auto` 래퍼 안에서 가로 스크롤. `100vh` 사용 없음.
- 페이지 바깥 여백은 레이아웃의 `px-2 md:px-3 lg:px-4` 유지, 카드 안쪽 `p-3`~`p-4`.
- hover 전용 기능 없음. 활성 셀은 실제 `<button>`, 내 자리는 `aria-current`.

---

## 9. 배포

- 스키마 변경 없음(마이그레이션 없음). `main` push → Railway 자동 배포.
- 배포 후 확인: 학생 계정 로그인 → 참여일정 격자·오늘 테두리 → 요일 탭 → 폼 기본값 → [전체]·'기타' 동작 → 신청 후 배너 → 불참목록 확인 → 좌석 확인 카드 오후/야간.
