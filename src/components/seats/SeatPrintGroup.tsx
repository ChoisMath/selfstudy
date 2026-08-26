"use client";

import MiraeHallLayout, { GAP_CONFIG } from "./MiraeHallLayout";
import PrintRoomGrid, { type PrintRoomSeats } from "./PrintRoomGrid";
import { divisionLabel, type PrintBaseRoom, type PrintGroup } from "@/lib/seats/print-groups";
import { SEAT_SESSION_META, type SeatSessionType } from "@/lib/sessions";

const EMPTY_SEATS: PrintRoomSeats = new Map();
const GROUP_GAP_PX = 16;

export default function SeatPrintGroup({
  group,
  grade,
  sessionType,
  seatsByRoom,
}: {
  group: PrintGroup<PrintBaseRoom>;
  grade: number;
  sessionType: SeatSessionType;
  seatsByRoom: Map<number, PrintRoomSeats>;
}) {
  const sessionLabel = SEAT_SESSION_META[sessionType].label;
  const showTeacherDesk = group.kind === "divisions-row" || group.kind === "divisions-column";

  return (
    <div className="inline-flex flex-col items-center">
      <h2 className="mb-3 text-[18px] font-bold text-black whitespace-nowrap">
        {grade}학년 {sessionLabel} — {group.title}
      </h2>

      {group.kind === "hall" ? (
        <MiraeHallLayout
          rooms={group.rooms}
          fitContent
          renderRoom={(room) => (
            <PrintRoomGrid
              room={room}
              seats={seatsByRoom.get(room.id) ?? EMPTY_SEATS}
              label={room.name}
              gapAfterRows={GAP_CONFIG[room.name]}
            />
          )}
        />
      ) : (
        <div
          className="grid items-start"
          style={{
            gridTemplateColumns:
              group.kind === "divisions-row"
                ? `repeat(${group.rooms.length}, max-content)`
                : "max-content",
            columnGap: `${GROUP_GAP_PX}px`,
            rowGap: `${GROUP_GAP_PX}px`,
          }}
        >
          {group.rooms.map((room) => (
            <PrintRoomGrid
              key={room.id}
              room={room}
              seats={seatsByRoom.get(room.id) ?? EMPTY_SEATS}
              label={group.kind === "stack" ? room.name : divisionLabel(room.name)}
            />
          ))}
        </div>
      )}

      {showTeacherDesk ? (
        <div className="mt-3 border border-gray-700 px-10 py-1 text-[13px] text-black whitespace-nowrap">
          교탁
        </div>
      ) : null}
    </div>
  );
}
