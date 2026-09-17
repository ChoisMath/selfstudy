// src/app/student/batch-absence/page.tsx 이식 — 앱 상단바·탭(셸)은 다른 목업이 그리므로
// 본문(제목+오늘 날짜, 학생 표, 일괄신청 버튼)만 그린다.
//
// 실제 페이지는 학생마다 독립된 사유·상세사유 입력을 갖지만(RowState.reasonType/detail),
// 이 목업의 props는 `reason`/`detail`을 화면 전체에 하나만 받는다(브리프의 인터페이스 그대로) —
// 데모 내레이션이 "한 사유를 골라 여러 학생에게 한 번에 적용"하는 흐름만 보여주면 되므로,
// 사유 열(칸)은 원본과 똑같이 학생마다 그리되 값은 모든 행이 같은 값을 반영하도록 단순화했다.
//
// 표가 폰 높이(752)보다 길어서(12행 × 세션버튼 44px) `scrollY`로 세로 스크롤을 지원한다.
// 원본 thead는 `sticky top-0`(217행)이므로, 스크롤 레이어 안에는 thead 자리만 비워두고
// thead 자체는 레이어 밖에서 `theadYFor(scrollY)`로 계산한 위치에 별도로 그린다
// (app-mocks/AttendanceBoardMock.tsx의 stickyY 방식과 동일한 요령).
import React from "react";
import { useCurrentFrame } from "remotion";
import type { Rect } from "../../app-mocks/layout";
import type { Session } from "../../app-mocks/data";
import { pressScale, TypedText } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";
import { BATCH_CLASSMATES, sessionLabels, type BatchClassmate } from "../data";

export type BatchReason = "academy" | "afterschool" | "illness";

// REASON_OPTIONS — batch-absence/page.tsx 28-32행과 동일(기타 없음).
const REASON_OPTIONS: { value: BatchReason; label: string }[] = [
  { value: "academy", label: "학원" },
  { value: "afterschool", label: "방과후" },
  { value: "illness", label: "질병" },
];

const SESSIONS: Session[] = ["afternoon1", "afternoon2", "night"];

const PAD_X = 8; // student/layout.tsx main: px-2(<640px)
const PAD_TOP = 24; // main py-6
const TITLE_H = 24; // text-xl(20px) font-bold 줄높이
const TITLE_MB = 16; // mb-4(94행 flex justify-between)
const TABLE_TOP = PAD_TOP + TITLE_H + TITLE_MB;

const HEAD_H = 30; // thead px-3 py-2.5 압축
const SESSION_BTN_H = 44; // SessionButton className의 min-h-11(page.tsx 371·384·397·409행)
const ROW_PAD_Y = 6;
const ROW_H = SESSION_BTN_H + ROW_PAD_Y * 2;
const TABLE_BOTTOM = TABLE_TOP + HEAD_H + BATCH_CLASSMATES.length * ROW_H;

const SUBMIT_GAP = 20; // mt-6 근사
const SUBMIT_W = 120;
const SUBMIT_H = 40; // px-6 py-2.5 font-semibold 버튼 높이 근사
const SUBMIT_Y = TABLE_BOTTOM + SUBMIT_GAP;

const COL = { check: 26, no: 22, name: 40, session: 114 } as const;
const SESSION_BTN_W = 34;
const SESSION_GAP = 3;
const REASON_BTN_W = 28;
const REASON_GAP = 3;
const DETAIL_GAP = 4;

const geometry = (width: number) => {
  const contentW = width - PAD_X * 2;
  const checkX = 0;
  const noX = checkX + COL.check;
  const nameX = noX + COL.no;
  const sessionX = nameX + COL.name;
  const reasonX = sessionX + COL.session;
  const reasonW = contentW - reasonX;
  return { contentW, checkX, noX, nameX, sessionX, reasonX, reasonW };
};

const sessionBtnX = (g: ReturnType<typeof geometry>, sessionIndex: number) =>
  g.sessionX + (COL.session - (SESSION_BTN_W * SESSIONS.length + SESSION_GAP * (SESSIONS.length - 1))) / 2 +
  sessionIndex * (SESSION_BTN_W + SESSION_GAP);

const reasonBtnX = (g: ReturnType<typeof geometry>, reasonIndex: number) => {
  const pad = 4;
  return g.reasonX + pad + reasonIndex * (REASON_BTN_W + REASON_GAP);
};

const detailX = (g: ReturnType<typeof geometry>) => {
  const pad = 4;
  return g.reasonX + pad + REASON_OPTIONS.length * (REASON_BTN_W + REASON_GAP) - REASON_GAP + DETAIL_GAP;
};

