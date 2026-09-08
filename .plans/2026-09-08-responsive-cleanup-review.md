# 반응형 위반 정리 계획(2026-09-08 초안) 비판적 리뷰

검토일: 2026-09-08 · 대상: `.plans/2026-09-08-responsive-cleanup-draft.md` · 검토 기준: `~/.claude/rules/responsive-ui.md`, `~/.claude/rules/coding-style.md`
검증 방법: 계획서가 언급한 파일·줄·클래스·테스트 단언을 로컬 클론(`~/dev/selfstudy`)에서 직접 열어 대조. dnd-kit 동작은 `node_modules/@dnd-kit/core/dist/{index.d.ts,core.esm.js,hooks/useDroppable.d.ts}` grep, Tailwind 유틸은 설치된 `tailwindcss@4.2.2` 의 `compile()` 로 실제 컴파일해 확인.

---

## 0. 검증 통과 항목 (계획서 주장 중 사실로 확인된 것)

| 주장 | 확인 결과 |
|---|---|
| 패턴 A 대상 7곳 줄번호 | `MonthlyCalendar.tsx:250-252`, `ParticipationManagement.tsx:121-132`, `GradeMonthlyAttendance.tsx:113-116`, `StudentManagement.tsx:364-367`, `homeroom/participation/page.tsx:101-104`, `grade-admin/[grade]/participation/page.tsx:146-149`, `student/attendance/page.tsx:221-223`(thead sticky 없음) 모두 정확 |
| `RoomGrid.tsx:86-96` X 버튼, `pointer-coarse:opacity-100 / w-7` | 정확 (92행) |
| `tests/seating-editor-responsive.test.ts:47-51` 해제 버튼 단언 | 정확 |
| `SeatingEditor` `PointerSensor({distance:5})`, `closestCenter` | 162행, 352행 정확 |
| dnd-kit: 활성화 전 클릭 전달 | `core.esm.js` `handleStart()` 에서만 `activated=true` + document `click` capture `stopPropagation` 등록. `detach()` 는 document 리스너를 `setTimeout(…, 50)` 으로 지연 제거 → 활성화된 드래그의 후속 click 은 차단, 이동 없는 탭의 click 은 `onClick` 도달. 주장 맞음 |
| `pointerWithin` export | `index.d.ts:11` 에서 export, `utilities/algorithms/pointerWithin.d.ts` 존재. `CollisionDetection` 타입도 export(12행) |
| `DragOverlay` 기본 zIndex | 999 (`core.esm.js:3907`) → 액션바 `z-40` 위 |
| AdminNav / homeroom nav `h-14 sticky top-0 z-50` | `AdminNav.tsx:58-60`, `homeroom/layout.tsx:55-57` 정확 → `--header-h: 3.5rem` 타당 |
| RoomGrid 소비자 | `SeatingEditor.tsx`(363/389/405), `HelpDemos.tsx:96-103` 뿐. 인쇄 경로는 별도 `PrintRoomGrid` → 영향 없음. `MiraeHallLayout` 은 제네릭 `renderRoom` 이라 타입 영향 없음 |
| Tailwind 4 유틸 (실제 컴파일) | `min-h-dvh` → `min-height:100dvh` ✓ · `@utility table-scroll` → `@layer utilities` 에 방출 ✓ · `[--header-h:6.75rem]` → `--header-h:6.75rem` ✓ · `w-[min(100vw-1.5rem,344px)]` → `width:min(100vw - 1.5rem, 344px)` ✓(수학 연산자 공백 자동 삽입) · `bottom-[max(0.5rem,env(safe-area-inset-bottom))]` → `bottom:max(0.5rem, env(safe-area-inset-bottom))` ✓ · `sm:inset-x-auto`(`inset-inline:auto`) 가 `sm:right-4` 보다 먼저 방출되어 `right-4` 가 이김 ✓ |
| 구조 단언 테스트 | `participation-wiring.test.ts:27` `colSpan={21}`, `monthly-attendance-wiring.test.ts:22-25` `colSpan={3}`/`SESSION_META[t].shortLabel`/`SESSION_TYPES.map((t` — 계획의 클래스 변경과 충돌 없음 |
| `session-literal-guard` 허용 목록에 SeatingEditor | 11행 확인 |
| 3-6 팝오버 폭 산식 | 7×44 + 6×2(gap-0.5) + 24(p-3) = 344 ✓, 부모 `left-3`(`[grade]/page.tsx:980`) ✓ |
| §4 "fixed 액션바 조상에 transform 없음" | `grade-admin/[grade]/layout.tsx` main, `seats/page.tsx` 모두 일반 블록 ✓ |

