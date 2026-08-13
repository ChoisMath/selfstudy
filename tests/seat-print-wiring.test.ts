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
assert.match(
  printRoomGrid,
  /gridTemplateColumns: `repeat\(\$\{room\.cols\}, \$\{SEAT_CELL_WIDTH\}px\)`/,
  "격자 컬럼이 고정 px 가 아님 — 1fr 이면 자연 크기 실측이 무너진다"
);
assert.doesNotMatch(
  printRoomGrid,
  /gridTemplateColumns:[^\n]*1fr/,
  "격자 컬럼에 1fr 사용"
);
assert.match(
  printRoomGrid,
  /marginBottom:[\s\S]{0,80}room\.rows - 1[\s\S]{0,20}\?\s*0/,
  "마지막 행 marginBottom 이 0 이 아님 — 자연 높이 실측이 부정확해진다"
);

// --- Task 4: MiraeHallLayout fitContent ---
const miraeHall = read("../src/components/seats/MiraeHallLayout.tsx");
assert.match(miraeHall, /fitContent\?: boolean/, "MiraeHallLayout 에 fitContent 프롭 없음");
assert.match(miraeHall, /containerFit/, "MiraeHallLayout 에 containerFit 스타일 없음");
assert.match(miraeHall, /max-content/, "containerFit 이 width: max-content 를 쓰지 않음");
// 기존 스크롤 모드는 유지되어야 한다
assert.match(miraeHall, /minWidth: "700px"/, "기존 minWidth 700px 가 사라짐");
assert.match(miraeHall, /overflow-x-auto/, "기존 가로 스크롤이 사라짐");

// --- Task 5: SeatPrintGroup ---
const seatPrintGroup = read("../src/components/seats/SeatPrintGroup.tsx");
assert.match(seatPrintGroup, /PrintRoomGrid/, "SeatPrintGroup 이 PrintRoomGrid 를 쓰지 않음");
assert.match(seatPrintGroup, /MiraeHallLayout/, "SeatPrintGroup 이 도면 레이아웃을 쓰지 않음");
assert.match(seatPrintGroup, /fitContent/, "SeatPrintGroup 이 도면을 fitContent 로 렌더하지 않음");
assert.match(seatPrintGroup, /GAP_CONFIG/, "SeatPrintGroup 이 서브블록 갭 설정을 넘기지 않음");
assert.match(seatPrintGroup, /divisionLabel/, "SeatPrintGroup 이 분단 라벨 헬퍼를 쓰지 않음");
assert.match(seatPrintGroup, /교탁/, "SeatPrintGroup 에 교탁 표시가 없음");
// 교탁은 오후자습(divisions-*)에서만 — 야간(hall/stack)에는 없다
assert.match(
  seatPrintGroup,
  /divisions-row"\s*\|\|[\s\S]{0,80}divisions-column"/,
  "교탁 표시 조건이 오후자습 두 kind 로 한정되지 않음"
);
assert.doesNotMatch(seatPrintGroup, /@dnd-kit/, "SeatPrintGroup 이 dnd-kit 에 의존함");

// --- Task 6: PrintPageFitter ---
const fitter = read("../src/components/seats/PrintPageFitter.tsx");
// 변환된 크기가 아닌 레이아웃 크기를 재야 하므로 offsetWidth/offsetHeight 를 쓴다
assert.match(fitter, /offsetWidth/, "PrintPageFitter 가 offsetWidth 로 측정하지 않음");
assert.match(fitter, /offsetHeight/, "PrintPageFitter 가 offsetHeight 로 측정하지 않음");
assert.doesNotMatch(
  fitter,
  /getBoundingClientRect/,
  "getBoundingClientRect 는 scale 적용 후 크기를 반환하므로 쓰면 안 됨"
);
assert.match(fitter, /useLayoutEffect/, "PrintPageFitter 가 레이아웃 측정 훅을 쓰지 않음");
assert.match(fitter, /computeFitScale/, "PrintPageFitter 가 배율 계산 함수를 쓰지 않음");
assert.match(fitter, /print-page-landscape/, "가로 페이지 클래스가 없음");
assert.match(fitter, /print-page-portrait/, "세로 페이지 클래스가 없음");
assert.match(fitter, /fonts/, "폰트 로드 후 재측정 처리가 없음");
assert.match(
  fitter,
  /ref=\{contentRef\}[^>]*shrink-0/,
  "측정 대상 div 에 shrink-0 이 없음 — flex 축소로 offsetWidth 가 자연 폭 대신 페이지 폭을 반환한다"
);

// --- Task 7: 인쇄 라우트 + CSS ---
const printCss = read("../src/app/grade-admin/[grade]/seats/print/print.css");
assert.match(printCss, /@page\s+portraitPage\s*\{[^}]*size:\s*A4 portrait/, "세로 명명 페이지 규칙 없음");
assert.match(printCss, /@page\s+landscapePage\s*\{[^}]*size:\s*A4 landscape/, "가로 명명 페이지 규칙 없음");
assert.match(printCss, /\.print-page-portrait\s*\{[^}]*page:\s*portraitPage/, "세로 page 속성 매핑 없음");
assert.match(printCss, /\.print-page-landscape\s*\{[^}]*page:\s*landscapePage/, "가로 page 속성 매핑 없음");
assert.match(printCss, /break-after:\s*page/, "페이지 분할 규칙 없음");
assert.match(printCss, /seat-print-mode/, "인쇄 모드 스코프 클래스 없음");
assert.match(printCss, /\.no-print/, "툴바 숨김 규칙 없음");

const printPage = read("../src/app/grade-admin/[grade]/seats/print/page.tsx");
assert.match(printPage, /buildPrintGroups/, "인쇄 페이지가 그룹 헬퍼를 쓰지 않음");
assert.match(printPage, /PrintPageFitter/, "인쇄 페이지가 페이지 피터를 쓰지 않음");
assert.match(printPage, /SeatPrintGroup/, "인쇄 페이지가 그룹 컴포넌트를 쓰지 않음");
assert.match(printPage, /Suspense/, "useSearchParams 용 Suspense 경계가 없음");
assert.match(printPage, /seatPrintOrientation:/, "localStorage 방향 저장 키가 없음");
assert.match(printPage, /seat-print-mode/, "body 인쇄 모드 클래스 토글이 없음");
assert.match(printPage, /window\.print\(\)/, "인쇄 실행이 없음");
// 기존 API 재사용 — 새 엔드포인트를 만들지 않는다
assert.match(printPage, /\/seat-layouts\?sessionType=/, "기존 좌석 API 를 쓰지 않음");

console.log("seat-print-wiring checks passed");
