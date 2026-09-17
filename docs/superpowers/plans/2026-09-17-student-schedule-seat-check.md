# 학생 참여일정 개편 · 요일 클릭 불참 신청 · 좌석 확인 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생 화면 `/student`의 참여일정을 한 카드 3행 격자로 합치고, 요일 셀 클릭으로 같은 자리에서 불참 신청 폼을 열며, 참여시간 카드 아래에 내 좌석을 보여 주는 좌석 확인 카드를 추가한다.

**Architecture:** 순수 로직(날짜·참여 계산·좌석 그룹 규칙)을 `src/lib`에 두고 단위 테스트로 고정한다. 학생 페이지는 `draft` 상태로 참여일정 ↔ 신청 폼을 전환하는 얇은 조립자이고, 격자·폼·좌석 카드는 `src/components/student/`의 독립 컴포넌트다. 좌석은 학생 전용 `GET /api/student/seats`가 내 `SeatLayout` 기준으로 오후/야간 그룹(학급 분단 전부 또는 같은 접두사의 방 묶음)을 만들어 준다.

**Tech Stack:** Next.js 16 App Router(client components), TypeScript strict, Tailwind CSS 4, SWR, Prisma 7(`@/lib/prisma`), NextAuth `withAuth`. 테스트는 `node:assert` + `npx tsx tests/<file>.test.ts`(소스 스캔 배선 테스트 + 순수 함수 단위 테스트).

**Spec:** `docs/superpowers/specs/2026-09-17-student-schedule-seat-check-design.md`

## Global Constraints

