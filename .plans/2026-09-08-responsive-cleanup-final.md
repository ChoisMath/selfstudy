# 반응형 위반 정리(15개 파일) + 좌석 해제 44px 설계 — 최종

작성일: 2026-09-08 · 초안: `2026-09-08-responsive-cleanup-draft.md` · 리뷰: `2026-09-08-responsive-cleanup-review.md`

## 0. 초안 대비 변경 (Phase 3 성찰 결과)

| # | 리뷰 지적 | 판단 | 반영 |
|---|---|---|---|
| C1 | `xl:sticky` 패널 droppable 은 autoScroll 시 rect 드리프트 → 해제 대신 교환 | **수용** | 충돌 감지에서 패널만 `node.current.getBoundingClientRect()` 실시간 판정, `pointerCoordinates` null 가드. `pointerWithin` 은 사용하지 않음 |
| W1 | 빈 좌석 탭 → 해제가 핸들 onClick 으론 불가, 해제 후 선택 초기화 미명시 | **수용** | `onClick` 을 바깥 droppable div 에 두고 `SeatCell` 이 `onSelectSeat(hasStudent ? seat : null)` 호출. 해제 후 `setSelectedSeat(null)` |
| W2 | `onSelectSeat` 가 `seats` 에 의존하면 memo 무효 | **수용** | deps 없는 `useCallback` + 함수형 setState |
| W3 | `attendance/[grade]/page.tsx:1096` 닫기 버튼 누락 | **수용** | 1096·1195 둘 다 `w-11 h-11`, 1204 `pr-12` |
| W4 | student/homeroom 레이아웃 `main px-4` 잔존 | **수용** | 5개 레이아웃 main 을 `px-2 md:px-3 lg:px-4` 로 통일(모바일 8px = §1 "p-1~p-2" 범위) |
| W5 | 테스트 단언 함정 3건 | **수용** | MonthlyCalendar 헤더 div 도 `z-20` 으로 올려 `(thead\|div) sticky top-0 z-20` 로 단언, `p-6` 은 `(^\|[^\w:-])p-6\b`, h3 는 백틱 패턴 |
| W6 | 달력 드롭다운이 래퍼 하단에서 잘림(기존) | **부분 수용** | 하단 2주(idx ≥ length−14)는 `bottom-full mb-0.5` 로 위로 펼침(`openUpward` prop) |
| W7 | fixed 액션바가 마지막 행/패널을 가림 | **수용(대안)** | 액션바를 편집기 루트 마지막 자식 `sticky bottom-2` in-flow 로 — 콘텐츠를 밀어내고 편집기 밖과 겹치지 않음. xl 에서는 `sm:mr-auto sm:w-96` 로 좌측(격자 열) 정렬해 우측 패널과 분리 |
| S1 | 좌석 셀 gap 4px < 8px | **부분 거부** | 좌석 격자 `gap-1` 유지 — 미래홀 도면(`MiraeHallLayout` 고정 영역)의 기하가 바뀌어 회귀 위험, 드래그가 주 인터랙션. 칩 `space-y-1`→`space-y-2` 는 수용 |
| S2 | 학생 칩을 끌 때도 패널 isOver 링 | **수용** | `isOver && String(active?.id).startsWith("seat-")` |
| S3 | 키보드로 해제 불가 | **수용(최소)** | 핸들 `onKeyDown` Delete/Backspace → 선택; 액션바 `배정 해제` 버튼 `autoFocus`(Enter 로 해제), 액션바 Escape → 선택 해제 |
| S4 | z 서열 표현 부정확 | **수용** | 아래 2-2 문구 정정 |
| S5 | label 에 title/cursor, sticky td 행 hover | **수용** | `title`·`cursor-pointer` label 로, `tr group` + td `group-hover:bg-gray-50` |
| S6 | 슬롯 행 button aria-label/hover | **수용** | `aria-label`, `hover:bg-blue-50` |
| S7 | student/attendance `table-scroll` 무의미 | **거부** | 해롭지 않고 "모든 표 동일 구조" 단언이 단순해짐 |
| S8 | table-scroll 이 툴바/푸터 높이를 빼지 않아 이중 스크롤 | **거부** | 래퍼 상단이 nav 바로 아래에 올 때 정확히 뷰포트를 채우는 값이 `100dvh − header`. 오프셋을 더 빼면 그 상태에서 빈 공간만 생김. 이중 스크롤은 문서 스크롤 레이아웃의 본질이며 §4 가 내부 스크롤을 기본으로 요구 |
| S9 | 학생 헤더 6.75rem 과대 | **수용** | `[--header-h:6.5rem]` |
| S10 | literal-guard 주의를 RoomGrid/Unassigned 에도 | **수용** | 새 문자열에 `"afternoon"` 금지 |
| S11 | PROJECT_MAP 단계 누락 | **수용** | 실행 순서 7.5 추가 |
| S12 | 줄번호 오차 | **수용** | 정정 |

