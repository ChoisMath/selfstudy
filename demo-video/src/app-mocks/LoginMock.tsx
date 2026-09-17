// src/app/login/page.tsx 이식 — 폰 목업(390×752), 항상 로그인 상태(제출 전) 정지 화면 기준.
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import type { Point, Rect } from "./layout";
import { PHONE_BODY } from "./layout";
import { Caret, TypedText, pressScale, typedSlice } from "./primitives";
import { tw } from "./tw";
import { FONT } from "../fonts";

export type LoginMockProps = {
  width: number;
  height: number;
  tab: "teacher" | "student";
  tabPressAt?: number;
  fields: {
    first: { text: string; typeFrom?: number };
    second: { text: string; typeFrom?: number; masked?: boolean };
  };
  submitPressAt?: number;
  submitting?: boolean;
};

export type LoginPointKey = "tab_teacher" | "tab_student" | "field_first" | "field_second" | "submit" | "hint";

// login/page.tsx 37행: 바깥 컨테이너 px-2(8px) 패딩 + w-full max-w-sm(384px).
const PADDING_X = 8;
const contentW = (width: number) => Math.min(width - PADDING_X * 2, 384);
const contentX = (width: number) => (width - contentW(width)) / 2;

const HEADER_LOGO = 64; // w-16 h-16 (39행)
const HEADER_GAP = 12; // mb-3
const HEADER_TITLE_H = 32; // text-2xl 줄높이(40행)
const HEADER_H = HEADER_LOGO + HEADER_GAP + HEADER_TITLE_H;
const AFTER_HEADER_GAP = 32; // mb-8 (38행)

const TAB_PAD = 4; // p-1 (46행)
const TAB_BTN_H = 44; // min-h-11 (50행)
const TABS_H = TAB_PAD * 2 + TAB_BTN_H;
const AFTER_TABS_GAP = 24; // mb-6 (46행)

const LABEL_H = 20; // text-sm 줄높이
const LABEL_GAP = 4; // mb-1
const INPUT_H = 40; // py-2 + 기본 본문 줄높이
const FIELD_H = LABEL_H + LABEL_GAP + INPUT_H;
const FIELD_GAP = 16; // space-y-4 (79행)
const HINT_GAP = 4; // mt-1 (146행)
const HINT_H = 16; // text-xs 줄높이
// 학생 탭 학번 도움말(146-148행) 자리를 교사 탭에서도 항상 비워 둔다 — 탭을 바꿔도 제출 버튼이 움직이지 않도록.
const FIELD2_SLOT_H = FIELD_H + HINT_GAP + HINT_H;
const SUBMIT_H = 44; // py-2.5 버튼(106-113행)
const AFTER_FORM_GAP = 24; // mt-6 (160행)
const LINK_H = 44; // min-h-11 (163행)

const CONTENT_H =
  HEADER_H + AFTER_HEADER_GAP + TABS_H + AFTER_TABS_GAP + FIELD_H + FIELD_GAP + FIELD2_SLOT_H + FIELD_GAP + SUBMIT_H + AFTER_FORM_GAP + LINK_H;

// login/page.tsx는 min-h-dvh flex items-center justify-center로 전체를 세로 중앙 정렬한다(36행).
const CONTENT_Y = (PHONE_BODY.h - CONTENT_H) / 2;
const HEADER_Y = CONTENT_Y;
const TITLE_Y = HEADER_Y + HEADER_LOGO + HEADER_GAP;
const TABS_Y = TITLE_Y + HEADER_TITLE_H + AFTER_HEADER_GAP;
const FIELD1_Y = TABS_Y + TABS_H + AFTER_TABS_GAP;
const FIELD2_Y = FIELD1_Y + FIELD_H + FIELD_GAP;
const SUBMIT_Y = FIELD2_Y + FIELD2_SLOT_H + FIELD_GAP;
const LINK_Y = SUBMIT_Y + SUBMIT_H + AFTER_FORM_GAP;

export const loginRect = (key: LoginPointKey, width: number): Rect => {
  const cx = contentX(width);
  const cw = contentW(width);
  if (key === "tab_teacher" || key === "tab_student") {
    const innerX = cx + TAB_PAD;
    const btnW = (cw - TAB_PAD * 2) / 2;
    return { x: key === "tab_teacher" ? innerX : innerX + btnW, y: TABS_Y + TAB_PAD, w: btnW, h: TAB_BTN_H };
  }
  if (key === "field_first") {
    return { x: cx, y: FIELD1_Y + LABEL_H + LABEL_GAP, w: cw, h: INPUT_H };
  }
  if (key === "field_second") {
    return { x: cx, y: FIELD2_Y + LABEL_H + LABEL_GAP, w: cw, h: INPUT_H };
  }
  if (key === "submit") {
    return { x: cx, y: SUBMIT_Y, w: cw, h: SUBMIT_H };
  }
  // hint: 학번 입력 도움말(학생 탭 전용) — 좌표는 탭 무관하게 고정.
  return { x: cx, y: FIELD2_Y + FIELD_H + HINT_GAP, w: cw, h: HINT_H };
};

export const loginPoint = (key: LoginPointKey, width: number): Point => {
  const r = loginRect(key, width);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};