---

## 1. 발견 사항

### [부작용] xl 뷰포트의 `xl:sticky` 미배정 패널을 드롭 영역으로 쓰면 스크롤 중 좌표가 어긋나 "해제" 대신 "교환" 이 일어난다
- **심각도**: Critical
- **위치**: 계획 2-5 설계 3, 3-15, 3-16 `collisionDetection`; `SeatingEditor.tsx:418`(`xl:sticky xl:top-6 xl:self-start`)
- **문제**: dnd-kit 은 드롭 영역 rect 를 드래그 시작 시 1회 측정하고, 이후 스크롤 변화량만큼 rect 를 "일반 흐름 요소처럼" 이동시킨다. sticky 로 고정된 패널은 화면에서 움직이지 않으므로, 드래그 중 페이지가 스크롤되면 dnd-kit 이 아는 패널 rect 와 실제 위치가 스크롤량만큼 어긋난다. 패널은 `top-6`(24px) 에 붙어 있어 뷰포트 상단 20% 구역과 겹치고, 이 구역에 포인터가 들어가면 dnd-kit 기본 autoScroll 이 위로 스크롤한다. 즉 "아래쪽 교실에서 좌석을 집어 상단 패널로 끌어다 놓는" 데스크탑의 전형적 제스처에서 `pointerWithin` 이 패널을 놓치고 `closestCenter` 폴백이 가장 가까운 좌석을 `over` 로 돌려 **의도치 않은 좌석 교환**이 일어난다. 저장 전 상태이긴 하지만 사용자가 알아차리지 못하고 저장할 수 있다.
- **근거**: `core.esm.js:970-992` `Rect` 클래스가 `this.rect[key] + (측정 시 scrollOffsets - 현재 scrollOffsets)` 로 지연 보정; `core.esm.js:2977` `pointerCoordinates = activationCoordinates + translate`(현재 뷰포트 좌표); `core.esm.js:827-830` autoScroll 기본 threshold `{x:0.2,y:0.2}`.
- **제안**: 커스텀 충돌 감지에서 패널만은 저장된 rect 대신 실시간 rect 로 판정한다.
  ```ts
  const collisionDetection: CollisionDetection = (args) => {
    const panel = args.droppableContainers.find((c) => c.id === UNASSIGNED_DROP_ID);
    const rect = panel?.node.current?.getBoundingClientRect();
    const p = args.pointerCoordinates;
    if (panel && rect && p && p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom) {
      return [{ id: panel.id, data: { droppableContainer: panel, value: 0 } }];
    }
    return closestCenter(args);
  };
  ```
  (`pointerCoordinates` 는 KeyboardSensor 에서 `null` 이므로 가드 필요.) 대안: `autoScroll={false}` — 긴 교실 목록에서 불편하므로 비권장. `MeasuringStrategy.Always` 는 포인터가 멈춘 채 autoScroll 만 진행될 때 재측정이 안 되므로 불충분.

