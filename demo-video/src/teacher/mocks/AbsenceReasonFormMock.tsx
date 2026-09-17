// src/app/homeroom/absence-reasons/page.tsx 이식 — 헤더 셸 없이 본문만 그린다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { FONT } from "../../fonts";
import type { Point } from "../../app-mocks/layout";
import { pressScale, TypedText } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import {
  ABSENCE_REASON_EXAMPLE,
  ABSENCE_REASON_META,
  STUDENTS,
  studentLabel,
  type AbsenceReasonType,
  type AbsenceSession,
} from "../../app-mocks/data";

const PAD_X = 16; // lg:px-4 (homeroom/layout.tsx main)
const PAD_TOP = 24; // py-6 (homeroom/layout.tsx main) — HomeroomShellMock은 헤더만 그리므로 본문 패딩은 여기서 직접 재현한다
const TITLE_H = 28; // text-2xl 줄높이(84행)
const TITLE_MB = 20; // mb-6 근사치(압축)

const CARD_W = 512; // max-w-lg (86행)
const CARD_PAD = 20; // p-6 근사치(압축)
const GAP = 12; // space-y-5 근사치(압축)

const LABEL_H = 16;
const LABEL_MB = 4;
const SELECT_H = 30;
const DATE_H = 30;
const SESSION_H = 34; // min-h-11 근사치(압축, 129-150행)
const REASON_H = 26; // 158-180행
const TEXTAREA_H = 44; // rows=3 근사치(압축, 187-193행)
const MESSAGE_H = 26; // 197-207행
const BUTTON_H = 32; // 210-216행

const SESSION_ORDER: { key: AbsenceSession; label: string; w: number }[] = [
  { key: "afternoon1", label: "오후1 자습", w: 100 },
  { key: "afternoon2", label: "오후2 자습", w: 100 },
  { key: "night", label: "야간자습", w: 84 },
];
const SESSION_GAP = 10;

const REASON_ORDER: { key: AbsenceReasonType; w: number }[] = [
  { key: "academy", w: 56 },
  { key: "afterschool", w: 72 },
  { key: "illness", w: 56 },
  { key: "custom", w: 56 },
];
const REASON_GAP = 8;

const classTwoStudents = STUDENTS.filter((s) => s.classNumber === 2);

const cardWidth = (width: number) => Math.min(CARD_W, width - PAD_X * 2);

const layout = () => {
  const cardY = PAD_TOP + TITLE_H + TITLE_MB;
  let y = cardY + CARD_PAD;
  const studentLabelY = y;
  const studentY = y + LABEL_H + LABEL_MB;
  y = studentY + SELECT_H + GAP;
  const dateLabelY = y;
  const dateY = y + LABEL_H + LABEL_MB;
  y = dateY + DATE_H + GAP;
  const sessionLabelY = y;
  const sessionY = y + LABEL_H + LABEL_MB;
  y = sessionY + SESSION_H + GAP;
  const reasonLabelY = y;
  const reasonY = y + LABEL_H + LABEL_MB;
  y = reasonY + REASON_H + GAP;
  const detailLabelY = y;
  const detailY = y + LABEL_H + LABEL_MB;
  y = detailY + TEXTAREA_H + GAP;
  const messageY = y;
  y = messageY + MESSAGE_H + GAP;
  const buttonY = y;
  const cardH = buttonY + BUTTON_H + CARD_PAD - cardY;
  return {
    cardY,
    cardH,
    studentLabelY,
    studentY,
    dateLabelY,
    dateY,
    sessionLabelY,
    sessionY,
    reasonLabelY,
    reasonY,
    detailLabelY,
    detailY,
    messageY,
    buttonY,
  };
};

const sessionX = (index: number) => {
  let x = PAD_X + CARD_PAD;
  for (let i = 0; i < index; i += 1) x += SESSION_ORDER[i].w + SESSION_GAP;
  return x;
};
const reasonX = (index: number) => {
  let x = PAD_X + CARD_PAD;
  for (let i = 0; i < index; i += 1) x += REASON_ORDER[i].w + REASON_GAP;
  return x;
};

export const absenceReasonPoint = (
  key:
    | "student"
    | "date"
    | "session_afternoon1"
    | "session_afternoon2"
    | "session_night"
    | "reason_academy"
    | "reason_afterschool"
    | "reason_illness"
    | "reason_custom"
    | "detail"
    | "submit"
    | "success",
  width: number,
): Point => {
  const L = layout();
  const fieldW = cardWidth(width) - CARD_PAD * 2;
  const cx = PAD_X + CARD_PAD + fieldW / 2;
  if (key === "student") return { x: cx, y: L.studentY + SELECT_H / 2 };
  if (key === "date") return { x: cx, y: L.dateY + DATE_H / 2 };
  if (key.startsWith("session_")) {
    const i = SESSION_ORDER.findIndex((o) => `session_${o.key}` === key);
    return { x: sessionX(i) + SESSION_ORDER[i].w / 2, y: L.sessionY + SESSION_H / 2 };
  }
  if (key.startsWith("reason_")) {
    const i = REASON_ORDER.findIndex((o) => `reason_${o.key}` === key);
    return { x: reasonX(i) + REASON_ORDER[i].w / 2, y: L.reasonY + REASON_H / 2 };
  }
  if (key === "detail") return { x: cx, y: L.detailY + TEXTAREA_H / 2 };
  if (key === "submit") return { x: cx, y: L.buttonY + BUTTON_H / 2 };
  return { x: cx, y: L.messageY + MESSAGE_H / 2 };
};

