"use client";

import { DndContext } from "@dnd-kit/core";
import MiraeHallLayout, { GAP_CONFIG } from "@/components/seats/MiraeHallLayout";
import RoomGrid from "@/components/seats/RoomGrid";
import UnassignedStudents from "@/components/seats/UnassignedStudents";

type Student = {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
};

type Room = {
  id: number;
  name: string;
  cols: number;
  rows: number;
  sortOrder: number;
};

type CellState = {
  studentId: number | null;
  student: Student | null;
};

type RoomSeats = Map<string, CellState>;

const students: Student[] = [
  { id: 1, name: "김하늘", grade: 2, classNumber: 1, studentNumber: 3 },
  { id: 2, name: "박지훈", grade: 2, classNumber: 1, studentNumber: 12 },
  { id: 3, name: "이서연", grade: 2, classNumber: 2, studentNumber: 7 },
  { id: 4, name: "최민준", grade: 2, classNumber: 3, studentNumber: 18 },
  { id: 5, name: "정다은", grade: 2, classNumber: 4, studentNumber: 5 },
  { id: 6, name: "윤서준", grade: 2, classNumber: 5, studentNumber: 21 },
];

const rooms: Room[] = [
  { id: 101, name: "복도석", cols: 2, rows: 3, sortOrder: 1 },
  { id: 102, name: "미래혜윰실2", cols: 5, rows: 2, sortOrder: 2 },
  { id: 103, name: "미래202", cols: 4, rows: 2, sortOrder: 3 },
  { id: 104, name: "미래아띠존", cols: 4, rows: 2, sortOrder: 4 },
  { id: 105, name: "미래201", cols: 4, rows: 2, sortOrder: 5 },
  { id: 106, name: "미래혜윰실1", cols: 5, rows: 4, sortOrder: 6 },
];

function createRoomSeats(room: Room, offset: number): RoomSeats {
  const seats: RoomSeats = new Map();

  for (let row = 0; row < room.rows; row += 1) {
    for (let col = 0; col < room.cols; col += 1) {
      seats.set(`${row}-${col}`, { studentId: null, student: null });
    }
  }

  students.slice(offset, offset + 2).forEach((student, index) => {
    const row = Math.floor(index / room.cols);
    const col = index % room.cols;
    seats.set(`${row}-${col}`, { studentId: student.id, student });
  });

  return seats;
}

const roomSeats = new Map<number, RoomSeats>(
  rooms.map((room, index) => [room.id, createRoomSeats(room, index % 4)])
);

function DemoFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="my-6 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

export function SeatLayoutDemo() {
  return (
    <DemoFrame title="미래관 좌석 배치 예시">
      <DndContext>
        <div className="overflow-x-auto">
          <MiraeHallLayout
            rooms={rooms}
            renderRoom={(room) => (
              <RoomGrid
                room={room}
                seats={roomSeats.get(room.id) ?? new Map()}
                onRemoveStudent={() => undefined}
                gapAfterRows={GAP_CONFIG[room.name]}
                hideTeacherDesk
                compact
              />
            )}
          />
        </div>
      </DndContext>
    </DemoFrame>
  );
}

export function UnassignedStudentsDemo() {
  return (
    <DemoFrame title="미배정 학생 목록 예시">
      <DndContext>
        <div className="max-w-sm">
          <UnassignedStudents students={students.slice(2)} />
        </div>
      </DndContext>
    </DemoFrame>
  );
}

export function ExcelUploadDemo() {
  return (
    <DemoFrame title="Excel 업로드 모달 예시">
      <div className="mx-auto max-w-lg rounded-lg bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h4 className="text-lg font-bold text-gray-900">학생 Excel 일괄 업로드</h4>
          <span className="text-xl leading-none text-gray-400">&times;</span>
        </div>
        <div className="space-y-4 px-5 py-5">
          <button
            type="button"
            className="w-full rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700"
          >
            템플릿 다운로드
          </button>
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <div className="mb-2 text-3xl text-gray-300">XLSX</div>
            <p className="text-sm text-gray-500">
              파일을 드래그하거나 클릭해 선택합니다.
            </p>
            <p className="mt-1 text-xs text-gray-400">.xlsx, .xls 파일</p>
          </div>
          <button
            type="button"
            disabled
            className="w-full rounded-md bg-green-600 px-4 py-2.5 text-sm text-white opacity-60"
          >
            업로드
          </button>
        </div>
      </div>
    </DemoFrame>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "red" | "orange" | "yellow";
}) {
  const colorMap = {
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    orange: "bg-orange-50 text-orange-700",
    yellow: "bg-yellow-50 text-yellow-700",
  };

  return (
    <div className={`rounded-lg p-3 text-center ${colorMap[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function SessionSummary({
  title,
  supervisor,
  values,
}: {
  title: string;
  supervisor: string;
  values: [number, number, number, number];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-gray-800">{title}</h4>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
          감독: {supervisor}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="출석" value={values[0]} tone="green" />
        <StatCard label="결석" value={values[1]} tone="red" />
        <StatCard label="사유결석" value={values[2]} tone="orange" />
        <StatCard label="방과후" value={values[3]} tone="yellow" />
      </div>
      <p className="mt-3 text-right text-sm text-gray-400">
        총 자습대상 {values.reduce((sum, value) => sum + value, 0)}명
      </p>
    </div>
  );
}

export function TodayAttendanceDemo() {
  return (
    <DemoFrame title="오늘 출결 현황 예시">
      <div className="space-y-4">
        <div className="text-center text-lg font-semibold text-gray-800">
          2026년 5월 1일 (금)
        </div>
        <SessionSummary title="오후 자습" supervisor="김교사" values={[116, 3, 5, 12]} />
        <SessionSummary title="야간 자습" supervisor="박교사" values={[98, 4, 8, 0]} />
      </div>
    </DemoFrame>
  );
}