### [누락] 3-14 와 3-16 이 모순 — "빈 좌석 탭 → 선택 해제" 는 드래그 핸들 `onClick` 으로는 발생할 수 없다
- **심각도**: Warning
- **위치**: 계획 3-14 "드래그 핸들 div 에 onClick", 3-16 "빈 좌석이면 null"; `RoomGrid.tsx:70-102`
- **문제**: 드래그 핸들 div 는 `cell.student` 가 있을 때만 렌더된다(70행 분기). 빈 좌석은 `<span>` 만 있으므로 핸들 `onClick` 은 절대 빈 좌석에서 불리지 않는다. 또한 "배정 해제" 실행 후 `selectedSeat` 를 `null` 로 되돌린다는 언급이 없어 액션바가 사라지는 시점이 불명확하다.
- **근거**: `RoomGrid.tsx:70`(`cell.student ? (<div ref={setDragRef} …>) : (<span …>)`).
- **제안**: (a) 빈 좌석 탭 해제가 필요하면 `onClick` 을 바깥 droppable div(61행)에 두고 `cell.student` 여부는 SeatingEditor 가 아니라 `SeatCell` 이 판단해 `onSelect(hasStudent)` 로 넘긴다. (b) 필요 없으면 계획에서 "빈 좌석 탭 → 해제" 문구를 삭제한다. (c) 액션바의 `배정 해제` 핸들러는 `handleRemoveStudent(...)` 후 `setSelectedSeat(null)` 을 명시한다.

### [타입 안전성 / 성능] `onSelectSeat` 가 `seats` 에 의존하면 `memo(RoomGrid)` 최적화 의도가 무효화된다
- **심각도**: Warning
- **위치**: 계획 3-16 `handleSelectSeat`(빈 좌석 판정), 3-16 "selectedSeatKey … memo 재렌더 최소화"
- **문제**: "빈 좌석이면 null" 판정을 SeatingEditor 에서 하려면 `seats` 를 읽어야 하고, `useCallback` 의존성에 `seats` 가 들어가면 좌석이 바뀔 때마다 새 함수가 만들어져 모든 RoomGrid 가 재렌더된다. 선택 상태 변경(`setSelectedSeat`)만 일어나는 렌더에서 다른 교실을 건너뛰는 것이 `selectedSeatKey` 를 room 별로 나눈 이유인데, 콜백이 불안정하면 그 효과가 없다. 참고로 `cloneSeats`(457-463행)는 모든 교실 Map 을 새로 만들므로 드래그 후 렌더에서는 어차피 전부 재렌더된다 — memo 가 실제로 이득을 보는 경우가 바로 선택/activeId/saving 변경이므로 콜백 안정성이 핵심이다.
- **근거**: `SeatingEditor.tsx:241-250`(`handleRemoveStudent` 는 deps `[]` 로 안정), `RoomGrid.tsx:107`(`memo`).
- **제안**: `handleSelectSeat = useCallback((roomId,row,col) => setSelectedSeat(prev => prev && prev.roomId===roomId && prev.row===row && prev.col===col ? null : {roomId,row,col}), [])` 로 deps 를 비우고, 학생이 없는 셀에서는 `SeatCell` 이 `onSelect` 를 호출하지 않게 한다. 액션바 표시 조건("그 셀에 학생이 있을 때만")은 이미 렌더 시 `seats` 로 판정하므로 콜백에 `seats` 가 필요 없다.

### [누락] `attendance/[grade]/page.tsx` 에 32px 닫기 버튼이 하나 더 있다 (일괄승인 모달)
- **심각도**: Warning
- **위치**: 계획 3-11; `src/app/attendance/[grade]/page.tsx:1096`
- **문제**: 계획은 1192 부근(실제 1195행 버튼, 1204행 `pr-6`)만 다루는데, 1096행 `불참신청 일괄승인` 모달의 닫기 버튼도 `w-8 h-8` 이다. 성공 기준 "reviewer 재실행 시 15개 파일 위반 0" 을 같은 파일에서 놓친다.
- **근거**: `grep -n "w-8 h-8"` → 1096, 1195 두 곳.
- **제안**: 3-11 에 1096행 버튼 `w-11 h-11` 추가. 줄번호 표기도 1195/1204 로 정정.

