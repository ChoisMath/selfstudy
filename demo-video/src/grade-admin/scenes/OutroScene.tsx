import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { backOut, easeInOut, pulse, tween } from "../../anim";
import { APP_HOST } from "../../app-mocks/data";
import { PC_VIEWPORT } from "../../app-mocks/layout";
import { GuideScene } from "../../guide/GuideScene";
import { FONT, MONO } from "../../fonts";
import type { DemoProps } from "../../props";
import { colors } from "../../theme";
import { GradeAdminShellMock, gradeAdminHelpRect } from "../mocks/GradeAdminShellMock";
import { lineAt, lineStart } from "../timing";

const ID = "Outro";

// 학기 초 준비 순서 — 영상에서 다룬 탭 차례 그대로.
const STEPS: { text: string; note: string }[] = [
  { text: "명단 등록", note: "학생 관리 탭 · Excel 업로드" },
  { text: "도우미 지정", note: "반마다 도우미 학생" },
  { text: "참여 설정", note: "시간 · 요일 · 방과후" },
  { text: "좌석 배치", note: "교실 구조 → 배정 → 저장" },
  { text: "감독 배정", note: "달력에서 날짜마다" },
];

// GradeAdminShellMock 의 ? 버튼(gradeAdminHelpRect — 6탭 줄 오른쪽 끝)만 잘라 키운다.
// 크롭 세로 밴드는 그 rect 의 y/h 그대로 써서, 셸의 탭 줄 배치가 바뀌면 여기도 같이 따라간다.
const HELP_RECT = gradeAdminHelpRect();
const HELP_CENTER = { x: HELP_RECT.x + HELP_RECT.w / 2, y: HELP_RECT.y + HELP_RECT.h / 2 };
const HEADER_SCALE = 1.9;
const CROP = { x: 855, y: HELP_RECT.y, w: PC_VIEWPORT.w - 12 - 855, h: HELP_RECT.h };
// GuideHelpButton 의 보이는 원 지름(h-7).
const HELP_DOT = 28;

const CARD_TOP = 300;
const CARD_H = 560;
const LEFT_CARD = { x: 180, w: 620 };
const RIGHT_CARD = { x: 860, w: 880 };
const LEFT_CARD_CENTER_X = (1920 - LEFT_CARD.w) / 2;
const SHIFT_FRAMES = 18;

const MeshBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = tween(frame, [0, durationInFrames], [0, 1], easeInOut);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: -260 + drift * 60,
          top: -220,
          width: 980,
          height: 980,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.14) 0%, rgba(37,99,235,0) 68%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -300 + drift * 50,
          bottom: -360,
          width: 1100,
          height: 1100,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(252,211,77,0.20) 0%, rgba(252,211,77,0) 66%)",
        }}
      />
    </div>
  );
};

const Card: React.FC<{ x: number; w: number; enterAt: number; gap: number; children: React.ReactNode }> = ({
  x,
  w,
  enterAt,
  gap,
  children,
}) => {
  const frame = useCurrentFrame();
  const enter = tween(frame, [enterAt, enterAt + 14], [0, 1]);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: CARD_TOP,
        width: w,
        height: CARD_H,
        boxSizing: "border-box",
        padding: "36px 44px",
        display: "flex",
        flexDirection: "column",
        gap,
        background: colors.white,
        borderRadius: 24,
        border: `1px solid ${colors.blue100}`,
        boxShadow: "0 24px 60px rgba(15,23,42,0.10)",
        opacity: enter,
        translate: `0px ${(1 - enter) * 24}px`,
      }}
    >
      {children}
    </div>
  );
};

const StepRow: React.FC<{ at: number; index: number; text: string; note: string }> = ({ at, index, text, note }) => {
  const frame = useCurrentFrame();
  const enter = tween(frame, [at, at + 12], [0, 1]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: enter, translate: `${(1 - enter) * -20}px 0px` }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          flexShrink: 0,
          background: colors.blue600,
          color: colors.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          fontWeight: 800,
          scale: String(tween(frame, [at, at + 16], [0.4, 1], backOut)),
        }}
      >
        {index}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 32, lineHeight: 1.15, fontWeight: 800, color: colors.gray900, whiteSpace: "nowrap" }}>{text}</span>
        <span style={{ fontSize: 20, lineHeight: 1.2, fontWeight: 500, color: colors.gray500, whiteSpace: "nowrap" }}>{note}</span>
      </div>
    </div>
  );
};

