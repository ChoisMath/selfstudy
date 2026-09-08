# 반응형 정리 + 좌석 해제 — 사후 검토 (Phase 7)

검토일: 2026-09-08 · 대상: `2026-09-08-responsive-cleanup-final.md` 기준 작업 트리(`~/dev/selfstudy`, 24개 수정 + `tests/responsive-tables.test.ts` 신규)
검증 실행: 테스트 30/30 PASS(신규 포함), `tsc --noEmit` 0, eslint 오류 0(경고는 `no-img-element` 만)

---

## 1. 계획 충실도

### 0장 수용 항목

| 항목 | 구현 | 근거 |
|---|---|---|
| C1 패널 실시간 rect 판정 | ✅ | `SeatingEditor.tsx:175-183` — `node.current.getBoundingClientRect()` + `pointerCoordinates` null 가드, `pointerWithin` 미사용 |
| W1 바깥 div onClick / 빈 좌석 → null / 해제 후 초기화 | ✅ | `RoomGrid.tsx:65,70`, `SeatingEditor.tsx:284-288` |
| W2 deps 없는 useCallback + 함수형 setState | ✅ | `SeatingEditor.tsx:276-282` |
| W3 1096·1195 `w-11 h-11`, 1204 `pr-12` | ✅ | `attendance/[grade]/page.tsx:1096,1195,1204` |
| W4 5개 레이아웃 main `px-2 md:px-3 lg:px-4` | ✅ | admin, grade-admin, homeroom×2, student |
| W5 헤더 div `z-20`, 테스트 패턴 | ✅ | `MonthlyCalendar.tsx:252`, 테스트 36·92·100행 |
| W6 하단 2주 `openUpward` | ✅(세부 지적 M-3) | `MonthlyCalendar.tsx:269,450` |
| W7 액션바 in-flow `sticky bottom-2`, `sm:mr-auto sm:w-96` | ✅ | `SeatingEditor.tsx:482-513` |
| S1 gap-1 유지, `space-y-2` | ✅ | `UnassignedStudents.tsx:103` |
| S2 seat 드래그일 때만 링 | ✅ | `UnassignedStudents.tsx:48` |
| S3 Delete/Backspace·autoFocus·Escape | ✅ | `RoomGrid.tsx:84-90`, `SeatingEditor.tsx:486-499` |
| S5 label title/cursor, `tr group` + `group-hover` | ✅ | ParticipationManagement, homeroom/grade-admin participation, StudentManagement |
| S6 슬롯 행 aria-label / hover | ✅ | `homeroom/schedule/page.tsx:274-277` |
| S9 `[--header-h:6.5rem]` | ✅ | `student/layout.tsx:35` |
| S10 `"afternoon"` 리터럴 미추가 | ✅ | `session-literal-guard` PASS |
| S11 PROJECT_MAP 갱신(7.5) | ❌ | `.claude/PROJECT_MAP.md` 무변경 (→ W-2) |
| S12 줄번호 정정 | — | 문서 항목 |

### 3장 파일별 변경 표
24개 파일 모두 표의 항목이 구현됨(globals `--header-h`/`@utility`, 레이아웃 8파일 `min-h-dvh`, 표 7곳 `table-scroll`/z 서열/첫 열 sticky, 버튼 `min-h-11`, 모달 `mx-2 p-3 sm:mx-4 sm:p-6`, 팝오버 폭/셀, RoomGrid props 교체·X 제거·ring·h3 ellipsis, `UNASSIGNED_DROP_ID` droppable, SeatingEditor 선택/충돌/dragEnd/액션바, HelpDemos prop 제거, 테스트 2건).

### 누락
1. **2-4 "데이터 재로드 → null"** — `SeatingEditor.tsx:118-144` 의 seats 초기화 effect 가 `setSelectedSeat(null)` 을 호출하지 않음. 세션 탭 전환은 `seats/page.tsx` 의 `key` 로 remount 되므로 영향 없고, 저장 후 `layoutMutate()` 재로드 때만 선택이 남음(같은 학생이면 무해, 다른 학생이면 액션바가 엉뚱한 학생을 표시). → M-1
2. **6장 7.5 PROJECT_MAP 갱신** 미실행. → W-2

**판정: 부분(경미)** — 핵심 변경은 전부 구현, 문서 1건 + 저영향 상태 초기화 1건 누락.

---

## 2. 발견 사항

### Warning