### [누락 / 규칙 준수 §1] `student/layout.tsx`·`homeroom/layout.tsx` 의 `main px-4` 는 그대로 남는다
- **심각도**: Warning
- **위치**: 계획 3-2(grade-admin·admin 만 `px-1 sm:px-2 md:px-3 lg:px-4`), 3-3; `student/layout.tsx:83`, `homeroom/layout.tsx:48,106`
- **문제**: `student/layout.tsx` 는 핸드오프 15개 파일에 포함돼 있고 `main className="max-w-2xl mx-auto px-4 py-6"` 은 §1(모바일 바깥 여백 p-1~p-2)·체크리스트 4번 위반이다. 3-3 에서 같은 파일을 `min-h-dvh` 로 건드리면서 padding 은 그대로 두면 reviewer 재실행 시 다시 잡힌다. homeroom 레이아웃도 `homeroom/participation`·`homeroom/schedule` 페이지의 바깥 여백을 결정하므로 같은 문제.
- **근거**: 위 줄번호.
- **제안**: 3-3 에 두 레이아웃 `main` 을 `px-1 sm:px-2 md:px-3 lg:px-4` 로 통일. 헤더 내부 `px-4` 는 nav 요소이므로 유지 가능.

### [누락 / 실행 순서] 신규 `responsive-tables.test.ts` 단언 설계에 함정 3가지
- **심각도**: Warning
- **위치**: 계획 3-18
- **문제**:
  1. "7개 표 파일 … thead `z-20`" — `MonthlyCalendar.tsx` 에는 `<thead>` 가 없다(252행 `div.grid … sticky top-0 z-10`). 3-4 도 이 헤더의 z 를 바꾸지 않으므로 일괄 단언은 GREEN 에서 실패한다.
  2. "모달 `p-6` 단독 사용 부재" — 정규식 `/\bp-6\b/` 는 `sm:p-6` 에도 매치된다. `(?<![\w:-])p-6\b` 처럼 접두 변형을 제외해야 한다.
  3. "h3 nowrap"(seating-editor-responsive 갱신) — `RoomGrid.tsx:127` 의 h3 는 백틱 템플릿 className(`{\`font-semibold … ${compact ? …}\`}`)이라 기존 테스트의 `className="([^"]+)"` 패턴으로는 잡히지 않는다.
