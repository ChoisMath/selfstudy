"use client";

import { memo } from "react";
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

export type SeatRef = { roomId: number; row: number; col: number };

// 이름 4자(text-xs, 한글 ≈1em) + 테두리 2px 가 한 줄에 들어가는 폭. 44px 터치 타겟(responsive-ui §6)보다 넓다.
const MIN_SEAT_WIDTH = 52;

function SeatCell({
  roomId,
  row,
  col,
  cell,
  isSelected,
  onSelect,
}: {
  roomId: number;
  row: number;
  col: number;
  cell: CellState;
  isSelected: boolean;
  onSelect?: (seat: SeatRef | null) => void;
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

  // 이동 없는 탭은 dnd-kit 활성화(5px) 전이라 click 이 그대로 전달된다. 빈 좌석 탭은 선택 해제.
  const select = () => onSelect?.(cell.studentId ? { roomId, row, col } : null);

  return (
    <div
      ref={setDropRef}
      onClick={select}
      className={`
        relative border rounded h-14 flex items-center justify-center text-xs transition-colors
        ${isOver ? "bg-blue-50 border-blue-400 border-dashed" : "border-gray-200"}
        ${cell.studentId ? "bg-white" : "bg-gray-50"}
        ${isDragging ? "opacity-40" : ""}
        ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}
      `}
    >
      {cell.student ? (
        <div
          ref={setDragRef}
          {...attributes}
          {...listeners}
          onKeyDown={(e) => {
            listeners?.onKeyDown?.(e);
            if (!isDragging && (e.key === "Delete" || e.key === "Backspace")) {
              e.preventDefault();
              select();
            }
          }}
          className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
        >
          <span
            className="block min-w-0 max-w-full whitespace-nowrap overflow-hidden text-ellipsis text-center leading-tight font-medium text-gray-800"
            title={cell.student.name}
          >
            <span className="text-[10px] text-gray-400 block">
              {cell.student.classNumber}-{cell.student.studentNumber}
            </span>
            {cell.student.name}
          </span>
        </div>
      ) : (
        <span className="text-gray-300 text-[10px]">
          {row + 1}-{col + 1}
        </span>
      )}
    </div>
  );
}

export default memo(function RoomGrid({
  room,
  seats,
  gapAfterRows,
  hideTeacherDesk,
  compact,
  preserveSeatWidth,
  selectedSeatKey,
  onSelectSeat,
}: {
  room: Room;
  seats: RoomSeats;
  gapAfterRows?: number[];
  hideTeacherDesk?: boolean;
  compact?: boolean;
  preserveSeatWidth?: boolean;
  /** 이 방 안의 선택 좌석 "row-col". 다른 방이면 null 을 넘겨 memo 재렌더를 피한다 */
  selectedSeatKey?: string | null;
  onSelectSeat?: (seat: SeatRef | null) => void;
}) {
  return (
    <div className={`bg-white rounded-lg border ${compact ? "p-2" : "p-4"}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3
          className={`min-w-0 whitespace-nowrap overflow-hidden text-ellipsis font-semibold text-gray-800 ${compact ? "text-sm" : ""}`}
          title={room.name}
        >
          {room.name}
        </h3>
        {!compact && (
          <span className="shrink-0 text-xs text-gray-400">
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
                // minmax(0, 1fr) 은 폭이 부족하면 셀을 0 까지 줄여 이름이 글자 단위로 쪼개진다.
                // 최소 폭을 고정하면 격자가 부모(overflow-x-auto) 안에서 가로 스크롤된다.
                gridTemplateColumns: `repeat(${room.cols}, minmax(${
                  preserveSeatWidth ? MIN_SEAT_WIDTH : 0
                }px, 1fr))`,
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
                    isSelected={selectedSeatKey === key}
                    onSelect={onSelectSeat}
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
});
