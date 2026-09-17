// src/components/student/AbsenceRequestForm.tsx 이식. 학생 참여일정 페이지가 이 폼으로 "교체"된다(모달 아님) —
// 헤더 없이 폰 본문 폭(390) 기준, 페이지 자체의 여백(main px-2 py-6, student/layout.tsx:83)을 이 목업이 직접 그린다.
// 성공 배너(src/app/student/page.tsx:67-77)는 같은 페이지(참여일정)로 돌아온 뒤 표시되는 별개 요소라 SuccessBannerMock으로 분리.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import type { Rect } from "../../app-mocks/layout";
import { pressScale, TypedText } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { ABSENCE_REASON_META, type AbsenceReasonType, type Session } from "../../app-mocks/data";
import { sessionLabels } from "../data";
import { FONT } from "../../fonts";

const PAD_X = 8; // main px-2 (student/layout.tsx:83, 모바일 폭이라 sm:/lg: 는 적용 안 됨)
const PAD_TOP = 24; // main py-6
const FORM_PAD = 16; // form p-4 (AbsenceRequestForm.tsx:92)
const GAP_Y = 16; // space-y-4

const HEADER_H = 44; // 닫기 버튼 min-h-11 이 행 높이를 결정 (94-102행)
const CLOSE_BTN_H = 44;

const LABEL_H = 16; // text-sm font-medium (근사치)
const LABEL_MB = 4; // mb-1
const FIELD_H = 44; // min-h-11 (날짜 input, 세션·사유 버튼 공통)
const HELPER_H = 14; // mt-1 text-xs (153-155행)
const HELPER_MB = 4;
const TEXTAREA_H = 48; // rows=2 근사치(179-185행, rows=3 인 교사 폼 44의 비례값)
const SUBMIT_H = 44; // min-h-11 (189-195행)

const SESSION_GAP = 8; // gap-2 (120행)
const ALL_BTN_W = 52; // "전체" 버튼(146-151행) 근사 폭 — flex-1 이 아닌 고정폭 커서용 근사치
const SESSION_ORDER: Session[] = ["afternoon1", "afternoon2", "night"]; // src/lib/sessions.ts:1

const REASON_GAP = 8; // gap-2 (grid-cols-4, 160행)
const REASON_ORDER: AbsenceReasonType[] = ["academy", "afterschool", "illness", "custom"]; // src/lib/absence-reasons.ts:1

const DETAIL_PLACEHOLDER = "상세 사유를 입력해주세요"; // 182행

const fieldW = (width: number) => width - PAD_X * 2 - FORM_PAD * 2;

const sessionBtnW = (width: number) => {
  const fw = fieldW(width);
  return (fw - SESSION_GAP * SESSION_ORDER.length - ALL_BTN_W) / SESSION_ORDER.length;
};

const sessionBtnX = (width: number, index: number) => {
  const bw = sessionBtnW(width);
  return PAD_X + FORM_PAD + index * (bw + SESSION_GAP);
};

const reasonBtnW = (width: number) => {
  const fw = fieldW(width);
  return (fw - REASON_GAP * (REASON_ORDER.length - 1)) / REASON_ORDER.length;
};

const reasonBtnX = (width: number, index: number) => {
  const bw = reasonBtnW(width);
  return PAD_X + FORM_PAD + index * (bw + REASON_GAP);
};

// 세로 흐름 — "상세 사유" 칸은 사유가 기타일 때만 실제로 그려지므로(collapsible), 여기서는
// 항상 "칸이 없는(=사유가 기타가 아닌)" 기본 상태를 기준으로 계산한다. 사유가 기타면 컴포넌트가
// 실제로는 그 아래 모든 것을 TEXTAREA_H + GAP_Y(=64) 만큼 더 내려서 그린다 — submit 좌표를
// 기타 상태에서 쓰려면 이 값을 감안해서 보정할 것.
const layout = () => {
  const formY = PAD_TOP;
  let y = formY + FORM_PAD;
  const headerY = y;
  y += HEADER_H + GAP_Y;
  const dateLabelY = y;
  const dateY = y + LABEL_H + LABEL_MB;
  y = dateY + FIELD_H + GAP_Y;
  const sessionLabelY = y;
  const sessionY = y + LABEL_H + LABEL_MB;
  const helperY = sessionY + FIELD_H + HELPER_MB;
  y = helperY + HELPER_H + GAP_Y;
  const reasonLabelY = y;
  const reasonY = y + LABEL_H + LABEL_MB;
  y = reasonY + FIELD_H + GAP_Y;
  const detailLabelY = y; // 기타일 때만 사용
  const detailY = y + LABEL_H + LABEL_MB; // 기타일 때만 사용
  const submitY = y; // 기타가 아닐 때 제출 버튼 위치
  const submitYWithDetail = detailY + TEXTAREA_H + GAP_Y; // 기타일 때 제출 버튼 위치
  const compactH = submitY + SUBMIT_H + FORM_PAD - formY;
  const fullH = submitYWithDetail + SUBMIT_H + FORM_PAD - formY;
  return {
    formY,
    headerY,
    dateLabelY,
    dateY,
    sessionLabelY,
    sessionY,
    helperY,
    reasonLabelY,
    reasonY,
    detailLabelY,
    detailY,
    submitY,
    submitYWithDetail,
    compactH,
    fullH,
  };
};