export const AbsenceReasonFormMock: React.FC<{
  width: number;
  step: {
    student?: number;
    date?: number;
    session?: number;
    reason?: number;
    detailTypeFrom?: number;
    submitPressAt?: number;
    successFrom?: number;
  };
  selectOpen?: { from: number; to: number };
}> = ({ width, step, selectOpen }) => {
  const frame = useCurrentFrame();
  const L = layout();
  const cw = cardWidth(width);
  const fieldW = cw - CARD_PAD * 2;

  const studentPicked = step.student !== undefined && frame >= step.student;
  const successOpacity =
    step.successFrom !== undefined ? tween(frame, [step.successFrom, step.successFrom + 8], [0, 1]) : 0;
  const dropdownShown = selectOpen !== undefined && frame >= selectOpen.from && frame < selectOpen.to;

  const fieldBox = (top: number, h: number): React.CSSProperties => ({
    position: "absolute",
    left: PAD_X + CARD_PAD,
    top,
    width: fieldW,
    height: h,
    borderRadius: 6,
    border: `1px solid ${tw.gray[300]}`,
    background: tw.white,
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    boxSizing: "border-box",
    fontSize: 12,
    color: tw.gray[900],
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
        불참사유 등록
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

      <div style={labelBox(L.studentLabelY)}>학생</div>
      <div style={fieldBox(L.studentY, SELECT_H)}>
        {studentPicked ? (
          <span>{ABSENCE_REASON_EXAMPLE.student}</span>
        ) : (
          <span style={{ color: tw.gray[400] }}>학생을 선택하세요</span>
        )}
      </div>
      {dropdownShown ? (
        <div
          style={{
            position: "absolute",
            left: PAD_X + CARD_PAD,
            top: L.studentY + SELECT_H,
            width: fieldW,
            background: tw.white,
            border: `1px solid ${tw.gray[300]}`,
            borderRadius: 6,
            boxShadow: "0 4px 10px rgba(0,0,0,0.14)",
            zIndex: 30,
            boxSizing: "border-box",
          }}
        >
          {classTwoStudents.map((s) => (
            <div
              key={s.id}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                whiteSpace: "nowrap",
                background: s.id === 205 ? tw.blue[50] : tw.white,
                color: s.id === 205 ? tw.blue[700] : tw.gray[700],
              }}
            >
              {studentLabel(s.id)}
            </div>
          ))}
        </div>
      ) : null}

      <div style={labelBox(L.dateLabelY)}>날짜</div>
      <div style={{ ...fieldBox(L.dateY, DATE_H), scale: String(pressScale(frame, step.date)) }}>
        <span>{ABSENCE_REASON_EXAMPLE.date}</span>
      </div>

      <div style={labelBox(L.sessionLabelY)}>자습 시간</div>
      {SESSION_ORDER.map((opt, i) => {
        const selected = opt.key === ABSENCE_REASON_EXAMPLE.session;
        const bounceAt = selected ? step.session : undefined;
        return (
          <div
            key={opt.key}
            style={{
              position: "absolute",
              left: sessionX(i),
              top: L.sessionY,
              width: opt.w,
              height: SESSION_H,
              borderRadius: 6,
              border: `1px solid ${selected ? tw.blue[500] : tw.gray[300]}`,
              background: selected ? tw.blue[50] : tw.white,
              color: selected ? tw.blue[700] : tw.gray[600],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: "nowrap",
              boxSizing: "border-box",
              scale: String(pressScale(frame, bounceAt)),
            }}
          >
            {opt.label}
          </div>
        );
      })}

      <div style={labelBox(L.reasonLabelY)}>사유 유형</div>
      {REASON_ORDER.map((opt, i) => {
        const selected = opt.key === ABSENCE_REASON_EXAMPLE.reason;
        const bounceAt = selected ? step.reason : undefined;
        return (
          <div
            key={opt.key}
            style={{
              position: "absolute",
              left: reasonX(i),
              top: L.reasonY,
              width: opt.w,
              height: REASON_H,
              borderRadius: 6,
              border: `1px solid ${selected ? tw.blue[500] : tw.gray[300]}`,
              background: selected ? tw.blue[50] : tw.white,
              color: selected ? tw.blue[700] : tw.gray[600],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              whiteSpace: "nowrap",
              boxSizing: "border-box",
              scale: String(pressScale(frame, bounceAt)),
            }}
          >
            {ABSENCE_REASON_META[opt.key].label}
          </div>
        );
      })}

      <div style={labelBox(L.detailLabelY)}>상세 사유 (선택)</div>
      <div style={{ ...fieldBox(L.detailY, TEXTAREA_H), alignItems: "flex-start", paddingTop: 6 }}>
        <TypedText
          text={ABSENCE_REASON_EXAMPLE.detail}
          from={step.detailTypeFrom}
          placeholder="필요 시 상세 사유를 입력하세요"
        />
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
        불참사유가 등록되었습니다.
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
          scale: String(pressScale(frame, step.submitPressAt)),
        }}
      >
        불참사유 등록
      </div>
    </div>
  );
};
