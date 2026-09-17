import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { backOut, easeInOut, pulse, tween } from "../../anim";
import { CheckIcon } from "../../components/icons";
import { GuideScene } from "../../guide/GuideScene";
import { FONT, MONO } from "../../fonts";
import { APP_HOST, ME } from "../../app-mocks/data";
import { PC_VIEWPORT } from "../../app-mocks/layout";
import {
  ATTENDANCE_HEADER_H,
  AttendanceHeaderMock,
  attendanceHeaderRect,
  type AttendanceHeaderProps,
} from "../../app-mocks/AttendanceHeaderMock";
import { colors } from "../../theme";
import { lineStart } from "../timing";
import type { DemoProps } from "../../props";

const ID = "Outro";

// 인트로 목차와 같은 다섯 장.
const CHAPTERS = ["로그인", "출석 체크", "불참신청 승인", "감독 교체", "담임교사 메뉴"];

const HEADER: AttendanceHeaderProps = { width: PC_VIEWPORT.w, role: "homeroom", name: ME.name, showHelp: true };
const HEADER_SCALE = 1.9;
const CROP_PAD_X = 14;
const chipRect = attendanceHeaderRect("homeroom", HEADER);
const helpRect = attendanceHeaderRect("help", HEADER);
const logoutRect = attendanceHeaderRect("logout", HEADER);
const CROP = { x: chipRect.x - CROP_PAD_X, w: logoutRect.x + logoutRect.w + CROP_PAD_X - (chipRect.x - CROP_PAD_X) };
// ? 버튼의 보이는 원 지름(GuideHelpButton: 28px, 히트 영역 44px 가운데).
const HELP_DOT = 28;

const CARD_TOP = 300;
const LEFT_CARD = { x: 180, w: 620 };
const RIGHT_CARD = { x: 860, w: 880 };
// 첫 문장 동안 요약 카드는 가운데에 있다가, 도움말 카드가 들어올 때 왼쪽으로 비켜난다.
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

const DoneRow: React.FC<{ at: number; text: string }> = ({ at, text }) => {
  const frame = useCurrentFrame();
  const enter = tween(frame, [at, at + 12], [0, 1]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: enter, translate: `${(1 - enter) * -20}px 0px` }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          background: colors.green600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          scale: String(tween(frame, [at, at + 16], [0.4, 1], backOut)),
        }}
      >
        <CheckIcon size={22} />
      </div>
      <span style={{ fontSize: 34, fontWeight: 700, color: colors.gray800, whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
};

const Card: React.FC<{ x: number; w: number; enterAt: number; gap: number; children: React.ReactNode }> = ({ x, w, enterAt, gap, children }) => {
  const frame = useCurrentFrame();
  const enter = tween(frame, [enterAt, enterAt + 14], [0, 1]);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: CARD_TOP,
        width: w,
        height: 560,
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

const HeaderZoom: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const ringIn = tween(frame, [at, at + 12], [0, 1]);
  const helpCenterX = (helpRect.x + helpRect.w / 2 - CROP.x) * HEADER_SCALE;
  const helpCenterY = (helpRect.y + helpRect.h / 2) * HEADER_SCALE;
  const ring = HELP_DOT * HEADER_SCALE + 18;
  return (
    <div
      style={{
        position: "relative",
        width: CROP.w * HEADER_SCALE,
        height: ATTENDANCE_HEADER_H * HEADER_SCALE,
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
          height: ATTENDANCE_HEADER_H,
          transform: `scale(${HEADER_SCALE}) translateX(${-CROP.x}px)`,
          transformOrigin: "top left",
        }}
      >
        <AttendanceHeaderMock {...HEADER} />
      </div>
      <div
        style={{
          position: "absolute",
          left: helpCenterX - ring / 2,
          top: helpCenterY - ring / 2,
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
  const summaryAt = lineStart(ID, 0);
  const helpAt = lineStart(ID, 1);
  const titleEnter = tween(frame, [0, 14], [0, 1]);
  const lineEnter = (delay: number) => tween(frame, [helpAt + delay, helpAt + delay + 12], [0, 1]);
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
          교사 사용 안내
        </span>
      </div>

      <Card
        x={tween(frame, [helpAt, helpAt + SHIFT_FRAMES], [LEFT_CARD_CENTER_X, LEFT_CARD.x], easeInOut)}
        w={LEFT_CARD.w}
        enterAt={summaryAt}
        gap={34}
      >
        <div style={{ fontSize: 26, fontWeight: 700, color: colors.gray500, whiteSpace: "nowrap" }}>지금까지 살펴본 기능</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {CHAPTERS.map((text, i) => (
            <DoneRow key={text} at={summaryAt + 8 + i * 8} text={text} />
          ))}
        </div>
      </Card>

      <Card x={RIGHT_CARD.x} w={RIGHT_CARD.w} enterAt={helpAt + SHIFT_FRAMES - 4} gap={40}>
        <div style={{ fontSize: 26, fontWeight: 700, color: colors.gray500, whiteSpace: "nowrap" }}>궁금한 점이 생기면</div>
        <div style={{ opacity: lineEnter(SHIFT_FRAMES + 2) }}>
          <HeaderZoom at={helpAt + SHIFT_FRAMES + 12} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: lineEnter(SHIFT_FRAMES + 16), whiteSpace: "nowrap" }}>
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
            }}
          >
            ?
          </span>
          <span style={{ fontSize: 32, fontWeight: 700, color: colors.gray800 }}>출석부 위쪽 물음표 버튼</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, opacity: lineEnter(SHIFT_FRAMES + 30) }}>
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
          <div style={{ fontSize: 24, color: colors.gray500, whiteSpace: "nowrap" }}>화면별 사용 안내와 이 영상을 다시 볼 수 있습니다</div>
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
