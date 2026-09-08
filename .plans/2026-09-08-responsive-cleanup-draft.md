# 반응형 위반 정리(15개 파일) + 좌석 해제 44px 설계 — 초안

작성일: 2026-09-08 · 근거: `/tmp/selfstudy-handoff-2026-09-08.md` §4.2·§4.3, `~/.claude/rules/responsive-ui.md`

## 1. 목표
- 2차 responsive-ui-reviewer 가 남긴 기존 위반 15개 파일을 규칙(§1·§2·§3·§4·§6)에 맞게 모두 고치고, 좌석 해제 버튼을 44px 터치 타겟 설계로 교체한다.
- 성공 기준: 로컬 클론에서 테스트 전부 PASS, eslint 오류 0(경고는 `no-img-element` 7건만), tsc 0, `next build` 성공, `responsive-ui-reviewer` 재실행 시 15개 파일 신규/기존 위반 0.

## 2. 현재 상태 분석

### 2-1. 공통 패턴 A — sticky thead 가 `overflow-x-auto` 래퍼 안에 있어 동작하지 않음
`overflow-x:auto` 는 `overflow-y` 를 auto 로 계산해 래퍼가 스크롤포트가 된다. 래퍼에 높이 제한이 없으니 래퍼는 세로로 스크롤되지 않고, thead 는 문서 스크롤에 붙지 않는다.
해당: `MonthlyCalendar.tsx:250-252`, `ParticipationManagement.tsx:121-132`, `GradeMonthlyAttendance.tsx:113-116`, `StudentManagement.tsx:364-367`, `homeroom/participation/page.tsx:101-104`, `grade-admin/[grade]/participation/page.tsx:146-149`, `student/attendance/page.tsx:221-223`(thead sticky 조차 없음).

**해법(선택)**: 래퍼를 실제 스크롤포트로 만든다 — `max-height: calc(100dvh - var(--header-h))` + `overflow: auto`. 규칙 §4 "콘텐츠 영역 내부 스크롤 기본" 과 일치. 6곳 이상 반복이므로 `globals.css` 에 `@utility table-scroll` 로 추출(coding-style §4 "3회 이상 반복 시 추출", nextjs-prisma §6 "반복 클래스 조합은 유틸화").
- `:root { --header-h: 3.5rem }` — AdminNav/homeroom nav 는 `h-14` sticky.
- 학생 레이아웃은 헤더(제목 행 64px + 탭 42px + 테두리) ≈ 6.75rem 이므로 레이아웃 루트에 `[--header-h:6.75rem]` 로 재정의.

### 2-2. 공통 패턴 z-index (§3.4)
`GradeMonthlyAttendance`·`StudentManagement` 는 thead 전체를 `sticky top-0 z-10` 으로 붙이고(다중 헤더 행이라 thead 단위가 맞음), 본문 인덱스 td 도 `z-10`. 같은 z 에서 DOM 뒤쪽(tbody)이 위에 그려져 세로 스크롤 시 인덱스 셀이 헤더를 덮는다. 규칙 §3.4 는 셀 단위 z(2/3/4)를 전제하지만, thead 자체가 sticky(stacking context)인 구조에서는 **thead > 본문 인덱스 td** 여야 한다.
**해법**: thead `z-20`, thead 안 좌상단(인덱스 열) th `z-30`, tbody 인덱스 td `z-10`. 서열: 일반 셀 < 인덱스 td(10) < thead(20) < 교차 th(30). 헤더가 인덱스 셀 위에 오고, 교차 셀이 헤더 안에서 최상위.