const detailW = (g: ReturnType<typeof geometry>) => {
  const pad = 4;
  return Math.max(0, g.reasonW - pad * 2 - REASON_OPTIONS.length * (REASON_BTN_W + REASON_GAP) - DETAIL_GAP);
};

const rowIndexOf = (studentNo: number) => {
  const index = BATCH_CLASSMATES.findIndex((c) => c.student.number === studentNo);
  if (index === -1) throw new Error(`batch classmate not found: studentNo=${studentNo}`);
  return index;
};

const rowYOf = (studentNo: number) => TABLE_TOP + HEAD_H + rowIndexOf(studentNo) * ROW_H;

// thead는 [TABLE_TOP, TABLE_BOTTOM] 구간 안에서만 sticky top:0 — 표 영역을 벗어나면 함께 스크롤된다.
const theadYFor = (scrollY: number) => {
  const top = TABLE_TOP - scrollY;
  const bottom = TABLE_BOTTOM - scrollY;
  return Math.min(Math.max(top, 0), bottom - HEAD_H);
};

const canSelect = (c: BatchClassmate) => !c.alreadyRequested && SESSIONS.some((s) => c.participation[s]);

const hasValidSelection = (checked: number[], sessionPicks: Record<number, Session[]>) =>
  checked.some((no) => (sessionPicks[no]?.length ?? 0) > 0);

const allSelectableChecked = (checked: number[]) => {
  const selectable = BATCH_CLASSMATES.filter(canSelect);
  return selectable.length > 0 && selectable.every((c) => checked.includes(c.student.number));
};

export const batchRect = (
  key: `row_${number}` | `check_${number}` | `session_${number}_${Session}` | `reason_${string}` | "submit" | "header",
  width: number,
  scrollY = 0,
): Rect => {
  const g = geometry(width);
  if (key === "header") {
    return { x: PAD_X, y: theadYFor(scrollY), w: g.contentW, h: HEAD_H };
  }
  if (key === "submit") {
    return { x: (width - SUBMIT_W) / 2, y: SUBMIT_Y - scrollY, w: SUBMIT_W, h: SUBMIT_H };
  }
  const parts = key.split("_");
  if (parts[0] === "row") {
    const studentNo = Number(parts[1]);
    return { x: PAD_X, y: rowYOf(studentNo) - scrollY, w: g.contentW, h: ROW_H };
  }
  if (parts[0] === "check") {
    const studentNo = Number(parts[1]);
    const size = 16;
    return {
      x: PAD_X + g.checkX + (COL.check - size) / 2,
      y: rowYOf(studentNo) - scrollY + (ROW_H - size) / 2,
      w: size,
      h: size,
    };
  }
  if (parts[0] === "session") {
    const studentNo = Number(parts[1]);
    const session = parts[2] as Session;
    const sessionIndex = SESSIONS.indexOf(session);
    return {
      x: PAD_X + sessionBtnX(g, sessionIndex),
      y: rowYOf(studentNo) - scrollY + (ROW_H - SESSION_BTN_H) / 2,
      w: SESSION_BTN_W,
      h: SESSION_BTN_H,
    };
  }
  if (parts[0] === "reason") {
    const kind = parts[1];
    const btnH = 24;
    if (kind === "detail") {
      const studentNo = Number(parts[2]);
      return {
        x: PAD_X + detailX(g),
        y: rowYOf(studentNo) - scrollY + (ROW_H - btnH) / 2,
        w: detailW(g),
        h: btnH,
      };
    }
    const reasonIndex = REASON_OPTIONS.findIndex((o) => o.value === kind);
    if (reasonIndex === -1) throw new Error(`unknown batchRect reason key: ${key}`);
    const studentNo = Number(parts[2]);
    return {
      x: PAD_X + reasonBtnX(g, reasonIndex),
      y: rowYOf(studentNo) - scrollY + (ROW_H - btnH) / 2,
      w: REASON_BTN_W,
      h: btnH,
    };
  }
  throw new Error(`unknown batchRect key: ${key}`);
};

const Checkbox: React.FC<{ checked: boolean; disabled?: boolean; scale?: number }> = ({ checked, disabled, scale }) => (
  <span
    style={{
      width: 16,
      height: 16,
      borderRadius: 3,
      border: `1px solid ${checked ? tw.blue[600] : tw.gray[300]}`,
      background: checked ? tw.blue[600] : tw.white,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: disabled ? 0.3 : 1,
      scale: String(scale ?? 1),
      boxSizing: "border-box",
      flexShrink: 0,
    }}
  >
    {checked ? <span style={{ fontSize: 10, color: tw.white, lineHeight: 1 }}>✓</span> : null}
  </span>
);

type SessionButtonState = "nonParticipant" | "requested" | "picked" | "selectable";

