// src/components/students/StudentManagement.tsx 내부 StudentModal(31-156행) 이식 — 학생 추가/수정 모달.
// `fixed inset-0 flex items-center justify-center bg-black/40`(59행) 배경 위에 max-w-md(448px, 60행) 다이얼로그.
// PC 뷰포트 전체를 배경으로 받아 그 안에서 중앙 정렬한다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import type { Point, Rect } from "../../app-mocks/layout";
import { pressScale, typedSlice, TypedText } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT, MONO } from "../../fonts";

const DIALOG_W = 448; // max-w-md(60행)
const PAD = 24; // p-6(60행, PC 폭 기준이라 sm:p-6 적용)
const TITLE_H = 24; // text-lg(61행)
const TITLE_MB = 16; // mb-4(61행)
const LABEL_H = 18; // text-sm(72행 등) 근사
const LABEL_MB = 4; // mb-1
const INPUT_H = 40; // px-3 py-2(75-80행) 근사
const FIELD_GAP = 16; // space-y-4(69행)
const GRID_GAP = 12; // gap-3(82행)
const PREVIEW_H = 20; // text-sm(131-135행) 근사
const BUTTONS_PT = 8; // pt-2(136행)
const BUTTON_H = 44; // min-h-11(140,147행)
const BUTTON_GAP = 8; // gap-2(136행)
const CANCEL_W = 64; // "취소"(137-143행) 근사
const SUBMIT_W = 72; // "추가"/"수정"(144-150행) 근사

type FieldValue = { text: string; typeFrom?: number };

const fieldWidth = () => DIALOG_W - PAD * 2;
const halfFieldWidth = () => (fieldWidth() - GRID_GAP) / 2;

const layoutY = (showPreview: boolean) => {
  let y = PAD;
  const titleY = y;
  y += TITLE_H + TITLE_MB;
  const gradeLabelY = y;
  const gradeInputY = y + LABEL_H + LABEL_MB;
  y = gradeInputY + INPUT_H + FIELD_GAP;
  const rowLabelY = y;
  const rowInputY = y + LABEL_H + LABEL_MB;
  y = rowInputY + INPUT_H + FIELD_GAP;
  const nameLabelY = y;
  const nameInputY = y + LABEL_H + LABEL_MB;
  y = nameInputY + INPUT_H + FIELD_GAP;
  const previewY = showPreview ? y : undefined;
  if (showPreview) y += PREVIEW_H + FIELD_GAP;
  const buttonsY = y + BUTTONS_PT;
  const dialogH = buttonsY + BUTTON_H + PAD;
  return { titleY, gradeLabelY, gradeInputY, rowLabelY, rowInputY, nameLabelY, nameInputY, previewY, buttonsY, dialogH };
};

export const studentModalRect = (
  key: "classNumberInput" | "studentNumberInput" | "nameInput" | "cancel" | "submit",
  width: number,
  height: number,
  showPreview: boolean,
): Rect => {
  const dialogX = (width - DIALOG_W) / 2;
  const L = layoutY(showPreview);
  const dialogY = Math.max(0, (height - L.dialogH) / 2);
  const x0 = dialogX + PAD;
  if (key === "classNumberInput") return { x: x0, y: dialogY + L.rowInputY, w: halfFieldWidth(), h: INPUT_H };
  if (key === "studentNumberInput") {
    return { x: x0 + halfFieldWidth() + GRID_GAP, y: dialogY + L.rowInputY, w: halfFieldWidth(), h: INPUT_H };
  }
  if (key === "nameInput") return { x: x0, y: dialogY + L.nameInputY, w: fieldWidth(), h: INPUT_H };
  const rightEdge = dialogX + DIALOG_W - PAD;
  if (key === "submit") return { x: rightEdge - SUBMIT_W, y: dialogY + L.buttonsY, w: SUBMIT_W, h: BUTTON_H };
  return { x: rightEdge - SUBMIT_W - BUTTON_GAP - CANCEL_W, y: dialogY + L.buttonsY, w: CANCEL_W, h: BUTTON_H };
};

export const studentModalPoint = (
  key: "classNumberInput" | "studentNumberInput" | "nameInput" | "cancel" | "submit",
  width: number,
  height: number,
  showPreview: boolean,
): Point => {
  const r = studentModalRect(key, width, height, showPreview);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};

const fieldBoxStyle: React.CSSProperties = {
  position: "absolute",
  border: `1px solid ${tw.gray[300]}`,
  borderRadius: 6,
  background: tw.white,
  display: "flex",
  alignItems: "center",
  padding: "0 12px",
  boxSizing: "border-box",
  fontSize: 14,
  color: tw.gray[900],
  whiteSpace: "nowrap",
};

const labelStyle: React.CSSProperties = {
  position: "absolute",
  fontSize: 13,
  fontWeight: 500,
  color: tw.gray[700],
  whiteSpace: "nowrap",
};