### 2-3. 공통 패턴 B — 터치 타겟 < 44px (§6)
- 월 이동/이번달/Excel 버튼 `px-3 py-2`(38px), `py-1.5 text-xs`(30px)
- 요일 토글 `w-7 h-7`, 체크박스 `w-4 h-4`/`w-3.5 h-3.5`
- 행 액션 `px-2.5 py-1`(24px), `px-2 py-0.5`(22px)
- 달력 날짜 셀 `min-h-9`
- 닫기 `w-8 h-8`, 주간 이동 `p-2`(36px)
- 드래그 칩 ≈30px
**해법**: 버튼은 `min-h-11`(+가로가 좁은 화살표류는 `min-w-11`). 체크박스는 시각 크기를 유지하고 `<label className="inline-flex h-11 w-11 items-center justify-center">` 로 감싸 히트 영역만 44px(표준 기법). 인접 타겟 간 8px(§6) 는 열 폭 52px(44+8)·`mt-2` 로 확보.

### 2-4. 공통 패턴 C — nowrap 누락 / `overflow-hidden` 래퍼 (§3.1)
`ParticipationManagement`(tableLayout fixed, 21열 th/td), 참여설정 2페이지 td, `student/attendance` 표(래퍼 `overflow-hidden`, nowrap 없음, 375px 에서 우측 열 잘림).
**해법**: `table` 에 `whitespace-nowrap`(자식 상속) + 바깥 `rounded-lg overflow-hidden` 유지, 안쪽 래퍼 `overflow-x-auto table-scroll`.

### 2-5. 좌석 해제 버튼 (§6, handoff §4.3)
`RoomGrid.tsx:86-96`: 데스크탑 hover 16px, 터치 `pointer-coarse:` 28px. 52×56px 셀에 44px 버튼을 넣으면 드래그 시작 영역을 잠식.
DnD 사실 확인: `SeatingEditor` 는 `PointerSensor({distance:5})` — dnd-kit 은 활성화(5px 이동) 후에만 document click 을 capture 로 막으므로, 이동 없는 탭은 좌석 요소의 `onClick` 으로 정상 전달된다. `collisionDetection={closestCenter}`.

**설계 결정**:
1. X 버튼 제거(hover 전용·16px 위반 근원 제거).
2. 좌석 탭 → 선택(파란 ring) → 화면 하단 고정 액션바(`fixed bottom-2 inset-x-2`, `배정 해제`·`취소` 모두 `min-h-11`). 격자가 길어 상단 툴바가 화면 밖일 때도 엄지 영역에서 즉시 접근 가능. 같은 좌석 재탭·빈 좌석 탭·드래그 시작·세션 데이터 재로드 시 선택 해제.
3. 데스크탑 1제스처 경로 보전: `UnassignedStudents` 패널을 `useDroppable({id:"unassigned"})` 로 만들어 좌석→패널 드롭으로 해제. 충돌 감지는 `pointerWithin` 결과에 패널이 있으면 패널, 아니면 기존 `closestCenter` — 좌석 간 교환 동작은 그대로.
4. 후보 "의사요소 히트 확장" 은 드래그 영역 잠식 문제가 동일하므로 채택하지 않음.

### 2-6. 관련 회귀 테스트(src 스캔)
- `tests/seating-editor-responsive.test.ts:47-51` 이 해제 버튼 클래스(`pointer-coarse:opacity-100`, `pointer-coarse:w-7`)를 단언 → 새 설계로 교체.
- `tests/help-mdx.test.ts` — `HelpDemos.tsx` 가 `RoomGrid`/`UnassignedStudents` 를 `DndContext` 안에서 사용(`onRemoveStudent` 전달). prop 변경 시 HelpDemos 갱신.
- `tests/participation-wiring.test.ts`, `tests/monthly-attendance-wiring.test.ts` — `colSpan={21}`/`colSpan={3}`, `SESSION_TYPES.map` 등 구조 단언. 클래스 변경만이라 영향 없음(유지 확인).
- `tests/session-literal-guard.test.ts` — SeatingEditor 는 허용 목록. 새 `"afternoon"` 리터럴 추가 금지.
- `tests/seat-participation.test.ts:84-96` — SeatingEditor 배선 단언(유지).

