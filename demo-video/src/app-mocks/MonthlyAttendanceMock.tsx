// src/app/homeroom/attendance/page.tsx 이식 — 담임 월간출결표. 헤더 셸 없이 본문만 그린다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tw } from "./tw";
import type { Rect } from "./layout";
import { GRADE, HOMEROOM_MONTH, STUDENTS, type HomeroomCellValue, type Session } from "./data";
import { pressScale } from "./primitives";
import { FONT } from "../fonts";

const SESSIONS: Session[] = ["afternoon1", "afternoon2", "night"];
const SESSION_SHORT: Record<Session, string> = { afternoon1: "오후1", afternoon2: "오후2", night: "야간" };
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

const PAD_X = 16;
const PAD_TOP = 16;
const NAV_H = 30;
const NAV_MB = 12;
const EXCEL_W = 60;
const LEGEND_TOGGLE_H = 14;
const LEGEND_OPEN_H = 18;
const LEGEND_MB = 10;
const TITLE_H = 20;
const TITLE_MB = 8;
const STICKY1_W = 58;
const STICKY2_W = 34;
const STICKY_TOTAL = STICKY1_W + STICKY2_W;
const DATE_CELL_W = 30;
const DATE_GROUP_W = DATE_CELL_W * 3;
const HOURS_W = 48;
const HEAD1_H = 24;
const HEAD2_H = 16;
const BODY_H = 20;
const FOOT_H = 22;
const FOOTER_TEXT_H = 26;

const monthlyStudents = STUDENTS.filter((s) => s.classNumber === 2);

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

const contentScrollWidth = () => HOMEROOM_MONTH.dates.length * DATE_GROUP_W + HOURS_W;

const geometry = (width: number) => {
  const available = width - PAD_X * 2;
  const navY = PAD_TOP;
  const legendY = navY + NAV_H + NAV_MB;
  const scrollableW = Math.max(0, available - STICKY_TOTAL);
  return { available, navY, legendY, scrollableW };
};

const titleY = (width: number, legendOpen: boolean | undefined) => {
  const { legendY } = geometry(width);
  return legendY + LEGEND_TOGGLE_H + (legendOpen ? LEGEND_OPEN_H : 0) + LEGEND_MB;
};

const tableY = (width: number, legendOpen: boolean | undefined) => titleY(width, legendOpen) + TITLE_H + TITLE_MB;

const tableFullH = () => HEAD1_H + HEAD2_H + monthlyStudents.length * BODY_H + FOOT_H;

export const monthlyRect = (
  key: "monthNav" | "excel" | "legendToggle" | "hoursColumn" | "table",
  variant: "homeroom",
  width: number,
): Rect => {
  void variant;
  const { available, navY, legendY } = geometry(width);
  if (key === "monthNav") {
    return { x: PAD_X, y: navY, w: available - EXCEL_W - 12, h: NAV_H };
  }
  if (key === "excel") {
    return { x: PAD_X + available - EXCEL_W, y: navY, w: EXCEL_W, h: NAV_H };
  }
  if (key === "legendToggle") {
    return { x: PAD_X, y: legendY, w: available, h: LEGEND_TOGGLE_H };
  }
  const tY = tableY(width, false);
  if (key === "hoursColumn") {
    const { scrollableW } = geometry(width);
    return {
      x: PAD_X + STICKY_TOTAL + Math.max(0, scrollableW - HOURS_W),
      y: tY + HEAD1_H + HEAD2_H,
      w: HOURS_W,
      h: monthlyStudents.length * BODY_H,
    };
  }
  return { x: PAD_X, y: tY, w: available, h: tableFullH() };
};

// scrollX 를 이 값으로 두면 표가 오른쪽 끝(시간 열)까지 스크롤된 상태를 재현한다.
export const monthlyMaxScrollX = (width: number): number => {
  const { scrollableW } = geometry(width);
  return Math.max(0, contentScrollWidth() - scrollableW);
};

