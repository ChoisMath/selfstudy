import assert from "node:assert/strict";
import {
  CLASSROOM_LIMITS,
  corridorLabels,
  isGeometryChanged,
  parseClassroomConfig,
  planClassroomRooms,
  seatCountOf,
  type ClassroomConfig,
} from "../src/lib/seats/classroom-config";

const divisionConfig: ClassroomConfig = {
  classNumber: 4,
  corridorSide: "right",
  layoutType: "division",
  rowsPerDivision: [6, 6, 5],
};

// --- planClassroomRooms ---
const planned = planClassroomRooms(2, divisionConfig);
assert.deepEqual(planned, [
  { name: "2-4반 분단1", cols: 2, rows: 6, sortOrder: 1 },
  { name: "2-4반 분단2", cols: 2, rows: 6, sortOrder: 2 },
  { name: "2-4반 분단3", cols: 2, rows: 5, sortOrder: 3 },
]);

const singlePlanned = planClassroomRooms(1, { ...divisionConfig, classNumber: 7, layoutType: "single", rowsPerDivision: [5, 5] });
assert.deepEqual(singlePlanned, [
  { name: "1-7반 1열", cols: 1, rows: 5, sortOrder: 1 },
  { name: "1-7반 2열", cols: 1, rows: 5, sortOrder: 2 },
]);

// --- seatCountOf ---
assert.equal(seatCountOf(divisionConfig), 34);
assert.equal(seatCountOf({ ...divisionConfig, layoutType: "single" }), 17);

// --- isGeometryChanged ---
const existing = [
  { cols: 2, rows: 6, sortOrder: 2 },
  { cols: 2, rows: 5, sortOrder: 3 },
  { cols: 2, rows: 6, sortOrder: 1 },
];
assert.equal(isGeometryChanged(existing, divisionConfig), false, "순서가 섞여도 sortOrder 기준으로 같으면 변경 아님");
assert.equal(isGeometryChanged(existing, { ...divisionConfig, corridorSide: "left" }), false, "복도만 바뀌면 변경 아님");
assert.equal(isGeometryChanged(existing, { ...divisionConfig, classNumber: 9 }), false, "반 번호만 바뀌면 변경 아님");
assert.equal(isGeometryChanged(existing, { ...divisionConfig, rowsPerDivision: [6, 6, 6] }), true, "행 수 변경");
assert.equal(isGeometryChanged(existing, { ...divisionConfig, rowsPerDivision: [6, 6] }), true, "분단 수 변경");
assert.equal(isGeometryChanged(existing, { ...divisionConfig, layoutType: "single" }), true, "유형 변경");
assert.equal(isGeometryChanged([], divisionConfig), true, "Room 이 없으면 변경");

// --- corridorLabels ---
assert.deepEqual(corridorLabels("right"), { left: "창문", right: "복도" });
assert.deepEqual(corridorLabels("left"), { left: "복도", right: "창문" });

// --- parseClassroomConfig ---
const ok = parseClassroomConfig({ classNumber: "4", corridorSide: "left", layoutType: "division", rowsPerDivision: [6, 6, 5] });
assert.ok(ok.ok);
assert.deepEqual(ok.config, { classNumber: 4, corridorSide: "left", layoutType: "division", rowsPerDivision: [6, 6, 5] });

function expectError(input: unknown, fragment: string) {
  const result = parseClassroomConfig(input);
  assert.equal(result.ok, false, `통과하면 안 됨: ${JSON.stringify(input)}`);
  if (!result.ok) assert.match(result.error, new RegExp(fragment));
}
expectError(null, "요청");
expectError({ ...divisionConfig, classNumber: 0 }, "반 번호");
expectError({ ...divisionConfig, classNumber: CLASSROOM_LIMITS.classNumber.max + 1 }, "반 번호");
expectError({ ...divisionConfig, classNumber: 4.5 }, "반 번호");
expectError({ ...divisionConfig, corridorSide: "up" }, "복도");
expectError({ ...divisionConfig, layoutType: "pair" }, "유형");
expectError({ ...divisionConfig, rowsPerDivision: [] }, "분단");
expectError({ ...divisionConfig, rowsPerDivision: [3, 3, 3, 3, 3, 3, 3] }, "분단");
expectError({ ...divisionConfig, rowsPerDivision: [0, 3] }, "행 수");
expectError({ ...divisionConfig, rowsPerDivision: [3, CLASSROOM_LIMITS.rows.max + 1] }, "행 수");
expectError({ ...divisionConfig, rowsPerDivision: [3, "3"] }, "행 수");

console.log("classroom-config checks passed");
