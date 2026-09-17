// src/app/homeroom/page.tsx 이식 — 담임 주간 출결표. 헤더 셸 없이 본문만 그린다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tw } from "../../app-mocks/tw";
import type { Rect } from "../../app-mocks/layout";
import { HOMEROOM_WEEK, STUDENTS, type HomeroomCellValue, type Session } from "../../app-mocks/data";
import { FONT } from "../../fonts";

const SESSIONS: Session[] = ["afternoon1", "afternoon2", "night"];
const SESSION_SHORT: Record<Session, string> = { afternoon1: "오후1", afternoon2: "오후2", night: "야간" };

const PAD_X = 16;
const PAD_TOP = 16;
const NAV_H = 32;
const NAV_MB = 16;
const LEGEND_H = 20;
const LEGEND_MB = 14;
const NAME_W = 68;
const CLASS_W = 42;
const NO_W = 42;
const CELL_W = 44;
const DAY_W = CELL_W * 3;
const TABLE_W = NAME_W + CLASS_W + NO_W + DAY_W * 5;
const HEAD1_H = 32;
const HEAD2_H = 24;
const BODY_H = 28;
const FOOT_H = 32;
const ARROW_W = 30;
const TABLE_Y = PAD_TOP + NAV_H + NAV_MB + LEGEND_H + LEGEND_MB;

const weeklyStudents = STUDENTS.filter((s) => s.classNumber === 2);

// gray = 미참가(회색 배경), "-" = 미확인(배경 없음).
const CELL_TEXT: Record<HomeroomCellValue, string> = {
  O: tw.green[700],
  X: tw.red[700],
  "△": tw.orange[500],
  방: tw.yellow[600],
  gray: tw.gray[300],
  "-": tw.gray[400],
};
const CELL_BG: Partial<Record<HomeroomCellValue, string>> = {
  방: tw.yellow[50],
  gray: tw.gray[100],
};
const CELL_SYMBOL: Record<HomeroomCellValue, string> = {
  O: "O",
  X: "X",
  "△": "△",
  방: "방",
  gray: "-",
  "-": "-",
};

const dayColX = (dayIndex: number) => NAME_W + CLASS_W + NO_W + dayIndex * DAY_W;
const sessionColX = (dayIndex: number, session: Session) => dayColX(dayIndex) + SESSIONS.indexOf(session) * CELL_W;
const rowY = (studentNo: number) => TABLE_Y + HEAD1_H + HEAD2_H + (studentNo - 1) * BODY_H;

export const homeroomWeeklyRect = (
  key: "weekNav" | "legend" | "table" | "totals" | `cell_${number}_${number}_${Session}`,
  width: number,
): Rect => {
  if (key === "weekNav") {
    return { x: PAD_X, y: PAD_TOP, w: width - PAD_X * 2, h: NAV_H };
  }
  if (key === "legend") {
    return { x: PAD_X, y: PAD_TOP + NAV_H + NAV_MB, w: width - PAD_X * 2, h: LEGEND_H };
  }
  if (key === "table") {
    return { x: PAD_X, y: TABLE_Y, w: TABLE_W, h: HEAD1_H + HEAD2_H + 12 * BODY_H + FOOT_H };
  }
  if (key === "totals") {
    return { x: PAD_X, y: TABLE_Y + HEAD1_H + HEAD2_H + 12 * BODY_H, w: TABLE_W, h: FOOT_H };
  }
  const [, studentNoStr, dayIndexStr, session] = key.split("_");
  const studentNo = Number(studentNoStr);
  const dayIndex = Number(dayIndexStr);
  return {
    x: PAD_X + sessionColX(dayIndex, session as Session),
    y: rowY(studentNo),
    w: CELL_W,
    h: BODY_H,
  };
};

const countsFor = (dayIndex: number, session: Session) => {
  let present = 0;
  let absent = 0;
  let participating = 0;
  weeklyStudents.forEach((s) => {
    const v = HOMEROOM_WEEK.cell(s.number, dayIndex, session);
    if (v === "gray" || v === "-") return;
    participating += 1;
    if (v === "O") present += 1;
    else if (v === "X" || v === "△") absent += 1;
  });
  return { present, absent, participating };
};

const LegendItem: React.FC<{ symbol: string; color: string; bg?: string; label: string }> = ({ symbol, color, bg, label }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
    <span
      style={{
        fontSize: 13,
        fontWeight: 800,
        color,
        background: bg,
        padding: bg ? "0 2px" : undefined,
        borderRadius: bg ? 2 : undefined,
      }}
    >
      {symbol}
    </span>
    <span style={{ fontSize: 11, color: tw.gray[500] }}>{label}</span>
  </span>
);

