import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { backOut, easeInOut, pulse, tween } from "../../anim";
import { CheckIcon } from "../../components/icons";
import { GuideScene } from "../../guide/GuideScene";
import { FONT, MONO } from "../../fonts";
import { APP_HOST } from "../../app-mocks/data";
import { PHONE_BODY } from "../../app-mocks/layout";
import { colors } from "../../theme";
import { StudentShellMock, studentShellPoint, STUDENT_HEADER_H } from "../mocks/StudentShellMock";
import { lineStart } from "../timing";
import type { DemoProps } from "../../props";

const ID = "Outro";

const HELP_PATH = `${APP_HOST}/help/student`;

// 헤더 1행(로고·이름·?·로그아웃) 높이 — studentShellPoint 의 세로 중심에서 되짚는다.
const HEADER_ROW1_H = studentShellPoint("logout").y * 2;
const HELP_POINT = studentShellPoint("help");
// GuideHelpButton 의 보이는 원 지름(h-7).
const HELP_DOT = 28;
const HEADER_SCALE = 1.85;

const CARD_TOP = 300;
const CARD_H = 560;
const LEFT_CARD = { x: 180, w: 620 };
const RIGHT_CARD = { x: 860, w: 880 };
// 도움말 카드가 들어올 때 원칙 카드가 가운데에서 왼쪽으로 비켜난다.
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

const RuleRow: React.FC<{ at: number; text: string; note: string; tone: string; glyph?: string }> = ({
  at,
  text,
  note,
  tone,
  glyph,
}) => {
  const frame = useCurrentFrame();
  const enter = tween(frame, [at, at + 12], [0, 1]);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 18,
        opacity: enter,
        translate: `${(1 - enter) * -20}px 0px`,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          background: tone,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          scale: String(tween(frame, [at, at + 16], [0.4, 1], backOut)),
        }}
      >
        <CheckIcon size={24} color={glyph ?? colors.white} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 38, fontWeight: 800, color: colors.gray900, whiteSpace: "nowrap" }}>{text}</span>
        <span style={{ fontSize: 24, fontWeight: 500, color: colors.gray500, whiteSpace: "nowrap" }}>{note}</span>
      </div>
    </div>
  );
};

// 학생 화면 헤더를 그대로 키워 ? 버튼이 어디 있는지 보여 준다(교사 편 Outro 와 같은 장치).
const HeaderZoom: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const ringIn = tween(frame, [at, at + 12], [0, 1]);
  const ring = HELP_DOT * HEADER_SCALE + 18;
  return (
    <div
      style={{
        position: "relative",
        width: PHONE_BODY.w * HEADER_SCALE,
        height: HEADER_ROW1_H * HEADER_SCALE,
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
          width: PHONE_BODY.w,
          height: STUDENT_HEADER_H,
          transform: `scale(${HEADER_SCALE})`,
          transformOrigin: "top left",
        }}
      >
        <StudentShellMock width={PHONE_BODY.w} height={PHONE_BODY.h} tab="schedule" showHelp>
          {null}
        </StudentShellMock>
      </div>
      <div
        style={{
          position: "absolute",
          left: HELP_POINT.x * HEADER_SCALE - ring / 2,
          top: HELP_POINT.y * HEADER_SCALE - ring / 2,
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
  const selfAt = lineStart(ID, 0);
  const helperAt = lineStart(ID, 1);
  const helpAt = lineStart(ID, 2);
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
          학생 사용 안내
        </span>
      </div>

      <Card
        x={tween(frame, [helpAt, helpAt + SHIFT_FRAMES], [LEFT_CARD_CENTER_X, LEFT_CARD.x], easeInOut)}
        w={LEFT_CARD.w}
        enterAt={selfAt}
        gap={44}
      >
        <div style={{ fontSize: 26, fontWeight: 700, color: colors.gray500, whiteSpace: "nowrap" }}>불참 신청은</div>
        <RuleRow at={selfAt + 8} text="되도록 본인이 직접" tone={colors.green600} note="내 계정에서 참여일정 표를 눌러 신청" />
        <RuleRow
          at={helperAt + 6}
          text="어쩔 수 없을 때만 도우미"
          tone={colors.amber300}
          glyph={colors.gray900}
          note="휴대폰을 쓸 수 없는 경우에만 부탁"
        />
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
        <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: helpLine(SHIFT_FRAMES + 30), whiteSpace: "nowrap" }}>
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
            {HELP_PATH}
          </span>
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
