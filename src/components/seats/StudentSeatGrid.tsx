"use client";

import type { StudentSeatRoom } from "@/lib/seats/student-seat-group";

export type MySeatRef = { roomId: number; rowIndex: number; colIndex: number };

// 이름 4자(text-xs) + 테두리가 한 줄에 들어가는 폭. 폭이 부족하면 부모(overflow-x-auto)가 가로 스크롤한다.
const MIN_SEAT_WIDTH = 52;

export default function StudentSeatGrid({
  room,
  mySeat,
  gapAfterRows,
}: {
  room: StudentSeatRoom;
  mySeat: MySeatRef;
  gapAfterRows?: number[];
}) {
  const studentAt = new Map(room.seats.map((seat) => [`${seat.rowIndex}-${seat.colIndex}`, seat.student]));

  return (
    <div className="flex flex-col">
      {Array.from({ length: room.rows }, (_, row) => (
        <div
          key={row}
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${room.cols}, minmax(${MIN_SEAT_WIDTH}px, 1fr))`,
            marginBottom: gapAfterRows?.includes(row) ? "12px" : "4px",
          }}
        >
          {Array.from({ length: room.cols }, (_, col) => {
            const student = studentAt.get(`${row}-${col}`) ?? null;
            const isMine = mySeat.roomId === room.id && mySeat.rowIndex === row && mySeat.colIndex === col;
            if (!student) {
              return <div key={col} className="min-h-11 rounded border border-gray-100 bg-gray-50" />;
            }
            return (
              <div
                key={col}
                aria-current={isMine ? "true" : undefined}
                title={student.name}
                className={`min-h-11 rounded border px-1 flex flex-col items-center justify-center text-xs leading-tight whitespace-nowrap ${
                  isMine ? "bg-blue-600 border-blue-700 text-white font-bold" : "bg-white border-gray-200 text-gray-800"
                }`}
              >
                <span className={`text-[10px] ${isMine ? "text-blue-100" : "text-gray-400"}`}>
                  {student.classNumber}-{student.studentNumber}
                </span>
                <span className="block max-w-full overflow-hidden text-ellipsis">{student.name}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