const sessionButtonStyle: Record<SessionButtonState, { bg: string; fg: string; border: string; fontWeight: number }> = {
  nonParticipant: { bg: tw.gray[100], fg: tw.gray[300], border: tw.gray[200], fontWeight: 400 },
  requested: { bg: tw.gray[100], fg: tw.gray[400], border: tw.gray[200], fontWeight: 400 },
  picked: { bg: tw.red[100], fg: tw.red[700], border: tw.red[300], fontWeight: 500 },
  selectable: { bg: tw.sky[100], fg: tw.sky[700], border: tw.sky[300], fontWeight: 400 },
};

export const BatchAbsenceMock: React.FC<{
  width: number;
  height: number;
  checked: number[];
  sessionPicks: Record<number, Session[]>;
  reason: BatchReason;
  detail?: { text: string; typeFrom: number };
  rowPressAt?: { studentNo: number; at: number };
  sessionPressAt?: { studentNo: number; session: Session; at: number };
  submitPressAt?: number;
  busy?: boolean;
  scrollY?: number;
}> = ({ width, height, checked, sessionPicks, reason, detail, rowPressAt, sessionPressAt, submitPressAt, busy, scrollY }) => {
  const frame = useCurrentFrame();
  const g = geometry(width);
  const sy = scrollY ?? 0;
  const submitEnabled = !busy && hasValidSelection(checked, sessionPicks);

  return (
    <div style={{ position: "absolute", inset: 0, width, height, background: tw.gray[50], fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: -sy, width }}>
        {/* 제목 + 오늘 날짜 (page.tsx 206-209행) */}
        <div
          style={{
            position: "absolute",
            left: PAD_X,
            top: PAD_TOP,
            width: g.contentW,
            height: TITLE_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap" }}>일괄 불참신청</span>
          <span style={{ fontSize: 12, color: tw.gray[500], whiteSpace: "nowrap" }}>2026-09-17</span>
        </div>

        {/* 표 카드(page.tsx 212행) — thead는 별도 레이어(sticky)에서 그린다. */}
        <div
          style={{
            position: "absolute",
            left: PAD_X,
            top: TABLE_TOP,
            width: g.contentW,
            height: HEAD_H + BATCH_CLASSMATES.length * ROW_H,
            background: tw.white,
            border: `1px solid ${tw.gray[200]}`,
            borderRadius: 8,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {BATCH_CLASSMATES.map((classmate, i) => {
            const studentNo = classmate.student.number;
            const isChecked = checked.includes(studentNo);
            const selectable = canSelect(classmate);
            const picks = sessionPicks[studentNo] ?? [];
            const rowY = HEAD_H + i * ROW_H;
            const checkBounce = rowPressAt?.studentNo === studentNo ? rowPressAt.at : undefined;

            return (
              <div
                key={studentNo}
                style={{
                  position: "absolute",
                  left: 0,
                  top: rowY,
                  width: g.contentW,
                  height: ROW_H,
                  borderTop: i === 0 ? "none" : `1px solid ${tw.gray[100]}`,
                  opacity: isChecked ? 1 : 0.5,
                  boxSizing: "border-box",
                }}
              >
                <div style={{ position: "absolute", left: g.checkX, top: 0, width: COL.check, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Checkbox checked={isChecked} disabled={!selectable} scale={pressScale(frame, checkBounce)} />
                </div>

                <div style={{ position: "absolute", left: g.noX, top: 0, width: COL.no, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: tw.gray[700] }}>
                  {studentNo}
                </div>

                <div style={{ position: "absolute", left: g.nameX, top: 0, width: COL.name, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: tw.gray[900], whiteSpace: "nowrap" }}>
                  {classmate.student.name}
                </div>

                {/* 자습유형 — 세션 버튼 3개, 상태 4종(page.tsx 350-418행 SessionButton).
                    sessionBtnX가 g.sessionX를 이미 포함하므로 이 래퍼는 left:0(행 기준 절대좌표)이어야 한다. */}
                <div style={{ position: "absolute", left: 0, top: 0, width: g.contentW, height: ROW_H }}>
                  {SESSIONS.map((session, sessionIndex) => {
                    const participates = classmate.participation[session];
                    const picked = picks.includes(session);
                    const state: SessionButtonState = !participates
                      ? "nonParticipant"
                      : classmate.alreadyRequested
                        ? "requested"
                        : picked && isChecked
                          ? "picked"
                          : "selectable";
                    const style = sessionButtonStyle[state];
                    const dim = state === "selectable" && !isChecked ? 0.6 : 1;
                    const bounce = sessionPressAt?.studentNo === studentNo && sessionPressAt.session === session ? sessionPressAt.at : undefined;
                    return (
                      <div
                        key={session}
                        style={{
                          position: "absolute",
                          left: sessionBtnX(g, sessionIndex),
                          top: (ROW_H - SESSION_BTN_H) / 2,
                          width: SESSION_BTN_W,
                          height: SESSION_BTN_H,
                          borderRadius: 6,
                          border: `1px solid ${style.border}`,
                          background: style.bg,
                          color: style.fg,
                          fontWeight: style.fontWeight,
                          fontSize: 9,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          whiteSpace: "nowrap",
                          opacity: dim,
                          boxSizing: "border-box",
                          scale: String(pressScale(frame, bounce)),
                        }}
                      >
                        {state === "requested" ? "신청됨" : sessionLabels[session]}
                      </div>
                    );
                  })}
                </div>

                {/* 사유 — 버튼 3개 + 상세사유 입력(page.tsx 296-325행). reason/detail은 모든 행이 같은 값을 반영.
                    reasonBtnX/detailX가 g.reasonX를 이미 포함하므로 이 래퍼도 left:0이어야 한다. */}
                <div style={{ position: "absolute", left: 0, top: 0, width: g.contentW, height: ROW_H, opacity: isChecked ? 1 : 0.4 }}>
                  {REASON_OPTIONS.map((opt, reasonIndex) => {
                    const active = reason === opt.value;
                    return (
                      <div
                        key={opt.value}
                        style={{
                          position: "absolute",
                          left: reasonBtnX(g, reasonIndex),
                          top: (ROW_H - 24) / 2,
                          width: REASON_BTN_W,
                          height: 24,
                          borderRadius: 4,
                          border: `1px solid ${active ? tw.blue[500] : tw.gray[200]}`,
                          background: active ? tw.blue[50] : tw.white,
                          color: active ? tw.blue[700] : tw.gray[500],
                          fontWeight: active ? 500 : 400,
                          fontSize: 9,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          whiteSpace: "nowrap",
                          boxSizing: "border-box",
                        }}
                      >
                        {opt.label}
                      </div>
                    );
                  })}
                  <div
                    style={{
                      position: "absolute",
                      left: detailX(g),
                      top: (ROW_H - 24) / 2,
                      width: detailW(g),
                      height: 24,
                      borderRadius: 4,
                      border: `1px solid ${tw.gray[200]}`,
                      background: tw.white,
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 4,
                      fontSize: 9,
                      color: tw.gray[700],
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      boxSizing: "border-box",
                    }}
                  >
                    <TypedText text={detail?.text ?? ""} from={detail?.typeFrom} placeholder="상세사유" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 일괄신청 버튼(page.tsx 336-343행) */}
        <div
          style={{
            position: "absolute",
            left: (width - SUBMIT_W) / 2,
            top: SUBMIT_Y,
            width: SUBMIT_W,
            height: SUBMIT_H,
            borderRadius: 8,
            background: tw.blue[600],
            color: tw.white,
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            whiteSpace: "nowrap",
            opacity: submitEnabled ? 1 : 0.5,
            boxSizing: "border-box",
            scale: String(pressScale(frame, submitPressAt)),
          }}
        >
          {busy ? "신청 중..." : "일괄신청"}
        </div>
      </div>

      {/* thead — sticky top:0(page.tsx 215행), 표 영역([TABLE_TOP, TABLE_BOTTOM])을 벗어나면 함께 스크롤. */}
      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: theadYFor(sy),
          width: g.contentW,
          height: HEAD_H,
          background: tw.gray[50],
          borderBottom: `1px solid ${tw.gray[200]}`,
          zIndex: 2,
          boxSizing: "border-box",
        }}
      >
        <div style={{ position: "absolute", left: g.checkX, top: 0, width: COL.check, height: HEAD_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Checkbox checked={allSelectableChecked(checked)} />
        </div>
        <div style={{ position: "absolute", left: g.noX, top: 0, width: COL.no, height: HEAD_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, color: tw.gray[500], whiteSpace: "nowrap" }}>
          번호
        </div>
        <div style={{ position: "absolute", left: g.nameX, top: 0, width: COL.name, height: HEAD_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, color: tw.gray[500], whiteSpace: "nowrap" }}>
          이름
        </div>
        <div style={{ position: "absolute", left: g.sessionX, top: 0, width: COL.session, height: HEAD_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, color: tw.gray[500], whiteSpace: "nowrap" }}>
          자습유형
        </div>
        <div style={{ position: "absolute", left: g.reasonX, top: 0, width: g.reasonW, height: HEAD_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, color: tw.gray[500], whiteSpace: "nowrap" }}>
          사유
        </div>
      </div>
    </div>
  );
};
