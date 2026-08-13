"use client";

import { memo } from "react";
import {
  SEAT_CELL_GAP,
  SEAT_CELL_HEIGHT,
  SEAT_CELL_WIDTH,
} from "@/lib/seats/print-layout";

export type PrintSeatStudent = {
  id: number;
  name: string;
  classNumber: number;
  studentNumber: number;
};

export type PrintCellState = {
  studentId: number | null;
  student: PrintSeatStudent | null;
};

export type PrintRoomSeats = Map<string, PrintCellState>;

type PrintRoom = {
  id: number;
  name: string;
  cols: number;
  rows: number;
};

const SUB_BLOCK_GAP = SEAT_CELL_GAP * 3;

export default memo(function PrintRoomGrid({
  room,
  seats,
  label,
  gapAfterRows,
}: {
  room: PrintRoom;
  seats: PrintRoomSeats;
  label?: string;
  gapAfterRows?: number[];
}) {
  return (
    <div className="flex flex-col">
      {label ? (
        <div className="mb-1 text-center text-[13px] font-semibold text-black whitespace-nowrap">
          {label}
        </div>
      ) : null}

      {Array.from({ length: room.rows }, (_, r) => (
        <div
          key={`row-${r}`}
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${room.cols}, ${SEAT_CELL_WIDTH}px)`,
            columnGap: `${SEAT_CELL_GAP}px`,
            marginBottom:
              r === room.rows - 1
                ? 0
                : `${gapAfterRows?.includes(r) ? SUB_BLOCK_GAP : SEAT_CELL_GAP}px`,
          }}
        >
          {Array.from({ length: room.cols }, (_, c) => {
            const cell = seats.get(`${r}-${c}`);
            return (
              <div
                key={`${r}-${c}`}
                className="flex flex-col items-center justify-center overflow-hidden rounded-sm border border-gray-700"
                style={{ height: `${SEAT_CELL_HEIGHT}px` }}
              >
                {cell?.student ? (
                  <>
                    <span className="block text-[10px] leading-tight text-gray-500 whitespace-nowrap">
                      {cell.student.classNumber}-{cell.student.studentNumber}
                    </span>
                    <span className="block text-[13px] font-medium leading-tight text-black whitespace-nowrap">
                      {cell.student.name}
                    </span>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
});