### 2-7. 범위 밖이지만 같은 패턴을 가진 파일(참고, 이번 작업에서 수정하지 않음)
`homeroom/attendance/page.tsx:153-156`, `homeroom/page.tsx:206-209`, `homeroom/absence-requests/page.tsx:116`, `admin/users/page.tsx:250-252`, `student/batch-absence/page.tsx:215`, `admin/statistics/page.tsx:96`. 핸드오프 목록(15개) 밖이므로 후속 과제로 보고만 한다. 단, `min-h-screen`→`min-h-dvh` 는 1토큰 치환이고 위험이 없어 레이아웃 전체(admin·homeroom·student·attendance·login·help)에 함께 적용한다(확장 범위로 명시).

## 3. 변경 계획

### 3-1. `src/app/globals.css`
- `:root { --header-h: 3.5rem; }` 추가.
- `@utility table-scroll { max-height: calc(100dvh - var(--header-h)); overflow: auto; }` 추가.
- 이유: 패턴 A 해법의 단일 정의.

### 3-2. `src/app/grade-admin/[grade]/layout.tsx`, `src/app/admin/layout.tsx`
- `min-h-screen` → `min-h-dvh`; `main` `px-4` → `px-1 sm:px-2 md:px-3 lg:px-4`.
- 이유: §4, §1.

### 3-3. 레이아웃/페이지 `min-h-screen` → `min-h-dvh` (확장)
- `homeroom/layout.tsx`(2곳), `student/layout.tsx`(2곳, 루트에 `[--header-h:6.75rem]` 추가), `attendance/layout.tsx`, `login/page.tsx`, `help/page.tsx`.

### 3-4. `src/components/admin-shared/MonthlyCalendar.tsx`
- 래퍼(250) `overflow-x-auto` → `overflow-x-auto table-scroll`.
- 이전달/다음달/이번달/Excel 버튼·링크에 `min-h-11 whitespace-nowrap`(Excel 링크는 `inline-flex items-center`).

### 3-5. `src/components/admin-shared/ParticipationManagement.tsx`
- 래퍼(122) `table-scroll` 추가. `table` 에 `whitespace-nowrap`.
- colgroup: 이름 80 유지, 참가 열 44→52, 요일 열 36→52.
- thead `z-10`→`z-20`; 이름 th `sticky left-0 z-30 bg-gray-50`; 이름 td `sticky left-0 z-10 bg-white`.
- 헤더 전체 체크박스·행 참가 체크박스: `<label className="inline-flex h-11 w-11 items-center justify-center">` 래핑.
- 요일 버튼 `w-7 h-7` → `h-11 w-11`; 방과후 체크박스 래퍼 `mt-1` → `mt-2` + label 래핑(`h-11 w-11`).
- 반 필터 select `min-h-11`.

### 3-6. `src/components/attendance/AttendanceDatePicker.tsx`
- 날짜 셀 `min-h-9` → `min-h-11`.
- 팝오버 폭 `w-[clamp(260px,80vw,320px)]` → `w-[min(100vw-1.5rem,344px)]` (7열×44 + 간격 12 + 패딩 24 = 344; 부모 `left-3` 이므로 우측 12px 여유). 320px 폰에서는 37px 로 남음(허용).

### 3-7. `src/components/grade-admin/GradeMonthlyAttendance.tsx`
- 래퍼(114) `table-scroll`. thead `z-10`→`z-20`; 1·2행 인덱스 th `z-10`→`z-30`; tbody 인덱스 td `z-10` 유지.
- 화살표 버튼 `min-h-11 min-w-11`, Now/Excel `min-h-11`, 범례 토글 `min-h-11`.

### 3-8. `src/components/students/StudentManagement.tsx`
- 래퍼(365) `table-scroll`. thead `z-20`, 이름 th `z-30`, 이름 td `z-10`.
- select/Excel/학생 추가 `min-h-11`; 도우미 토글 `min-h-11 min-w-11`; 수정/삭제/복원 `min-h-11`.
- 모달 카드 `mx-4 p-6` → `mx-2 p-3 sm:mx-4 sm:p-6`; 취소/제출 `min-h-11`.

