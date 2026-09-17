// window.confirm/alert 을 트리거하는 지점(예: [grade]/page.tsx 733행 handleAbsenceAction)의 브라우저 네이티브 다이얼로그.
// 앱 CSS가 그리지 않는 OS 수준 UI라 tw 팔레트 대신 중립 회색/파랑을 쓴다 — 브랜드 표기 없이 Android/iOS 공통 인상만 낸다.
import React from "react";
import { useCurrentFrame } from "remotion";
import type { Point } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { FONT } from "../../fonts";

const PAD = 20;
const BUTTON_ROW_H = 46;
const MESSAGE_LINE_H = 20;
const EST_MESSAGE_LINES = 2; // message 글자 수는 함수 시그니처에 없어 실측 불가 — 근사치.

const dialogGeometry = (width: number, height: number) => {
  const w = Math.min(280, width - 64);
  const estH = PAD * 2 + MESSAGE_LINE_H * EST_MESSAGE_LINES + BUTTON_ROW_H;
  return { x: (width - w) / 2, y: (height - estH) / 2, w, h: estH };
};

export const nativeDialogPoint = (key: "ok" | "cancel", width: number, height: number, kind: "confirm" | "alert"): Point => {
  if (key === "cancel" && kind === "alert") {
    throw new Error("alert dialog has no cancel button");
  }
  const dialog = dialogGeometry(width, height);
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
  const enter = openAt !== undefined ? Math.min(1, Math.max(0, (frame - openAt) / 8)) : 1;
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
