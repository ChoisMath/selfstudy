// 앱 src/app/attendance/[grade]/page.tsx SeatCell(105-169행) 재현. 색 hex 는 앱 코드 그대로.
import React from "react";
import { useCurrentFrame } from "remotion";
import { easeInOut, tween } from "../anim";
import { FONT } from "../fonts";
import { colors } from "../theme";
import { PHONE_BODY } from "./layout";
import { pressScale } from "./primitives";

export type SeatVisual =
  | "unchecked"
  | "present"
  | "absent"
  | "approved"
  | "afterschool"
  | "inactive"
  | "activated"
  | "selected";

export type SeatCellProps = {
  name: string;
  gradeClass: string;
  visual: SeatVisual;
  afterSchoolStatus?: "unchecked" | "present" | "absent";
  pending?: boolean;
  pressAt?: number;
  longPressFrom?: number;
  longPressTo?: number;
  width: number;
  height: number;
  // 앱의 clamp(…vw…) 글자·여백을 계산할 화면 폭. 기본 폰 390.
  viewportWidth?: number;
};

export const vwClamp = (min: number, vw: number, max: number, viewportWidth: number) =>
  Math.min(max, Math.max(min, (viewportWidth * vw) / 100));

const LINE_HEIGHT = 1.5;
const BORDER = 2;
const SUB_LABEL_FONT = 7;
const SUB_LABEL_MARGIN = 2;
const RING_FADE = 6;
const ACTIVE_SCALE = 0.95;

export const seatMetrics = (viewportWidth: number = PHONE_BODY.w) => {
  const nameFont = vwClamp(9, 2.2, 12, viewportWidth);
  const gradeFont = vwClamp(7, 1.8, 9, viewportWidth);
  const padY = vwClamp(4, 1, 8, viewportWidth);
  const baseHeight = BORDER * 2 + padY * 2 + nameFont * LINE_HEIGHT + 2 + gradeFont * LINE_HEIGHT;
  return {
    nameFont,
    gradeFont,
    padY,
    padX: vwClamp(1, 0.3, 4, viewportWidth),
    radius: vwClamp(3, 0.8, 5, viewportWidth),
    infoSize: vwClamp(12, 3, 16, viewportWidth),
    infoFont: vwClamp(7, 1.8, 10, viewportWidth),
    baseHeight,
    labelHeight: baseHeight + SUB_LABEL_MARGIN + SUB_LABEL_FONT * LINE_HEIGHT,
  };
};

type SubLabel = { text: string; color: string };

const subLabelOf = (visual: SeatVisual, afterSchoolStatus: SeatCellProps["afterSchoolStatus"]): SubLabel | null => {
  if (visual === "approved") return { text: "불참승인", color: "#ca8a04" };
  if (visual !== "afterschool") return null;
  if (afterSchoolStatus === "present") return { text: "출석", color: "#166534" };
  if (afterSchoolStatus === "absent") return { text: "결석", color: "#991b1b" };
  return { text: "방과후", color: "#ca8a04" };
};

// 방과후·불참승인 칸은 아래 작은 라벨 한 줄만큼 키가 크다 — 같은 행 칸들이 이 높이로 늘어난다.
export const seatContentHeight = (visual: SeatVisual, viewportWidth: number = PHONE_BODY.w) => {
  const m = seatMetrics(viewportWidth);
  return subLabelOf(visual, undefined) ? m.labelHeight : m.baseHeight;
};

type SeatPalette = { bg: string; fg: string; border: string; opacity: number; shadow?: string };

const paletteOf = (visual: SeatVisual, afterSchoolStatus: SeatCellProps["afterSchoolStatus"]): SeatPalette => {
  switch (visual) {
    case "inactive":
      return { bg: "#e5e7eb", fg: "#9ca3af", border: "#d1d5db", opacity: 0.7 };
    case "selected":
      return { bg: "#2563eb", fg: "#fff", border: "#1d4ed8", opacity: 1, shadow: "0 2px 8px rgba(37,99,235,0.3)" };
    case "afterschool": {
      const border = afterSchoolStatus === "present" ? "#22c55e" : afterSchoolStatus === "absent" ? "#ef4444" : "#facc15";
      return { bg: "#fef9c3", fg: "#1e293b", border, opacity: 1 };
    }
    case "approved":
      return { bg: "#fef9c3", fg: "#1e293b", border: "#facc15", opacity: 1 };
    case "present":
      return { bg: "#bbf7d0", fg: "#1e293b", border: "transparent", opacity: 1 };
    case "absent":
      return { bg: "#fecaca", fg: "#1e293b", border: "transparent", opacity: 1 };
    default:
      return { bg: "#dbeafe", fg: "#1e293b", border: "transparent", opacity: 1 };
  }
};