- UI 문구는 한국어. 식별자·로그·커밋 메시지는 영어.
- `"afternoon"` 문자열 리터럴은 `tests/session-literal-guard.test.ts` 허용목록 파일 밖에서 금지. 이 계획에서 리터럴을 쓰는 신규 파일은 `components/student/SeatCheckCard.tsx` 하나뿐이며 Task 6에서 허용목록에 추가한다. 그 외 신규 파일은 `SEAT_SESSION_TYPES`/`sessionTypesOfSeat` 등을 통해서만 세션을 다룬다.
- 반응형 규칙(`~/.claude/rules/responsive-ui.md`): 탭·버튼·클릭 셀 `min-h-11`(44px), 라벨·이름 `whitespace-nowrap`, 격자는 `overflow-x-auto` 래퍼 안에서 가로 스크롤, `100vh` 금지, 인접 클릭 셀 간격 8px(`gap-2`).
- 주석은 "왜"가 비자명할 때만. WHAT 주석·작업 언급 주석 금지. `any` 금지(`unknown` + 타입 가드).
- React: effect 안에서 `setState` 하지 않는다(`react-hooks/set-state-in-effect` lint). 파생값은 렌더에서 계산.
- 스키마 변경 없음. `prisma migrate`·`db push` 실행 금지. 로컬 DB가 없으므로 dev 서버로 API를 호출하는 검증은 하지 않는다(타입·lint·테스트로 검증).
- 같은 저장소에서 다른 세션이 병렬로 작업 중일 수 있다. **커밋 시 반드시 이 계획이 만든/수정한 파일만 `git add <경로>`** 한다(`git add -A`·`git add .` 금지). 푸시는 하지 않는다.
- 모든 커밋 메시지는 아래 두 줄로 **정확히 그대로** 끝난다(모델명 바꾸지 말 것):
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01LGV2H6Y2jd4vSd1eE4YqWL
  ```
- 테스트 실행: `npx tsx tests/<file>.test.ts` (성공 시 마지막 줄에 `... checks passed` 출력, 실패 시 `AssertionError`와 함께 비정상 종료).
- 배선(wiring) 테스트 `tests/student-schedule-wiring.test.ts`는 Task 4에서 만들고 이후 Task가 블록을 **파일 끝의 `console.log("student-schedule-wiring checks passed");` 바로 위에** 추가한다.

---

## 파일 구조

| 파일 | 책임 |
|------|------|
| `src/lib/calendar.ts` (수정) | `weekdayOf`, `addDays`, `nextDateForWeekday` 추가 |
| `src/lib/participation-days.ts` (신규) | 요일 키·라벨, `DaySettings`, `weekdayKeyOf`, `isActiveOn`, `activeSessionTypesOn`, `activeDayCount` |
| `src/lib/seats/student-seat-group.ts` (신규) | `selectSeatGroupRooms` 순수 규칙 + API 응답 타입(`StudentSeatGroup`, `StudentSeatsResponse`) |
| `src/app/api/student/seats/route.ts` (신규) | 학생 전용 좌석 그룹 조회 |
| `src/components/seats/StudentSeatGrid.tsx` (신규) | 읽기 전용 좌석 격자(dnd 없음), 내 자리 강조 |
| `src/components/student/SeatCheckCard.tsx` (신규) | 오후/야간 탭 + 그룹 렌더(`ClassroomFrame` 재사용) |
| `src/components/student/ParticipationScheduleCard.tsx` (신규) | 3행 격자, 오늘 강조, 요일 셀 클릭 |
| `src/components/student/AbsenceRequestForm.tsx` (신규) | 신청 폼(헤더·닫기 포함) |
| `src/app/student/page.tsx` (수정) | 조립 + `draft`/`notice` 상태 |
| `src/app/student/absence-requests/page.tsx` (수정) | 목록 전용 "불참목록" |
| `src/app/student/layout.tsx` (수정) | 탭 라벨 |
| `tests/*` | 아래 각 Task 참조 |
| `.claude/PROJECT_MAP.md` (수정) | Task 11 |

---

### Task 1: 달력 헬퍼 — `weekdayOf` / `addDays` / `nextDateForWeekday`

**Files:**
- Modify: `src/lib/calendar.ts` (파일 끝에 추가)
- Test: `tests/calendar.test.ts` (기존 파일 확장)

**Interfaces:**
- Consumes: 기존 `parseDateValue(date)`, `formatDateValue(y,m,d)` (같은 파일)
- Produces:
  - `weekdayOf(date: string): number` — `0(일)`~`6(토)`
  - `addDays(date: string, days: number): string` — `YYYY-MM-DD`
  - `nextDateForWeekday(fromDate: string, weekday: number): string` — `fromDate` 이후(당일 포함) 가장 가까운 해당 요일

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/calendar.test.ts`의 import 목록에 세 함수를 추가하고, 마지막 `console.log(...)` 바로 위에 단언을 추가한다.

```ts
// import 블록을 이렇게 바꾼다
import {
  getKstTodayString,
  formatDateValue,
  parseDateValue,
  formatDateLabel,
  shiftMonth,
  buildMonthCells,
  weekdayOf,
  addDays,
  nextDateForWeekday,
} from "../src/lib/calendar";
```

```ts
// console.log("calendar util checks passed"); 바로 위에 추가
// weekdayOf: 2026-09-17 은 목요일(4), 2026-09-20 은 일요일(0)
assert.equal(weekdayOf("2026-09-17"), 4);
assert.equal(weekdayOf("2026-09-20"), 0);

// addDays: 월/연 경계
assert.equal(addDays("2026-09-30", 1), "2026-10-01");
assert.equal(addDays("2026-12-31", 1), "2027-01-01");
assert.equal(addDays("2026-03-01", -1), "2026-02-28");
assert.equal(addDays("2026-09-17", 0), "2026-09-17");

// nextDateForWeekday: 당일 포함 가장 가까운 해당 요일 (getDay 기준 월=1 … 금=5)
assert.equal(nextDateForWeekday("2026-09-17", 4), "2026-09-17"); // 목요일에 목 → 당일
assert.equal(nextDateForWeekday("2026-09-17", 5), "2026-09-18"); // 아직 안 지난 금 → 이번 주
assert.equal(nextDateForWeekday("2026-09-17", 1), "2026-09-21"); // 지난 월 → 다음 주
assert.equal(nextDateForWeekday("2026-09-19", 1), "2026-09-21"); // 토요일 → 다음 주 월
assert.equal(nextDateForWeekday("2026-09-20", 5), "2026-09-25"); // 일요일 → 다음 주 금
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/calendar.test.ts`
Expected: FAIL — `TypeError: (0 , calendar_1.weekdayOf) is not a function` 또는 유사한 "is not a function" 오류.

- [ ] **Step 3: 구현**

`src/lib/calendar.ts` 파일 끝에 추가:

```ts
export function weekdayOf(date: string): number {
  const { year, month, day } = parseDateValue(date);
  return new Date(year, month - 1, day).getDay();
}

export function addDays(date: string, days: number): string {
  const { year, month, day } = parseDateValue(date);
  const shifted = new Date(year, month - 1, day + days);
  return formatDateValue(shifted.getFullYear(), shifted.getMonth() + 1, shifted.getDate());
}

export function nextDateForWeekday(fromDate: string, weekday: number): string {
  const delta = (weekday - weekdayOf(fromDate) + 7) % 7;
  return addDays(fromDate, delta);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx tsx tests/calendar.test.ts`
Expected: `calendar util checks passed`

- [ ] **Step 5: 커밋**

```bash
git add src/lib/calendar.ts tests/calendar.test.ts
git commit -m "$(cat <<'EOF'
Add weekday and next-weekday date helpers to calendar lib

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LGV2H6Y2jd4vSd1eE4YqWL
EOF
)"
```

---

### Task 2: 참여 요일 헬퍼 — `src/lib/participation-days.ts`

**Files:**
- Create: `src/lib/participation-days.ts`
- Test: `tests/participation-days.test.ts` (신규)

**Interfaces:**
- Consumes: `weekdayOf` (Task 1), `SESSION_TYPES`/`SessionType` (`@/lib/sessions`)
- Produces:
  - `WEEKDAY_KEYS: readonly ["mon","tue","wed","thu","fri"]`, `type WeekdayKey`
  - `WEEKDAY_LABELS: Record<WeekdayKey, string>` (월~금)
  - `type DaySettings = { isParticipating: boolean } & Record<WeekdayKey, boolean>`
  - `type ParticipationDaysMap = Partial<Record<SessionType, DaySettings>>`
  - `weekdayKeyOf(date: string): WeekdayKey | null` (주말 → `null`)
  - `isActiveOn(settings: DaySettings | undefined, key: WeekdayKey): boolean`
  - `activeSessionTypesOn(days: ParticipationDaysMap, date: string): SessionType[]`
  - `activeDayCount(settings: DaySettings | undefined): number`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/participation-days.test.ts`:

```ts
import assert from "node:assert/strict";
import {
  WEEKDAY_KEYS,
  WEEKDAY_LABELS,
  activeDayCount,
  activeSessionTypesOn,
  isActiveOn,
  weekdayKeyOf,
  type DaySettings,
} from "../src/lib/participation-days";

const settings = (isParticipating: boolean, days: Partial<Record<keyof DaySettings, boolean>> = {}): DaySettings => ({
  isParticipating,
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
  ...days,
});

assert.deepEqual([...WEEKDAY_KEYS], ["mon", "tue", "wed", "thu", "fri"]);
assert.equal(WEEKDAY_LABELS.mon, "월");
assert.equal(WEEKDAY_LABELS.fri, "금");

// weekdayKeyOf: 2026-09-17 목, 2026-09-19 토, 2026-09-20 일
assert.equal(weekdayKeyOf("2026-09-17"), "thu");
assert.equal(weekdayKeyOf("2026-09-14"), "mon");
assert.equal(weekdayKeyOf("2026-09-19"), null);
assert.equal(weekdayKeyOf("2026-09-20"), null);

// isActiveOn: 레코드 없음·미참가·요일 false 는 모두 비활성
assert.equal(isActiveOn(undefined, "mon"), false);
assert.equal(isActiveOn(settings(false), "mon"), false);
assert.equal(isActiveOn(settings(true, { mon: false }), "mon"), false);
assert.equal(isActiveOn(settings(true), "mon"), true);

// activeSessionTypesOn: 목요일 — 오후2 는 목 비참여, 야간은 미참가
const days = {
  afternoon1: settings(true),
  afternoon2: settings(true, { thu: false }),
  night: settings(false),
};
assert.deepEqual(activeSessionTypesOn(days, "2026-09-17"), ["afternoon1"]);
assert.deepEqual(activeSessionTypesOn(days, "2026-09-16"), ["afternoon1", "afternoon2"]);
assert.deepEqual(activeSessionTypesOn(days, "2026-09-19"), []);
assert.deepEqual(activeSessionTypesOn({}, "2026-09-16"), []);

// activeDayCount
assert.equal(activeDayCount(undefined), 0);
assert.equal(activeDayCount(settings(false)), 0);
assert.equal(activeDayCount(settings(true, { tue: false, thu: false })), 3);

console.log("participation-days checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/participation-days.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/participation-days'`

- [ ] **Step 3: 구현**

`src/lib/participation-days.ts`:

```ts
import { weekdayOf } from "@/lib/calendar";
import { SESSION_TYPES, type SessionType } from "@/lib/sessions";

export const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금",
};

// `/api/student/participation-days` 응답의 participationDays[sessionType] 과 같은 형태
export type DaySettings = { isParticipating: boolean } & Record<WeekdayKey, boolean>;

export type ParticipationDaysMap = Partial<Record<SessionType, DaySettings>>;

export function weekdayKeyOf(date: string): WeekdayKey | null {
  // getDay() 는 일=0 이므로 월~금은 1~5
  const index = weekdayOf(date) - 1;
  return index >= 0 && index < WEEKDAY_KEYS.length ? WEEKDAY_KEYS[index] : null;
}

// 레코드가 없으면 비활성으로 본다 — 학생 화면의 회색 표시와 같은 규칙(출석 API 의 "기본 참여" 와 다름)
export function isActiveOn(settings: DaySettings | undefined, key: WeekdayKey): boolean {
  return !!settings && settings.isParticipating && settings[key];
}

export function activeSessionTypesOn(days: ParticipationDaysMap, date: string): SessionType[] {
  const key = weekdayKeyOf(date);
  if (!key) return [];
  return SESSION_TYPES.filter((sessionType) => isActiveOn(days[sessionType], key));
}

export function activeDayCount(settings: DaySettings | undefined): number {
  if (!settings?.isParticipating) return 0;
  return WEEKDAY_KEYS.filter((key) => settings[key]).length;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx tsx tests/participation-days.test.ts`
Expected: `participation-days checks passed`

- [ ] **Step 5: 커밋**

```bash
git add src/lib/participation-days.ts tests/participation-days.test.ts
git commit -m "$(cat <<'EOF'
Add participation-day helpers for weekday activity lookup

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LGV2H6Y2jd4vSd1eE4YqWL
EOF
)"
```

---

### Task 3: 좌석 그룹 규칙 — `src/lib/seats/student-seat-group.ts`

**Files:**
- Create: `src/lib/seats/student-seat-group.ts`
- Test: `tests/student-seat-group.test.ts` (신규)

**Interfaces:**
- Consumes: `classroomTitle(grade, classNumber)`, `roomPrefix(name)` (`@/lib/seats/print-groups`), `CorridorSide` (`@/lib/seats/classroom-config`), `SeatSessionType` (`@/lib/sessions`)
- Produces:
  - `type StudentSeatRoomInput = { id; name; cols; rows; sortOrder; classroomId: number | null; classroom?: { classNumber: number; corridorSide: CorridorSide } | null }`
  - `type SeatGroupKind = "classroom" | "room"`
  - `selectSeatGroupRooms<T extends StudentSeatRoomInput>(myRoom: StudentSeatRoomInput, sessionRooms: T[], grade: number): { kind: SeatGroupKind; title: string; corridorSide: CorridorSide | null; rooms: T[] }`
  - API 응답 타입: `StudentSeatStudent`, `StudentSeatCell`, `StudentSeatRoom`, `StudentSeatGroup`, `StudentSeatsResponse = Record<SeatSessionType, StudentSeatGroup | null>`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/student-seat-group.test.ts`:

```ts
import assert from "node:assert/strict";
import { selectSeatGroupRooms, type StudentSeatRoomInput } from "../src/lib/seats/student-seat-group";

const classroom = (classNumber: number, corridorSide: "left" | "right" = "right") => ({ classNumber, corridorSide });

const room = (
  id: number,
  name: string,
  sortOrder: number,
  classroomId: number | null = null,
  meta: ReturnType<typeof classroom> | null = null
): StudentSeatRoomInput => ({ id, name, cols: 2, rows: 3, sortOrder, classroomId, classroom: meta });

// 2학년 오후: 학급 2-4반(분단 3, 정렬 어긋남) + 2-5반 + 미래혜윰 접두사 그룹 2개
const afternoonRooms = [
  room(3, "2-4반 분단3", 3, 40, classroom(4, "left")),
  room(1, "2-4반 분단1", 1, 40, classroom(4, "left")),
  room(2, "2-4반 분단2", 2, 40, classroom(4, "left")),
  room(4, "2-5반 분단1", 4, 50, classroom(5)),
  room(10, "오후미래혜윰1 분단1", 10),
  room(11, "오후미래혜윰1 분단2", 11),
  room(12, "오후미래혜윰2 분단1", 12),
];

// 학급 교실: 같은 classroomId 전부, sortOrder 순, 제목 "2-4반", 복도 위치 전달
const classroomGroup = selectSeatGroupRooms(afternoonRooms[0], afternoonRooms, 2);
assert.equal(classroomGroup.kind, "classroom");
assert.equal(classroomGroup.title, "2-4반");
assert.equal(classroomGroup.corridorSide, "left");
assert.deepEqual(classroomGroup.rooms.map((r) => r.id), [1, 2, 3]);

// 별도 교실: 이름 접두사가 같은 Room 만, 학급 Room 과 다른 접두사는 제외
const miraeGroup = selectSeatGroupRooms(afternoonRooms[5], afternoonRooms, 2);
assert.equal(miraeGroup.kind, "room");
assert.equal(miraeGroup.title, "오후미래혜윰1");
assert.equal(miraeGroup.corridorSide, null);
assert.deepEqual(miraeGroup.rooms.map((r) => r.id), [10, 11]);

// 야간 단일 방: 그 방 하나, 제목은 방 이름
const nightRooms = [room(20, "미래혜윰실2", 1), room(21, "미래202", 2), room(22, "미래혜윰실1", 5)];
const single = selectSeatGroupRooms(nightRooms[1], nightRooms, 2);
assert.equal(single.kind, "room");
assert.equal(single.title, "미래202");
assert.deepEqual(single.rooms.map((r) => r.id), [21]);

console.log("student-seat-group checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/student-seat-group.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/seats/student-seat-group'`

- [ ] **Step 3: 구현**

`src/lib/seats/student-seat-group.ts`:

```ts
import type { CorridorSide } from "@/lib/seats/classroom-config";
import { classroomTitle, roomPrefix } from "@/lib/seats/print-groups";
import type { SeatSessionType } from "@/lib/sessions";

export type StudentSeatRoomInput = {
  id: number;
  name: string;
  cols: number;
  rows: number;
  sortOrder: number;
  classroomId: number | null;
  classroom?: { classNumber: number; corridorSide: CorridorSide } | null;
};

export type SeatGroupKind = "classroom" | "room";

export type SeatGroupSelection<T extends StudentSeatRoomInput> = {
  kind: SeatGroupKind;
  title: string;
  corridorSide: CorridorSide | null;
  rooms: T[];
};

// 학급 교실이면 그 Classroom 의 분단 전부, 아니면 같은 이름 접두사의 방 묶음(인쇄 그룹과 같은 규칙)
export function selectSeatGroupRooms<T extends StudentSeatRoomInput>(
  myRoom: StudentSeatRoomInput,
  sessionRooms: T[],
  grade: number
): SeatGroupSelection<T> {
  const byOrder = (a: T, b: T) => a.sortOrder - b.sortOrder || a.id - b.id;

  if (myRoom.classroomId != null) {
    const rooms = sessionRooms.filter((r) => r.classroomId === myRoom.classroomId).sort(byOrder);
    const meta = myRoom.classroom;
    return {
      kind: "classroom",
      title: meta ? classroomTitle(grade, meta.classNumber) : roomPrefix(myRoom.name),
      corridorSide: meta?.corridorSide ?? null,
      rooms,
    };
  }

  const prefix = roomPrefix(myRoom.name);
  const rooms = sessionRooms
    .filter((r) => r.classroomId == null && roomPrefix(r.name) === prefix)
    .sort(byOrder);
  return { kind: "room", title: prefix, corridorSide: null, rooms };
}

export type StudentSeatStudent = { id: number; name: string; classNumber: number; studentNumber: number };
export type StudentSeatCell = { rowIndex: number; colIndex: number; student: StudentSeatStudent | null };
export type StudentSeatRoom = {
  id: number;
  name: string;
  cols: number;
  rows: number;
  sortOrder: number;
  seats: StudentSeatCell[];
};
export type StudentSeatGroup = {
  title: string;
  kind: SeatGroupKind;
  corridorSide: CorridorSide | null;
  rooms: StudentSeatRoom[];
  mySeat: { roomId: number; rowIndex: number; colIndex: number };
};
export type StudentSeatsResponse = Record<SeatSessionType, StudentSeatGroup | null>;
```

- [ ] **Step 4: 통과 확인**

Run: `npx tsx tests/student-seat-group.test.ts`
Expected: `student-seat-group checks passed`

- [ ] **Step 5: 커밋**

```bash
git add src/lib/seats/student-seat-group.ts tests/student-seat-group.test.ts
git commit -m "$(cat <<'EOF'
Add seat group selection rule for the student seat view

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LGV2H6Y2jd4vSd1eE4YqWL
EOF
)"
```

---

### Task 4: 학생 좌석 API — `GET /api/student/seats`

**Files:**
- Create: `src/app/api/student/seats/route.ts`
- Test: `tests/student-schedule-wiring.test.ts` (신규 — 이후 Task 들이 블록을 추가)

**Interfaces:**
- Consumes: `selectSeatGroupRooms`, `StudentSeatGroup`, `StudentSeatsResponse` (Task 3), `withAuth` (`@/lib/api-auth` — 핸들러 인자 `user.userId`), `prisma` (`@/lib/prisma`), `SEAT_SESSION_TYPES` (`@/lib/sessions`)
- Produces: `GET /api/student/seats` → JSON `StudentSeatsResponse` (`{ afternoon: StudentSeatGroup | null, night: StudentSeatGroup | null }`)

- [ ] **Step 1: 실패하는 배선 테스트 작성**

`tests/student-schedule-wiring.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// --- 좌석 API: 학생 전용, 내 userId 기준, 그룹 규칙은 lib, 출결/불참 정보 노출 없음 ---
const seatsApi = read("../src/app/api/student/seats/route.ts");
assert.match(seatsApi, /withAuth\(\["student"\]/, "seats API 가 학생 전용이 아님");
assert.match(seatsApi, /where: \{ studentId: user\.userId \}/, "내 좌석을 세션 userId 로 조회하지 않음");
assert.match(seatsApi, /selectSeatGroupRooms\(/, "그룹 규칙을 lib 헬퍼로 계산하지 않음");
assert.match(seatsApi, /SEAT_SESSION_TYPES\.map/, "오후/야간을 SEAT_SESSION_TYPES 로 돌지 않음");
assert.doesNotMatch(seatsApi, /prisma\.attendance|prisma\.absenceRequest/, "좌석 API 가 출결/불참 정보를 조회함");

console.log("student-schedule-wiring checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/student-schedule-wiring.test.ts`
Expected: FAIL — `ENOENT: no such file or directory ... src/app/api/student/seats/route.ts`

- [ ] **Step 3: 구현**

`src/app/api/student/seats/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { SEAT_SESSION_TYPES, type SeatSessionType } from "@/lib/sessions";
import {
  selectSeatGroupRooms,
  type StudentSeatGroup,
  type StudentSeatsResponse,
} from "@/lib/seats/student-seat-group";

const CLASSROOM_SELECT = { select: { classNumber: true, corridorSide: true } } as const;

// GET /api/student/seats — 내 좌석이 속한 교실(학급 분단 전부 또는 같은 접두사의 방 묶음)을 좌석 세션별로 반환
export const GET = withAuth(["student"], async (_req: Request, user) => {
  const myLayouts = await prisma.seatLayout.findMany({
    where: { studentId: user.userId },
    include: {
      room: {
        include: {
          classroom: CLASSROOM_SELECT,
          session: { select: { type: true, grade: true } },
        },
      },
    },
    orderBy: [{ room: { sortOrder: "asc" } }, { rowIndex: "asc" }, { colIndex: "asc" }],
  });

  async function buildGroup(seatSession: SeatSessionType): Promise<StudentSeatGroup | null> {
    const mine = myLayouts.find((layout) => layout.room.session.type === seatSession);
    if (!mine) return null;

    const sessionRooms = await prisma.room.findMany({
      where: { sessionId: mine.room.sessionId },
      include: { classroom: CLASSROOM_SELECT },
    });
    const selection = selectSeatGroupRooms(mine.room, sessionRooms, mine.room.session.grade);

    const seats = await prisma.seatLayout.findMany({
      where: { roomId: { in: selection.rooms.map((room) => room.id) } },
      include: { student: { select: { id: true, name: true, classNumber: true, studentNumber: true } } },
      orderBy: [{ rowIndex: "asc" }, { colIndex: "asc" }],
    });

    return {
      title: selection.title,
      kind: selection.kind,
      corridorSide: selection.corridorSide,
      rooms: selection.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        cols: room.cols,
        rows: room.rows,
        sortOrder: room.sortOrder,
        seats: seats
          .filter((seat) => seat.roomId === room.id)
          .map((seat) => ({ rowIndex: seat.rowIndex, colIndex: seat.colIndex, student: seat.student })),
      })),
      mySeat: { roomId: mine.roomId, rowIndex: mine.rowIndex, colIndex: mine.colIndex },
    };
  }

  const entries = await Promise.all(
    SEAT_SESSION_TYPES.map(async (seatSession) => [seatSession, await buildGroup(seatSession)] as const)
  );
  const response = Object.fromEntries(entries) as StudentSeatsResponse;
  return NextResponse.json(response);
});
```

- [ ] **Step 4: 통과 + 타입 확인**

Run: `npx tsx tests/student-schedule-wiring.test.ts`
Expected: `student-schedule-wiring checks passed`

Run: `npx tsc --noEmit`
Expected: 출력 없음(오류 0). `mine.room` 이 `StudentSeatRoomInput` 에 맞지 않는다는 오류가 나면 Task 3 의 `classroom?: {...} | null` 정의와 `CLASSROOM_SELECT` 의 `select` 필드가 일치하는지 확인.

Run: `npx tsx tests/session-literal-guard.test.ts`
Expected: `session-literal-guard checks passed` (이 라우트에는 `"afternoon"` 리터럴이 없어야 한다)

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/student/seats/route.ts tests/student-schedule-wiring.test.ts
git commit -m "$(cat <<'EOF'
Add student seats API returning my classroom or room seat group

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LGV2H6Y2jd4vSd1eE4YqWL
EOF
)"
```

---

### Task 5: 읽기 전용 좌석 격자 — `StudentSeatGrid`

**Files:**
- Create: `src/components/seats/StudentSeatGrid.tsx`
- Test: `tests/student-schedule-wiring.test.ts` (블록 추가)

**Interfaces:**
- Consumes: `StudentSeatRoom` (Task 3)
- Produces: `default export StudentSeatGrid({ room: StudentSeatRoom; mySeat: { roomId: number; rowIndex: number; colIndex: number }; gapAfterRows?: number[] })`

- [ ] **Step 1: 실패하는 배선 테스트 추가**

`tests/student-schedule-wiring.test.ts`의 `console.log(...)` 바로 위에 추가:

```ts
// --- 읽기 전용 좌석 격자: dnd 없음, 최소 셀 폭으로 가로 스크롤, 내 자리 aria-current ---
const seatGrid = read("../src/components/seats/StudentSeatGrid.tsx");
assert.doesNotMatch(seatGrid, /@dnd-kit/, "StudentSeatGrid 가 dnd-kit 에 의존함");
assert.match(seatGrid, /minmax\(\$\{MIN_SEAT_WIDTH\}px, 1fr\)/, "셀 최소 폭이 없음 — 좁은 화면에서 이름이 쪼개짐");
assert.match(seatGrid, /aria-current=\{isMine \? "true" : undefined\}/, "내 자리에 aria-current 가 없음");
assert.match(seatGrid, /min-h-11/, "좌석 셀 높이가 44px 미만");
assert.match(seatGrid, /whitespace-nowrap/, "이름 줄바꿈 방지가 없음");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/student-schedule-wiring.test.ts`
Expected: FAIL — `ENOENT ... StudentSeatGrid.tsx`

- [ ] **Step 3: 구현**

`src/components/seats/StudentSeatGrid.tsx`:

```tsx
"use client";

import type { StudentSeatRoom } from "@/lib/seats/student-seat-group";

export type MySeatRef = { roomId: number; rowIndex: number; colIndex: number };

// 이름 4자(text-xs) + 테두리가 한 줄에 들어가는 폭. 폭이 부족하면 부모(overflow-x-auto)가 가로 스크롤한다.
const MIN_SEAT_WIDTH = 52;

export default function StudentSeatGrid({
  room,
  mySeat,
  gapAfterRows,
}: {
  room: StudentSeatRoom;
  mySeat: MySeatRef;
  gapAfterRows?: number[];
}) {
  const studentAt = new Map(room.seats.map((seat) => [`${seat.rowIndex}-${seat.colIndex}`, seat.student]));

  return (
    <div className="flex flex-col">
      {Array.from({ length: room.rows }, (_, row) => (
        <div
          key={row}
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${room.cols}, minmax(${MIN_SEAT_WIDTH}px, 1fr))`,
            marginBottom: gapAfterRows?.includes(row) ? "12px" : "4px",
          }}
        >
          {Array.from({ length: room.cols }, (_, col) => {
            const student = studentAt.get(`${row}-${col}`) ?? null;
            const isMine = mySeat.roomId === room.id && mySeat.rowIndex === row && mySeat.colIndex === col;
            if (!student) {
              return <div key={col} className="min-h-11 rounded border border-gray-100 bg-gray-50" />;
            }
            return (
              <div
                key={col}
                aria-current={isMine ? "true" : undefined}
                title={student.name}
                className={`min-h-11 rounded border px-1 flex flex-col items-center justify-center text-xs leading-tight whitespace-nowrap ${
                  isMine ? "bg-blue-600 border-blue-700 text-white font-bold" : "bg-white border-gray-200 text-gray-800"
                }`}
              >
                <span className={`text-[10px] ${isMine ? "text-blue-100" : "text-gray-400"}`}>
                  {student.classNumber}-{student.studentNumber}
                </span>
                <span className="block max-w-full overflow-hidden text-ellipsis">{student.name}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx tsx tests/student-schedule-wiring.test.ts`
Expected: `student-schedule-wiring checks passed`

Run: `npx tsc --noEmit`
Expected: 오류 0

- [ ] **Step 5: 커밋**

```bash
git add src/components/seats/StudentSeatGrid.tsx tests/student-schedule-wiring.test.ts
git commit -m "$(cat <<'EOF'
Add read-only StudentSeatGrid with own-seat highlight

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LGV2H6Y2jd4vSd1eE4YqWL
EOF
)"
```

---

### Task 6: 좌석 확인 카드 — `SeatCheckCard`

**Files:**
- Create: `src/components/student/SeatCheckCard.tsx`
- Modify: `tests/session-literal-guard.test.ts` (허용목록에 추가)
- Test: `tests/student-schedule-wiring.test.ts` (블록 추가)

**Interfaces:**
- Consumes: `StudentSeatGrid` (Task 5), `StudentSeatGroup`/`StudentSeatsResponse` (Task 3), `ParticipationDaysMap` (Task 2), `ClassroomFrame` (`@/components/seats/ClassroomFrame`, props `{ corridorSide, variant: "screen" | "print", showTeacherDesk?, children }`), `GAP_CONFIG` (`@/components/seats/MiraeHallLayout`, `Record<string, number[]>`), `divisionLabel(name)` (`@/lib/seats/print-groups`), `SEAT_SESSION_TYPES`/`SEAT_SESSION_META`/`sessionTypesOfSeat`/`SeatSessionType` (`@/lib/sessions`)
- Produces: `default export SeatCheckCard({ participationDays: ParticipationDaysMap })` — 자체 SWR 로 `/api/student/seats` 조회

- [ ] **Step 1: 실패하는 배선 테스트 추가**

`tests/student-schedule-wiring.test.ts`의 `console.log(...)` 바로 위에 추가:

```ts
// --- 좌석 확인 카드: 오후/야간 탭, 기본 탭은 렌더 파생, ClassroomFrame 재사용, 가로 스크롤 래퍼 ---
const seatCard = read("../src/components/student/SeatCheckCard.tsx");
assert.match(seatCard, /useSWR<StudentSeatsResponse>\("\/api\/student\/seats"/, "좌석 API 를 SWR 로 조회하지 않음");
assert.match(seatCard, /SEAT_SESSION_TYPES\.map/, "탭을 SEAT_SESSION_TYPES 로 그리지 않음");
assert.match(seatCard, /useState<SeatSessionType \| null>\(null\)/, "탭 선택 상태가 없음");
assert.match(seatCard, /picked \?\? firstWithGroup \?\? "afternoon"/, "기본 탭을 렌더에서 파생하지 않음");
assert.doesNotMatch(seatCard, /useEffect/, "effect 안 setState 금지 — 파생값으로 계산");
assert.match(seatCard, /import ClassroomFrame from/, "학급 그룹을 ClassroomFrame 으로 그리지 않음");
assert.match(seatCard, /variant="screen"/, "ClassroomFrame 화면 variant 가 아님");
assert.match(seatCard, /<div className="overflow-x-auto">/, "격자 래퍼에 가로 스크롤이 없음");
assert.match(seatCard, /GAP_CONFIG\[room\.name\]/, "야간 미래혜윰실 블록 간격을 재사용하지 않음");
assert.match(seatCard, /내 자리: /, "내 자리 위치 문구가 없음");
assert.match(seatCard, /배정된 좌석이 없습니다\./, "좌석 없음 문구가 없음");
assert.match(seatCard, /sessionTypesOfSeat\(tab\)\.some/, "미참가 판정을 좌석 세션의 블록으로 하지 않음");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/student-schedule-wiring.test.ts`
Expected: FAIL — `ENOENT ... SeatCheckCard.tsx`

- [ ] **Step 3: 구현**

`src/components/student/SeatCheckCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import ClassroomFrame from "@/components/seats/ClassroomFrame";
import { GAP_CONFIG } from "@/components/seats/MiraeHallLayout";
import StudentSeatGrid from "@/components/seats/StudentSeatGrid";
import type { ParticipationDaysMap } from "@/lib/participation-days";
import { divisionLabel } from "@/lib/seats/print-groups";
import type { StudentSeatGroup, StudentSeatsResponse } from "@/lib/seats/student-seat-group";
import { SEAT_SESSION_META, SEAT_SESSION_TYPES, sessionTypesOfSeat, type SeatSessionType } from "@/lib/sessions";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function mySeatLabel(group: StudentSeatGroup): string {
  const room = group.rooms.find((r) => r.id === group.mySeat.roomId);
  const position = `${group.mySeat.rowIndex + 1}행 ${group.mySeat.colIndex + 1}열`;
  return room && group.rooms.length > 1 ? `${divisionLabel(room.name)} · ${position}` : position;
}

export default function SeatCheckCard({ participationDays }: { participationDays: ParticipationDaysMap }) {
  const { data, error, isLoading } = useSWR<StudentSeatsResponse>("/api/student/seats", fetcher);
  const [picked, setPicked] = useState<SeatSessionType | null>(null);
  // 데이터가 비동기로 오므로 기본 탭은 렌더에서 파생한다 (effect 안 setState 금지)
  const firstWithGroup = SEAT_SESSION_TYPES.find((seatSession) => data?.[seatSession]);
  const tab: SeatSessionType = picked ?? firstWithGroup ?? "afternoon";
  const group = data?.[tab] ?? null;
  const participates = sessionTypesOfSeat(tab).some((sessionType) => participationDays[sessionType]?.isParticipating);

  function renderBody() {
    if (isLoading) return <p className="text-sm text-gray-400">불러오는 중...</p>;
    if (error || !data) return <p className="text-sm text-red-600">좌석 정보를 불러오지 못했습니다.</p>;
    if (!group) {
      return (
        <p className="text-sm text-gray-400">
          {participates ? "배정된 좌석이 없습니다." : `${SEAT_SESSION_META[tab].label} 미참가`}
        </p>
      );
    }

    const assignedCount = group.rooms.reduce((sum, room) => sum + room.seats.filter((seat) => seat.student).length, 0);
    const showDivisionLabels = group.rooms.length > 1;
    const grids = group.rooms.map((room) => (
      <div key={room.id} className="min-w-0">
        {showDivisionLabels && (
          <p className="mb-1 text-center text-[11px] text-gray-500 whitespace-nowrap">{divisionLabel(room.name)}</p>
        )}
        <StudentSeatGrid room={room} mySeat={group.mySeat} gapAfterRows={GAP_CONFIG[room.name]} />
      </div>
    ));

    return (
      <>
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="text-sm font-bold text-gray-800 whitespace-nowrap">{group.title}</span>
          <span className="text-xs text-gray-400 whitespace-nowrap">{assignedCount}석</span>
        </div>
        <p className="mb-3 text-xs text-blue-700 whitespace-nowrap">내 자리: {mySeatLabel(group)}</p>
        <div className="overflow-x-auto">
          {group.kind === "classroom" && group.corridorSide ? (
            <ClassroomFrame corridorSide={group.corridorSide} variant="screen">
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${group.rooms.length}, 1fr)` }}>
                {grids}
              </div>
            </ClassroomFrame>
          ) : (
            <div className="flex flex-col gap-3">
              {grids}
              {tab === "afternoon" && (
                <div className="text-center py-1.5 bg-gray-50 border-t border-dashed border-gray-300 text-gray-400 text-xs whitespace-nowrap">
                  교탁
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-medium text-gray-600 whitespace-nowrap">좌석 확인</h3>
        <div className="flex gap-1">
          {SEAT_SESSION_TYPES.map((seatSession) => (
            <button
              key={seatSession}
              type="button"
              onClick={() => setPicked(seatSession)}
              className={`min-h-11 px-3 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                tab === seatSession ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {SEAT_SESSION_META[seatSession].label}
            </button>
          ))}
        </div>
      </div>
      {renderBody()}
    </div>
  );
}
```

- [ ] **Step 4: session-literal-guard 허용목록 갱신**

`tests/session-literal-guard.test.ts`의 `SEAT_CONTEXT_ALLOWLIST` 배열에서 `"app/student/absence-requests/page.tsx",` **바로 위**에 한 줄 추가(기존 항목은 건드리지 않는다 — 그 항목은 Task 10 에서 제거):

```ts
  // 좌석 확인 카드: 기본 탭 폴백과 교탁 표시(오후만) 분기
  "components/student/SeatCheckCard.tsx",
```

- [ ] **Step 5: 통과 확인**

Run: `npx tsx tests/student-schedule-wiring.test.ts`
Expected: `student-schedule-wiring checks passed`

Run: `npx tsx tests/session-literal-guard.test.ts`
Expected: `session-literal-guard checks passed`

Run: `npx tsx tests/classroom-wiring.test.ts`
Expected: `classroom-wiring checks passed` (기존 3곳 단언은 고정 목록이라 영향 없음)

Run: `npx tsc --noEmit`
Expected: 오류 0

- [ ] **Step 6: 커밋**

```bash
git add src/components/student/SeatCheckCard.tsx tests/session-literal-guard.test.ts tests/student-schedule-wiring.test.ts
git commit -m "$(cat <<'EOF'
Add SeatCheckCard showing the student's afternoon and night seats

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LGV2H6Y2jd4vSd1eE4YqWL
EOF
)"
```

---

### Task 7: 참여일정 3행 격자 — `ParticipationScheduleCard`

**Files:**
- Create: `src/components/student/ParticipationScheduleCard.tsx`
- Modify: `tests/participation-wiring.test.ts:30-32` (학생 페이지 단언 → 카드 단언)
- Test: `tests/student-schedule-wiring.test.ts` (블록 추가)

**Interfaces:**
- Consumes: `addDays`, `nextDateForWeekday`, `weekdayOf` (Task 1); `WEEKDAY_KEYS`, `WEEKDAY_LABELS`, `activeDayCount`, `isActiveOn`, `weekdayKeyOf`, `ParticipationDaysMap` (Task 2); `SESSION_TYPES`, `SESSION_META`, `SessionType` (`@/lib/sessions`)
- Produces: `default export ParticipationScheduleCard({ participationDays: ParticipationDaysMap; today: string; onSelectDay: (sessionType: SessionType, date: string) => void })`

- [ ] **Step 1: 실패하는 배선 테스트 추가**

`tests/student-schedule-wiring.test.ts`의 `console.log(...)` 바로 위에 추가:

```ts
// --- 참여일정 카드: 인덱스 + 5요일 격자, 오늘 강조, 다음 돌아오는 요일로 신청 진입 ---
const scheduleCard = read("../src/components/student/ParticipationScheduleCard.tsx");
assert.match(scheduleCard, /grid-cols-\[auto_repeat\(5,1fr\)\] gap-2/, "3행 격자(인덱스+5요일, 8px 간격)가 아님");
assert.match(scheduleCard, /SESSION_TYPES\.map\(\(sessionType\) =>/, "행을 SESSION_TYPES 로 그리지 않음");
assert.match(scheduleCard, /WEEKDAY_KEYS\.map\(\(key, index\) =>/, "요일 셀을 WEEKDAY_KEYS 로 그리지 않음");
assert.match(scheduleCard, /nextDateForWeekday\(today, index \+ 1\)/, "셀 날짜가 다음 돌아오는 요일이 아님");
assert.match(scheduleCard, /onSelectDay\(sessionType, date\)/, "셀 클릭이 세션+날짜를 넘기지 않음");
assert.match(scheduleCard, /border-blue-700/, "오늘 열 진한 테두리가 없음");
assert.match(scheduleCard, /다음주/, "다음 주로 넘어간 셀 표시가 없음");
assert.match(scheduleCard, /미참가/, "미참가 세션 캡션이 없음");
assert.match(scheduleCard, /"오늘"/, "오늘 캡션이 없음");
assert.match(scheduleCard, /min-h-11/, "요일 셀 높이가 44px 미만");
assert.doesNotMatch(scheduleCard, /participationDays\?\.afternoon/, "옛 afternoon 키 접근이 남아 있음");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/student-schedule-wiring.test.ts`
Expected: FAIL — `ENOENT ... ParticipationScheduleCard.tsx`

- [ ] **Step 3: 구현**

`src/components/student/ParticipationScheduleCard.tsx`:

```tsx
"use client";

import { Fragment } from "react";
import { addDays, nextDateForWeekday, weekdayOf } from "@/lib/calendar";
import {
  WEEKDAY_KEYS,
  WEEKDAY_LABELS,
  activeDayCount,
  isActiveOn,
  weekdayKeyOf,
  type ParticipationDaysMap,
} from "@/lib/participation-days";
import { SESSION_META, SESSION_TYPES, type SessionType } from "@/lib/sessions";

function shortDate(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${month}/${day}`;
}

export default function ParticipationScheduleCard({
  participationDays,
  today,
  onSelectDay,
}: {
  participationDays: ParticipationDaysMap;
  today: string;
  onSelectDay: (sessionType: SessionType, date: string) => void;
}) {
  const todayKey = weekdayKeyOf(today);
  // 주말(토=6, 일=0)에도 "이번 주" 는 지난 월요일부터 센다
  const thisMonday = addDays(today, -((weekdayOf(today) + 6) % 7));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-2">
        {SESSION_TYPES.map((sessionType) => {
          const settings = participationDays[sessionType];
          const participating = !!settings?.isParticipating;
          return (
            <Fragment key={sessionType}>
              <div className="flex flex-col justify-center pr-1 whitespace-nowrap">
                <span className={`text-sm font-medium ${participating ? "text-gray-700" : "text-gray-400"}`}>
                  {SESSION_META[sessionType].shortLabel}
                </span>
                <span className="text-[10px] text-gray-400">
                  {participating ? `주 ${activeDayCount(settings)}일` : "미참가"}
                </span>
              </div>
              {WEEKDAY_KEYS.map((key, index) => {
                const active = isActiveOn(settings, key);
                const isToday = key === todayKey;
                // getDay() 기준 월=1 … 금=5
                const date = nextDateForWeekday(today, index + 1);
                const isNextWeek = date !== addDays(thisMonday, index);
                const border = isToday ? (active ? "border-blue-700" : "border-gray-400") : "border-transparent";
                const label = WEEKDAY_LABELS[key];
                if (!active) {
                  return (
                    <div
                      key={key}
                      className={`min-h-11 rounded-lg border-2 ${border} bg-gray-100 text-gray-300 flex items-center justify-center text-sm font-medium whitespace-nowrap`}
                    >
                      {label}
                    </div>
                  );
                }
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectDay(sessionType, date)}
                    title={date}
                    aria-label={`${SESSION_META[sessionType].shortLabel} ${shortDate(date)}(${label}) 불참 신청`}
                    className={`min-h-11 rounded-lg border-2 ${border} bg-blue-100 text-blue-700 hover:bg-blue-200 flex flex-col items-center justify-center text-sm font-medium whitespace-nowrap transition-colors`}
                  >
                    {label}
                    {isNextWeek && <span className="text-[9px] leading-none text-blue-500">다음주</span>}
                  </button>
                );
              })}
            </Fragment>
          );
        })}
        {todayKey && (
          <>
            <div />
            {WEEKDAY_KEYS.map((key) => (
              <div key={key} className="text-center text-[10px] font-semibold text-blue-700 whitespace-nowrap">
                {key === todayKey ? "오늘" : ""}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `tests/participation-wiring.test.ts` 갱신**

기존 3줄:

```ts
const studentPage = read("../src/app/student/page.tsx");
assert.match(studentPage, /SESSION_TYPES\.map\(\(t\) => renderSession/, "학생 참여일정이 3세션을 그리지 않음");
assert.doesNotMatch(studentPage, /participationDays\?\.afternoon/, "옛 afternoon 키 접근이 남아 있음");
```

를 이렇게 교체:

```ts
const scheduleCard = read("../src/components/student/ParticipationScheduleCard.tsx");
assert.match(scheduleCard, /SESSION_TYPES\.map\(\(sessionType\) =>/, "학생 참여일정이 3세션을 그리지 않음");
assert.doesNotMatch(scheduleCard, /participationDays\?\.afternoon/, "옛 afternoon 키 접근이 남아 있음");
```

- [ ] **Step 5: 통과 확인**

Run: `npx tsx tests/student-schedule-wiring.test.ts`
Expected: `student-schedule-wiring checks passed`

Run: `npx tsx tests/participation-wiring.test.ts`
Expected: `participation-wiring checks passed`

Run: `npx tsc --noEmit`
Expected: 오류 0

- [ ] **Step 6: 커밋**

```bash
git add src/components/student/ParticipationScheduleCard.tsx tests/participation-wiring.test.ts tests/student-schedule-wiring.test.ts
git commit -m "$(cat <<'EOF'
Add ParticipationScheduleCard with a three-row weekday grid

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LGV2H6Y2jd4vSd1eE4YqWL
EOF
)"
```

---

### Task 8: 불참 신청 폼 컴포넌트 — `AbsenceRequestForm`

**Files:**
- Create: `src/components/student/AbsenceRequestForm.tsx`
- Modify: `tests/absence-request-wiring.test.ts:12-16` (학생 폼 단언 대상 변경)
- Test: `tests/student-schedule-wiring.test.ts` (블록 추가)

**Interfaces:**
- Consumes: `activeSessionTypesOn`, `ParticipationDaysMap` (Task 2); `REASON_TYPES`, `REASON_LABELS`, `ReasonType` (`@/lib/absence-reasons`); `SESSION_TYPES`, `SESSION_META`, `SessionType` (`@/lib/sessions`); 기존 `POST /api/student/absence-requests` (`{ date, sessionTypes, reasonType, detail? }`, 201 → `{created, skipped}`, 오류 → `{ error }`)
- Produces: `default export AbsenceRequestForm({ initialDate: string; initialSessionTypes: SessionType[]; today: string; participationDays: ParticipationDaysMap; onClose: () => void; onSubmitted: () => void })`

- [ ] **Step 1: 실패하는 배선 테스트 추가**

`tests/student-schedule-wiring.test.ts`의 `console.log(...)` 바로 위에 추가:

```ts
// --- 신청 폼: 날짜 요일의 활성 세션만 선택 가능, [전체], 사유 4열 한 행, 기타일 때만 상세 사유 ---
const requestForm = read("../src/components/student/AbsenceRequestForm.tsx");
assert.match(requestForm, /const activeTypes = activeSessionTypesOn\(participationDays, date\)/, "활성 세션을 날짜 요일로 계산하지 않음");
assert.match(requestForm, /disabled=\{disabled\}/, "비활성 세션 버튼이 disabled 가 아님");
assert.match(requestForm, />\s*전체\s*</, "[전체] 버튼이 없음");
assert.doesNotMatch(requestForm, /오후 전체|sessionTypesOfSeat/, "옛 오후 전체 편의 버튼이 남아 있음");
assert.match(requestForm, /grid grid-cols-4 gap-2/, "사유 4개가 한 행이 아님");
assert.match(requestForm, /REASON_TYPES\.map/, "사유 버튼을 REASON_TYPES 로 그리지 않음");
assert.match(requestForm, /\{reasonType === "custom" && \(/, "상세 사유가 기타일 때만 렌더되지 않음");
assert.match(requestForm, /detail: reasonType === "custom" && detail\.trim\(\) \? detail\.trim\(\) : undefined/, "상세 사유를 기타일 때만 보내지 않음");
assert.match(requestForm, /해당 날짜에는 참여 일정이 없습니다\./, "활성 세션 없음 안내가 없음");
assert.match(requestForm, /불참 신청하기/, "폼 제목이 없음");
assert.match(requestForm, /onClick=\{onClose\}/, "닫기 버튼이 onClose 를 부르지 않음");
assert.match(requestForm, /onSubmitted\(\)/, "성공 시 onSubmitted 를 부르지 않음");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/student-schedule-wiring.test.ts`
Expected: FAIL — `ENOENT ... AbsenceRequestForm.tsx`

- [ ] **Step 3: 구현**

`src/components/student/AbsenceRequestForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { REASON_LABELS, REASON_TYPES, type ReasonType } from "@/lib/absence-reasons";
import { activeSessionTypesOn, type ParticipationDaysMap } from "@/lib/participation-days";
import { SESSION_META, SESSION_TYPES, type SessionType } from "@/lib/sessions";

const DISABLED_BUTTON = "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed";
const SELECTED_BUTTON = "border-blue-600 bg-blue-50 text-blue-700";
const IDLE_BUTTON = "border-gray-300 bg-white text-gray-600 hover:bg-gray-50";

export default function AbsenceRequestForm({
  initialDate,
  initialSessionTypes,
  today,
  participationDays,
  onClose,
  onSubmitted,
}: {
  initialDate: string;
  initialSessionTypes: SessionType[];
  today: string;
  participationDays: ParticipationDaysMap;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>(initialSessionTypes);
  const [reasonType, setReasonType] = useState<ReasonType>("academy");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeTypes = activeSessionTypesOn(participationDays, date);
  const allActiveSelected = activeTypes.length > 0 && activeTypes.every((t) => sessionTypes.includes(t));

  function handleDateChange(nextDate: string) {
    setDate(nextDate);
    // 날짜가 바뀌면 그 요일에 비활성인 세션은 선택에서 뺀다
    const nextActive = activeSessionTypesOn(participationDays, nextDate);
    setSessionTypes((prev) => prev.filter((t) => nextActive.includes(t)));
  }

  function toggleSessionType(sessionType: SessionType) {
    setSessionTypes((prev) =>
      prev.includes(sessionType) ? prev.filter((t) => t !== sessionType) : [...prev, sessionType]
    );
  }

  function toggleAll() {
    setSessionTypes(allActiveSelected ? [] : activeTypes);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!date) {
      setError("날짜를 선택해주세요.");
      return;
    }
    if (sessionTypes.length === 0) {
      setError("자습 시간을 하나 이상 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/student/absence-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          sessionTypes,
          reasonType,
          detail: reasonType === "custom" && detail.trim() ? detail.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "신청에 실패했습니다.");
      }
      onSubmitted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-gray-900 whitespace-nowrap">불참 신청하기</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 px-4 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 whitespace-nowrap transition-colors"
        >
          닫기
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
        <input
          type="date"
          value={date}
          min={today}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-full min-h-11 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">세션</label>
        <div className="flex gap-2 overflow-x-auto">
          {SESSION_TYPES.map((sessionType) => {
            const disabled = !activeTypes.includes(sessionType);
            const selected = sessionTypes.includes(sessionType);
            return (
              <button
                key={sessionType}
                type="button"
                disabled={disabled}
                onClick={() => toggleSessionType(sessionType)}
                className={`flex-1 min-h-11 px-3 py-2 text-sm font-medium rounded-md border transition-colors whitespace-nowrap ${
                  disabled ? DISABLED_BUTTON : selected ? SELECTED_BUTTON : IDLE_BUTTON
                }`}
              >
                {SESSION_META[sessionType].shortLabel}
              </button>
            );
          })}
          <button
            type="button"
            disabled={activeTypes.length === 0}
            onClick={toggleAll}
            className={`min-h-11 px-3 py-2 text-sm font-medium rounded-md border transition-colors whitespace-nowrap ${
              activeTypes.length === 0
                ? DISABLED_BUTTON
                : allActiveSelected
                  ? "border-blue-600 bg-blue-100 text-blue-800"
                  : "border-dashed border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            전체
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {activeTypes.length === 0 ? "해당 날짜에는 참여 일정이 없습니다." : "여러 시간을 함께 선택할 수 있습니다."}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">사유</label>
        <div className="grid grid-cols-4 gap-2">
          {REASON_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setReasonType(type)}
              className={`min-h-11 px-2 text-sm font-medium rounded-md border transition-colors whitespace-nowrap ${
                reasonType === type ? SELECTED_BUTTON : IDLE_BUTTON
              }`}
            >
              {REASON_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {reasonType === "custom" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">상세 사유 (선택)</label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="상세 사유를 입력해주세요"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full min-h-11 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "신청 중..." : "신청하기"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: `tests/absence-request-wiring.test.ts` 갱신**

기존 블록(12~16행):

```ts
const studentPage = read("../src/app/student/absence-requests/page.tsx");
assert.match(studentPage, /SESSION_TYPES\.map/, "세션 버튼을 SESSION_TYPES 로 그리지 않음");
assert.match(studentPage, /오후 전체/, "오후 전체 편의 버튼이 없음");
assert.match(studentPage, /sessionTypesOfSeat\("afternoon"\)/, "오후 전체가 좌석 세션의 블록 목록을 쓰지 않음");
assert.match(studentPage, /sessionTypes,/, "전송 바디가 sessionTypes 가 아님");
```

를 이렇게 교체:

```ts
const studentForm = read("../src/components/student/AbsenceRequestForm.tsx");
assert.match(studentForm, /SESSION_TYPES\.map/, "세션 버튼을 SESSION_TYPES 로 그리지 않음");
assert.match(studentForm, /activeSessionTypesOn\(participationDays, date\)/, "[전체] 가 그 날짜의 활성 세션 목록을 쓰지 않음");
assert.doesNotMatch(studentForm, /오후 전체|sessionTypesOfSeat/, "옛 오후 전체 편의 버튼이 남아 있음");
assert.match(studentForm, /sessionTypes,/, "전송 바디가 sessionTypes 가 아님");
```

- [ ] **Step 5: 통과 확인**

Run: `npx tsx tests/student-schedule-wiring.test.ts`
Expected: `student-schedule-wiring checks passed`

Run: `npx tsx tests/absence-request-wiring.test.ts`
Expected: `absence-request-wiring checks passed`

Run: `npx tsc --noEmit`
Expected: 오류 0

- [ ] **Step 6: 커밋**

```bash
git add src/components/student/AbsenceRequestForm.tsx tests/absence-request-wiring.test.ts tests/student-schedule-wiring.test.ts
git commit -m "$(cat <<'EOF'
Extract AbsenceRequestForm with per-date session availability

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LGV2H6Y2jd4vSd1eE4YqWL
EOF
)"
```

---

### Task 9: 학생 페이지 조립 — `/student/page.tsx`

**Files:**
- Modify: `src/app/student/page.tsx` (전체 교체)
- Test: `tests/student-schedule-wiring.test.ts` (블록 추가)

**Interfaces:**
- Consumes: `ParticipationScheduleCard` (Task 7), `AbsenceRequestForm` (Task 8), `SeatCheckCard` (Task 6), `ParticipationDaysMap` (Task 2), `getKstTodayString` (`@/lib/calendar`), `SESSION_TYPES`/`SessionType` (`@/lib/sessions`), 기존 `GET /api/student/participation-days` (`{ participationDays, monthlyStudyHours, yearlyStudyHours, ranking }`)
- Produces: 페이지 동작 — `draft` 가 있으면 폼만, 없으면 제목 + 배너 + 격자 + 참여시간 + 좌석 카드

- [ ] **Step 1: 실패하는 배선 테스트 추가**

`tests/student-schedule-wiring.test.ts`의 `console.log(...)` 바로 위에 추가:

```ts
// --- 학생 페이지: 세 컴포넌트 조립, draft 로 폼 전환, 완료 배너 + 불참목록 링크 ---
const studentPage = read("../src/app/student/page.tsx");
assert.match(studentPage, /import AbsenceRequestForm from "@\/components\/student\/AbsenceRequestForm"/);
assert.match(studentPage, /import ParticipationScheduleCard from "@\/components\/student\/ParticipationScheduleCard"/);
assert.match(studentPage, /import SeatCheckCard from "@\/components\/student\/SeatCheckCard"/);
assert.match(studentPage, /useState<Draft \| null>\(null\)/, "draft 상태가 없음");
assert.match(studentPage, /onSelectDay=\{openForm\}/, "요일 셀 클릭이 폼을 열지 않음");
assert.match(studentPage, /window\.scrollTo\(\{ top: 0 \}\)/, "폼 열 때 상단으로 스크롤하지 않음");
assert.match(studentPage, /불참 신청이 접수되었습니다\./, "완료 배너 문구가 없음");
assert.match(studentPage, /href="\/student\/absence-requests"/, "배너에 불참목록 링크가 없음");
assert.match(studentPage, /<SeatCheckCard participationDays=\{participationDays\} \/>/, "좌석 카드가 없음");
assert.doesNotMatch(studentPage, /renderSession|DAY_KEYS|DAY_LABELS/, "옛 세션별 카드 렌더가 남아 있음");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/student-schedule-wiring.test.ts`
Expected: FAIL — `AssertionError ... import AbsenceRequestForm` (첫 단언에서 실패)

- [ ] **Step 3: 구현 — 파일 전체를 아래로 교체**

`src/app/student/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import AbsenceRequestForm from "@/components/student/AbsenceRequestForm";
import ParticipationScheduleCard from "@/components/student/ParticipationScheduleCard";
import SeatCheckCard from "@/components/student/SeatCheckCard";
import { getKstTodayString } from "@/lib/calendar";
import type { ParticipationDaysMap } from "@/lib/participation-days";
import { SESSION_TYPES, type SessionType } from "@/lib/sessions";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Ranking = {
  rank: number;
  totalRanked: number;
  topPercent: number;
};

type ParticipationData = {
  participationDays: ParticipationDaysMap;
  monthlyStudyHours: number;
  yearlyStudyHours: number;
  ranking: Ranking | null;
};

type Draft = { date: string; sessionTypes: SessionType[] };

export default function StudentParticipationPage() {
  const { data, isLoading } = useSWR<ParticipationData>("/api/student/participation-days", fetcher);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState("");
  const today = getKstTodayString();
  const participationDays = data?.participationDays ?? {};

  function openForm(sessionType: SessionType, date: string) {
    setNotice("");
    setDraft({ date, sessionTypes: [sessionType] });
    window.scrollTo({ top: 0 });
  }

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">불러오는 중...</div>;
  }

  if (draft) {
    return (
      <AbsenceRequestForm
        initialDate={draft.date}
        initialSessionTypes={draft.sessionTypes}
        today={today}
        participationDays={participationDays}
        onClose={() => setDraft(null)}
        onSubmitted={() => {
          setDraft(null);
          setNotice("불참 신청이 접수되었습니다.");
        }}
      />
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">내 참여일정</h2>

      {notice && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          <span>{notice}</span>
          <Link
            href="/student/absence-requests"
            className="inline-flex min-h-11 items-center font-medium underline whitespace-nowrap"
          >
            불참목록 보기
          </Link>
        </div>
      )}

      <ParticipationScheduleCard participationDays={participationDays} today={today} onSelectDay={openForm} />

      {data && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">자율학습 참여시간</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-500 mb-1">이번 달</p>
              <p className="text-2xl font-bold text-blue-700">
                {data.monthlyStudyHours.toFixed(1)}
              </p>
              <p className="text-xs text-blue-400 mt-0.5">시간</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <p className="text-xs text-indigo-500 mb-1">학년도 누계</p>
              <p className="text-2xl font-bold text-indigo-700">
                {data.yearlyStudyHours.toFixed(1)}
              </p>
              <p className="text-xs text-indigo-400 mt-0.5">시간</p>
              {data.ranking && (
                <p className="text-[11px] text-amber-600 mt-1 font-semibold">
                  {data.ranking.rank}위 (상위 {data.ranking.topPercent}%)
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <SeatCheckCard participationDays={participationDays} />

      {SESSION_TYPES.every((sessionType) => !participationDays[sessionType]) && (
        <p className="mt-4 text-sm text-gray-400">
          참여일정이 설정되지 않았습니다. 담당 선생님에게 문의하세요.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx tsx tests/student-schedule-wiring.test.ts`
Expected: `student-schedule-wiring checks passed`

Run: `npx tsx tests/participation-wiring.test.ts`
Expected: `participation-wiring checks passed`

Run: `npx tsc --noEmit`
Expected: 오류 0

Run: `npx eslint src/app/student/page.tsx src/components/student src/components/seats/StudentSeatGrid.tsx src/lib/participation-days.ts src/lib/seats/student-seat-group.ts src/app/api/student/seats/route.ts`
Expected: 오류·경고 0

- [ ] **Step 5: 커밋**

```bash
git add src/app/student/page.tsx tests/student-schedule-wiring.test.ts
git commit -m "$(cat <<'EOF'
Rebuild student schedule page with inline absence form and seat card

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LGV2H6Y2jd4vSd1eE4YqWL
EOF
)"
```

---

### Task 10: 불참목록 페이지 · 탭 라벨 · 허용목록 정리

**Files:**
- Modify: `src/app/student/absence-requests/page.tsx` (전체 교체)
- Modify: `src/app/student/layout.tsx:30` (탭 라벨)
- Modify: `tests/session-literal-guard.test.ts` (허용목록에서 학생 신청 페이지 제거)
- Test: `tests/student-schedule-wiring.test.ts` (블록 추가)

**Interfaces:**
- Consumes: 기존 `GET /api/student/absence-requests` (`{ requests: [...] }`), `SESSION_META` (`@/lib/sessions`), `reasonLabel` (`@/lib/absence-reasons`)
- Produces: 목록 전용 페이지, 탭 "불참목록"

- [ ] **Step 1: 실패하는 배선 테스트 추가**

`tests/student-schedule-wiring.test.ts`의 `console.log(...)` 바로 위에 추가:

```ts
// --- 불참목록: 탭 라벨, 신청 폼 제거, 참여일정으로 안내 ---
const studentLayout = read("../src/app/student/layout.tsx");
assert.match(studentLayout, /label: "불참목록"/, "탭 라벨이 불참목록이 아님");
assert.doesNotMatch(studentLayout, /불참신청/, "옛 탭 라벨이 남아 있음");
assert.match(studentLayout, /label: "일괄신청"/, "도우미 일괄신청 탭이 사라짐");

const absenceList = read("../src/app/student/absence-requests/page.tsx");
assert.match(absenceList, /불참목록/, "페이지 제목이 불참목록이 아님");
assert.doesNotMatch(absenceList, /불참 신청하기|AbsenceRequestForm|handleSubmit|setShowForm|sessionTypesOfSeat/, "불참목록 페이지에 신청 폼이 남아 있음");
assert.match(absenceList, /href="\/student"/, "참여일정으로 가는 안내 링크가 없음");
assert.match(absenceList, /요일을 눌러/, "신청 방법 안내 문구가 없음");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/student-schedule-wiring.test.ts`
Expected: FAIL — `AssertionError: 탭 라벨이 불참목록이 아님`

- [ ] **Step 3: 탭 라벨 변경**

`src/app/student/layout.tsx` 30행:

```ts
    { href: "/student/absence-requests", label: "불참신청" },
```

→

```ts
    { href: "/student/absence-requests", label: "불참목록" },
```

- [ ] **Step 4: 불참목록 페이지 — 파일 전체를 아래로 교체**

`src/app/student/absence-requests/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import useSWR from "swr";
import { SESSION_META, type SessionType } from "@/lib/sessions";
import { reasonLabel } from "@/lib/absence-reasons";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  pending: { text: "대기중", className: "bg-yellow-100 text-yellow-700" },
  approved: { text: "승인", className: "bg-green-100 text-green-700" },
  rejected: { text: "반려", className: "bg-red-100 text-red-700" },
};

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

type AbsenceRequestItem = {
  id: number;
  date: string;
  sessionType: SessionType;
  reasonType: string;
  detail: string | null;
  status: string;
  createdAt: string;
};

export default function AbsenceRequestsPage() {
  const { data, isLoading } = useSWR<{ requests: AbsenceRequestItem[] }>(
    "/api/student/absence-requests",
    fetcher
  );
  const requests = data?.requests ?? [];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">불참목록</h2>
      <p className="mb-4 flex flex-wrap items-center gap-x-1 text-sm text-gray-500">
        <span>불참 신청은</span>
        <Link href="/student" className="inline-flex min-h-11 items-center px-1 font-medium text-blue-600 underline whitespace-nowrap">
          참여일정
        </Link>
        <span>탭에서 요일을 눌러 할 수 있습니다.</span>
      </p>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">불러오는 중...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-white rounded-lg border border-gray-200">
          신청 내역이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => {
            const statusInfo = STATUS_LABELS[req.status] || {
              text: req.status,
              className: "bg-gray-100 text-gray-600",
            };
            const d = new Date(req.date + "T00:00:00Z");
            const dayName = DAY_NAMES[d.getUTCDay()];

            return (
              <div
                key={req.id}
                className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
                    {d.getUTCMonth() + 1}/{d.getUTCDate()}({dayName}){" "}
                    {SESSION_META[req.sessionType]?.shortLabel ?? req.sessionType}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                    {reasonLabel(req.reasonType)}
                    {req.detail && ` - ${req.detail}`}
                  </div>
                </div>
                <span className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusInfo.className}`}>
                  {statusInfo.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: session-literal-guard 허용목록에서 학생 신청 페이지 제거**

`tests/session-literal-guard.test.ts`의 `SEAT_CONTEXT_ALLOWLIST`에서 아래 두 줄을 찾아:

```ts
  // 좌석 세션 분기(seatSession === "afternoon") 와 "오후 전체" 편의 선택(sessionTypesOfSeat("afternoon"))
  "app/attendance/[grade]/page.tsx",
```

주석만 바꾸고(항목 유지):

```ts
  // 좌석 세션 분기(seatSession === "afternoon")
  "app/attendance/[grade]/page.tsx",
```

그리고 `"app/student/absence-requests/page.tsx",` 한 줄을 **삭제**한다. (Task 6 에서 넣은 `"components/student/SeatCheckCard.tsx",` 와 그 주석은 그대로 둔다.)

- [ ] **Step 6: 통과 확인**

Run: `npx tsx tests/student-schedule-wiring.test.ts`
Expected: `student-schedule-wiring checks passed`

Run: `npx tsx tests/session-literal-guard.test.ts`
Expected: `session-literal-guard checks passed`

Run: `npx tsx tests/absence-request-wiring.test.ts`
Expected: `absence-request-wiring checks passed`

Run: `npx tsx tests/responsive-tables.test.ts`
Expected: `responsive-tables checks passed` (학생 레이아웃의 `--header-h`·`main` 클래스는 변경하지 않았으므로 통과해야 한다)

Run: `npx tsc --noEmit && npx eslint src/app/student`
Expected: 오류·경고 0

- [ ] **Step 7: 커밋**

```bash
git add src/app/student/absence-requests/page.tsx src/app/student/layout.tsx tests/session-literal-guard.test.ts tests/student-schedule-wiring.test.ts
git commit -m "$(cat <<'EOF'
Turn the student absence tab into a list-only 불참목록 page

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LGV2H6Y2jd4vSd1eE4YqWL
EOF
)"
```

---

### Task 11: 전체 검증 + PROJECT_MAP 갱신

**Files:**
- Modify: `.claude/PROJECT_MAP.md`
- (실행) 전체 테스트, `tsc`, `eslint`

**Interfaces:**
- Consumes: Task 1~10 결과물 전부
- Produces: 갱신된 프로젝트 지도, 전체 녹색 검증 기록

- [ ] **Step 1: 전체 테스트 실행**

스크래치패드 디렉터리에 스크립트를 만들어 실행한다(셸 루프를 직접 치면 거부될 수 있음):

```bash
cat > "$SCRATCHPAD/run-all-tests.sh" <<'EOF'
#!/bin/zsh
set -e
cd /Volumes/Chois_SD2/dev/selfstudy
for f in tests/*.test.ts; do
  echo "== $f"
  npx tsx "$f"
done
echo "ALL TESTS PASSED"
EOF
chmod +x "$SCRATCHPAD/run-all-tests.sh" && "$SCRATCHPAD/run-all-tests.sh"
```

(`$SCRATCHPAD` 는 세션의 scratchpad 경로. 없으면 `/private/tmp/claude-501/-Volumes-Chois-SD2-dev-selfstudy/<session>/scratchpad` 형태의 디렉터리를 쓴다.)

Expected: 마지막 줄 `ALL TESTS PASSED`. 실패하는 테스트가 있으면 그 테스트가 고정하는 규칙(파일 상단 주석)을 읽고 **구현을 규칙에 맞게** 고친다. 테스트의 기대값을 바꾸는 것은 이 계획이 명시한 갱신(Task 6·7·8·10)뿐이다.

- [ ] **Step 2: 타입·lint 전체**

Run: `npx tsc --noEmit`
Expected: 출력 없음

Run: `npm run lint`
Expected: 기존과 동일하게 `@next/next/no-img-element` 경고 7건만 남고, 이 계획이 만든 파일에서 오류·경고 0

- [ ] **Step 3: PROJECT_MAP.md 갱신 (아래 5곳)**

(a) 디렉터리 구조 `student/` 블록을 이렇게 교체:

```
│   ├── student/                # 학생
│   │   ├── layout.tsx          # 3개 탭 (참여일정 / 출결기록 / 불참목록, 도우미는 +일괄신청)
│   │   ├── page.tsx            # 참여일정 3행 격자(ParticipationScheduleCard) + 참여시간 카드 + 좌석 확인(SeatCheckCard). 요일 셀 클릭 → `draft` 상태로 같은 자리에서 AbsenceRequestForm 전환, 완료 시 배너
│   │   ├── attendance/page.tsx # 주간/월간 출결
│   │   ├── absence-requests/page.tsx  # 불참목록 (목록 전용 — 신청 버튼/폼 없음, 참여일정으로 안내)
│   │   └── batch-absence/page.tsx     # 도우미 학생 전용 — 반 전체 일괄 불참신청, 학생당 세션 버튼 3개
```

(b) `components/seats/` 블록의 `PrintRoomGrid.tsx` 줄 **아래**에 추가:

```
│   │   ├── StudentSeatGrid.tsx     # 학생용 읽기 전용 좌석 격자 (dnd 없음, `minmax(52px,1fr)` 최소 폭, 내 자리 `aria-current` + 파란 강조, props `{room, mySeat, gapAfterRows?}`)
```

(c) `components/students/` 블록 **위**에 새 블록 추가:

```
│   ├── student/
│   │   ├── ParticipationScheduleCard.tsx  # 참여일정 3행 격자 (인덱스 오후1/오후2/야간 + 월~금, `grid-cols-[auto_repeat(5,1fr)]`). 활성 셀은 button → `onSelectDay(sessionType, nextDateForWeekday(today, wd))`, 오늘 열 `border-2` 강조 + "오늘" 캡션, 다음 주로 넘어간 셀 "다음주"
│   │   ├── AbsenceRequestForm.tsx         # 불참 신청 폼 (헤더 "불참 신청하기" + 닫기). 세션 버튼은 날짜 요일의 `activeSessionTypesOn` 밖이면 disabled, [전체] = 활성 세션 전부 토글, 사유 4열 한 행, 상세 사유는 기타일 때만 표시·전송. props `{initialDate, initialSessionTypes, today, participationDays, onClose, onSubmitted}`
│   │   └── SeatCheckCard.tsx              # 좌석 확인 카드 — SWR `/api/student/seats`, 오후/야간 탭(기본 탭은 렌더 파생 `picked ?? firstWithGroup ?? "afternoon"`), classroom 은 `ClassroomFrame variant="screen"` 안에 분단 가로 배치, room 은 세로 스택(`GAP_CONFIG` 재사용, 교탁은 오후만). 미참가/좌석 없음 문구 분기
```

(d) `lib/` 트리에서 `calendar.ts` 줄의 함수 목록에 `weekdayOf/addDays/nextDateForWeekday` 를 추가하고, `absence-reasons.ts` 줄 **아래**에 추가:

```
│   ├── participation-days.ts  # 학생 화면용 요일 헬퍼 — WEEKDAY_KEYS/WEEKDAY_LABELS/DaySettings/ParticipationDaysMap, weekdayKeyOf(주말 null), isActiveOn(레코드 없음 = 비활성), activeSessionTypesOn(days, date), activeDayCount
```

그리고 `lib/seats/` 블록의 `seat-participation.ts` 줄 **아래**에 추가:

```
│   │   └── student-seat-group.ts  # selectSeatGroupRooms(myRoom, sessionRooms, grade): classroomId 있으면 그 Classroom 의 Room 전부(kind "classroom", 제목 classroomTitle), 없으면 같은 roomPrefix 의 Room(kind "room"). API 응답 타입 StudentSeatGroup/StudentSeatsResponse 도 여기
```

(`seat-participation.ts` 줄의 `└──` 를 `├──` 로 바꾼다.)

(e) API 표 `### 학생 (/api/student/)` 의 `participation-days` 행 아래에 추가:

```
| GET | `seats` | **신규.** 내 좌석 그룹. `Record<SeatSessionType, StudentSeatGroup|null>` — 학급 교실이면 분단 Room 전부 + `corridorSide`, 별도 교실이면 같은 접두사 Room 묶음. 각 Room 의 좌석에 같은 교실 학생 `{id,name,classNumber,studentNumber}` 포함, `mySeat{roomId,rowIndex,colIndex}` |
```

(f) `## 수정 이력 (주요 변경)` 바로 아래(최신 항목 위)에 추가:

```
### 2026-09-17: 학생 참여일정 3행 격자 + 요일 클릭 불참 신청 + 좌석 확인 카드

- **설계/계획**: `docs/superpowers/specs/2026-09-17-student-schedule-seat-check-design.md`, `docs/superpowers/plans/2026-09-17-student-schedule-seat-check.md`
- **참여일정**: 세션별 카드 3개 → `ParticipationScheduleCard` 한 카드 3행 격자. 오늘 열 `border-2`(활성 파랑/비활성 회색) + "오늘" 캡션. 활성 셀 클릭 → `nextDateForWeekday(today, wd)`(당일 포함 다음 돌아오는 요일, 지났거나 주말이면 다음 주 + "다음주" 표시) 날짜와 그 행 세션이 기본값인 폼으로 같은 자리 전환
- **불참 신청 폼**: `AbsenceRequestForm` 으로 추출. [오후 전체] → [전체](그 날짜의 `activeSessionTypesOn` 전부), 비활성 세션 disabled, 사유 4열 한 행, 상세 사유는 기타일 때만. 신청 API 변경 없음. "불참신청" 탭 → "불참목록"(목록 전용, 신청 버튼 제거)
- **좌석 확인**: 신규 `GET /api/student/seats` + `SeatCheckCard`/`StudentSeatGrid`. 그룹 규칙은 `lib/seats/student-seat-group.ts`(`selectSeatGroupRooms`). 야간 미래홀 도면 전체는 그리지 않고 내 방(접두사 묶음)만 표시
- **신규 lib**: `lib/participation-days.ts`(레코드 없음 = 비활성 규칙), `lib/calendar.ts` 확장(`weekdayOf/addDays/nextDateForWeekday`)
- **테스트**: 신규 `tests/participation-days.test.ts`, `tests/student-seat-group.test.ts`, `tests/student-schedule-wiring.test.ts`; 갱신 `tests/calendar.test.ts`, `tests/absence-request-wiring.test.ts`(폼 위치·[전체]), `tests/participation-wiring.test.ts`(카드 단언), `tests/session-literal-guard.test.ts`(허용목록: 학생 신청 페이지 제거, `SeatCheckCard` 추가)
```

(g) `### 8. 세션 블록 분리` 절의 문장 `좌석 컨텍스트 파일(좌석·인쇄, 출석 화면의 `seatSession` 분기, 학생 신청의 "오후 전체")` 를 `좌석 컨텍스트 파일(좌석·인쇄, 출석 화면의 `seatSession` 분기, 학생 좌석 확인 카드의 기본 탭 폴백)` 으로 바꾼다.

파일 상단 `> 마지막 업데이트: 2026-09-15` 를 `2026-09-17` 로 바꾼다.

- [ ] **Step 4: 지도 갱신 확인**

Run: `grep -n "student-seat-group\|ParticipationScheduleCard\|SeatCheckCard\|participation-days.ts\|\`seats\`" .claude/PROJECT_MAP.md | head -20`
Expected: (a)~(f) 각 위치에서 한 줄 이상 검색됨

- [ ] **Step 5: 커밋**

```bash
git add .claude/PROJECT_MAP.md
git commit -m "$(cat <<'EOF'
Sync PROJECT_MAP with student schedule, absence form, and seat check

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LGV2H6Y2jd4vSd1eE4YqWL
EOF
)"
```

- [ ] **Step 6: 마무리 보고(컨트롤 세션이 수행)**

- `responsive-ui-reviewer` 에이전트를 `src/components/student/*.tsx`, `src/components/seats/StudentSeatGrid.tsx`, `src/app/student/page.tsx`, `src/app/student/absence-requests/page.tsx` 대상으로 실행하고, 보고된 위반은 같은 세션에서 수정·재검증·커밋한다.
- 푸시 여부는 사용자에게 확인한다(푸시 = Railway 배포). 배포 후 실서버(`https://self.posan.kr`) 학생 계정으로 §9 배포 확인 항목을 점검한다.
