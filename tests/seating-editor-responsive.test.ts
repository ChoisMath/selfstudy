import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// responsive-ui 규칙: 버튼 44px 터치 타겟(§6), 라벨 줄바꿈 금지(§2), 폭 부족 시 컨테이너 가로 스크롤(§2), 100vh 금지(§4)

const seatingEditor = read("../src/components/seats/SeatingEditor.tsx");

const saveButtonClass = seatingEditor.match(/<button\s+onClick=\{handleSave\}[\s\S]*?className="([^"]+)"/)?.[1];
assert.ok(saveButtonClass, "저장 버튼을 찾지 못함");
assert.match(saveButtonClass, /\bmin-h-11\b/, "저장 버튼 터치 타겟이 44px 미만 (min-h-11 없음)");
assert.match(saveButtonClass, /\bwhitespace-nowrap\b/, "저장 버튼 라벨 '저장 (N개 교실 변경)' 이 줄바꿈될 수 있음");

const dragChipClass = seatingEditor.match(/<DragOverlay>[\s\S]*?className="([^"]+)"/)?.[1];
assert.ok(dragChipClass, "DragOverlay 칩을 찾지 못함");
assert.match(dragChipClass, /\bwhitespace-nowrap\b/, "드래그 칩 'N반 N번 이름' 이 좁은 좌석에서 두 줄로 깨짐");

const afternoonGroupWrapper = seatingEditor.match(/오후 자습: 이름 접두사 기반 그룹 \*\/\s*<div className="([^"]+)"/)?.[1];
assert.ok(afternoonGroupWrapper, "오후 그룹 래퍼를 찾지 못함");
assert.match(afternoonGroupWrapper, /\boverflow-x-auto\b/, "오후 그룹이 N열 고정이라 모바일에서 문서 전체가 가로로 넘침 — 래퍼가 스크롤해야 함");

for (const heading of ["좌석 편집", "{group.title}"]) {
  const cls = seatingEditor.match(new RegExp(`<h[23] className="([^"]+)">${heading.replace(/[{}]/g, "\\$&")}`))?.[1];
  assert.ok(cls, `제목 "${heading}" 을 찾지 못함`);
  assert.match(cls, /\bwhitespace-nowrap\b/, `제목 "${heading}" 에 whitespace-nowrap 없음`);
}

const unassigned = read("../src/components/seats/UnassignedStudents.tsx");
assert.doesNotMatch(unassigned, /\d+vh\]/, "UnassignedStudents 가 vh 를 사용 — 모바일 주소창 변화로 잘림 (dvh 로 교체)");
assert.match(unassigned, /max-h-\[60dvh\]/, "UnassignedStudents 목록 높이가 60dvh 가 아님");