#### W-1. 패널 밖에서도 패널이 `over` 가 될 수 있음 (closestCenter 폴백에 패널 포함)
- **파일**: `src/components/seats/SeatingEditor.tsx:175-183`
- **문제**: 포인터가 실제 패널 안에 있을 때만 패널을 반환하는 것은 맞지만, 아닐 때의 `closestCenter(args)` 에는 여전히 패널 컨테이너가 후보로 남아 있다. closestCenter 는 **캐시된 rect** 의 중심 거리로 판정하므로 (1) xl 에서 autoScroll 로 드리프트된 패널 rect, (2) 우측 열 패널 아래 빈 공간이나 격자–패널 사이 gap 에서 포인터가 좌석 중심보다 패널 중심에 가까우면 패널이 `over` 가 되어 붉은 링이 켜지고 드롭 시 해제된다. C1 의 "안에 있는데 교환" 은 막았지만 "밖에 있는데 해제" 는 남아 있음. 계획 문구대로 구현된 것이라 계획의 공백이지만, 한 줄로 닫힌다.
- **수정안**:
  ```ts
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => c.id !== UNASSIGNED_DROP_ID),
  });
  ```
  → 패널은 "포인터가 실제로 안에 있을 때만" 대상이 되고, 학생 칩을 패널 근처 빈 공간에 놓았을 때 패널로 끌려가는 일도 없어진다. 테스트에 `droppableContainers.filter` 단언 추가 권장.

#### W-2. PROJECT_MAP 미갱신 (S11 / 실행 순서 7.5)
- **파일**: `.claude/PROJECT_MAP.md:88,93,349`
- **문제**: `RoomGrid.tsx` 설명에 `selectedSeatKey`/`onSelectSeat`·X 버튼 제거, `UnassignedStudents.tsx` 에 `UNASSIGNED_DROP_ID` droppable 이 반영되지 않았고, `globals.css` 의 `--header-h`/`table-scroll` 관행, 신규 `tests/responsive-tables.test.ts` 가 없다. 다음 세션이 "X 버튼으로 해제" 를 전제로 작업할 수 있음.
- **수정안**: `project-map-updater` 실행. 최소 기록: (a) 좌석 해제 = 탭→액션바 / 좌석→미배정 패널 드롭, 충돌 감지 커스텀(sticky 패널 실시간 rect) (b) 표 7곳 `overflow-x-auto table-scroll` + thead `z-20`/인덱스 th `z-30`/td `z-10` 서열 (c) `--header-h` 재정의 위치(student 6.5rem) (d) 테스트 파일 2건.

### Minor

#### M-1. 재로드 시 `selectedSeat` 초기화 누락 (계획 2-4)
- **파일**: `src/components/seats/SeatingEditor.tsx:118-144`
- **수정안**: effect 끝에 `setSelectedSeat(null);` 추가(저장 → `layoutMutate()` 후 액션바가 남지 않음).

#### M-2. 키보드 드래그 중 Delete 가 선택을 바꿈
- **파일**: `src/components/seats/RoomGrid.tsx:84-90`
- **문제**: Enter/Space 로 dnd-kit 키보드 드래그가 활성화된 뒤에도 포커스는 핸들에 남아 있어 Delete 를 누르면 `select()` → 액션바 `autoFocus` 가 포커스를 가져간다. 이후 Enter 는 dnd-kit(document 리스너)의 드롭과 액션바의 해제를 동시에 발생시킬 수 있다.
- **수정안**: `if (!isDragging && (e.key === "Delete" || e.key === "Backspace"))`.

#### M-3. `openUpward` 가 "행" 이 아니라 "셀 14개" 기준
- **파일**: `src/components/admin-shared/MonthlyCalendar.tsx:269`
- **문제**: `monthDays` 는 앞쪽 패딩만 있으므로 마지막 14셀은 항상 마지막 2행을 포함하지만, 월이 토요일로 끝나지 않으면 뒤에서 세 번째 행의 최대 6셀도 위로 펼친다. 그 행 위에는 ≥2행+헤더(모바일 80×2+33 ≈ 193px ≥ `max-h-48` 192px)가 있어 실질 잘림은 없음. 계획 문구("하단 2주")와 정확히 맞추려면 행 기준이 낫고, `14` 는 이름이 없다.
- **수정안**:
  ```ts
  const DAYS_PER_WEEK = 7;
  const lastRow = Math.ceil(monthDays.length / DAYS_PER_WEEK) - 1;
  const openUpward = Math.floor(idx / DAYS_PER_WEEK) >= lastRow - 1;
  ```