## 1. 목표
- 핸드오프 §4.2 의 15개 파일 위반을 규칙(§1·§2·§3·§4·§6)에 맞게 모두 고치고, 좌석 해제를 44px 터치 타겟 설계로 교체한다.
- 성공 기준: 로컬 클론에서 테스트 전부 PASS(신규 포함), eslint 오류 0(경고는 `no-img-element` 7건만), tsc 0, `next build` 성공, `responsive-ui-reviewer` 재실행 시 대상 파일 위반 0.

## 2. 설계 결정 (요약)

### 2-1. 패턴 A — 표 래퍼를 실제 스크롤포트로
`globals.css`: `:root { --header-h: 3.5rem }` + `@utility table-scroll { max-height: calc(100dvh - var(--header-h)); overflow: auto; }`. 학생 레이아웃 루트에 `[--header-h:6.5rem]`. 대상 래퍼 7곳(MonthlyCalendar, ParticipationManagement, GradeMonthlyAttendance, StudentManagement, homeroom/participation, grade-admin/participation, student/attendance)에 `overflow-x-auto table-scroll`.

### 2-2. z 서열 (thead 단위 sticky 구조)
- 본문 인덱스 td `z-10` < thead `z-20`(stacking context). 세로 스크롤 시 헤더가 인덱스 셀 위.
- thead 안 인덱스 열 th `z-30` — 이 값은 thead 컨텍스트 로컬이며 형제 th 보다 위라는 뜻(바깥 td 와 비교되지 않음). `SupervisorSummaryModal.tsx:90-112` 가 이미 같은 관행.
- sticky 셀은 모두 불투명 배경 명시(`bg-gray-50`/`bg-white`), 행 hover 는 `group`/`group-hover:bg-gray-50`.

### 2-3. 44px 터치 타겟
- 버튼 `min-h-11`(화살표류 `+min-w-11`), 슬롯 행 button `min-h-11 w-full text-left`.
- 체크박스: 시각 크기 유지, `<label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center" title=…>` 래핑. 열 폭 52px(44+8), 세로 `mt-2`.
- 날짜 셀 `min-h-11`, 팝오버 `w-[min(100vw-1.5rem,344px)]`.

