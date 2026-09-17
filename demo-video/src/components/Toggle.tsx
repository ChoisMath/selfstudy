import React from "react";
import { interpolateColors, useCurrentFrame } from "remotion";
import { colors } from "../theme";
import { tween } from "../anim";

export const Toggle: React.FC<{
  onAt: number | null;
  initiallyOn?: boolean;
  color?: string;
}> = ({ onAt, initiallyOn = false, color = colors.blue600 }) => {
  const frame = useCurrentFrame();
  const progress = initiallyOn ? 1 : onAt === null ? 0 : tween(frame, [onAt, onAt + 8], [0, 1]);
  return (
    <div
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        background: interpolateColors(progress, [0, 1], [colors.gray200, color]),
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: 2,
          width: 20,
          height: 20,
          borderRadius: 10,
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          translate: `${progress * 20}px 0px`,
        }}
      />
    </div>
  );
};
