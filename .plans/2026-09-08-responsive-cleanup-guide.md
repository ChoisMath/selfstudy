# 실무 지침서 — 반응형 위반 정리 + 좌석 해제 설계

기준: `.plans/2026-09-08-responsive-cleanup-final.md`. 작업 트리: `~/dev/selfstudy`(검수 가능). 완료 후 GDrive 트리로 복사.

공통 확인 명령
```bash
cd ~/dev/selfstudy
for f in tests/*.test.ts; do npx tsx "$f" >/dev/null 2>&1 && echo "PASS $f" || echo "FAIL $f"; done
npx eslint .          # 오류 0, 경고 7(no-img-element)
npx tsc --noEmit      # 0
npm run build         # exit 0
```

## 1단계 — RED 테스트 (선행 없음)
- `tests/responsive-tables.test.ts` 신규. 단언: `globals.css` 에 `--header-h: 3.5rem` 과 `@utility table-scroll {… max-height: calc(100dvh - var(--header-h)) … overflow: auto …}`; 표 파일 7곳에 `<div className="…table-scroll…">` 바로 뒤 `<table` 또는 `<div className="min-w-[700px]">`; `(thead|div) … sticky top-0 z-20`; 참여설정 3파일에 `w-7 h-7` 없음·`<label className="…h-11 w-11…"` 있음; AttendanceDatePicker `min-h-9` 없음·`aspect-square min-h-11`; 레이아웃/로그인/도움말 `min-h-screen` 없음; 레이아웃 main `px-2 md:px-3 lg:px-4`; 학생 레이아웃 `[--header-h:6.5rem]`; 버튼(`onClick={prevMonth}` 등) 클래스에 `min-h-11`; 모달에 접두 없는 `p-6` 없음; attendance/[grade] 에 `w-8 h-8` 없음; attendance/page 에 접두 없는 `p-8` 없음.
- `tests/seating-editor-responsive.test.ts` 47-51 교체: RoomGrid 에 `group-hover:opacity-100`/`title="배정 해제"` 없음, `onSelectSeat`·`ring-2 ring-blue-500` 있음, h3(백틱 className) nowrap; SeatingEditor `배정 해제` 버튼 `min-h-11`, `UNASSIGNED_DROP_ID`·`getBoundingClientRect` 사용; UnassignedStudents `export const UNASSIGNED_DROP_ID = "unassigned"`, `useDroppable`, `min-h-11`.
- 확인: 두 테스트가 FAIL. 주의: tsconfig target ES2017 → 정규식 `s` 플래그·lookbehind 금지(`[\s\S]`, `(^|[^\w:-])` 사용).

## 2단계 — globals.css + 레이아웃 (1단계 후)
- `src/app/globals.css` `:root` 에 `--header-h: 3.5rem;`, 파일 끝에 `@utility table-scroll`.
- `sed` 로 `min-h-screen` → `min-h-dvh`: admin/grade-admin/homeroom/student/attendance 레이아웃, login/help 페이지.
- main `px-4` → `px-2 md:px-3 lg:px-4`: admin, grade-admin, homeroom(2곳), student.
- student 레이아웃 루트 div: `min-h-dvh bg-gray-50 [--header-h:6.5rem]`.
- 확인: `grep -rn min-h-screen src` 비어 있음.