export const StudentModalMock: React.FC<{
  width: number;
  height: number;
  grade: number;
  mode: "add" | "edit";
  classNumber: FieldValue;
  studentNumber: FieldValue;
  name: FieldValue;
  submitting?: boolean;
  openAt?: number;
  cancelPressAt?: number;
  submitPressAt?: number;
}> = ({ width, height, grade, mode, classNumber, studentNumber, name, submitting, openAt, cancelPressAt, submitPressAt }) => {
  const frame = useCurrentFrame();
  if (openAt !== undefined && frame < openAt) return null;
  const enter = openAt !== undefined ? tween(frame, [openAt, openAt + 10], [0, 1]) : 1;

  const classNumberShown = typedSlice(classNumber.text, frame, classNumber.typeFrom);
  const studentNumberShown = typedSlice(studentNumber.text, frame, studentNumber.typeFrom);
  const classNumberInt = parseInt(classNumberShown, 10);
  const studentNumberInt = parseInt(studentNumberShown, 10);
  const previewId =
    classNumberShown && studentNumberShown && !isNaN(classNumberInt) && !isNaN(studentNumberInt)
      ? grade * 10000 + classNumberInt * 100 + studentNumberInt
      : null;
  const showPreview = previewId !== null;

  const dialogX = (width - DIALOG_W) / 2;
  const L = layoutY(showPreview);
  const dialogY = Math.max(0, (height - L.dialogH) / 2);
  const fw = fieldWidth();
  const hw = halfFieldWidth();

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height, overflow: "hidden", fontFamily: FONT }}>
      <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${0.4 * enter})` }} />
      <div
        style={{
          position: "absolute",
          left: dialogX,
          top: dialogY,
          width: DIALOG_W,
          height: L.dialogH,
          background: tw.white,
          borderRadius: 8,
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
          opacity: enter,
          scale: String(0.95 + 0.05 * enter),
        }}
      >
        <div style={{ position: "absolute", left: PAD, top: L.titleY, fontSize: 18, fontWeight: 600, color: tw.gray[900], whiteSpace: "nowrap" }}>
          {mode === "edit" ? "학생 수정" : "학생 추가"}
        </div>

        <div style={{ ...labelStyle, left: PAD, top: L.gradeLabelY }}>학년</div>
        <div style={{ ...fieldBoxStyle, left: PAD, top: L.gradeInputY, width: fw, height: INPUT_H, background: tw.gray[100], color: tw.gray[500] }}>
          {grade}학년
        </div>

        <div style={{ ...labelStyle, left: PAD, top: L.rowLabelY }}>반</div>
        <div style={{ ...fieldBoxStyle, left: PAD, top: L.rowInputY, width: hw, height: INPUT_H }}>
          <TypedText text={classNumber.text} from={classNumber.typeFrom} placeholder="반" />
        </div>
        <div style={{ ...labelStyle, left: PAD + hw + GRID_GAP, top: L.rowLabelY }}>번호</div>
        <div style={{ ...fieldBoxStyle, left: PAD + hw + GRID_GAP, top: L.rowInputY, width: hw, height: INPUT_H }}>
          <TypedText text={studentNumber.text} from={studentNumber.typeFrom} placeholder="번호" />
        </div>

        <div style={{ ...labelStyle, left: PAD, top: L.nameLabelY }}>이름</div>
        <div style={{ ...fieldBoxStyle, left: PAD, top: L.nameInputY, width: fw, height: INPUT_H }}>
          <TypedText text={name.text} from={name.typeFrom} placeholder="이름을 입력하세요" />
        </div>

        {showPreview && L.previewY !== undefined ? (
          <div style={{ position: "absolute", left: PAD, top: L.previewY, fontSize: 13, color: tw.gray[500], whiteSpace: "nowrap" }}>
            학번 (자동): <span style={{ fontFamily: MONO, fontWeight: 700 }}>{previewId}</span>
          </div>
        ) : null}

        <div
          style={{
            position: "absolute",
            left: DIALOG_W - PAD - SUBMIT_W - BUTTON_GAP - CANCEL_W,
            top: L.buttonsY,
            width: CANCEL_W,
            height: BUTTON_H,
            borderRadius: 6,
            background: tw.gray[100],
            color: tw.gray[700],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            whiteSpace: "nowrap",
            scale: String(pressScale(frame, cancelPressAt)),
          }}
        >
          취소
        </div>
        <div
          style={{
            position: "absolute",
            left: DIALOG_W - PAD - SUBMIT_W,
            top: L.buttonsY,
            width: SUBMIT_W,
            height: BUTTON_H,
            borderRadius: 6,
            background: tw.blue[600],
            color: tw.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            whiteSpace: "nowrap",
            opacity: submitting ? 0.5 : 1,
            scale: String(pressScale(frame, submitPressAt)),
          }}
        >
          {submitting ? "처리 중..." : mode === "edit" ? "수정" : "추가"}
        </div>
      </div>
    </div>
  );
};
