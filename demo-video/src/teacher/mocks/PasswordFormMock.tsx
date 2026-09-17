// src/app/homeroom/password/page.tsx 이식 — 헤더 셸 없이 본문만 그린다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { FONT } from "../../fonts";
import type { Point } from "../../app-mocks/layout";
import { Caret, pressScale, typedSlice } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";

// 실제 비밀번호 값은 앱에 없다 — 시연용 가상 값(교사 테스트 계정 규칙 pass1234와 동일한 형식).
const CURRENT_PASSWORD = "pass1234";
const NEW_PASSWORD = "hope2026";
const CONFIRM_PASSWORD = NEW_PASSWORD;

const PAD_X = 16; // lg:px-4 (homeroom/layout.tsx main)
const PAD_TOP = 24; // py-6 (homeroom/layout.tsx main) — HomeroomShellMock은 헤더만 그리므로 본문 패딩은 여기서 직접 재현한다
const TITLE_H = 28; // text-2xl 줄높이(69행)
const TITLE_MB = 20; // mb-6 근사치(압축)

const CARD_W = 448; // max-w-md (71행)
const CARD_PAD = 24; // p-6 (71행)
const GAP = 18; // space-y-5 근사치(압축)

const LABEL_H = 16;
const LABEL_MB = 4;
const INPUT_H = 34;
const MESSAGE_H = 28; // 114-124행
const BUTTON_H = 34; // 126-132행

const cardWidth = (width: number) => Math.min(CARD_W, width - PAD_X * 2);

const layout = () => {
  const cardY = PAD_TOP + TITLE_H + TITLE_MB;
  let y = cardY + CARD_PAD;
  const currentLabelY = y;
  const currentY = y + LABEL_H + LABEL_MB;
  y = currentY + INPUT_H + GAP;
  const nextLabelY = y;
  const nextY = y + LABEL_H + LABEL_MB;
  y = nextY + INPUT_H + GAP;
  const confirmLabelY = y;
  const confirmY = y + LABEL_H + LABEL_MB;
  y = confirmY + INPUT_H + GAP;
  const messageY = y;
  y = messageY + MESSAGE_H + GAP;
  const buttonY = y;
  const cardH = buttonY + BUTTON_H + CARD_PAD - cardY;
  return { cardY, cardH, currentLabelY, currentY, nextLabelY, nextY, confirmLabelY, confirmY, messageY, buttonY };
};

// 카드가 화면 왼쪽에 고정된 offset(PAD_X)로 붙어 있어 width는 카드가 줄어드는 경우에만
// x축에 영향을 준다(컴포넌트의 cardWidth(width)와 동일 계산) — 그래도 시그니처는 다른
// point 함수들과 맞춰 width를 받는다.
export const passwordPoint = (key: "current" | "next" | "confirm" | "submit" | "success", width: number): Point => {
  const L = layout();
  const fieldW = cardWidth(width) - CARD_PAD * 2;
  const cx = PAD_X + CARD_PAD + fieldW / 2;
  if (key === "current") return { x: cx, y: L.currentY + INPUT_H / 2 };
  if (key === "next") return { x: cx, y: L.nextY + INPUT_H / 2 };
  if (key === "confirm") return { x: cx, y: L.confirmY + INPUT_H / 2 };
  if (key === "submit") return { x: cx, y: L.buttonY + BUTTON_H / 2 };
  return { x: cx, y: L.messageY + MESSAGE_H / 2 };
};

// TypedText(primitives.tsx)는 마스킹을 지원하지 않아 비밀번호 필드용으로 로컬 복제 — primitives.tsx는 수정하지 않는다.
const MaskedField: React.FC<{ text: string; from?: number }> = ({ text, from }) => {
  const frame = useCurrentFrame();
  const shown = typedSlice(text, frame, from);
  const typing = from !== undefined && frame >= from && shown.length < text.length;
  const caretOn = typing && Math.floor(frame / 8) % 2 === 0;
  if (shown.length === 0) {
    return caretOn ? <Caret /> : null;
  }
  return (
    <span style={{ whiteSpace: "nowrap", letterSpacing: 3, fontSize: 15, color: tw.gray[900] }}>
      {"•".repeat(shown.length)}
      {caretOn ? <Caret /> : null}
    </span>
  );
};

export const PasswordFormMock: React.FC<{
  width: number;
  current: { typeFrom?: number };
  next: { typeFrom?: number };
  confirm: { typeFrom?: number };
  submitPressAt?: number;
  successFrom?: number;
}> = ({ width, current, next, confirm, submitPressAt, successFrom }) => {
  const frame = useCurrentFrame();
  const L = layout();
  const cw = cardWidth(width);
  const fieldW = cw - CARD_PAD * 2;
  const successOpacity = successFrom !== undefined ? tween(frame, [successFrom, successFrom + 8], [0, 1]) : 0;

  const fieldBox = (top: number): React.CSSProperties => ({
    position: "absolute",
    left: PAD_X + CARD_PAD,
    top,
    width: fieldW,
    height: INPUT_H,
    borderRadius: 6,
    border: `1px solid ${tw.gray[300]}`,
    background: tw.white,
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    boxSizing: "border-box",
    whiteSpace: "nowrap",
    overflow: "hidden",
  });

  const labelBox = (top: number): React.CSSProperties => ({
    position: "absolute",
    left: PAD_X + CARD_PAD,
    top,
    fontSize: 11,
    fontWeight: 500,
    color: tw.gray[700],
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ position: "absolute", inset: 0, background: tw.gray[50], fontFamily: FONT, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: PAD_TOP,
          fontSize: 22,
          fontWeight: 700,
          color: tw.gray[900],
          whiteSpace: "nowrap",
        }}
      >
        비밀번호 변경
      </div>

      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: L.cardY,
          width: cw,
          height: L.cardH,
          background: tw.white,
          border: `1px solid ${tw.gray[200]}`,
          borderRadius: 8,
          boxSizing: "border-box",
        }}
      />

      <div style={labelBox(L.currentLabelY)}>현재 비밀번호</div>
      <div style={fieldBox(L.currentY)}>
        <MaskedField text={CURRENT_PASSWORD} from={current.typeFrom} />
      </div>

      <div style={labelBox(L.nextLabelY)}>새 비밀번호</div>
      <div style={fieldBox(L.nextY)}>
        <MaskedField text={NEW_PASSWORD} from={next.typeFrom} />
      </div>

      <div style={labelBox(L.confirmLabelY)}>새 비밀번호 확인</div>
      <div style={fieldBox(L.confirmY)}>
        <MaskedField text={CONFIRM_PASSWORD} from={confirm.typeFrom} />
      </div>

      <div
        style={{
          position: "absolute",
          left: PAD_X + CARD_PAD,
          top: L.messageY,
          width: fieldW,
          height: MESSAGE_H,
          borderRadius: 6,
          background: tw.green[50],
          color: tw.green[700],
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          boxSizing: "border-box",
          whiteSpace: "nowrap",
          opacity: successOpacity,
        }}
      >
        비밀번호가 변경되었습니다.
      </div>

      <div
        style={{
          position: "absolute",
          left: PAD_X + CARD_PAD,
          top: L.buttonY,
          width: fieldW,
          height: BUTTON_H,
          borderRadius: 6,
          background: tw.blue[600],
          color: tw.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          scale: String(pressScale(frame, submitPressAt)),
        }}
      >
        비밀번호 변경
      </div>
    </div>
  );
};
