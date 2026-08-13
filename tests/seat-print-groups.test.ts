import assert from "node:assert/strict";
import {
  buildPrintGroups,
  divisionLabel,
  roomPrefix,
  type PrintBaseRoom,
} from "../src/lib/seats/print-groups";

const room = (id: number, name: string, cols: number, rows: number, sortOrder: number): PrintBaseRoom =>
  ({ id, name, cols, rows, sortOrder });

// 2학년 오후자습 실제 구성 (교실 3반 × 분단3 + 오후미래혜윰1 분단2 + 오후미래혜윰2 분단3)
const afternoonRooms: PrintBaseRoom[] = [
  room(1, "2-4반 분단1", 2, 3, 1),
  room(2, "2-4반 분단2", 2, 3, 2),
  room(3, "2-4반 분단3", 2, 3, 3),
  room(4, "2-5반 분단1", 2, 3, 4),
  room(5, "2-5반 분단2", 2, 3, 5),
  room(6, "2-5반 분단3", 2, 3, 6),
  room(7, "2-6반 분단1", 2, 3, 7),
  room(8, "2-6반 분단2", 2, 3, 8),
  room(9, "2-6반 분단3", 2, 3, 9),
  room(10, "오후미래혜윰1 분단1", 5, 2, 10),
  room(11, "오후미래혜윰1 분단2", 5, 2, 11),
  room(12, "오후미래혜윰2 분단1", 5, 2, 12),
  room(13, "오후미래혜윰2 분단2", 5, 2, 13),
  room(14, "오후미래혜윰2 분단3", 5, 2, 14),
];

const groups = buildPrintGroups(afternoonRooms, "afternoon", 2);

assert.equal(groups.length, 5);
assert.deepEqual(
  groups.map((g) => g.key),
  ["2-4반", "2-5반", "2-6반", "오후미래혜윰1", "오후미래혜윰2"]
);
assert.deepEqual(
  groups.map((g) => g.kind),
  ["divisions-row", "divisions-row", "divisions-row", "divisions-column", "divisions-column"]
);
assert.deepEqual(groups.map((g) => g.rooms.length), [3, 3, 3, 2, 3]);
assert.equal(groups[0].title, "2-4반");

// 입력 순서가 뒤섞여도 sortOrder 기준으로 정렬해 그룹핑한다
const shuffled = [...afternoonRooms].reverse();
const shuffledGroups = buildPrintGroups(shuffled, "afternoon", 2);
assert.deepEqual(
  shuffledGroups.map((g) => g.key),
  ["2-4반", "2-5반", "2-6반", "오후미래혜윰1", "오후미래혜윰2"]
);
assert.deepEqual(shuffledGroups[0].rooms.map((r) => r.id), [1, 2, 3]);

// 원본 배열을 변형하지 않는다
assert.equal(afternoonRooms[0].id, 1);

// 야간 2학년: 미래홀 도면 1그룹
const nightRooms: PrintBaseRoom[] = [
  room(20, "복도석", 1, 12, 0),
  room(21, "미래혜윰실2", 5, 4, 1),
  room(22, "미래202", 3, 2, 2),
  room(23, "미래아띠존", 4, 2, 3),
  room(24, "미래201", 3, 2, 4),
  room(25, "미래혜윰실1", 5, 10, 5),
];
const nightGrade2 = buildPrintGroups(nightRooms, "night", 2);
assert.equal(nightGrade2.length, 1);
assert.equal(nightGrade2[0].key, "night");
assert.equal(nightGrade2[0].title, "미래홀");
assert.equal(nightGrade2[0].kind, "hall");
assert.equal(nightGrade2[0].rooms.length, 6);

// 야간 1·3학년: 도면 없이 나열
const nightGrade1 = buildPrintGroups(nightRooms.slice(1), "night", 1);
assert.equal(nightGrade1.length, 1);
assert.equal(nightGrade1[0].kind, "stack");
const nightGrade3 = buildPrintGroups(nightRooms.slice(1), "night", 3);
assert.equal(nightGrade3[0].kind, "stack");

// 방이 없으면 빈 배열
assert.deepEqual(buildPrintGroups([], "afternoon", 2), []);
assert.deepEqual(buildPrintGroups([], "night", 2), []);

// 라벨 헬퍼
assert.equal(roomPrefix("2-4반 분단1"), "2-4반");
assert.equal(roomPrefix("복도석"), "복도석");
assert.equal(divisionLabel("2-4반 분단1"), "분단1");
assert.equal(divisionLabel("오후미래혜윰2 분단3"), "분단3");
assert.equal(divisionLabel("복도석"), "복도석");

console.log("seat-print-groups checks passed");