export const absenceFormRect = (
  key: "date" | `session_${Session}` | "all" | `reason_${AbsenceReasonType}` | "detail" | "submit",
  width: number,
): Rect => {
  const L = layout();
  const fw = fieldW(width);
  const x0 = PAD_X + FORM_PAD;
  if (key === "date") return { x: x0, y: L.dateY, w: fw, h: FIELD_H };
  if (key === "all") {
    const i = SESSION_ORDER.length;
    return { x: sessionBtnX(width, i), y: L.sessionY, w: ALL_BTN_W, h: FIELD_H };
  }
  if (key.startsWith("session_")) {
    const s = key.slice(8) as Session;
    const i = SESSION_ORDER.indexOf(s);
    return { x: sessionBtnX(width, i), y: L.sessionY, w: sessionBtnW(width), h: FIELD_H };
  }
  if (key.startsWith("reason_")) {
    const r = key.slice(7) as AbsenceReasonType;
    const i = REASON_ORDER.indexOf(r);
    return { x: reasonBtnX(width, i), y: L.reasonY, w: reasonBtnW(width), h: FIELD_H };
  }
  if (key === "detail") return { x: x0, y: L.detailY, w: fw, h: TEXTAREA_H };
  return { x: x0, y: L.submitY, w: fw, h: SUBMIT_H }; // submit — 사유가 기타가 아닌 기본 상태 기준(위 layout 주석 참고)
};

const labelStyle: React.CSSProperties = {
  position: "absolute",
  fontSize: 12,
  fontWeight: 500,
  color: tw.gray[700],
  whiteSpace: "nowrap",
};

const pillBase = (selected: boolean, disabled: boolean): React.CSSProperties => ({
  position: "absolute",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 6,
  border: `1px solid ${disabled ? tw.gray[200] : selected ? tw.blue[600] : tw.gray[300]}`,
  background: disabled ? tw.gray[50] : selected ? tw.blue[50] : tw.white,
  color: disabled ? tw.gray[300] : selected ? tw.blue[700] : tw.gray[600],
  fontSize: 13,
  fontWeight: 500,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
});

