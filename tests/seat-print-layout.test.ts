import assert from "node:assert/strict";
import {
  contentBoxPx,
  computeFitScale,
  pageSizeMm,
  suggestOrientation,
} from "../src/lib/seats/print-layout";

// 용지 크기: 가로는 297×210, 세로는 210×297 (mm)
assert.deepEqual(pageSizeMm("landscape"), { width: 297, height: 210 });
assert.deepEqual(pageSizeMm("portrait"), { width: 210, height: 297 });

// 가용 영역: 양쪽 8mm 패딩 제외 후 px 환산 (1mm = 96/25.4 px)
const land = contentBoxPx("landscape");
assert.ok(Math.abs(land.width - 1062.05) < 0.1, `가로 가용폭 ${land.width}`);
assert.ok(Math.abs(land.height - 733.23) < 0.1, `가로 가용높이 ${land.height}`);

const port = contentBoxPx("portrait");
assert.ok(Math.abs(port.width - 733.23) < 0.1, `세로 가용폭 ${port.width}`);
assert.ok(Math.abs(port.height - 1062.05) < 0.1, `세로 가용높이 ${port.height}`);

// 방향 추천: 비율 r = 폭/높이 가 1 이상이면 가로, 미만이면 세로
assert.equal(suggestOrientation(620, 288), "landscape");   // 2-4반
assert.equal(suggestOrientation(496, 384), "landscape");   // 오후미래혜윰1
assert.equal(suggestOrientation(496, 544), "portrait");    // 오후미래혜윰2
assert.equal(suggestOrientation(100, 100), "landscape");   // 경계 r = 1
assert.equal(suggestOrientation(99, 100), "portrait");
// 측정 전(0) 방어
assert.equal(suggestOrientation(0, 0), "portrait");

// 배율: 콘텐츠가 가용 영역과 같으면 1
assert.ok(Math.abs(computeFitScale(land.width, land.height, "landscape") - 1) < 1e-9);
// 두 배 크면 0.5
assert.ok(Math.abs(computeFitScale(land.width * 2, land.height * 2, "landscape") - 0.5) < 1e-9);
// 폭·높이 중 더 빡빡한 쪽이 배율을 결정
assert.ok(Math.abs(computeFitScale(620, 288, "landscape") - land.width / 620) < 1e-9);
// 작은 콘텐츠는 확대되어 페이지를 채운다 (상한 없음)
assert.ok(computeFitScale(100, 100, "portrait") > 1);
// 측정 전(0) 방어
assert.equal(computeFitScale(0, 100, "portrait"), 1);
assert.equal(computeFitScale(100, 0, "portrait"), 1);

console.log("seat-print-layout checks passed");