#### M-4. 계획에 없는 안내 문구 `<p>` (UnassignedStudents)
- **파일**: `src/components/seats/UnassignedStudents.tsx:80-82` (+ `:74` h3 `mb-2→mb-1`, `:46` 주석)
- **판단**: 드롭 제스처는 화면에 단서가 없으므로 안내는 정당하다. 다만 (1) 모바일의 주 경로(좌석 탭 → 액션바)는 언급하지 않고, (2) `:46` 주석 첫 문장("좌석을 이 패널로 끌어오면 배정 해제.")은 WHAT 주석이다.
- **수정안**: 문구를 "좌석을 탭하거나 여기로 끌어오면 배정이 해제됩니다" 로, 주석은 둘째 문장(칩 드래그 시 하이라이트 제외 이유)만 남김.

#### M-5. `isMine` 행 hover 시 노란 강조가 사라짐
- **파일**: `src/app/homeroom/schedule/page.tsx:277`
- **문제**: `hover:bg-blue-50` 가 `rowClass` 의 `bg-yellow-100` 보다 뒤에 와서 hover 중 "내 감독" 표시가 파란색으로 바뀐다.
- **수정안**: `${isMine ? "hover:bg-yellow-200" : "hover:bg-blue-50"}` 또는 `hover:brightness-95`.

#### M-6. 액션바 닫힌 뒤 포커스 유실 / `role="dialog"` 의미
- **파일**: `src/components/seats/SeatingEditor.tsx:483-511`
- **문제**: Delete 로 선택 → `autoFocus` 로 포커스가 액션바로 이동 → 해제/취소/Escape 후 바가 언마운트되면 포커스가 body 로 떨어진다. 비모달 인라인 바에 `role="dialog"`(aria-modal 없음)은 스크린리더에 모달처럼 안내될 수 있다.
- **수정안**: 닫을 때 해당 좌석 핸들(`[data-seat]` ref)로 포커스 복귀; role 은 `region` + `aria-label` 또는 `aria-live="polite"` 컨테이너로.

#### M-7. 테스트의 존재 확인형 단언
- **파일**: `tests/responsive-tables.test.ts:50,72`, `tests/seating-editor-responsive.test.ts:48,56,60`
- **문제**: `/openUpward/`, `/getBoundingClientRect\(\)/`, `/onSelectSeat/`, Unassigned 의 `/\bmin-h-11\b/` 는 식별자가 파일 어딘가에 있으면 통과한다(예: `openUpward` prop 을 받지만 클래스에 연결하지 않아도 PASS). 참여설정 `/<button[\s\S]*?className=\{`h-11 w-11 /` 는 파일 첫 `<button` 부터 lazy 로 어디까지든 매칭. S2(`startsWith("seat-")`), 드래그 시작 시 선택 해제, Escape 는 단언이 없다.
- **수정안**: `/\$\{openUpward \? "bottom-full[^"]*" : "mt-0\.5"\}/`, `/<div\s+ref=\{setNodeRef\}[\s\S]*?className=\{`\s*flex min-h-11 /`(DraggableStudent), `/isOver && String\(active\?\.id\)\.startsWith\("seat-"\)/`, `/handleDragStart[\s\S]*?setSelectedSeat\(null\)/`, `/e\.key === "Escape"\) setSelectedSeat\(null\)/`. ES2017 금지 기능(s 플래그·lookbehind)은 두 파일 모두 사용하지 않음(확인).

#### M-8. 들여쓰기 (student/attendance)
- **파일**: `src/app/student/attendance/page.tsx:222-260`
- **문제**: 새 래퍼 `<div className="overflow-x-auto table-scroll">` 안의 `<table>` 이 같은 깊이로 남아 있음(포맷만).

---

## 3. 타입/런타임 점검 결과 (문제 없음으로 확인한 항목)