- **근거**: `MonthlyCalendar.tsx:252`, `RoomGrid.tsx:127`, `StudentManagement.tsx:60`(계획대로면 `mx-2 p-3 sm:mx-4 sm:p-6`).
- **제안**: MonthlyCalendar 는 "헤더 div 가 `sticky top-0`" 만 단언하고 thead z-20 목록에서 제외. 모달 단언은 `mx-2 p-3` 존재 + 접두 없는 `p-6` 부재로 작성. h3 는 `<h3 className=\{`([^`]+)`\}` 로 매치.

### [부작용] `table-scroll` 이 붙은 `MonthlyCalendar` 래퍼 안에서 감독 선택 드롭다운이 잘린다
- **심각도**: Warning
- **위치**: 계획 3-4; `MonthlyCalendar.tsx:250`(래퍼), 443-446(`ul absolute z-50 max-h-48`)
- **문제**: 드롭다운은 래퍼 내부 absolute 요소라 래퍼의 스크롤 오버플로에 포함된다. 지금도 `overflow-x-auto` 가 세로 오버플로를 auto 로 만들어 잘리지만(기존 버그), `max-height` 를 주면 마지막 1~2주 행의 드롭다운이 래퍼 하단 밖으로 나가 스크롤해야만 보인다. `onBlur` 150ms 닫힘은 휠/터치 스크롤로는 안 불리므로 동작은 하지만 UX 가 나쁘다. z-index 자체는 문제없다(헤더 `z-10` < `ul z-50`, 같은 stacking context).
- **근거**: 위 줄번호; `CalendarTeacherSelect` 루트(420행)는 `relative` 만 있고 z-index 없음.
- **제안**: 하단 2행(idx ≥ monthDays.length − 14)에서는 `ul` 에 `bottom-full mb-0.5` 를 줘 위로 펼치거나, 계획서 5장 위험 목록에 "기존 잘림 유지" 를 명시해 의도된 미수정으로 남긴다.

### [부작용 / 규칙 준수 §6] 하단 고정 액션바가 마지막 좌석 행과 미배정 패널을 가린다
- **심각도**: Warning
- **위치**: 계획 3-16 액션바 `fixed inset-x-2 bottom-…`
- **문제**: xl 미만에서 미배정 패널은 교실 아래(356행 `grid-cols-1`)에 있고, 좌석을 선택한 상태에서 액션바(≈100px)가 화면 하단을 덮으면 마지막 교실의 아래 행이나 패널 상단이 가려져 스크롤 끝까지 가도 볼 수 없다. xl 에서는 `sm:right-4 sm:w-80` 카드가 우측 280px 열(sticky 패널)과 세로가 짧은 뷰포트(<≈580px)에서 겹친다.
- **근거**: `SeatingEditor.tsx:356,418`, `UnassignedStudents.tsx:79`(`max-h-[60dvh]`).
- **제안**: `selectedSeat` 가 있을 때 편집기 루트에 `pb-28` 을 주거나(간단), 액션바를 `sticky bottom-0` 인 in-flow 요소로 두어 콘텐츠를 밀어내게 한다.

### [규칙 준수 §6] 좌석 셀 간격 4px, 미배정 칩 간격 4px — 탭 타겟 간 8px 미만
- **심각도**: Suggestion
- **위치**: `RoomGrid.tsx:139`(`grid gap-1`), `UnassignedStudents.tsx:90`(`space-y-1`); 계획 3-14/3-15
- **문제**: 계획이 좌석 탭 → 선택 인터랙션을 새로 도입하므로 좌석 셀이 탭 타겟이 된다. §6 "인접 터치 타겟 간 간격 최소 8px" 기준으로 `gap-1`(4px) 은 미달. 칩도 `min-h-11` 로 키우면서 간격은 4px 로 남는다.
- **근거**: 위 줄번호.
- **제안**: `gap-2`/`space-y-2` 로 변경(10열 교실 기준 폭 +36px, `preserveSeatWidth` 래퍼가 스크롤하므로 안전). 수용하지 않으면 계획서 5장에 "드래그 주 인터랙션이라 4px 유지" 를 명시.

### [부작용] 패널 `isOver` 하이라이트가 미배정 칩을 끌 때도 켜진다
- **심각도**: Suggestion
- **위치**: 계획 3-15 `isOver` 시 `ring-2 ring-red-300`
- **문제**: 학생 칩(`student-*`)을 패널 안에서 집어 움직이면 `pointerWithin` 이 패널을 반환해 `isOver` 가 true 가 되고 "여기 놓으면 해제" 처럼 보이는 빨간 링이 뜬다. `handleDragEnd` 는 `parseDragId("unassigned")` → null 로 무시하므로 동작 버그는 아니지만 시각적 오해를 준다.
- **근거**: `useDroppable` 반환 타입에 `active` 포함(`hooks/useDroppable.d.ts:22`); `SeatingEditor.tsx:184`.
- **제안**: `const { isOver, active } = useDroppable(...)`; 하이라이트 조건을 `isOver && String(active?.id).startsWith("seat-")` 로.

### [규칙 준수 / 접근성] 좌석 선택·해제가 키보드로 불가능해진다
- **심각도**: Suggestion
- **위치**: 계획 2-5 설계 1·2, `RoomGrid.tsx:71-76`(`{...attributes}` 가 `role="button" tabIndex=0` 부여)
- **문제**: 기존 X 버튼은 `<button>` 이라 Tab/Enter 로 해제가 가능했다. 새 설계는 div `onClick` 이므로 Enter/Space 는 KeyboardSensor 가 드래그 시작으로 소비하고 div 는 click 을 합성하지 않는다. 키보드 드래그로 패널까지 이동하는 것은 사실상 불가.
- **근거**: dnd-kit `KeyboardSensor` 기본 활성 키 Enter/Space; `useDraggable` `attributes`.
- **제안**: 핸들 div 에 `onKeyDown={(e) => { if (e.key === "Delete" || e.key === "Backspace") onSelect(); }}` 를 추가하거나, 액션바를 `role="dialog"` + 자동 포커스로 만들어 선택 후 키보드 조작이 가능하게 한다. 관리자 도구이므로 후속 과제로 미뤄도 되나 계획서에 명시할 것.

### [규칙 준수 §3.4] thead 단위 sticky 에서의 z 서열 재해석은 타당하나, 표기가 오해를 부른다
- **심각도**: Suggestion
- **위치**: 계획 2-2 "서열: 일반 셀 < 인덱스 td(10) < thead(20) < 교차 th(30)"
- **문제**: `position: sticky` 는 항상 stacking context 를 만들므로 thead 안 th 의 `z-30` 은 thead 내부(형제 th 대비)에서만 의미가 있고 바깥 td(10)·모달(50)과는 비교되지 않는다. "30 이 20 보다 위" 라는 서술은 CSS 상 성립하지 않는다(결과는 동일하게 옳다). 규칙 §3.4 의 셀 단위 서열(헤더 2 < 인덱스 3)을 thead 단위에 그대로 적용하면 계획이 지적한 "인덱스 셀이 헤더를 덮는" 버그가 재현되므로 재해석 자체는 정당하다.
- **근거**: `StudentManagement.tsx:367-369,414`(현재 thead z-10 / th z-20 / td z-10), `SupervisorSummaryModal.tsx:90-92,112`(같은 재해석을 이미 사용: thead z-20, th z-30, td z-20/z-[5]).
- **제안**: 문구를 "thead(20) > 본문 인덱스 td(10); thead 내부에서 교차 th 는 형제 th 보다 위(z-30 은 thead 컨텍스트 로컬)" 로 정정하고, 이 프로젝트 관행(SupervisorSummaryModal 과 동일)임을 명시. 규칙 파일 §3.4 에 "thead 단위 sticky 구조" 각주를 추가하는 후속 제안.

### [규칙 준수 §6] 체크박스 44px label 래핑 — 충족하나 `title` 위치와 `cursor` 보완 필요
- **심각도**: Suggestion
- **위치**: 계획 2-3, 3-5, 3-10; `ParticipationManagement.tsx:146-153,186-191,209-216`
- **문제**: `<label class="inline-flex h-11 w-11 …">` 래핑은 label 활성화 규칙으로 히트 영역이 44px 이 되고, disabled input 은 label 클릭에도 반응하지 않으므로 §6 을 만족한다. 다만 헤더 체크박스의 `title`(152행)은 input 에 남아 44px 영역 전체에서 툴팁이 뜨지 않고, label 에 `cursor-pointer` 가 없어 데스크탑 어포던스가 약하다.
- **근거**: 위 줄번호.
- **제안**: `title` 을 label 로 옮기고 `cursor-pointer`(disabled 시 `cursor-not-allowed`) 추가. 이름 sticky td 는 `tr` 의 `hover:bg-gray-50` 을 못 받으므로 `tr` 에 `group`, td 에 `group-hover:bg-gray-50` 을 준다.

### [규칙 준수 / 접근성] `homeroom/schedule` 슬롯 행 → `<button>` 전환은 시맨틱상 문제없음, 라벨만 보강
- **심각도**: Suggestion
- **위치**: 계획 3-9; `homeroom/schedule/page.tsx:251-273`
- **문제**: 행 내용이 span 뿐이라 button 안에 두어도 phrasing content 규칙을 지키고, "교체" 를 span 으로 바꾸면 중첩 인터랙티브도 없다. 다만 스크린리더는 "1 김교사 교체" 로 읽으므로 의미가 약하고, 전체 행이 버튼이 되면 hover 어포던스가 없어진다. 배정 없음/과거 날짜 행은 div 로 남기는 분기는 적절.
- **근거**: 위 줄번호; Tailwind 4 preflight 가 button 의 `font/color` 만 상속시키므로 `text-left` 명시는 필요(계획에 있음).
- **제안**: `aria-label={`${slot.grade}학년 ${assignment.teacherName} 감독 교체`}` 와 `hover:bg-blue-50` 추가.

### [과잉 설계] `student/attendance` 주간 표(4행)에 `table-scroll` + sticky thead 는 실효가 없다
- **심각도**: Suggestion
- **위치**: 계획 3-13, 3-18 "7개 표 파일"
- **문제**: 세션 3행 표는 어떤 뷰포트에서도 세로 스크롤이 생기지 않는다. 규칙 §3.2 문자 그대로는 맞지만 `table-scroll` 은 무의미한 `max-height` 를 붙일 뿐이다. 반면 가로 잘림(375px) 은 실제 문제이므로 `overflow-x-auto` + nowrap + sticky 첫 열은 정당하다.
- **근거**: `student/attendance/page.tsx:221-260`.
- **제안**: 3-13 은 `overflow-x-auto` 래퍼·nowrap·sticky 첫 열만 적용하고 `table-scroll` 은 생략, 신규 테스트의 "7개" 를 6개로 조정. 규칙 일관성을 우선하면 현행 유지도 무방(해롭지 않음).

### [과잉 설계 / 범위] `table-scroll` 높이가 카드 상단 툴바·하단 "총 N명" 을 빼지 않아 이중 스크롤이 항상 발생한다
- **심각도**: Suggestion
- **위치**: 계획 2-1, 3-1, 5장 "표 높이 제한"
- **문제**: 래퍼는 헤더 바로 아래가 아니라 제목(h1)·필터 툴바·카드 테두리 아래에 있고 카드 안에 푸터가 있다. `calc(100dvh - var(--header-h))` 는 이 여분을 빼지 않아 래퍼가 가시 영역보다 커지고, 문서 스크롤 + 래퍼 스크롤이 항상 동시에 존재한다. 계획이 수용한다고 적었으나 완화가 쉽다.
- **근거**: `grade-admin/[grade]/participation/page.tsx:122-146`, `StudentManagement.tsx:317-364`.
- **제안**: `@utility table-scroll { max-height: calc(100dvh - var(--header-h) - var(--table-offset, 8rem)); overflow: auto; }` 처럼 페이지별 오프셋 변수를 두거나, 최소한 고정 여유(예 6rem)를 뺀다. 완전한 해법(레이아웃 자체를 내부 스크롤 컨테이너로)은 범위 밖으로 두는 것이 맞다.

### [사실 확인] 학생 레이아웃 헤더 높이 6.75rem 은 과대 추정(≈6.4rem) — 무해
- **심각도**: Suggestion
- **위치**: 계획 2-1, 3-3 `[--header-h:6.75rem]`; `student/layout.tsx:37-80`
- **문제**: 제목 행 `py-4` + `text-lg`(28px) = 60px, 탭 `py-2.5 text-sm` + `border-b-2` = 42px, 헤더 `border-b` 1px → 약 103px ≈ 6.4rem. 6.75rem(108px) 은 5px 크게 잡아 래퍼가 약간 짧아질 뿐 잘림은 없다.
- **근거**: 위 줄번호.
- **제안**: 그대로 두거나 6.5rem 으로 조정. 값은 주석 없이 상수명(`--header-h`)만으로 의미가 드러나므로 coding-style §1 준수.

### [누락] `session-literal-guard` 허용 목록에 `RoomGrid.tsx`·`UnassignedStudents.tsx` 가 없다
- **심각도**: Suggestion
- **위치**: 계획 2-6; `tests/session-literal-guard.test.ts:8-20`
- **문제**: 계획은 SeatingEditor 에만 "afternoon 리터럴 금지" 를 적는데, 허용 목록 밖인 RoomGrid/UnassignedStudents 에 새 코드(액션바 라벨, droppable id 등)를 넣을 때 `"afternoon"` 문자열이 들어가면 src 스캔이 실패한다. 계획된 문자열(`"unassigned"`, `배정 해제`) 은 안전하다.
- **근거**: 허용 목록 11행은 `components/seats/SeatingEditor.tsx` 만.
- **제안**: 3-14/3-15 에 같은 주의 문구 추가.

### [실행 순서] PROJECT_MAP 동기화 단계 누락
- **심각도**: Suggestion
- **위치**: 계획 6장
- **문제**: 신규 테스트 파일 생성 + RoomGrid props 계약 변경은 프로젝트 `CLAUDE.md` 가 요구하는 `project-map-updater` 실행 대상이다. 6장 8단계까지에 없다.
- **근거**: 프로젝트 `CLAUDE.md` "코드 변경 후" 절.
- **제안**: 7단계와 8단계 사이에 "PROJECT_MAP 갱신" 추가. 테스트 실행 명령은 memory 대로 `npx tsx tests/*.test.ts`(package.json 에 `test` 스크립트 없음)임을 명시.

### [사실 확인] 소소한 줄번호 오차
- **심각도**: Suggestion
- **위치**: 계획 2-6 `seat-participation.test.ts:84-96`(실제 87-97), 3-11 `:1192`(실제 1195/1204), 2-5 "`SeatingEditor` 는 …" 의 `collisionDetection={closestCenter}` 352행
- **문제**: 실행에 지장 없는 표기 오차.
- **제안**: 정정.

---

## 2. 관점별 요약

| 관점 | 판정 |
|---|---|
| 1. 사실 확인 | 대체로 정확. 줄번호 2건 오차, 학생 헤더 높이 과대 추정(무해). dnd-kit·Tailwind 주장 전부 검증 통과 |
| 2. 누락 | 1096행 닫기 버튼, student/homeroom 레이아웃 `main px-4`, 빈 좌석 탭 모순·해제 후 선택 초기화, 테스트 단언 함정 3건, literal-guard 범위, PROJECT_MAP 단계 |
| 3. 부작용 | **sticky 패널 드롭 좌표 드리프트(Critical)**, 달력 드롭다운 잘림(기존 버그 유지), 액션바가 콘텐츠 가림, `isOver` 오표시. z-index 충돌은 AdminNav/모달/팝오버/DragOverlay 모두 없음(확인) |
| 4. 실행 순서 | 의존성(globals → 표, RoomGrid → SeatingEditor/HelpDemos 동일 tsc 패스) 반영됨. RED 단언은 현재 코드에서 실제로 실패함(`group-hover:opacity-100` 존재, `onSelectSeat`/`pointerWithin`/`useDroppable` 부재, `--header-h` 부재, `w-7 h-7`·`min-h-9`·`min-h-screen` 존재) |
| 5. 타입 안전성 | 새 props 선택적 → HelpDemos 는 `onRemoveStudent` 제거만으로 통과. `CollisionDetection` 타입 명시 권장. `onSelectSeat` 는 deps 없는 `useCallback` 필수 |
| 6. 규칙 준수 | §2·§3·§4·§6 대부분 충족. §3.4 재해석 타당(표현만 정정). §1 은 student/homeroom 레이아웃에서 미충족. 좌석 셀·칩 간격 4px 는 §6 미달 |
| 7. 과잉 설계 / 범위 | `min-h-dvh` 확장·sticky 첫 열·select `min-h-11` 은 규칙 근거가 있어 정당. 패널 droppable 은 Critical 수정을 전제로 유지 가능(대안: 탭→액션바 단일 경로). `student/attendance` 의 `table-scroll` 은 불필요 |

---

## 3. 종합 평가

- **전반 품질: 중상(中上)**. 현황 분석(패턴 A 원인, z 서열 문제, dnd-kit 클릭 전달)이 정확하고 Tailwind 4 문법 선택도 모두 실제 컴파일로 확인됐다. 회귀 테스트 영향 분석도 맞다.
- **Critical 1건**: xl `xl:sticky` 미배정 패널을 dnd-kit droppable 로 쓰면 드래그 중 autoScroll 시 좌표가 어긋나 해제 대신 좌석 교환이 발생. 커스텀 충돌 감지에서 패널을 실시간 `getBoundingClientRect()` 로 판정하면 해결(5줄).
- **Warning 7건**: 3-14/3-16 모순(빈 좌석 탭), `onSelectSeat` 안정성, 1096행 닫기 버튼 누락, student/homeroom `main px-4` 잔존, 신규 테스트 단언 함정(MonthlyCalendar thead 없음·`sm:p-6`·백틱 className), 달력 드롭다운 잘림, 액션바가 콘텐츠 가림.
- **실행 가능 여부**: **가능** — Critical 1건과 Warning 중 "3-14/3-16 모순", "테스트 단언 함정", "1096행", "레이아웃 px-4" 를 계획서에 반영한 뒤 착수하면 된다. 나머지 Warning/Suggestion 은 구현 중 같은 파일을 만질 때 함께 처리하는 것이 비용이 가장 낮다.
