// 앱 src/components/seats/ClassroomFrame.tsx 재현. 좌우 라벨은 classroom-config.ts corridorLabels 그대로.
import React from "react";
import { FONT } from "../fonts";
import { PHONE_BODY } from "./layout";
import { tw } from "./tw";

export type CorridorSide = "left" | "right";
export type ClassroomFrameVariant = "screen" | "print";

const LINE_HEIGHT = 1.5;
const PRINT_SIDE_LABEL_WIDTH = 20;
const PRINT_COLUMN_GAP = 8;
const PRINT_LABEL_FONT = 11;
const PRINT_DESK_FONT = 13;
const SCREEN_COLUMN_GAP = 4;

export const corridorLabels = (side: CorridorSide) =>
  side === "left" ? { left: "복도", right: "창문" } : { left: "창문", right: "복도" };

// 인쇄는 고정 px, 화면은 clamp(10px,2.5vw,12px) 글자 — 세로쓰기 라벨 폭은 줄 높이(글자×1.5)와 같다.
export const classroomFrameMetrics = (variant: ClassroomFrameVariant, viewportWidth: number = PHONE_BODY.w) => {
  if (variant === "print") {
    return {
      labelFont: PRINT_LABEL_FONT,
      sideLabelWidth: PRINT_SIDE_LABEL_WIDTH,
      columnGap: PRINT_COLUMN_GAP,
      deskBlockHeight: 12 + 2 + 8 + PRINT_DESK_FONT * LINE_HEIGHT,
    };
  }
  const labelFont = Math.min(12, Math.max(10, viewportWidth * 0.025));
  return {
    labelFont,
    sideLabelWidth: labelFont * LINE_HEIGHT,
    columnGap: SCREEN_COLUMN_GAP,
    deskBlockHeight: 8 + 1 + 12 + labelFont * LINE_HEIGHT,
  };
};

export const ClassroomFrameMock: React.FC<{
  corridorSide: CorridorSide;
  variant: ClassroomFrameVariant;
  showTeacherDesk?: boolean;
  viewportWidth?: number;
  children: React.ReactNode;
}> = ({ corridorSide, variant, showTeacherDesk = true, viewportWidth = PHONE_BODY.w, children }) => {
  const labels = corridorLabels(corridorSide);
  const isPrint = variant === "print";
  const metrics = classroomFrameMetrics(variant, viewportWidth);

  const sideLabel = (text: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
        writingMode: "vertical-rl",
        fontSize: metrics.labelFont,
        lineHeight: LINE_HEIGHT,
        color: isPrint ? tw.gray[700] : "#94a3b8",
        width: isPrint ? PRINT_SIDE_LABEL_WIDTH : undefined,
      }}
    >
      {text}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", fontFamily: FONT }}>
      <div
        style={{
          display: "grid",
          alignItems: "stretch",
          gridTemplateColumns: isPrint
            ? `${PRINT_SIDE_LABEL_WIDTH}px max-content ${PRINT_SIDE_LABEL_WIDTH}px`
            : "auto minmax(min-content, 1fr) auto",
          columnGap: metrics.columnGap,
        }}
      >
        {sideLabel(labels.left)}
        <div>{children}</div>
        {sideLabel(labels.right)}
      </div>
      {showTeacherDesk ? (
        isPrint ? (
          <div
            style={{
              marginTop: 12,
              alignSelf: "center",
              border: `1px solid ${tw.gray[700]}`,
              padding: "4px 40px",
              fontSize: PRINT_DESK_FONT,
              lineHeight: LINE_HEIGHT,
              color: "#000",
              whiteSpace: "nowrap",
            }}
          >
            교탁
          </div>
        ) : (
          <div
            style={{
              marginTop: 8,
              textAlign: "center",
              padding: "6px 0",
              background: "#f9fafb",
              borderTop: "1px dashed #d1d5db",
              color: "#9ca3af",
              fontSize: metrics.labelFont,
              lineHeight: LINE_HEIGHT,
              whiteSpace: "nowrap",
            }}
          >
            교탁
          </div>
        )
      ) : null}
    </div>
  );
};