export const AbsenceFormMock: React.FC<{
  width: number;
  date: string;
  sessions: Session[];
  allPressAt?: number;
  sessionPressAt?: { session: Session; at: number };
  reason: AbsenceReasonType;
  reasonPressAt?: { reason: AbsenceReasonType; at: number };
  detail?: { text: string; typeFrom: number };
  submitPressAt?: number;
  busy?: boolean;
  disabledSessions?: Session[];
}> = ({ width, date, sessions, allPressAt, sessionPressAt, reason, reasonPressAt, detail, submitPressAt, busy, disabledSessions }) => {
  const frame = useCurrentFrame();
  const L = layout();
  const fw = fieldW(width);
  const x0 = PAD_X + FORM_PAD;
  const showDetail = reason === "custom";
  const activeCount = SESSION_ORDER.length - (disabledSessions?.length ?? 0);
  const allSelected = activeCount > 0 && SESSION_ORDER.every((s) => (disabledSessions ?? []).includes(s) || sessions.includes(s));
  const formH = showDetail ? L.fullH : L.compactH;
  const submitY = showDetail ? L.submitYWithDetail : L.submitY;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height: PAD_TOP + formH, background: tw.gray[50], fontFamily: FONT, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: L.formY,
          width: width - PAD_X * 2,
          height: formH,
          background: tw.white,
          border: `1px solid ${tw.gray[200]}`,
          borderRadius: 8,
          boxSizing: "border-box",
        }}
      />

      <div style={{ position: "absolute", left: x0, top: L.headerY, fontSize: 20, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap" }}>
        불참 신청하기
      </div>
      <div
        style={{
          position: "absolute",
          right: PAD_X + FORM_PAD,
          top: L.headerY,
          height: CLOSE_BTN_H,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          borderRadius: 8,
          background: tw.gray[100],
          color: tw.gray[600],
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        닫기
      </div>

      <div style={{ ...labelStyle, left: x0, top: L.dateLabelY }}>날짜</div>
      <div
        style={{
          position: "absolute",
          left: x0,
          top: L.dateY,
          width: fw,
          height: FIELD_H,
          borderRadius: 6,
          border: `1px solid ${tw.gray[300]}`,
          background: tw.white,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          boxSizing: "border-box",
          fontSize: 13,
          color: tw.gray[900],
          whiteSpace: "nowrap",
        }}
      >
        {date}
      </div>

      <div style={{ ...labelStyle, left: x0, top: L.sessionLabelY }}>세션</div>
      {SESSION_ORDER.map((s, i) => {
        const disabled = (disabledSessions ?? []).includes(s);
        const selected = !disabled && sessions.includes(s);
        const bounceAt = sessionPressAt?.session === s ? sessionPressAt.at : undefined;
        return (
          <div
            key={s}
            style={{
              ...pillBase(selected, disabled),
              left: sessionBtnX(width, i),
              top: L.sessionY,
              width: sessionBtnW(width),
              height: FIELD_H,
              scale: String(pressScale(frame, bounceAt)),
            }}
          >
            {sessionLabels[s]}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: sessionBtnX(width, SESSION_ORDER.length),
          top: L.sessionY,
          width: ALL_BTN_W,
          height: FIELD_H,
          borderRadius: 6,
          border: `1px ${activeCount === 0 ? "solid" : allSelected ? "solid" : "dashed"} ${
            activeCount === 0 ? tw.gray[200] : allSelected ? tw.blue[600] : tw.gray[300]
          }`,
          background: activeCount === 0 ? tw.gray[50] : allSelected ? tw.blue[100] : tw.white,
          color: activeCount === 0 ? tw.gray[300] : allSelected ? tw.blue[800] : tw.gray[500],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          scale: String(pressScale(frame, allPressAt)),
        }}
      >
        전체
      </div>
      <div style={{ position: "absolute", left: x0, top: L.helperY, fontSize: 11, color: tw.gray[400], whiteSpace: "nowrap" }}>
        {activeCount === 0 ? "해당 날짜에는 참여 일정이 없습니다." : "여러 시간을 함께 선택할 수 있습니다."}
      </div>

      <div style={{ ...labelStyle, left: x0, top: L.reasonLabelY }}>사유</div>
      {REASON_ORDER.map((r, i) => {
        const selected = reason === r;
        const bounceAt = reasonPressAt?.reason === r ? reasonPressAt.at : undefined;
        return (
          <div
            key={r}
            style={{
              ...pillBase(selected, false),
              left: reasonBtnX(width, i),
              top: L.reasonY,
              width: reasonBtnW(width),
              height: FIELD_H,
              fontSize: 13,
              scale: String(pressScale(frame, bounceAt)),
            }}
          >
            {ABSENCE_REASON_META[r].label}
          </div>
        );
      })}

      {showDetail ? (
        <>
          <div style={{ ...labelStyle, left: x0, top: L.detailLabelY }}>상세 사유 (선택)</div>
          <div
            style={{
              position: "absolute",
              left: x0,
              top: L.detailY,
              width: fw,
              height: TEXTAREA_H,
              borderRadius: 6,
              border: `1px solid ${tw.gray[300]}`,
              background: tw.white,
              padding: "8px 12px",
              boxSizing: "border-box",
              fontSize: 13,
              color: tw.gray[900],
            }}
          >
            <TypedText text={detail?.text ?? ""} from={detail?.typeFrom} placeholder={DETAIL_PLACEHOLDER} />
          </div>
        </>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: x0,
          top: submitY,
          width: fw,
          height: SUBMIT_H,
          borderRadius: 8,
          background: tw.blue[600],
          color: tw.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          opacity: busy ? 0.5 : 1,
          scale: String(pressScale(frame, submitPressAt)),
        }}
      >
        {busy ? "신청 중..." : "신청하기"}
      </div>
    </div>
  );
};

// src/app/student/page.tsx:67-77 — 폼 제출 성공 후 참여일정 페이지 상단에 뜨는 배너. 페이지의 다른 요소(제목·일정
// 카드) 위치는 장면이 따로 잡으므로, 이 배너는 세로 여백 없이 내용 높이만 그린다(page px-2 만 내부에서 재현).
const BANNER_H = 44; // "불참목록 보기" 링크의 min-h-11 이 행 높이를 결정 (72행)

export const SuccessBannerMock: React.FC<{ width: number; from: number }> = ({ width, from }) => {
  const frame = useCurrentFrame();
  const opacity = tween(frame, [from, from + 8], [0, 1]);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height: BANNER_H,
        opacity,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: 0,
          width: width - PAD_X * 2,
          height: BANNER_H,
          borderRadius: 8,
          background: tw.green[50],
          color: tw.green[700],
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "0 12px",
          boxSizing: "border-box",
          fontSize: 13,
          whiteSpace: "nowrap",
        }}
      >
        <span>불참 신청이 접수되었습니다.</span>
        <span style={{ fontWeight: 500, textDecoration: "underline", whiteSpace: "nowrap" }}>불참목록 보기</span>
      </div>
    </div>
  );
};
