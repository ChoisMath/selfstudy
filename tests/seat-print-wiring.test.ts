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

console.log("seat-print-wiring checks passed");