## 3단계 — 표 7곳 + 팝오버 (2단계 후)
각 파일에서 순서대로: (a) 래퍼 `overflow-x-auto` → `overflow-x-auto table-scroll` (b) thead/헤더 `z-10` → `z-20` (c) 인덱스 th `z-30`, td `z-10` + 배경 (d) table `whitespace-nowrap` (e) 버튼 `min-h-11` (f) 체크박스 label 래핑, 요일 `h-11 w-11`, 방과후 `mt-2`.
- ParticipationManagement: colgroup 18열 `52px`; td `py-1`; tr `hover:bg-gray-50` → `group hover:bg-gray-50`; 이름 td `sticky left-0 z-10 bg-white group-hover:bg-gray-50`.
- MonthlyCalendar: `CalendarTeacherSelect` 에 `openUpward: boolean` prop, `ul` 클래스 `mt-0.5` ↔ `bottom-full mb-0.5`; 호출부 `openUpward={idx >= monthDays.length - 14}`.
- AttendanceDatePicker: `min-h-9`→`min-h-11`, `w-[clamp(260px,80vw,320px)]`→`w-[min(100vw-1.5rem,344px)]`.
- 주의: `colSpan={21}`/`colSpan={3}`/`SESSION_TYPES.map` 구조는 그대로(wiring 테스트).
- 확인: `npx tsx tests/responsive-tables.test.ts` 의 표 관련 단언 통과, `participation-wiring`·`monthly-attendance-wiring` PASS.

## 4단계 — 버튼/모달 (독립)
- homeroom/schedule: 화살표 `min-h-11 min-w-11`; Now/토일/누계 `min-h-11`; 슬롯 행 `assignment && isFutureOrToday ? <button …> : <div …>`(공통 `rowClass` 에 `min-h-11`); 모달 `mx-2 p-3 sm:mx-4 sm:p-6`, 버튼 `min-h-11`.
- attendance/[grade]: `w-8 h-8 flex items-center justify-center` → `w-11 h-11 …`(2곳), `<div className="pr-6">` → `pr-12`.
- attendance/page: 카드·버튼·gap.
- student/attendance: 탭/이동 버튼; 표 구조.
- 확인: tsc 0.

## 5단계 — 좌석 해제 (순서 고정: RoomGrid → UnassignedStudents → SeatingEditor → HelpDemos)
- RoomGrid: props `{ room, seats, gapAfterRows?, hideTeacherDesk?, compact?, preserveSeatWidth?, selectedSeatKey?: string | null, onSelectSeat?: (seat: SeatRef | null) => void }`, `export type SeatRef = { roomId; row; col }`. SeatCell 바깥 div `onClick`, 핸들 `onKeyDown`(Delete/Backspace → onSelect), `isSelected` ring. X 버튼 삭제. h3 `min-w-0 whitespace-nowrap overflow-hidden text-ellipsis` + `title`.
- UnassignedStudents: `export const UNASSIGNED_DROP_ID = "unassigned"`; 루트 `useDroppable`; `isOver && String(active?.id).startsWith("seat-")` 링; 칩 `min-h-11`; `space-y-2`.
- SeatingEditor: `selectedSeat` state; `handleSelectSeat = useCallback(seat => setSelectedSeat(prev => …), [])`; `handleDragStart` 에서 null; 데이터 effect 에서 null; `collisionDetection` 함수; `handleDragEnd` 패널 분기(`handleRemoveStudent` 재사용); RoomGrid 3곳 `selectedSeatKey={selectedSeat?.roomId === room.id ? key : null}` `onSelectSeat={handleSelectSeat}`; 액션바(sticky bottom-2, autoFocus, Escape).
- HelpDemos: `onRemoveStudent={() => undefined}` 줄 삭제.
- 확인: `seating-editor-responsive`, `seat-participation`, `help-mdx`, `session-literal-guard` PASS; tsc 0.

## 6단계 — GREEN 전체 검수
공통 확인 명령 4종 전부. eslint 오류가 `react-hooks/*` 면 `eslint-disable` 금지 — 패턴으로 해결.

## 7단계 — 리뷰어/맵
- `responsive-ui-reviewer` 에이전트로 변경 파일 재검토 → 위반 수정 → 6단계 반복.
- `project-map-updater` 로 PROJECT_MAP 갱신(신규 테스트, RoomGrid 계약, `table-scroll` 유틸, 좌석 해제 설계).

## 8단계 — 사후 검토 + 동기화
- Phase 7 사후 검토 에이전트 → Critical/Warning 수정.
- `git -C ~/dev/selfstudy status --short` 로 변경 목록 → 동일 경로로 GDrive 트리에 복사. 커밋/push 는 보류.