const Th: React.FC<{ x: number; w: number; h: number; children?: React.ReactNode; border?: boolean }> = ({ x, w, h, children, border }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: 0,
      width: w,
      height: h,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 500,
      color: tw.gray[600],
      borderLeft: border ? `1px solid ${tw.gray[300]}` : undefined,
      whiteSpace: "nowrap",
      boxSizing: "border-box",
    }}
  >
    {children}
  </div>
);

export const HomeroomWeeklyMock: React.FC<{
  width: number;
  height: number;
  tooltip?: { studentNo: number; day: number; session: Session; from: number };
  highlightRow?: "totals";
}> = ({ width, height, tooltip, highlightRow }) => {
  const frame = useCurrentFrame();
  const navRight = width - PAD_X - ARROW_W;
  const tooltipShown = tooltip !== undefined && frame >= tooltip.from;
  const tooltipText = tooltip
    ? (HOMEROOM_WEEK.detail(tooltip.studentNo, tooltip.day, tooltip.session) ??
      HOMEROOM_WEEK.remark(tooltip.studentNo, tooltip.day, tooltip.session))
    : undefined;

  return (
    <div style={{ position: "absolute", width, height, background: tw.gray[50], fontFamily: FONT, overflow: "hidden" }}>
      {/* 주 이동 */}
      <div style={{ position: "absolute", left: PAD_X, top: PAD_TOP, width: width - PAD_X * 2, height: NAV_H }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: ARROW_W,
            height: NAV_H,
            border: `1px solid ${tw.gray[300]}`,
            borderRadius: 6,
            background: tw.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: tw.gray[700],
            boxSizing: "border-box",
          }}
        >
          ←
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: width - PAD_X * 2,
            height: NAV_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            color: tw.gray[500],
            whiteSpace: "nowrap",
          }}
        >
          {HOMEROOM_WEEK.range}
        </div>
        <div
          style={{
            position: "absolute",
            left: navRight - PAD_X,
            top: 0,
            width: ARROW_W,
            height: NAV_H,
            border: `1px solid ${tw.gray[300]}`,
            borderRadius: 6,
            background: tw.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: tw.gray[700],
            boxSizing: "border-box",
          }}
        >
          →
        </div>
      </div>

      {/* 범례 */}
      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: PAD_TOP + NAV_H + NAV_MB,
          width: width - PAD_X * 2,
          height: LEGEND_H,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <LegendItem symbol="O" color={tw.green[700]} label="출석" />
        <LegendItem symbol="X" color={tw.red[700]} label="무단결석" />
        <LegendItem symbol="△" color={tw.orange[500]} label="사유결석" />
        <LegendItem symbol="방" color={tw.yellow[600]} label="방과후" />
        <LegendItem symbol="-" color={tw.gray[400]} label="미확인" />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
          <span style={{ width: 16, height: 12, background: tw.gray[100], border: `1px solid ${tw.gray[300]}`, borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: tw.gray[500] }}>미참가</span>
        </span>
      </div>

      {/* 표 */}
      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: TABLE_Y,
          width: TABLE_W,
          background: tw.white,
          border: `1px solid ${tw.gray[300]}`,
          borderRadius: 8,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* 헤더 1행 */}
        <div style={{ position: "relative", height: HEAD1_H, background: tw.gray[50], borderBottom: `1px solid ${tw.gray[300]}` }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: NAME_W, height: HEAD1_H, display: "flex", alignItems: "center", paddingLeft: 10, fontSize: 12, fontWeight: 500, color: tw.gray[600], whiteSpace: "nowrap", boxSizing: "border-box" }}>
            이름
          </div>
          <Th x={NAME_W} w={CLASS_W} h={HEAD1_H}>반</Th>
          <Th x={NAME_W + CLASS_W} w={NO_W} h={HEAD1_H}>번호</Th>
          {HOMEROOM_WEEK.days.map((label, i) => (
            <Th key={label} x={dayColX(i)} w={DAY_W} h={HEAD1_H} border>
              {label}
            </Th>
          ))}
        </div>
        {/* 헤더 2행 */}
        <div style={{ position: "relative", height: HEAD2_H, background: tw.gray[50], borderBottom: `1px solid ${tw.gray[300]}` }}>
          {HOMEROOM_WEEK.days.map((_, dayIndex) =>
            SESSIONS.map((session, i) => (
              <Th key={`${dayIndex}-${session}`} x={sessionColX(dayIndex, session)} w={CELL_W} h={HEAD2_H} border={i === 0}>
                <span style={{ fontSize: 10, color: tw.gray[400] }}>{SESSION_SHORT[session]}</span>
              </Th>
            )),
          )}
        </div>

        {/* 본문 */}
        {weeklyStudents.map((student) => (
          <div key={student.id} style={{ position: "relative", height: BODY_H, borderBottom: `1px solid ${tw.gray[300]}` }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: NAME_W, height: BODY_H, display: "flex", alignItems: "center", paddingLeft: 10, fontSize: 13, fontWeight: 500, color: tw.gray[900], whiteSpace: "nowrap", boxSizing: "border-box" }}>
              {student.name}
            </div>
            <Th x={NAME_W} w={CLASS_W} h={BODY_H}>
              <span style={{ fontSize: 13, color: tw.gray[600] }}>{student.classNumber}</span>
            </Th>
            <Th x={NAME_W + CLASS_W} w={NO_W} h={BODY_H}>
              <span style={{ fontSize: 13, color: tw.gray[600] }}>{student.number}</span>
            </Th>
            {HOMEROOM_WEEK.days.map((_, dayIndex) =>
              SESSIONS.map((session, i) => {
                const v = HOMEROOM_WEEK.cell(student.number, dayIndex, session);
                const remark = HOMEROOM_WEEK.remark(student.number, dayIndex, session);
                return (
                  <div
                    key={session}
                    style={{
                      position: "absolute",
                      left: sessionColX(dayIndex, session),
                      top: 0,
                      width: CELL_W,
                      height: BODY_H,
                      borderLeft: i === 0 ? `1px solid ${tw.gray[300]}` : undefined,
                      background: CELL_BG[v],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxSizing: "border-box",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 800, color: CELL_TEXT[v] }}>{CELL_SYMBOL[v]}</span>
                    {remark ? (
                      <span style={{ position: "absolute", top: 2, right: 4, fontSize: 8, fontWeight: 700, color: tw.orange[500] }}>*</span>
                    ) : null}
                  </div>
                );
              }),
            )}
          </div>
        ))}

        {/* 합계 */}
        <div
          style={{
            position: "relative",
            height: FOOT_H,
            background: highlightRow === "totals" ? tw.amber[50] : tw.gray[50],
            borderTop: `2px solid ${tw.gray[300]}`,
            boxSizing: "border-box",
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, width: NAME_W + CLASS_W + NO_W, height: FOOT_H, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, fontSize: 11, fontWeight: 600, color: tw.gray[600], whiteSpace: "nowrap", boxSizing: "border-box" }}>
            합계
          </div>
          {HOMEROOM_WEEK.days.map((_, dayIndex) =>
            SESSIONS.map((session, i) => {
              const { present, absent, participating } = countsFor(dayIndex, session);
              return (
                <div
                  key={session}
                  style={{
                    position: "absolute",
                    left: sessionColX(dayIndex, session),
                    top: 0,
                    width: CELL_W,
                    height: FOOT_H,
                    borderLeft: i === 0 ? `1px solid ${tw.gray[300]}` : undefined,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    whiteSpace: "nowrap",
                    boxSizing: "border-box",
                  }}
                >
                  <span style={{ color: tw.green[700], fontWeight: 700 }}>{present}</span>
                  <span style={{ color: tw.gray[400] }}>/</span>
                  <span style={{ color: tw.red[700], fontWeight: 700 }}>{absent}</span>
                  <span style={{ color: tw.gray[400] }}>/</span>
                  <span style={{ color: tw.gray[500] }}>{participating}</span>
                </div>
              );
            }),
          )}
        </div>
      </div>

      <div style={{ position: "absolute", left: PAD_X, top: TABLE_Y + HEAD1_H + HEAD2_H + 12 * BODY_H + FOOT_H + 6, fontSize: 12, color: tw.gray[500], whiteSpace: "nowrap" }}>
        총 {weeklyStudents.length}명{" "}
        <span style={{ fontSize: 10, color: tw.gray[400], marginLeft: 6 }}>(합계: 출석/결석/참여)</span>
      </div>

      {tooltipShown && tooltipText ? (
        <div
          style={{
            position: "absolute",
            left: PAD_X + sessionColX(tooltip!.day, tooltip!.session) + CELL_W / 2,
            top: rowY(tooltip!.studentNo) - 6,
            transform: "translate(-50%, -100%)",
            background: tw.gray[800],
            color: tw.white,
            fontSize: 10,
            padding: "4px 8px",
            borderRadius: 4,
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          {tooltipText}
        </div>
      ) : null}
    </div>
  );
};