// TypedText(primitives.tsx)는 마스킹을 지원하지 않아 비밀번호 필드용으로 로컬 복제 — primitives.tsx는 수정하지 않는다.
const MaskedTypedText: React.FC<{ text: string; from?: number; placeholder: string }> = ({ text, from, placeholder }) => {
  const frame = useCurrentFrame();
  const shown = typedSlice(text, frame, from);
  const typing = from !== undefined && frame >= from && shown.length < text.length;
  const caretOn = typing && Math.floor(frame / 8) % 2 === 0;
  if (shown.length === 0 && !typing) {
    return <span style={{ color: tw.gray[400], whiteSpace: "nowrap" }}>{placeholder}</span>;
  }
  return (
    <span style={{ whiteSpace: "nowrap" }}>
      {"•".repeat(shown.length)}
      {caretOn ? <Caret /> : null}
    </span>
  );
};

const FieldGroup: React.FC<{
  x: number;
  y: number;
  w: number;
  label: string;
  placeholder: string;
  value: { text: string; typeFrom?: number; masked?: boolean };
}> = ({ x, y, w, label, placeholder, value }) => (
  <>
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: LABEL_H,
        fontSize: 14,
        fontWeight: 500,
        color: "#374151",
        display: "flex",
        alignItems: "center",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + LABEL_H + LABEL_GAP,
        width: w,
        height: INPUT_H,
        boxSizing: "border-box",
        border: `1px solid ${tw.gray[300]}`,
        borderRadius: 8,
        background: tw.white,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        fontSize: 16,
        color: "#1e293b",
      }}
    >
      {value.masked ? (
        <MaskedTypedText text={value.text} from={value.typeFrom} placeholder={placeholder} />
      ) : (
        <TypedText text={value.text} from={value.typeFrom} placeholder={placeholder} />
      )}
    </div>
  </>
);

export const LoginMock: React.FC<LoginMockProps> = ({ width, height, tab, tabPressAt, fields, submitPressAt, submitting }) => {
  const frame = useCurrentFrame();
  const cx = contentX(width);
  const cw = contentW(width);
  const isTeacher = tab === "teacher";

  const firstLabel = isTeacher ? "ID" : "이름";
  const firstPlaceholder = isTeacher ? "아이디 입력" : "이름 입력";
  const secondLabel = isTeacher ? "비밀번호" : "학번";
  const secondPlaceholder = isTeacher ? "비밀번호 입력" : "학번 5자리 (예: 20102)";

  const tabTeacherRect = loginRect("tab_teacher", width);
  const tabStudentRect = loginRect("tab_student", width);

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height, background: "#f9fafb", fontFamily: FONT, overflow: "hidden" }}>
      <Img
        src={staticFile("posan.svg")}
        alt=""
        style={{ position: "absolute", left: cx + cw / 2 - HEADER_LOGO / 2, top: HEADER_Y, width: HEADER_LOGO, height: HEADER_LOGO }}
      />
      <div
        style={{
          position: "absolute",
          left: cx,
          top: TITLE_Y,
          width: cw,
          height: HEADER_TITLE_H,
          textAlign: "center",
          fontSize: 24,
          fontWeight: 700,
          color: "#111827",
          whiteSpace: "nowrap",
        }}
      >
        포산고 자습 출석부
      </div>

      <div
        style={{
          position: "absolute",
          left: cx,
          top: TABS_Y,
          width: cw,
          height: TABS_H,
          background: "#e5e7eb",
          borderRadius: 8,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: tabTeacherRect.x - cx,
            top: TAB_PAD,
            width: tabTeacherRect.w,
            height: TAB_BTN_H,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 500,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
            background: isTeacher ? tw.white : "transparent",
            color: isTeacher ? "#111827" : "#6b7280",
            boxShadow: isTeacher ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            scale: String(isTeacher ? pressScale(frame, tabPressAt) : 1),
          }}
        >
          교사 로그인
        </div>
        <div
          style={{
            position: "absolute",
            left: tabStudentRect.x - cx,
            top: TAB_PAD,
            width: tabStudentRect.w,
            height: TAB_BTN_H,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 500,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
            background: !isTeacher ? tw.white : "transparent",
            color: !isTeacher ? "#111827" : "#6b7280",
            boxShadow: !isTeacher ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            scale: String(!isTeacher ? pressScale(frame, tabPressAt) : 1),
          }}
        >
          학생 로그인
        </div>
      </div>

      <FieldGroup x={cx} y={FIELD1_Y} w={cw} label={firstLabel} placeholder={firstPlaceholder} value={fields.first} />
      <FieldGroup x={cx} y={FIELD2_Y} w={cw} label={secondLabel} placeholder={secondPlaceholder} value={fields.second} />

      {!isTeacher ? (
        <div
          style={{
            position: "absolute",
            left: cx,
            top: FIELD2_Y + FIELD_H + HINT_GAP,
            width: cw,
            height: HINT_H,
            fontSize: 12,
            color: "#6b7280",
            whiteSpace: "nowrap",
          }}
        >
          학년(1자리) + 반(2자리) + 번호(2자리) 예: 2학년 1반 2번 → 20102
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: cx,
          top: SUBMIT_Y,
          width: cw,
          height: SUBMIT_H,
          borderRadius: 8,
          background: tw.blue[600],
          color: tw.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 500,
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          opacity: submitting ? 0.5 : 1,
          scale: String(pressScale(frame, submitPressAt)),
        }}
      >
        {submitting ? "로그인 중..." : "로그인"}
      </div>

      <div
        style={{
          position: "absolute",
          left: cx,
          top: LINK_Y,
          width: cw,
          height: LINK_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#6b7280",
          whiteSpace: "nowrap",
        }}
      >
        사용 안내 보기 →
      </div>
    </div>
  );
};
