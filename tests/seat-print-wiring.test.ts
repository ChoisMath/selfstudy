import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// --- Task 3: PrintRoomGrid ---
const printRoomGrid = read("../src/components/seats/PrintRoomGrid.tsx");
// 읽기전용 보장: dnd-kit 의존이 없어야 DndContext 밖에서 렌더된다
assert.doesNotMatch(printRoomGrid, /@dnd-kit/, "PrintRoomGrid 가 dnd-kit 에 의존함");
// 셀 크기는 print-layout 상수에서만 온다
assert.match(printRoomGrid, /SEAT_CELL_WIDTH/, "PrintRoomGrid 가 셀 폭 상수를 쓰지 않음");
assert.match(printRoomGrid, /SEAT_CELL_HEIGHT/, "PrintRoomGrid 가 셀 높이 상수를 쓰지 않음");
assert.match(printRoomGrid, /whitespace-nowrap/, "PrintRoomGrid 셀에 줄바꿈 금지 클래스 없음");

// --- Task 4: MiraeHallLayout fitContent ---
const miraeHall = read("../src/components/seats/MiraeHallLayout.tsx");
assert.match(miraeHall, /fitContent\?: boolean/, "MiraeHallLayout 에 fitContent 프롭 없음");
assert.match(miraeHall, /containerFit/, "MiraeHallLayout 에 containerFit 스타일 없음");
assert.match(miraeHall, /max-content/, "containerFit 이 width: max-content 를 쓰지 않음");
// 기존 스크롤 모드는 유지되어야 한다
assert.match(miraeHall, /minWidth: "700px"/, "기존 minWidth 700px 가 사라짐");
assert.match(miraeHall, /overflow-x-auto/, "기존 가로 스크롤이 사라짐");

console.log("seat-print-wiring checks passed");
