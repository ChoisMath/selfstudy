// window.confirm/alert 을 트리거하는 지점(예: [grade]/page.tsx 733행 handleAbsenceAction)의 브라우저 네이티브 다이얼로그.
// 앱 CSS가 그리지 않는 OS 수준 UI라 tw 팔레트 대신 중립 회색/파랑을 쓴다 — 브랜드 표기 없이 Android/iOS 공통 인상만 낸다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import type { Point } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { FONT } from "../../fonts";

const PAD = 20;
const MESSAGE_PAD_BOTTOM = 18; // 메시지 div padding: `${PAD}px ${PAD}px 18px` (3-value: top/좌우/bottom)
const BUTTON_ROW_H = 46;
const MESSAGE_LINE_H = 20;
const MESSAGE_FONT_SIZE = 14;
const EST_MESSAGE_LINES = 2; // message 를 안 넘기면(레거시 호출부) 기존처럼 2줄로 가정.

// 한글 음절(완성형)·자모는 대략 정사각형(1em), 그 외(영문·숫자·기호)는 좁게, 공백은 더 좁게 — word-break:keep-all
// 이라 공백 단위로만 줄바꿈되므로 실제 폰트 실측 없이도 줄 수를 근사할 수 있다.
const charWidth = (ch: string, fontSize: number) => {
  if (ch === " ") return fontSize * 0.28;
  const code = ch.codePointAt(0) ?? 0;
  const isHangul = (code >= 0xac00 && code <= 0xd7a3) || (code >= 0x3131 && code <= 0x318e);
  return isHangul ? fontSize : fontSize * 0.58;
};

// 컴포넌트의 메시지 div(word-break:keep-all, textAlign:center)와 같은 규칙으로 줄바꿈을 흉내 낸다.
const estimateMessageLines = (message: string, maxWidth: number): number => {
  const words = message.split(" ");
  let lines = 1;
  let lineWidth = 0;
  words.forEach((word, i) => {
    const wordWidth = Array.from(word).reduce((sum, ch) => sum + charWidth(ch, MESSAGE_FONT_SIZE), 0);
    const withGap = (i === 0 ? 0 : charWidth(" ", MESSAGE_FONT_SIZE)) + wordWidth;
    if (lineWidth > 0 && lineWidth + withGap > maxWidth) {
      lines += 1;
      lineWidth = wordWidth;
    } else {
      lineWidth += withGap;
    }
  });
  return Math.max(1, lines);
};

const dialogGeometry = (width: number, height: number, message?: string) => {
  const w = Math.min(280, width - 64);
  const lines = message === undefined ? EST_MESSAGE_LINES : estimateMessageLines(message, w - PAD * 2);
  const estH = PAD + MESSAGE_LINE_H * lines + MESSAGE_PAD_BOTTOM + BUTTON_ROW_H;
  return { x: (width - w) / 2, y: (height - estH) / 2, w, h: estH };
};

export const nativeDialogPoint = (
  key: "ok" | "cancel",
  width: number,
  height: number,
  kind: "confirm" | "alert",
  message?: string,
): Point => {
  if (key === "cancel" && kind === "alert") {
    throw new Error("alert dialog has no cancel button");
  }
  const dialog = dialogGeometry(width, height, message);
  const buttonY = dialog.y + dialog.h - BUTTON_ROW_H / 2;
  if (kind === "alert") {
    return { x: dialog.x + dialog.w / 2, y: buttonY };
  }
  const half = dialog.w / 2;
  return { x: dialog.x + (key === "cancel" ? half / 2 : half + half / 2), y: buttonY };
};

export const NativeDialogMock: React.FC<{
  width: number;
  height: number;
  kind: "confirm" | "alert";
  message: string;
  openAt?: number;
  okPressAt?: number;
}> = ({ width, height, kind, message, openAt, okPressAt }) => {
  const frame = useCurrentFrame();
  if (openAt !== undefined && frame < openAt) {
    return null;
  }
  const enter = openAt !== undefined ? tween(frame, [openAt, openAt + 8], [0, 1]) : 1;
  const w = Math.min(280, width - 64);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `rgba(0,0,0,${0.6 * enter})`,
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: w,
          background: "#fff",
          borderRadius: 14,
          boxSizing: "border-box",
          boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
          opacity: enter,
          scale: String(0.92 + 0.08 * enter),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: `${PAD}px ${PAD}px 18px`,
            fontSize: 14,
            lineHeight: `${MESSAGE_LINE_H}px`,
            color: "#202124",
            textAlign: "center",
            whiteSpace: "normal",
            wordBreak: "keep-all",
          }}
        >
          {message}
        </div>
        <div style={{ display: "flex", borderTop: "1px solid #e5e7eb", height: BUTTON_ROW_H }}>
          {kind === "confirm" ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRight: "1px solid #e5e7eb",
                fontSize: 14,
                fontWeight: 500,
                color: "#5f6368",
                whiteSpace: "nowrap",
              }}
            >
              취소
            </div>
          ) : null}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "#1a73e8",
              whiteSpace: "nowrap",
              scale: String(pressScale(frame, okPressAt)),
            }}
          >
            확인
          </div>
        </div>
      </div>
    </div>
  );
};
