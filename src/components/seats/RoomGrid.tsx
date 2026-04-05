"use client";

import { useDroppable, useDraggable } from "@dnd-kit/core";

type Student = {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
};

type CellState = {
  studentId: number | null;
  student: Student | null;
};

type RoomSeats = Map<string, CellState>;

type Room = {
  id: number;
  name: string;
  cols: number;
  rows: number;
};

function SeatCell({
  roomId,
  row,
  col,
  cell,
  onRemove,
}: {
  roomId: number;
  row: number;
  col: number;
  cell: CellState;
  onRemove: () => void;
}) {
  const seatId = `seat-${roomId}-${row}-${col}`;

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: seatId,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: seatId,
    disabled: !cell.studentId,
  });

  return (
    <div
      ref={setDropRef}
      className={`
        relative border rounded h-14 flex items-center justify-center text-xs transition-colors
        ${isOver ? "bg-blue-50 border-blue-400 border-dashed" : "border-gray-200"}
        ${cell.studentId ? "bg-white" : "bg-gray-50"}
        ${isDragging ? "opacity-40" : ""}
      `}
    >
      {cell.student ? (
        <div
          ref={setDragRef}
          {...attributes}
          {...listeners}
          className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing group"
        >
          <span className="text-center leading-tight font-medium text-gray-800">
            <span className="text-[10px] text-gray-400 block">
              {cell.student.classNumber}-{cell.student.studentNumber}
            </span>
            {cell.student.name}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            title="배정 해제"
          >
            x
          </button>
        </div>
      ) : (
        <span className="text-gray-300 text-[10px]">
          {row + 1}-{col + 1}
        </span>
      )}
    </div>
  );
}

export default function RoomGrid({
  room,
  seats,
  onRemoveStudent,
  gapAfterRows,
  hideTeacherDesk,
  compact,
}: {
  room: Room;
  seats: RoomSeats;
  onRemoveStudent: (roomId: number, row: number, col: number) => void;
  gapAfterRows?: number[];
  hideTeacherDesk?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`bg-white rounded-lg border ${compact ? "p-2" : "p-4"}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold text-gray-800 ${compact ? "text-sm" : ""}`}>{room.name}</h3>
        {!compact && (
          <span className="text-xs text-gray-400">
            {room.rows}행 x {room.cols}열
          </span>
        )}
      </div>

      <div className="flex flex-col">
        {Array.from({ length: room.rows }, (_, r) => (
          <div key={`row-${r}`}>
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${room.cols}, minmax(0, 1fr))`,
                marginBottom: gapAfterRows?.includes(r) ? "12px" : "4px",
              }}
            >
              {Array.from({ length: room.cols }, (_, c) => {
                const key = `${r}-${c}`;
                const cell = seats.get(key) ?? {
                  studentId: null,
                  student: null,
                };
                return (
                  <SeatCell
                    key={key}
                    roomId={room.id}
                    row={r}
                    col={c}
                    cell={cell}
                    onRemove={() => onRemoveStudent(room.id, r, c)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 교탁 표시 (하단) */}
      {!hideTeacherDesk && (
        <div className="mt-3 text-center">
          <div className="inline-block bg-gray-200 text-gray-500 text-xs px-6 py-1 rounded">
            교탁
          </div>
        </div>
      )}
    </div>
  );
}
