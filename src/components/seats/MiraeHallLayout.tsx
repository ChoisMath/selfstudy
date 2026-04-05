"use client";

import type { ReactNode } from "react";

interface BaseRoom {
  id: number;
  name: string;
  cols: number;
  rows: number;
}

// 방 이름 → CSS grid area 매핑
const ROOM_AREAS: Record<string, string> = {
  복도석: "sidebar",
  미래혜윰실2: "room1",
  미래202: "room2",
  미래아띠존: "room3",
  미래201: "room4",
  미래혜윰실1: "room5",
};

// 행 간 시각적 갭 설정 (서브블록 구분용)
export const GAP_CONFIG: Record<string, number[]> = {
  미래혜윰실2: [1],           // 2 sub-blocks of 5×2
  미래혜윰실1: [1, 3, 5, 7],  // 5 sub-blocks of 5×2
};

export default function MiraeHallLayout<T extends BaseRoom>({
  rooms,
  renderRoom,
}: {
  rooms: T[];
  renderRoom: (room: T) => ReactNode;
}) {
  // 방 이름으로 매핑
  const roomByName = new Map(rooms.map((r) => [r.name, r]));

  const renderRoomArea = (name: string) => {
    const room = roomByName.get(name);
    if (!room) return null;
    return renderRoom(room);
  };

  return (
    <div
      className="bg-white rounded-lg border p-4 overflow-x-auto"
      style={{
        display: "grid",
        gridTemplateColumns: "90px 1fr 44px 1fr",
        gridTemplateRows: "auto auto 1fr 1fr 1fr auto",
        gridTemplateAreas: `
          "sidebar label1   divider stairs"
          "sidebar room1    divider bath"
          "sidebar room2    divider room5"
          "sidebar room3    divider room5"
          "sidebar room4    divider room5"
          "sidebar teacher  divider room5"
        `,
        gap: "6px",
        minWidth: "700px",
      }}
    >
      {/* 좌측: 복도석 */}
      <div
        style={{ gridArea: "sidebar" }}
        className="border-r border-gray-300 pr-1"
      >
        {renderRoomArea("복도석")}
      </div>

      {/* 사감실 라벨 */}
      <div
        style={{ gridArea: "label1" }}
        className="text-center py-2 bg-gray-50 rounded border text-sm font-medium text-gray-600"
      >
        사감실
      </div>

      {/* 중앙 교실들 */}
      <div style={{ gridArea: "room1" }}>{renderRoomArea("미래혜윰실2")}</div>
      <div style={{ gridArea: "room2" }}>{renderRoomArea("미래202")}</div>
      <div style={{ gridArea: "room3" }}>{renderRoomArea("미래아띠존")}</div>
      <div style={{ gridArea: "room4" }}>{renderRoomArea("미래201")}</div>

      {/* 감독교사 대기석 */}
      <div
        style={{ gridArea: "teacher" }}
        className="flex items-center justify-end py-2 px-3"
      >
        <div className="border border-gray-300 px-4 py-1 text-sm bg-gray-100 rounded text-gray-600">
          감독교사 대기석
        </div>
      </div>

      {/* 창의홀 디바이더 */}
      <div
        style={{ gridArea: "divider" }}
        className="flex flex-col items-center justify-center border-l border-r border-gray-300 py-4"
      >
        <div className="text-sm text-gray-400 mb-2">&darr;</div>
        <div
          className="font-bold tracking-widest text-base text-gray-500"
          style={{ writingMode: "vertical-rl" }}
        >
          창의홀
        </div>
      </div>

      {/* 우측 상단: 계단 */}
      <div
        style={{ gridArea: "stairs" }}
        className="flex items-center justify-center bg-gray-50 rounded border text-sm font-medium text-gray-500"
      >
        계단
      </div>

      {/* 우측: 화장실 */}
      <div
        style={{ gridArea: "bath" }}
        className="flex flex-col rounded border overflow-hidden"
      >
        <div className="flex-1 flex items-center justify-center text-xs text-gray-500 border-b bg-gray-50">
          화장실(남)
        </div>
        <div className="flex-1 flex items-center justify-center text-xs text-gray-500 bg-gray-50">
          화장실(여)
        </div>
      </div>

      {/* 우측: 미래혜윰실1 */}
      <div style={{ gridArea: "room5" }}>{renderRoomArea("미래혜윰실1")}</div>
    </div>
  );
}