const LegendItem: React.FC<{ symbol: string; color: string; label: string }> = ({ symbol, color, label }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
    <span style={{ fontSize: 12, fontWeight: 800, color }}>{symbol}</span>
    <span style={{ fontSize: 10, color: tw.gray[500] }}>{label}</span>
  </span>
);

export const MonthlyAttendanceMock: React.FC<{
  variant: "homeroom";
  width: number;
  height: number;
  legendOpen?: boolean;
  scrollX?: number;
  excelPressAt?: number;
}> = ({ variant, width, height, legendOpen, scrollX, excelPressAt }) => {
  void variant;
  const frame = useCurrentFrame();
  const { available, navY, legendY, scrollableW } = geometry(width);
  const tY = tableY(width, legendOpen);
  const excelRect = monthlyRect("excel", "homeroom", width);
  const classLabel = HOMEROOM_MONTH.classLabel.split("-")[1] ?? HOMEROOM_MONTH.classLabel;
  const sx = scrollX ?? 0;
  const headerAreaH = HEAD1_H + HEAD2_H;
  const bodyAreaH = monthlyStudents.length * BODY_H;

  return (
    <div style={{ position: "absolute", width, height, background: tw.gray[50], fontFamily: FONT, overflow: "hidden" }}>
      {/* 월 이동 + Excel */}
      <div style={{ position: "absolute", left: PAD_X, top: navY, width: available, height: NAV_H }}>
        <div style={{ position: "absolute", left: 0, top: 0, display: "flex", alignItems: "center", gap: 10, height: NAV_H }}>
          <div style={{ width: 28, height: NAV_H, border: `1px solid ${tw.gray[300]}`, borderRadius: 6, background: tw.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: tw.gray[700], boxSizing: "border-box" }}>
            ←
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: tw.gray[800], whiteSpace: "nowrap" }}>
            {HOMEROOM_MONTH.year}.{String(HOMEROOM_MONTH.month).padStart(2, "0")}
          </span>
          <div style={{ width: 28, height: NAV_H, border: `1px solid ${tw.gray[300]}`, borderRadius: 6, background: tw.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: tw.gray[700], boxSizing: "border-box" }}>
            →
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: excelRect.x - PAD_X,
            top: 0,
            width: EXCEL_W,
            height: NAV_H,
            borderRadius: 6,
            background: tw.green[600],
            color: tw.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            scale: String(pressScale(frame, excelPressAt ?? null)),
          }}
        >
          Excel
        </div>
      </div>

      {/* 범례 토글 */}
      <div style={{ position: "absolute", left: PAD_X, top: legendY, width: available }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, height: LEGEND_TOGGLE_H }}>
          <span style={{ flex: 1, borderTop: `1px solid ${tw.gray[200]}` }} />
          <span style={{ fontSize: 9, color: tw.gray[400] }}>{legendOpen ? "▲" : "▼"}</span>
          <span style={{ flex: 1, borderTop: `1px solid ${tw.gray[200]}` }} />
        </div>
        {legendOpen ? (
          <div style={{ marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap", height: LEGEND_OPEN_H - 4, alignItems: "center" }}>
            <LegendItem symbol="O" color={tw.green[700]} label="출석" />
            <LegendItem symbol="X" color={tw.red[700]} label="무단결석" />
            <LegendItem symbol="△" color={tw.orange[500]} label="사유결석" />
            <LegendItem symbol="방" color={tw.yellow[600]} label="방과후" />
            <LegendItem symbol="-" color={tw.gray[400]} label="미확인" />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 14, height: 10, background: tw.gray[100], border: `1px solid ${tw.gray[300]}`, borderRadius: 2 }} />
              <span style={{ fontSize: 10, color: tw.gray[500] }}>미참가</span>
            </span>
          </div>
        ) : null}
      </div>

      {/* 반 제목 */}
      <div style={{ position: "absolute", left: PAD_X, top: titleY(width, legendOpen), fontSize: 14, fontWeight: 700, color: tw.gray[800], whiteSpace: "nowrap" }}>
        {GRADE}학년 {classLabel}반
      </div>

      {/* 표 */}
      <div style={{ position: "absolute", left: PAD_X, top: tY, width: available, background: tw.white, border: `1px solid ${tw.gray[300]}`, borderRadius: 8, overflow: "hidden", boxSizing: "border-box" }}>
        {/* 헤더 */}
        <div style={{ position: "relative", height: headerAreaH, background: tw.gray[50], borderBottom: `1px solid ${tw.gray[300]}` }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: STICKY_TOTAL,
              height: headerAreaH,
              background: tw.gray[50],
              zIndex: 4,
              display: "flex",
              alignItems: "center",
              boxSizing: "border-box",
            }}
          >
            <span style={{ width: STICKY1_W, paddingLeft: 8, fontSize: 10, fontWeight: 500, color: tw.gray[600], whiteSpace: "nowrap" }}>이름</span>
            <span style={{ width: STICKY2_W, textAlign: "center", fontSize: 10, fontWeight: 500, color: tw.gray[600] }}>번호</span>
          </div>
          <div style={{ position: "absolute", left: STICKY_TOTAL, top: 0, width: scrollableW, height: headerAreaH, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: -sx, top: 0, width: contentScrollWidth(), height: headerAreaH }}>
              {HOMEROOM_MONTH.dates.map((date, dateIndex) => {
                const day = Number(date.slice(8));
                const dayName = DAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()];
                return (
                  <div
                    key={date}
                    style={{
                      position: "absolute",
                      left: dateIndex * DATE_GROUP_W,
                      top: 0,
                      width: DATE_GROUP_W,
                      height: HEAD1_H,
                      borderLeft: `1px solid ${tw.gray[300]}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 500,
                      color: tw.gray[600],
                      whiteSpace: "nowrap",
                      boxSizing: "border-box",
                    }}
                  >
                    {String(day).padStart(2, "0")}/{dayName}
                  </div>
                );
              })}
              {HOMEROOM_MONTH.dates.map((date, dateIndex) =>
                SESSIONS.map((session, i) => (
                  <div
                    key={`${date}-${session}`}
                    style={{
                      position: "absolute",
                      left: dateIndex * DATE_GROUP_W + i * DATE_CELL_W,
                      top: HEAD1_H,
                      width: DATE_CELL_W,
                      height: HEAD2_H,
                      borderLeft: i === 0 ? `1px solid ${tw.gray[300]}` : undefined,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8,
                      color: tw.gray[400],
                      whiteSpace: "nowrap",
                      boxSizing: "border-box",
                    }}
                  >
                    {SESSION_SHORT[session]}
                  </div>
                )),
              )}
              <div
                style={{
                  position: "absolute",
                  left: HOMEROOM_MONTH.dates.length * DATE_GROUP_W,
                  top: 0,
                  width: HOURS_W,
                  height: headerAreaH,
                  borderLeft: `1px solid ${tw.gray[300]}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 500,
                  color: tw.gray[600],
                  whiteSpace: "nowrap",
                  boxSizing: "border-box",
                }}
              >
                시간
              </div>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div style={{ position: "relative", height: bodyAreaH }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: STICKY_TOTAL, height: bodyAreaH, background: tw.white, zIndex: 3 }}>
            {monthlyStudents.map((student, rowIndex) => (
              <div key={student.id} style={{ position: "absolute", left: 0, top: rowIndex * BODY_H, width: STICKY_TOTAL, height: BODY_H, borderBottom: `1px solid ${tw.gray[300]}`, display: "flex", alignItems: "center", boxSizing: "border-box" }}>
                <span style={{ width: STICKY1_W, paddingLeft: 8, fontSize: 11, fontWeight: 500, color: tw.gray[900], whiteSpace: "nowrap" }}>{student.name}</span>
                <span style={{ width: STICKY2_W, textAlign: "center", fontSize: 11, color: tw.gray[600] }}>{student.number}</span>
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", left: STICKY_TOTAL, top: 0, width: scrollableW, height: bodyAreaH, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: -sx, top: 0, width: contentScrollWidth(), height: bodyAreaH }}>
              {monthlyStudents.map((student, rowIndex) => (
                <React.Fragment key={student.id}>
                  {HOMEROOM_MONTH.dates.map((date, dateIndex) =>
                    SESSIONS.map((session, i) => {
                      const v = HOMEROOM_MONTH.cell(student.number, date, session);
                      return (
                        <div
                          key={`${date}-${session}`}
                          style={{
                            position: "absolute",
                            left: dateIndex * DATE_GROUP_W + i * DATE_CELL_W,
                            top: rowIndex * BODY_H,
                            width: DATE_CELL_W,
                            height: BODY_H,
                            borderLeft: i === 0 ? `1px solid ${tw.gray[300]}` : undefined,
                            borderBottom: `1px solid ${tw.gray[300]}`,
                            background: CELL_BG[v],
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxSizing: "border-box",
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 800, color: CELL_TEXT[v] }}>{CELL_SYMBOL[v]}</span>
                        </div>
                      );
                    }),
                  )}
                  <div
                    style={{
                      position: "absolute",
                      left: HOMEROOM_MONTH.dates.length * DATE_GROUP_W,
                      top: rowIndex * BODY_H,
                      width: HOURS_W,
                      height: BODY_H,
                      borderLeft: `1px solid ${tw.gray[300]}`,
                      borderBottom: `1px solid ${tw.gray[300]}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: tw.blue[600],
                      boxSizing: "border-box",
                    }}
                  >
                    {HOMEROOM_MONTH.hours(student.number)}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* 합계 */}
        <div style={{ position: "relative", height: FOOT_H, background: tw.gray[50], borderTop: `2px solid ${tw.gray[300]}`, boxSizing: "border-box" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: STICKY_TOTAL, height: FOOT_H, background: tw.gray[50], zIndex: 3, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6, fontSize: 9, fontWeight: 600, color: tw.gray[600], whiteSpace: "nowrap", boxSizing: "border-box" }}>
            합계
          </div>
          <div style={{ position: "absolute", left: STICKY_TOTAL, top: 0, width: scrollableW, height: FOOT_H, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: -sx, top: 0, width: contentScrollWidth(), height: FOOT_H }}>
              {HOMEROOM_MONTH.dates.map((date, dateIndex) =>
                SESSIONS.map((session, i) => {
                  let present = 0;
                  let absent = 0;
                  let participating = 0;
                  monthlyStudents.forEach((s) => {
                    const v = HOMEROOM_MONTH.cell(s.number, date, session);
                    if (v === "gray" || v === "-") return;
                    participating += 1;
                    if (v === "O") present += 1;
                    else if (v === "X" || v === "△") absent += 1;
                  });
                  return (
                    <div
                      key={`${date}-${session}`}
                      style={{
                        position: "absolute",
                        left: dateIndex * DATE_GROUP_W + i * DATE_CELL_W,
                        top: 0,
                        width: DATE_CELL_W,
                        height: FOOT_H,
                        borderLeft: i === 0 ? `1px solid ${tw.gray[300]}` : undefined,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 7,
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
              <div
                style={{
                  position: "absolute",
                  left: HOMEROOM_MONTH.dates.length * DATE_GROUP_W,
                  top: 0,
                  width: HOURS_W,
                  height: FOOT_H,
                  borderLeft: `1px solid ${tw.gray[300]}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: tw.blue[600],
                }}
              >
                {(
                  monthlyStudents.reduce((sum, s) => sum + Number(HOMEROOM_MONTH.hours(s.number)), 0) / monthlyStudents.length
                ).toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", left: PAD_X, top: tY + tableFullH() + 6, height: FOOTER_TEXT_H, fontSize: 11, color: tw.gray[500], whiteSpace: "nowrap" }}>
        총 {monthlyStudents.length}명{" "}
        <span style={{ fontSize: 9, color: tw.gray[400], marginLeft: 6 }}>(합계: 출석/결석/참여)</span>
      </div>
    </div>
  );
};