### 2-4. 좌석 해제
- X 버튼 제거. 좌석 탭(바깥 droppable div `onClick`) → `onSelectSeat(hasStudent ? {roomId,row,col} : null)` → SeatingEditor `selectedSeat`(같은 좌석 재탭·빈 좌석·드래그 시작·데이터 재로드·해제 후 → null).
- 선택 좌석 `ring-2 ring-blue-500 ring-offset-1`. 핸들 Delete/Backspace 키 → 선택.
- 액션바: 편집기 루트 마지막 자식 `sticky bottom-2 z-40 mt-4 sm:mr-auto sm:w-96` 카드. `{room.name} · {반}-{번} {이름}`(nowrap/ellipsis) + `배정 해제`(`min-h-11`, autoFocus) + `취소`(`min-h-11`). Escape → 취소.
- 데스크탑 1제스처: `UnassignedStudents` 루트 `useDroppable({ id: UNASSIGNED_DROP_ID })`(`export const UNASSIGNED_DROP_ID = "unassigned"`). 충돌 감지: 패널 `getBoundingClientRect()` 안에 `pointerCoordinates` 가 있으면 패널, 아니면 `closestCenter`. `handleDragEnd`: over 가 패널이고 소스가 seat 이면 해제.
- `"afternoon"` 리터럴은 RoomGrid/UnassignedStudents 에 추가 금지(literal-guard).

## 3. 파일별 변경 (초안 3장 + 위 반영)

| 파일 | 변경 |
|---|---|
| `src/app/globals.css` | `--header-h`, `@utility table-scroll` |
| `src/app/admin/layout.tsx`, `grade-admin/[grade]/layout.tsx` | `min-h-dvh`; main `px-2 md:px-3 lg:px-4` |
| `src/app/homeroom/layout.tsx` | 2곳 `min-h-dvh`; 2곳 main px |
| `src/app/student/layout.tsx` | 2곳 `min-h-dvh`; 루트 `[--header-h:6.5rem]`; main px |
| `src/app/attendance/layout.tsx`, `login/page.tsx`, `help/page.tsx` | `min-h-dvh` |
| `MonthlyCalendar.tsx` | 버튼 4개 `min-h-11 whitespace-nowrap`(Excel `inline-flex items-center`); 래퍼 `table-scroll`; 헤더 `z-20`; `openUpward` 드롭다운 |
| `ParticipationManagement.tsx` | select `min-h-11`; 래퍼; table nowrap; colgroup 18열 52px; thead z-20; 이름 th/td sticky; label 래핑 3종; 요일 `h-11 w-11`; 방과후 `mt-2` label; td `py-1`; tr `group` |
| `AttendanceDatePicker.tsx` | `min-h-11`; 폭 |
| `GradeMonthlyAttendance.tsx` | 버튼 4개 + 범례 토글 `min-h-11`; 래퍼; thead z-20; 인덱스 th z-30 |
| `StudentManagement.tsx` | 툴바 3개 `min-h-11`; 래퍼; thead z-20/th z-30; td group-hover; 도우미 `min-h-11 min-w-11`; 행 액션 `min-h-11`; 모달 `mx-2 p-3 sm:mx-4 sm:p-6` + 버튼 `min-h-11` |
| `homeroom/schedule/page.tsx` | 화살표 `min-h-11 min-w-11`; Now/토일/누계 `min-h-11`; 슬롯 행 button/div `min-h-11`; 모달 |
| `homeroom/participation/page.tsx` | ParticipationManagement 와 동일 규칙 |
| `grade-admin/[grade]/participation/page.tsx` | 동일(방과후 없음); select `min-h-11` |
| `attendance/[grade]/page.tsx` | 1096·1195 `w-11 h-11`; 1204 `pr-12` |
| `attendance/page.tsx` | 카드 `p-4 sm:p-8 mx-2`; 버튼 `px-4 sm:px-6 text-base sm:text-lg whitespace-nowrap`; `gap-2 sm:gap-3` |
| `student/attendance/page.tsx` | 탭·이동 버튼 `min-h-11`(+`min-w-11`); 표 래퍼/nowrap/thead z-20/첫 열 sticky |
| `RoomGrid.tsx` | props 교체(`selectedSeatKey`, `onSelectSeat`); X 제거; 선택 ring; 키보드; h3 nowrap/ellipsis/title |
| `UnassignedStudents.tsx` | `UNASSIGNED_DROP_ID` export; droppable + seat 드래그 시 링; 칩 `min-h-11`; `space-y-2` |
| `SeatingEditor.tsx` | `selectedSeat`; 충돌 감지; dragEnd 패널 처리; RoomGrid 3곳 props; 액션바 |
| `HelpDemos.tsx` | `onRemoveStudent` 제거 |
| `tests/seating-editor-responsive.test.ts` | 47-51 교체 |
| `tests/responsive-tables.test.ts` (신규) | globals/레이아웃/표 7곳/버튼/모달/팝오버 단언 |