- **`listeners?.onKeyDown?.(e)`** (`RoomGrid.tsx:85`): `listeners` 는 `SyntheticListenerMap | undefined` = `Record<string, Function> | undefined`(dnd-kit 6.3.1). 학생이 있는 셀에서만 핸들이 렌더되므로 `disabled=false` → 정의됨. KeyboardSensor 활성화 핸들러는 `keyboardCodes.start = [Space, Enter]` 만 처리하고 Delete/Backspace 는 `false` 반환 → Enter/Space 드래그 유지, Delete 는 선택. `{...listeners}` 뒤의 명시 `onKeyDown` 이 덮어쓰지만 내부에서 먼저 호출하므로 손실 없음.
- **탭 후 click 전달 / 드롭 후 click 억제**: 5px 미활성 탭은 click 이 그대로 전달(계획 5장). 활성화된 드래그는 `AbstractPointerSensor.handleStart` 가 document capture `click` 을 `stopPropagation` 하고 `detach` 가 50ms 뒤에 제거하므로(`core.esm.js:1479,1506`) 드롭 직후 같은 셀에 click 이 도달해 선택되는 일은 없음.
- **`collisionDetection`**: `useCallback<CollisionDetection>` 제네릭 OK, 반환 `[{ id, data: { droppableContainer, value: 0 } }]` 는 `Collision[]`(`data?: Data`) 계약에 맞음. `pointerCoordinates` 는 키보드 센서에서도 non-null(`activationCoordinates + translate`)이라 키보드로 패널에 진입해도 동작.
- **`handleDragEnd` → `handleRemoveStudent`**: 둘 다 렌더 중 초기화되는 const 이고 호출은 이벤트 시점 → TDZ 없음(eslint `no-use-before-define` 미적용, tsc 0).
- **`selectedRoom`/`selectedStudent`** (`:290-293`): `rooms.find` → undefined, `seats.get()?.get()?.student ?? null` — 액션바는 셋 모두 truthy 일 때만 렌더. `??` 우선순위 정상.
- **`rowContent` 재사용** (`schedule/page.tsx:262-282`): 한 반복에서 button 또는 div 한쪽에만 렌더, key 는 바깥 요소에 있음. Fragment 재사용 문제 없음.
- **`tableLayout: fixed` 52px**: 요일 td 는 `py-1` 만(가로 패딩 0) → 44px 버튼/label 이 52px 안에 들어감. 헤더 `월`~`금`·`참가` 체크 label(44px)도 수용. 이름 80px 은 `truncate`.

## 4. 기존 기능 보존 (확인)

- seat→seat 교환, 미배정→좌석 드롭, dirty/저장, `handlePrint`: 로직 무변경. 패널 드롭 분기는 `overIdStr === UNASSIGNED_DROP_ID` 에서 조기 return 하므로 학생 칩을 패널에 되돌려 놓으면 no-op(이전엔 가장 가까운 좌석에 스냅되던 것보다 안전).
- 인쇄 경로는 `PrintRoomGrid`/`SeatPrintGroup` 만 사용(RoomGrid 미사용) → 영향 없음.
- HelpDemos: `onRemoveStudent` 제거, `onSelectSeat` 미전달 → `select()` no-op. `UnassignedStudentsDemo` 는 DndContext 안이라 `useDroppable` OK.
- 참여설정 3화면 `handleUpdate`/낙관적 업데이트 무변경(마크업만). 감독 교체 모달 흐름(`handleSwapClick` → `swapTarget` → `handleSwapSubmit`) 동일.
- `MiraeHallLayout` 의 `overflow-hidden` 은 화장실 블록에만 있어 선택 ring(3px)이 잘리지 않음(RoomGrid 카드 `p-2` 안쪽).
- help MDX(`content.mdx`)는 X 버튼을 언급하지 않아 문서 회귀 없음.

## 5. import/export

- `UNASSIGNED_DROP_ID`(`UnassignedStudents.tsx:14` named export) ↔ `SeatingEditor.tsx:18` ✅
- `SeatRef`(`RoomGrid.tsx:28` `export type`) ↔ `SeatingEditor.tsx:17` `type` import ✅
- `CollisionDetection` — `@dnd-kit/core` 에서 `type` import ✅

## 6. 일관성

- 새 주석은 대부분 WHY(dnd-kit 활성화 임계, sticky rect 드리프트, memo deps, 44px 근거). WHAT 성격: `UnassignedStudents.tsx:46` 첫 문장(M-4).
- `any` 없음, 네이밍(`isSeatOver`, `openUpward`, `selectedSeatKeyOf`, `handleUnassignSelected`) 관행 일치.
- 매직 넘버: `14`(M-3). `52`(colgroup) 는 계획에 44+8 로 기록되어 있으나 코드에는 근거가 없음 — 1회 사용이라 인라인 허용 범위, 짧은 주석 정도면 충분.

---

## 요약

- **Critical 0 / Warning 2 / Minor 8**
- **계획 충실도: 부분(경미)** — 0장 수용 항목 중 S11(PROJECT_MAP) 1건과 2-4 "재로드 → 선택 초기화" 1건 누락, 나머지 3장 24개 파일 변경은 모두 구현되고 테스트·tsc·eslint 통과.
- 권장 처리 순서: W-1(한 줄) → M-1·M-2(각 한 줄) → M-7 테스트 보강 → W-2 PROJECT_MAP → 나머지 Minor 는 선택.
