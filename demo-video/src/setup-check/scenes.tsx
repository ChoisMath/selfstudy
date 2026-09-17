import React from "react";
import { useCurrentFrame } from "remotion";
import type { SceneDef } from "../scenes";
import { GuideScene } from "../guide/GuideScene";
import { BrowserFrame } from "../components/BrowserFrame";
import { Cursor } from "../components/Cursor";
import { Annotation } from "../components/Annotation";
import { BROWSER, colors } from "../theme";
import { backOut, tween } from "../anim";
import type { DemoProps } from "../props";
import { lineAt, lineEnd, sceneFrames } from "./timing";

const IntroScene: React.FC<DemoProps> = ({ appName }) => {
  const frame = useCurrentFrame();
  return (
    <GuideScene id="Intro">
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          opacity: tween(frame, [0, 14], [0, 1]),
          translate: `0px ${tween(frame, [0, 18], [24, 0], backOut)}px`,
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 600, color: colors.blue700, whiteSpace: "nowrap" }}>{appName}</div>
        <div style={{ fontSize: 76, fontWeight: 800, color: colors.gray900, whiteSpace: "nowrap" }}>안내 영상 환경 점검</div>
      </div>
    </GuideScene>
  );
};

const SEAT = { cols: 6, rows: 3, w: 150, h: 96, gap: 22, left: 250, top: 150 };
// 주석 라벨이 대상 좌석 위쪽에 붙으므로 맨 윗줄을 대상으로 해야 다른 좌석 번호를 가리지 않는다.
const TARGET = { col: 2, row: 0 };
const seatBox = (col: number, row: number) => ({
  x: SEAT.left + col * (SEAT.w + SEAT.gap),
  y: SEAT.top + row * (SEAT.h + SEAT.gap),
});

const CheckScene: React.FC<DemoProps> = ({ appUrl }) => {
  const frame = useCurrentFrame();
  const clickAt = lineAt("Check", 0, 0.6);
  const target = seatBox(TARGET.col, TARGET.row);
  // 커서·주석 좌표는 1920×1080 화면 기준이라 브라우저 본문 좌표에 프레임 위치를 더한다.
  const screenX = BROWSER.x + target.x + SEAT.w / 2;
  const screenY = BROWSER.y + BROWSER.chrome + target.y + SEAT.h / 2;
  return (
    <GuideScene id="Check" step={1} label="출석 체크">
      <BrowserFrame url={`${appUrl}/attendance/1`} tabTitle="포산고 자율학습">
        <div style={{ position: "absolute", left: 250, top: 60, fontSize: 30, fontWeight: 700, color: colors.gray800, whiteSpace: "nowrap" }}>
          1학년 · 오후1
        </div>
        {Array.from({ length: SEAT.rows }, (_, row) =>
          Array.from({ length: SEAT.cols }, (_, col) => {
            const { x, y } = seatBox(col, row);
            const isTarget = col === TARGET.col && row === TARGET.row;
            const checked = isTarget && frame >= clickAt;
            return (
              <div
                key={`${row}-${col}`}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: SEAT.w,
                  height: SEAT.h,
                  borderRadius: 14,
                  border: `2px solid ${checked ? colors.green600 : colors.gray200}`,
                  background: checked ? colors.green50 : colors.white,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 600,
                  color: checked ? colors.green600 : colors.gray600,
                  whiteSpace: "nowrap",
                }}
              >
                {checked ? "출석" : `${row + 1}-${col + 1}`}
              </div>
            );
          }),
        )}
      </BrowserFrame>
      <Cursor
        path={[
          { frame: lineAt("Check", 0, 0.1), x: 1500, y: 800 },
          { frame: clickAt - 4, x: screenX, y: screenY },
        ]}
        clicks={[clickAt]}
      />
      <Annotation
        from={clickAt + 6}
        durationInFrames={lineEnd("Check", 1) - clickAt}
        x={BROWSER.x + target.x - 10}
        y={BROWSER.y + BROWSER.chrome + target.y - 10}
        width={SEAT.w + 20}
        height={SEAT.h + 20}
        label="눌러서 출석"
        color={colors.green600}
      />
    </GuideScene>
  );
};

export const SETUP_CHECK_SCENES: SceneDef[] = [
  { id: "Intro", component: IntroScene, durationInFrames: sceneFrames("Intro") },
  { id: "Check", component: CheckScene, durationInFrames: sceneFrames("Check") },
];