### 3-9. `src/app/homeroom/schedule/page.tsx`
- 화살표 `min-h-11 min-w-11`; Now/토일/누계 `min-h-11`.
- 달력 슬롯 행(251-273): `assignment && isFutureOrToday` 이면 행 전체를 `<button type="button" className="... min-h-11 w-full text-left">` 로, 아니면 `<div className="... min-h-11">`. "교체" 텍스트는 버튼 안 시각 힌트로 유지(별도 버튼 아님).
- 모달 카드 `mx-2 p-3 sm:mx-4 sm:p-6`; 취소/교체 `min-h-11`.

### 3-10. `src/app/homeroom/participation/page.tsx`, `src/app/grade-admin/[grade]/participation/page.tsx`
- 3-5 와 동일 규칙(table-scroll, table nowrap, thead z-20, 이름 sticky, label 래핑, `h-11 w-11`, `mt-2`). grade-admin 판은 방과후 행 없음. grade-admin 판 select `min-h-11`.

### 3-11. `src/app/attendance/[grade]/page.tsx:1192`
- 닫기 버튼 `w-8 h-8` → `w-11 h-11`; 본문 `pr-6` → `pr-12`.

### 3-12. `src/app/attendance/page.tsx`
- 카드 `p-8 mx-4` → `p-4 sm:p-8 mx-2`; 버튼 `px-6 text-lg` → `px-4 sm:px-6 text-base sm:text-lg`, `gap-3` → `gap-2 sm:gap-3`. (`assignedGrade` 데드코드는 §4.5 범위 밖 — 유지)

### 3-13. `src/app/student/attendance/page.tsx`
- 탭 버튼·주/월 이동 버튼 `min-h-11`(이동은 `min-w-11`).
- 주간 표: 바깥 `rounded-lg border overflow-hidden` 유지, 안쪽 `<div className="overflow-x-auto table-scroll">` 신설; `table` `whitespace-nowrap`; thead `sticky top-0 z-20 bg-gray-50`; 첫 열 th `sticky left-0 z-30 bg-gray-50`, td `sticky left-0 z-10 bg-white`.

### 3-14. `src/components/seats/RoomGrid.tsx`
- props: `onRemoveStudent` 제거 → `selectedSeatKey?: string | null`, `onSelectSeat?: (roomId,row,col) => void`.
- SeatCell: X 버튼 제거; 드래그 핸들 div 에 `onClick={() => onSelect()}`; `isSelected` 시 `ring-2 ring-blue-500 ring-offset-1`; `cursor-grab` 유지.
- h3: `whitespace-nowrap overflow-hidden text-ellipsis min-w-0` + `title={room.name}`; 헤더 행 `gap-2`, 우측 span `shrink-0`.

### 3-15. `src/components/seats/UnassignedStudents.tsx`
- 루트 `useDroppable({ id: "unassigned" })`, `isOver` 시 `ring-2 ring-red-300 bg-red-50/40`.
- 칩 `min-h-11`.

### 3-16. `src/components/seats/SeatingEditor.tsx`
- state `selectedSeat: {roomId,row,col} | null`. 데이터 재로드 effect 에서 `null`. `handleDragStart` 에서 `null`.
- `handleSelectSeat(roomId,row,col)`: 같은 좌석이면 해제, 빈 좌석이면 `null`, 아니면 선택.
- `collisionDetection`: `(args) => { const hit = pointerWithin(args).find(c => c.id === "unassigned"); return hit ? [hit] : closestCenter(args); }`.
- `handleDragEnd`: `overIdStr === "unassigned"` 이고 소스가 seat 이면 `handleRemoveStudent(...)` 후 return. 기존 로직 유지.
- RoomGrid 3곳: `onRemoveStudent` → `selectedSeatKey`(해당 room 일 때만 값, 아니면 null — memo 재렌더 최소화) + `onSelectSeat`.
- 액션바: `selectedSeat` 이고 그 셀에 학생이 있을 때만 `fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 sm:inset-x-auto sm:right-4 sm:w-80` 카드. 내용: `{room.name} · {반}-{번} {이름}`(nowrap+ellipsis), `배정 해제`(red, `min-h-11`), `취소`(`min-h-11`).