const longPressScale = (frame: number, from?: number, to?: number) => {
  if (from === undefined || to === undefined) return 1;
  const down = tween(frame, [from, from + 4], [1, ACTIVE_SCALE]);
  return frame < to ? down : tween(frame, [to, to + 4], [ACTIVE_SCALE, 1]);
};

const LongPressRing: React.FC<{ width: number; height: number; radius: number; from: number; to: number }> = ({
  width,
  height,
  radius,
  from,
  to,
}) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to + RING_FADE) return null;
  const progress = tween(frame, [from, to], [0, 1], easeInOut);
  const opacity = tween(frame, [to, to + RING_FADE], [1, 0]);
  const inset = 3;
  return (
    <svg
      width={width + inset * 2}
      height={height + inset * 2}
      style={{ position: "absolute", left: -inset, top: -inset, overflow: "visible", opacity, pointerEvents: "none" }}
    >
      <rect
        x={1.5}
        y={1.5}
        width={width + inset * 2 - 3}
        height={height + inset * 2 - 3}
        rx={radius + inset}
        fill="none"
        stroke={colors.blue600}
        strokeWidth={3}
        pathLength={1}
        strokeDasharray={`${progress} 1`}
        strokeLinecap="round"
      />
    </svg>
  );
};

export const SeatCellMock: React.FC<SeatCellProps> = ({
  name,
  gradeClass,
  visual,
  afterSchoolStatus,
  pending,
  pressAt,
  longPressFrom,
  longPressTo,
  width,
  height,
  viewportWidth = PHONE_BODY.w,
}) => {
  const frame = useCurrentFrame();
  const m = seatMetrics(viewportWidth);
  const palette = paletteOf(visual, afterSchoolStatus);
  const isSelected = visual === "selected";
  const subLabel = isSelected ? null : subLabelOf(visual, afterSchoolStatus);
  const scale = pressScale(frame, pressAt) * longPressScale(frame, longPressFrom, longPressTo);

  return (
    <div style={{ position: "relative", width, height, transform: `scale(${scale})`, fontFamily: FONT }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxSizing: "border-box",
          borderRadius: m.radius,
          padding: `${m.padY}px ${m.padX}px`,
          textAlign: "center",
          border: `${BORDER}px solid ${palette.border}`,
          background: palette.bg,
          color: palette.fg,
          opacity: palette.opacity,
          boxShadow: palette.shadow,
          lineHeight: LINE_HEIGHT,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            width: m.infoSize,
            height: m.infoSize,
            borderRadius: "50%",
            fontSize: m.infoFont,
            fontWeight: 700,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isSelected ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.05)",
            color: isSelected ? "#fff" : "#6b7280",
          }}
        >
          i
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: m.nameFont,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {pending ? <span style={{ color: "#ef4444", fontWeight: 900 }}>*</span> : null}
          {name}
        </div>
        <div
          style={{
            fontSize: m.gradeFont,
            marginTop: 2,
            color: isSelected ? "#bfdbfe" : "#6b7280",
            whiteSpace: "nowrap",
          }}
        >
          {gradeClass}
        </div>
        {subLabel ? (
          <div
            style={{
              fontSize: SUB_LABEL_FONT,
              marginTop: SUB_LABEL_MARGIN,
              color: subLabel.color,
              whiteSpace: "nowrap",
            }}
          >
            {subLabel.text}
          </div>
        ) : null}
      </div>
      {longPressFrom !== undefined && longPressTo !== undefined ? (
        <LongPressRing width={width} height={height} radius={m.radius} from={longPressFrom} to={longPressTo} />
      ) : null}
    </div>
  );
};
