"use client";

import { useState } from "react";
import useSWR from "swr";
import ClassroomFrame from "@/components/seats/ClassroomFrame";
import { GAP_CONFIG } from "@/components/seats/MiraeHallLayout";
import StudentSeatGrid from "@/components/seats/StudentSeatGrid";
import type { ParticipationDaysMap } from "@/lib/participation-days";
import { divisionLabel } from "@/lib/seats/print-groups";
import type { StudentSeatGroup, StudentSeatsResponse } from "@/lib/seats/student-seat-group";
import { SEAT_SESSION_META, SEAT_SESSION_TYPES, sessionTypesOfSeat, type SeatSessionType } from "@/lib/sessions";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function mySeatLabel(group: StudentSeatGroup): string {
  const room = group.rooms.find((r) => r.id === group.mySeat.roomId);
  const position = `${group.mySeat.rowIndex + 1}행 ${group.mySeat.colIndex + 1}열`;
  return room && group.rooms.length > 1 ? `${divisionLabel(room.name)} · ${position}` : position;
}

export default function SeatCheckCard({ participationDays }: { participationDays: ParticipationDaysMap }) {
  const { data, error, isLoading } = useSWR<StudentSeatsResponse>("/api/student/seats", fetcher);
  const [picked, setPicked] = useState<SeatSessionType | null>(null);
  // 데이터가 비동기로 오므로 기본 탭은 렌더에서 파생한다 (effect 안 setState 금지)
  const firstWithGroup = SEAT_SESSION_TYPES.find((seatSession) => data?.[seatSession]);
  const tab: SeatSessionType = picked ?? firstWithGroup ?? "afternoon";
  const group = data?.[tab] ?? null;
  const participates = sessionTypesOfSeat(tab).some((sessionType) => participationDays[sessionType]?.isParticipating);

  function renderBody() {
    if (isLoading) return <p className="text-sm text-gray-400">불러오는 중...</p>;
    if (error || !data) return <p className="text-sm text-red-600">좌석 정보를 불러오지 못했습니다.</p>;
    if (!group) {
      return (
        <p className="text-sm text-gray-400">
          {participates ? "배정된 좌석이 없습니다." : `${SEAT_SESSION_META[tab].label} 미참가`}
        </p>
      );
    }

    const assignedCount = group.rooms.reduce((sum, room) => sum + room.seats.filter((seat) => seat.student).length, 0);
    const showDivisionLabels = group.rooms.length > 1;
    const grids = group.rooms.map((room) => (
      <div key={room.id} className="min-w-0">
        {showDivisionLabels && (
          <p className="mb-1 text-center text-[11px] text-gray-500 whitespace-nowrap">{divisionLabel(room.name)}</p>
        )}
        <StudentSeatGrid room={room} mySeat={group.mySeat} gapAfterRows={GAP_CONFIG[room.name]} />
      </div>
    ));

    return (
      <>
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="text-sm font-bold text-gray-800 whitespace-nowrap">{group.title}</span>
          <span className="text-xs text-gray-400 whitespace-nowrap">{assignedCount}석</span>
        </div>
        <p className="mb-3 text-xs text-blue-700 whitespace-nowrap">내 자리: {mySeatLabel(group)}</p>
        <div className="overflow-x-auto">
          {group.kind === "classroom" && group.corridorSide ? (
            <ClassroomFrame corridorSide={group.corridorSide} variant="screen">
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${group.rooms.length}, 1fr)` }}>
                {grids}
              </div>
            </ClassroomFrame>
          ) : (
            <div className="flex flex-col gap-3">
              {grids}
              {tab === "afternoon" && (
                <div className="text-center py-1.5 bg-gray-50 border-t border-dashed border-gray-300 text-gray-400 text-xs whitespace-nowrap">
                  교탁
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-medium text-gray-600 whitespace-nowrap">좌석 확인</h3>
        <div className="flex gap-1">
          {SEAT_SESSION_TYPES.map((seatSession) => (
            <button
              key={seatSession}
              type="button"
              onClick={() => setPicked(seatSession)}
              className={`min-h-11 px-3 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                tab === seatSession ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {SEAT_SESSION_META[seatSession].label}
            </button>
          ))}
        </div>
      </div>
      {renderBody()}
    </div>
  );
}