// 야간 기본 분기(1·3학년)도 오후와 같은 규칙: 셀을 줄이지 말고 래퍼가 스크롤
assert.match(
  seatingEditor,
  /\) : \(\s*<div className="[^"]*\boverflow-x-auto\b[^"]*">\s*\{rooms\.map\(\(room\) => \(\s*<RoomGrid[\s\S]*?\bpreserveSeatWidth\b[\s\S]*?\/>/,
  "야간 기본 분기가 overflow-x-auto 래퍼 + preserveSeatWidth 없이 셀을 찌그러뜨림"
);

const roomGrid = read("../src/components/seats/RoomGrid.tsx");
// MIN_SEAT_WIDTH(52px) 는 4자 이름 기준 — 5자 이상은 nowrap + 말줄임 + title 로 대응
assert.match(
  roomGrid,
  /<span\s+className="[^"]*\bwhitespace-nowrap\b[^"]*\btext-ellipsis\b[^"]*"\s+title=\{cell\.student\.name\}/,
  "좌석 이름 span 에 whitespace-nowrap/text-ellipsis/title 없음 — 5자 이름이 글자 단위로 쪼개짐"
);
// 배정 해제: hover 전용 X 버튼(16px/터치 28px) 대신 좌석 탭 → 선택 → 44px 액션바. 데스크탑은 좌석→미배정 패널 드롭.
assert.doesNotMatch(roomGrid, /group-hover:opacity-100|title="배정 해제"/, "RoomGrid 에 hover 전용 해제 버튼이 남아 있음 (§6 hover 전용 UI 금지)");
assert.match(roomGrid, /onSelectSeat/, "RoomGrid 에 좌석 선택 콜백(onSelectSeat) 없음");
assert.match(roomGrid, /ring-2 ring-blue-500/, "선택된 좌석 표시(ring) 없음");
const roomTitleClass = roomGrid.match(/<h3\s+className=\{`([^`]+)`\}/)?.[1];
assert.ok(roomTitleClass, "방 이름 h3 을 찾지 못함");
assert.match(roomTitleClass, /\bwhitespace-nowrap\b/, "방 이름 h3 에 whitespace-nowrap 없음 (§2)");
const unassignButtonClass = seatingEditor.match(/<button[^>]*className="([^"]+)"[^>]*>\s*배정 해제\s*</)?.[1];
assert.ok(unassignButtonClass, "SeatingEditor 액션바의 '배정 해제' 버튼을 찾지 못함");
assert.match(unassignButtonClass, /\bmin-h-11\b/, "'배정 해제' 버튼 터치 타겟이 44px 미만");
assert.match(seatingEditor, /UNASSIGNED_DROP_ID/, "SeatingEditor 가 미배정 패널 드롭 id 를 쓰지 않음");
// xl:sticky 패널은 dnd-kit 의 지연 보정 rect 와 어긋나므로 실시간 rect 로 판정해야 함
assert.match(seatingEditor, /getBoundingClientRect\(\)/, "패널 드롭 판정이 실시간 rect 가 아님 (autoScroll 시 해제 대신 교환 발생)");
assert.match(unassigned, /export const UNASSIGNED_DROP_ID = "unassigned"/, "UnassignedStudents 가 드롭 id 를 export 하지 않음");
assert.match(unassigned, /useDroppable\(\{\s*id:\s*UNASSIGNED_DROP_ID/, "UnassignedStudents 패널이 droppable 이 아님");
assert.match(unassigned, /\bmin-h-11\b/, "미배정 학생 칩이 44px 미만");
assert.match(unassigned, /isOver && String\(active\?\.id\)\.startsWith\("seat-"\)/, "패널 하이라이트가 학생 칩 드래그에도 켜짐");
assert.match(seatingEditor, /droppableContainers\.filter\(\(c\) => c\.id !== UNASSIGNED_DROP_ID\)/, "closestCenter 폴백에 패널이 후보로 남아 패널 밖에서도 해제됨");
assert.match(seatingEditor, /setActiveId\(event\.active\.id as string\);\s*setSelectedSeat\(null\);/, "드래그 시작 시 선택이 해제되지 않음");
assert.match(seatingEditor, /e\.key === "Escape"\) setSelectedSeat\(null\)/, "액션바 Escape 로 선택 해제 불가");

// 미래홀 도면: minWidth 700px 과 overflow-x-auto 가 같은 요소에 있으면 그 요소가 700px 로 커져 문서가 가로 스크롤된다
const miraeHall = read("../src/components/seats/MiraeHallLayout.tsx");
const scrollBox = miraeHall.match(/<div[^>]*overflow-x-auto[^>]*>/)?.[0];
assert.ok(scrollBox, "MiraeHallLayout 스크롤 컨테이너를 찾지 못함");
assert.doesNotMatch(scrollBox, /GRID_STYLES\.container\b/, "minWidth 700px 격자 스타일이 스크롤 컨테이너 자신에 적용됨 — 안쪽 요소로 내려야 스크롤이 동작");
assert.match(miraeHall, /style=\{fitContent \? GRID_STYLES\.containerFit : GRID_STYLES\.container\}/, "격자 스타일 분기가 사라짐");

for (const rel of ["../src/app/attendance/page.tsx", "../src/app/attendance/[grade]/page.tsx"]) {
  assert.doesNotMatch(read(rel), /\d+vh\]/, `${rel}: vh 사용 — dvh 로 교체 (§4)`);
}

console.log("seating-editor-responsive checks passed");