### 3-17. `src/components/help/HelpDemos.tsx`
- `onRemoveStudent={() => undefined}` 제거(새 prop 은 선택적).

### 3-18. 테스트
- `tests/seating-editor-responsive.test.ts`: 47-51 교체 — RoomGrid 에 `group-hover:opacity` X 버튼 없음, `onSelectSeat` 존재, h3 nowrap; SeatingEditor 액션바 `배정 해제` 버튼 `min-h-11`, `pointerWithin` 사용; UnassignedStudents `useDroppable` + `"unassigned"` + 칩 `min-h-11`.
- 신규 `tests/responsive-tables.test.ts`(src 스캔): globals.css 에 `--header-h`·`@utility table-scroll`; 7개 표 파일 래퍼에 `table-scroll`; thead `z-20`; `w-7 h-7`·`min-h-9` 부재; 대상 버튼 `min-h-11`; 레이아웃에 `min-h-screen` 부재; 학생 레이아웃 `--header-h` 재정의; 모달 `p-6` 단독 사용 부재.

## 4. 의존성 및 영향 범위
- DB 스키마·API 계약 변경 없음. 타입 변경은 `RoomGrid` props(내부 컴포넌트 3개 소비자: SeatingEditor, HelpDemos, MiraeHallLayout 경유).
- `@utility` 는 Tailwind 4(`@tailwindcss/postcss ^4`) 기능. `pointer-coarse:` 변형은 더 이상 사용하지 않음.
- `fixed` 액션바: 조상에 transform 없음(확인 — layout main 은 일반 블록).

## 5. 위험 요소
- **dnd-kit 탭 vs 클릭**: 활성화 전 클릭은 전달됨(2-5). 만약 특정 브라우저에서 pointerdown 후 미세 이동으로 활성화되면 클릭이 막혀 선택이 안 될 수 있음 → distance 5px 그대로 유지, 실기기 확인 항목으로 보고.
- **표 높이 제한**: 문서 스크롤 + 래퍼 스크롤 이중 스크롤 UX. 규칙 §4 가 내부 스크롤을 기본으로 요구하므로 수용.
- **참여설정 표 행 높이 증가**(44+8+44+패딩 ≈ 110px): 30명 → 3,300px, table-scroll 로 내부 스크롤. 정보 밀도 감소는 §6 준수의 대가.
- **달력 셀 높이 증가**(homeroom/schedule): 슬롯 3행 × 44 = 132px/셀. 데스크탑도 동일 적용(규칙이 포인터 종류를 구분하지 않음).
- **HelpDemos**: RoomGrid prop 변경을 반영하지 않으면 tsc 실패 → 3-17.

## 6. 실행 순서 (개략)
1. RED: `tests/responsive-tables.test.ts` 신규 + `seating-editor-responsive` 갱신 → 실패 확인.
2. globals.css + 레이아웃(3-1~3-3).
3. 표 5곳 패턴 A/z/B/C(3-4, 3-5, 3-7, 3-8, 3-10, 3-13).
4. 버튼/모달/팝오버(3-6, 3-9, 3-11, 3-12).
5. 좌석 해제 설계(3-14~3-17).
6. GREEN: 테스트 전부, eslint, tsc, build.
7. `responsive-ui-reviewer` 재실행 → 잔여 위반 수정.
8. 변경 파일을 GDrive 트리로 복사. 커밋/push 는 사용자 확인 후.