// 교사 편·학생 편 Outro 와 같은 장치 — 실제 탭 줄을 키워 ? 버튼 위치를 보여 준다.
const HeaderZoom: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const ringIn = tween(frame, [at, at + 12], [0, 1]);
  const ring = HELP_DOT * HEADER_SCALE + 18;
  return (
    <div
      style={{
        position: "relative",
        width: CROP.w * HEADER_SCALE,
        height: CROP.h * HEADER_SCALE,
        borderRadius: 14,
        overflow: "hidden",
        border: `1px solid ${colors.gray200}`,
        boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: PC_VIEWPORT.w,
          height: PC_VIEWPORT.h,
          transform: `scale(${HEADER_SCALE}) translate(${-CROP.x}px, ${-CROP.y}px)`,
          transformOrigin: "top left",
        }}
      >
        <GradeAdminShellMock tab="today" showHelp />
      </div>
      <div
        style={{
          position: "absolute",
          left: (HELP_CENTER.x - CROP.x) * HEADER_SCALE - ring / 2,
          top: (HELP_CENTER.y - CROP.y) * HEADER_SCALE - ring / 2,
          width: ring,
          height: ring,
          borderRadius: "50%",
          boxSizing: "border-box",
          border: `4px solid ${colors.red600}`,
          boxShadow: `0 0 0 ${4 + pulse(frame, 28) * 8}px ${colors.red600}33`,
          opacity: ringIn,
          scale: String(tween(frame, [at, at + 14], [1.6, 1], backOut)),
        }}
      />
    </div>
  );
};

const OutroBody: React.FC = () => {
  const frame = useCurrentFrame();
  const stepsAt = lineStart(ID, 0);
  const firstStep = lineAt(ID, 0, 0.22);
  const stepGap = Math.round((lineAt(ID, 0, 0.62) - firstStep) / (STEPS.length - 1));
  const helpAt = lineStart(ID, 1);
  const titleEnter = tween(frame, [0, 14], [0, 1]);
  const helpLine = (delay: number) => tween(frame, [helpAt + delay, helpAt + delay + 12], [0, 1]);
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT }}>
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          opacity: titleEnter,
          translate: `0px ${(1 - titleEnter) * -16}px`,
        }}
      >
        <Img src={staticFile("posan.svg")} style={{ width: 84, height: 84 }} />
        <span style={{ fontSize: 68, fontWeight: 800, color: colors.gray900, letterSpacing: -2, whiteSpace: "nowrap" }}>
          학년관리자 사용 안내
        </span>
      </div>

      <Card
        x={tween(frame, [helpAt, helpAt + SHIFT_FRAMES], [LEFT_CARD_CENTER_X, LEFT_CARD.x], easeInOut)}
        w={LEFT_CARD.w}
        enterAt={stepsAt}
        gap={18}
      >
        <div style={{ fontSize: 26, lineHeight: 1.2, fontWeight: 700, color: colors.gray500, whiteSpace: "nowrap" }}>
          학기 초 준비 순서
        </div>
        {STEPS.map((step, i) => (
          <StepRow key={step.text} at={firstStep + i * stepGap} index={i + 1} text={step.text} note={step.note} />
        ))}
      </Card>

      <Card x={RIGHT_CARD.x} w={RIGHT_CARD.w} enterAt={helpAt + SHIFT_FRAMES - 4} gap={36}>
        <div style={{ fontSize: 26, fontWeight: 700, color: colors.gray500, whiteSpace: "nowrap" }}>궁금한 점이 생기면</div>
        <div style={{ opacity: helpLine(SHIFT_FRAMES + 2) }}>
          <HeaderZoom at={helpAt + SHIFT_FRAMES + 12} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: helpLine(SHIFT_FRAMES + 16), whiteSpace: "nowrap" }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              border: `3px solid ${colors.gray500}`,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 800,
              color: colors.gray600,
              flexShrink: 0,
            }}
          >
            ?
          </span>
          <span style={{ fontSize: 32, fontWeight: 700, color: colors.gray800 }}>화면 위쪽 물음표 버튼</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, opacity: helpLine(SHIFT_FRAMES + 30) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: colors.gray800 }}>도움말</span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 28,
                color: colors.blue700,
                background: colors.blue50,
                padding: "8px 20px",
                borderRadius: 999,
              }}
            >
              {APP_HOST}/help
            </span>
          </div>
          <div style={{ fontSize: 24, color: colors.gray500, whiteSpace: "nowrap" }}>
            학년관리 · 좌석 배치 안내와 이 영상을 다시 볼 수 있습니다
          </div>
        </div>
      </Card>
    </div>
  );
};

export const OutroScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID}>
    <MeshBackground />
    <OutroBody />
  </GuideScene>
);
