import assert from "node:assert/strict";
import { selectSeatGroupRooms, type StudentSeatRoomInput } from "../src/lib/seats/student-seat-group";

const classroom = (classNumber: number, corridorSide: "left" | "right" = "right") => ({ classNumber, corridorSide });

const room = (
  id: number,
  name: string,
  sortOrder: number,
  classroomId: number | null = null,
  meta: ReturnType<typeof classroom> | null = null
): StudentSeatRoomInput => ({ id, name, cols: 2, rows: 3, sortOrder, classroomId, classroom: meta });

// 2학년 오후: 학급 2-4반(분단 3, 정렬 어긋남) + 2-5반 + 미래혜윰 접두사 그룹 2개
const afternoonRooms = [
  room(3, "2-4반 분단3", 3, 40, classroom(4, "left")),
  room(1, "2-4반 분단1", 1, 40, classroom(4, "left")),
  room(2, "2-4반 분단2", 2, 40, classroom(4, "left")),
  room(4, "2-5반 분단1", 4, 50, classroom(5)),
  room(10, "오후미래혜윰1 분단1", 10),
  room(11, "오후미래혜윰1 분단2", 11),
  room(12, "오후미래혜윰2 분단1", 12),
];

// 학급 교실: 같은 classroomId 전부, sortOrder 순, 제목 "2-4반", 복도 위치 전달
const classroomGroup = selectSeatGroupRooms(afternoonRooms[0], afternoonRooms, 2);
assert.equal(classroomGroup.kind, "classroom");
assert.equal(classroomGroup.title, "2-4반");
assert.equal(classroomGroup.corridorSide, "left");
assert.deepEqual(classroomGroup.rooms.map((r) => r.id), [1, 2, 3]);

// 별도 교실: 이름 접두사가 같은 Room 만, 학급 Room 과 다른 접두사는 제외
const miraeGroup = selectSeatGroupRooms(afternoonRooms[5], afternoonRooms, 2);
assert.equal(miraeGroup.kind, "room");
assert.equal(miraeGroup.title, "오후미래혜윰1");
assert.equal(miraeGroup.corridorSide, null);
assert.deepEqual(miraeGroup.rooms.map((r) => r.id), [10, 11]);

// 야간 단일 방: 그 방 하나, 제목은 방 이름
const nightRooms = [room(20, "미래혜윰실2", 1), room(21, "미래202", 2), room(22, "미래혜윰실1", 5)];
const single = selectSeatGroupRooms(nightRooms[1], nightRooms, 2);
assert.equal(single.kind, "room");
assert.equal(single.title, "미래202");
assert.deepEqual(single.rooms.map((r) => r.id), [21]);

console.log("student-seat-group checks passed");
