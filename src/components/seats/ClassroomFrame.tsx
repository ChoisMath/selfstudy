"use client";

import type { ReactNode } from "react";
import { corridorLabels, type CorridorSide } from "@/lib/seats/classroom-config";
import { SEAT_CELL_GAP } from "@/lib/seats/print-layout";

export const PRINT_SIDE_LABEL_WIDTH = 20;

export default function ClassroomFrame({
  corridorSide,
  variant,
  showTeacherDesk = true,
  children,
}: {
  corridorSide: CorridorSide;
  variant: "screen" | "print";
  showTeacherDesk?: boolean;
  children: ReactNode;
}) {
  const labels = corridorLabels(corridorSide);
  const isPrint = variant === "print";

  const sideLabel = (text: string) => (
    <div
      className={`flex items-center justify-center whitespace-nowrap ${
        isPrint ? "text-[11px] text-gray-700" : "text-[clamp(10px,2.5vw,12px)] text-[#94a3b8]"
      }`}
      style={{ writingMode: "vertical-rl", width: isPrint ? PRINT_SIDE_LABEL_WIDTH : undefined }}
    >
      {text}
    </div>
  );

  return (
    <div className="flex flex-col">
      <div
        className="grid items-stretch"
        style={{
          // 인쇄는 PrintPageFitter 가 자연 크기를 실측하므로 고정 px + max-content 만 쓴다.
          // 화면은 격자 최소 폭(min-content) 아래로 줄이지 않는다 — 호출부가 overflow-x-auto 래퍼로 가로 스크롤을 제공해야 한다.
          gridTemplateColumns: isPrint
            ? `${PRINT_SIDE_LABEL_WIDTH}px max-content ${PRINT_SIDE_LABEL_WIDTH}px`
            : "auto minmax(min-content, 1fr) auto",
          columnGap: isPrint ? `${SEAT_CELL_GAP * 2}px` : "4px",
        }}
      >
        {sideLabel(labels.left)}
        <div>{children}</div>
        {sideLabel(labels.right)}
      </div>

      {showTeacherDesk ? (
        isPrint ? (
          <div className="mt-3 self-center border border-gray-700 px-10 py-1 text-[13px] text-black whitespace-nowrap">
            교탁
          </div>
        ) : (
          <div className="mt-2 text-center py-1.5 bg-[#f9fafb] border-t border-dashed border-[#d1d5db] text-[#9ca3af] text-[clamp(10px,2.5vw,12px)] whitespace-nowrap">
            교탁
          </div>
        )
      ) : null}
    </div>
  );
}