## 4. 의존성·영향
- DB/API 변경 없음. RoomGrid props 변경 소비자: SeatingEditor, HelpDemos(MiraeHallLayout 은 제네릭).
- Tailwind 4 문법(`min-h-dvh`, `@utility`, `[--header-h:…]`, `w-[min(…)]`)은 리뷰에서 실제 컴파일로 확인됨.

## 5. 위험 요소
- dnd-kit 탭/클릭: 활성화(5px) 전 클릭은 전달됨(리뷰 확인). 실기기 확인 항목.
- 참여설정 행 높이 ≈104px, 감독일정 셀 ≈150px — §6 준수의 대가. table-scroll 로 내부 스크롤.
- 달력 드롭다운 잘림은 하단 2주만 완화, 중간 행은 기존과 동일.
- 좌석 격자 gap 4px 유지(§6 8px 미달) — 드래그가 주 인터랙션, 도면 회귀 방지. 후속 과제로 기록.
- 커밋/push 는 사용자 확인 후(`main` = 프로덕션).

## 6. 실행 순서
1. RED: `tests/responsive-tables.test.ts` 신규, `seating-editor-responsive` 갱신 → 실패 확인.
2. globals.css + 레이아웃 8파일.
3. 표 7곳(A/z/B/C) + 팝오버.
4. 버튼/모달(schedule, attendance 2파일).
5. 좌석 해제(RoomGrid → UnassignedStudents → SeatingEditor → HelpDemos).
6. GREEN: `for f in tests/*.test.ts; do npx tsx "$f"; done`, `npx eslint .`, `npx tsc --noEmit`, `npm run build`.
7. `responsive-ui-reviewer` 재실행 → 잔여 위반 수정. 7.5 `project-map-updater`.
8. Phase 7 사후 검토 에이전트 → 수정. 9. 변경 파일을 GDrive 트리로 복사(rsync). 커밋/push 보류.

## 7. 구현 후 변경 (Phase 6-7·Phase 7 리뷰 반영)
- 반응형 리뷰어 회귀 2건 수정: 방과후 체크박스 label 을 `mx-auto mt-2 flex`(블록)로 — `inline-flex` 는 요일 버튼 옆에 나란히 놓여 히트 영역이 겹쳤음. 테스트에 가드 추가.
- 리뷰어가 찾은 기존 위반도 "위반은 모두 개선" 요청에 따라 처리: 로그인 탭/링크·도움말 여백·학생/담임/감독 레이아웃과 `AdminNav` 의 네비 링크·로그아웃 `min-h-11`, 일괄승인 모달 버튼 44px + 표 스크롤포트/sticky thead, `MonthlyCalendar` 드롭다운 항목 44px, 행 액션 gap 8px.
- 학생 레이아웃 탭·로그아웃을 44px 로 올리면서 헤더 실측이 121px 가 되어 `[--header-h:7.625rem]`(S9 의 6.5rem 대체).
- 사후 검토 W-1: `closestCenter` 폴백에서 패널 제외. M-1 재로드 시 `selectedSeat` 초기화(effect, eslint 통과). M-2 키보드 드래그 중 Delete 무시. M-3 `openUpward` 를 주(행) 단위·상수화. M-5 내 배정 행 hover 색 유지. M-7 테스트 단언 4건 추가. M-8 들여쓰기.
- 최종 검수: 테스트 30/30, eslint 오류 0(경고 7 img), tsc 0, `next build` 성공. PROJECT_MAP 갱신 완료.
