import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { FONT, MONO } from "../../fonts";
import { colors } from "../../theme";
import { backOut, tween } from "../../anim";
import { GuideScene } from "../../guide/GuideScene";
import { lineAt, lineStart } from "../timing";
import { APP_HOST } from "../../app-mocks/data";
import type { DemoProps } from "../../props";

const ID = "Intro";

// 목차 칩은 문장 1에서 그 탭 이름이 들리는 대략의 위치(비율)에 하나씩 올라온다.
const CHAPTERS: { text: string; at: number }[] = [
  { text: "오늘출결", at: 0 },
  { text: "학생 관리", at: 0.1 },
  { text: "참여 설정", at: 0.21 },
  { text: "좌석 배치", at: 0.32 },
  { text: "감독 배정", at: 0.43 },
  { text: "월간출결", at: 0.54 },
];
// 칩이 말보다 살짝 먼저 떠야 들릴 때 이미 읽힌다.
const CHIP_LEAD = 4;

// 인트로 전용 배경 메시 — 흐린 원 두 개가 천천히 떠다닌다.
const BackgroundMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const driftA = Math.sin(frame / 55) * 50;
  const driftB = Math.cos(frame / 70) * 40;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 1200,
          height: 1200,
          borderRadius: "50%",
          left: -360 + driftA,
          top: -520,
          filter: "blur(60px)",
          background: `radial-gradient(circle, ${colors.blue600}30, transparent 62%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1000,
          height: 1000,
          borderRadius: "50%",
          right: -300 - driftB,
          bottom: -460,
          filter: "blur(70px)",
          background: `radial-gradient(circle, ${colors.indigo600}26, transparent 65%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const ChapterChip: React.FC<{ at: number; index: number; text: string }> = ({ at, index, text }) => {
  const frame = useCurrentFrame();
  const enter = tween(frame, [at, at + 14], [0, 1]);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#fff",
        border: `1px solid ${colors.blue100}`,
        borderRadius: 16,
        padding: "14px 22px 14px 14px",
        boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
        opacity: enter,
        translate: `0px ${(1 - enter) * 24}px`,
        scale: String(0.9 + 0.1 * tween(frame, [at, at + 20], [0, 1], backOut)),
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          background: colors.blue600,
          color: "#fff",
          fontSize: 19,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {index + 1}
      </div>
      <span style={{ fontSize: 26, fontWeight: 700, color: colors.gray800, whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
};

const IntroBody: React.FC<{ appName: string }> = ({ appName }) => {
  const frame = useCurrentFrame();
  const titleAt = lineStart(ID, 0);
  const breathe = Math.sin(frame / 40) * 3;
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 150,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          fontFamily: FONT,
        }}
      >
        <Img
          src={staticFile("posan.svg")}
          alt=""
          style={{
            width: 132,
            height: 132,
            opacity: tween(frame, [titleAt - 10, titleAt + 4], [0, 1]),
            scale: String(tween(frame, [titleAt - 10, titleAt + 18], [0.5, 1], backOut)),
            translate: `0px ${breathe}px`,
          }}
        />
        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            color: colors.gray900,
            letterSpacing: -1,
            whiteSpace: "nowrap",
            opacity: tween(frame, [titleAt - 4, titleAt + 10], [0, 1]),
            translate: `0px ${tween(frame, [titleAt - 4, titleAt + 14], [28, 0])}px`,
          }}
        >
          {appName} 출석부
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: colors.blue700,
            whiteSpace: "nowrap",
            opacity: tween(frame, [titleAt + 6, titleAt + 20], [0, 1]),
            translate: `0px ${tween(frame, [titleAt + 6, titleAt + 24], [24, 0])}px`,
          }}
        >
          학년관리자 사용 안내
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 26,
            color: colors.gray600,
            background: "#fff",
            border: `1px solid ${colors.blue100}`,
            padding: "8px 22px",
            borderRadius: 999,
            whiteSpace: "nowrap",
            opacity: tween(frame, [titleAt + 16, titleAt + 30], [0, 1]),
            translate: `0px ${tween(frame, [titleAt + 16, titleAt + 32], [16, 0])}px`,
          }}
        >
          {APP_HOST}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 700,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 16,
          fontFamily: FONT,
        }}
      >
        {CHAPTERS.map((chapter, i) => (
          <ChapterChip key={chapter.text} at={lineAt(ID, 1, chapter.at) - CHIP_LEAD} index={i} text={chapter.text} />
        ))}
      </div>
    </>
  );
};

export const IntroScene: React.FC<DemoProps> = ({ appName }) => (
  <GuideScene id={ID}>
    <BackgroundMesh />
    <IntroBody appName={appName} />
  </GuideScene>
);
