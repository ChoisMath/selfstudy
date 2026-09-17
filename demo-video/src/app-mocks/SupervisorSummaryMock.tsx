// src/components/homeroom/SupervisorSummaryModal.tsx 이식 — 1248×570 뷰포트 전체를 덮는 오버레이.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../anim";
import { FONT } from "../fonts";
import type { Rect } from "./layout";
import { PC_VIEWPORT } from "./layout";
import { tw } from "./tw";
import { SUPERVISOR_SUMMARY } from "./data";

const PANEL_W = 672; // 72행 sm:max-w-2xl
const PANEL_X = (PC_VIEWPORT.w - PANEL_W) / 2;
const TABLE_PAD_X = 16; // 88행 px-2 근사(여백을 조금 더 줌)

const CLOSE_ROW_H = 28; // 74-81행 닫기 버튼 행
const HEADER_ROW_H = 32; // 90-106행 sticky 헤더
const MY_ROW_H = 32; // 110-131행 본인 행(sticky, bold)
const ROW_H = 30; // 134-156행 나머지 행

// data.ts SUPERVISOR_SUMMARY 기준 고정 — summaryRect는 width/rows 인자를 받지 않는다.
const OTHERS_COUNT = SUPERVISOR_SUMMARY.rows.length - 1;
const PANEL_H = CLOSE_ROW_H + HEADER_ROW_H + MY_ROW_H + ROW_H * OTHERS_COUNT + 8;
const PANEL_Y = (PC_VIEWPORT.h - PANEL_H) / 2;

const NAME_COL_W = 110;
const TOTAL_COL_W = 80;
const monthColW = (months: number) => (PANEL_W - TABLE_PAD_X * 2 - NAME_COL_W - TOTAL_COL_W) / months;

const TABLE_TOP = PANEL_Y + CLOSE_ROW_H;

export const summaryRect = (key: "table" | "myRow"): Rect => {
  if (key === "myRow") {
    return { x: PANEL_X, y: TABLE_TOP + HEADER_ROW_H, w: PANEL_W, h: MY_ROW_H };
  }
  return { x: PANEL_X, y: TABLE_TOP, w: PANEL_W, h: HEADER_ROW_H + MY_ROW_H + ROW_H * OTHERS_COUNT };
};

export type SupervisorSummaryMockProps = {
  months: string[];
  rows: typeof SUPERVISOR_SUMMARY.rows;
  me: string;
  openAt?: number;
};

export const SupervisorSummaryMock: React.FC<SupervisorSummaryMockProps> = ({ months, rows, me, openAt }) => {
  const frame = useCurrentFrame();
  const scale = openAt === undefined ? 1 : tween(frame, [openAt, openAt + 10], [0.96, 1]);
  const opacity = openAt === undefined ? 1 : tween(frame, [openAt, openAt + 10], [0, 1]);

  const myRow = rows.find((r) => r.name === me);
  const otherRows = rows.filter((r) => r.name !== me).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const monthW = monthColW(months.length);
  // 패널 div가 이미 left:PANEL_X 로 배치돼 있으므로(자식의 position:absolute 기준점), 자식 left는 패널 기준 상대좌표여야 한다.
  const nameColX = TABLE_PAD_X;
  const monthsX = nameColX + NAME_COL_W;
  const totalColX = monthsX + monthW * months.length;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: PC_VIEWPORT.w, height: PC_VIEWPORT.h, background: "rgba(0,0,0,0.4)", fontFamily: FONT }}>
      <div
        style={{
          position: "absolute",
          left: PANEL_X,
          top: PANEL_Y,
          width: PANEL_W,
          height: PANEL_H,
          background: tw.white,
          borderRadius: 8,
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
          transform: `scale(${scale})`,
          transformOrigin: "center",
          opacity,
        }}
      >
        <div style={{ position: "absolute", right: 8, top: 4, fontSize: 18, color: tw.gray[400], whiteSpace: "nowrap" }}>&times;</div>

        <div style={{ position: "absolute", left: nameColX, top: CLOSE_ROW_H, width: NAME_COL_W, height: HEADER_ROW_H, display: "flex", alignItems: "center", background: tw.gray[50], borderBottom: `1px solid ${tw.gray[200]}`, borderRight: `1px solid ${tw.gray[200]}`, fontSize: 12, fontWeight: 600, color: tw.gray[600], whiteSpace: "nowrap", boxSizing: "border-box", paddingLeft: 8 }}>
          교사명
        </div>
        {months.map((m, i) => (
          <div key={m} style={{ position: "absolute", left: monthsX + i * monthW, top: CLOSE_ROW_H, width: monthW, height: HEADER_ROW_H, display: "flex", alignItems: "center", justifyContent: "center", background: tw.gray[50], borderBottom: `1px solid ${tw.gray[200]}`, fontSize: 12, fontWeight: 600, color: tw.gray[600], whiteSpace: "nowrap", boxSizing: "border-box" }}>
            {m}
          </div>
        ))}
        <div style={{ position: "absolute", left: totalColX, top: CLOSE_ROW_H, width: TOTAL_COL_W, height: HEADER_ROW_H, display: "flex", alignItems: "center", justifyContent: "center", background: tw.gray[50], borderBottom: `1px solid ${tw.gray[200]}`, borderLeft: `1px solid ${tw.gray[200]}`, fontSize: 12, fontWeight: 700, color: tw.gray[800], whiteSpace: "nowrap", boxSizing: "border-box" }}>
          총계
        </div>

        {myRow ? (
          <React.Fragment>
            <div style={{ position: "absolute", left: nameColX, top: TABLE_TOP - PANEL_Y + HEADER_ROW_H, width: NAME_COL_W, height: MY_ROW_H, display: "flex", alignItems: "center", background: tw.yellow[50], borderBottom: `1px solid ${tw.yellow[200]}`, borderRight: `1px solid ${tw.yellow[200]}`, fontSize: 13, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap", boxSizing: "border-box", paddingLeft: 8 }}>
              {myRow.name}
              <span style={{ fontSize: 11, fontWeight: 400, color: tw.gray[500], marginLeft: 4 }}>({myRow.primaryGrade})</span>
            </div>
            {myRow.counts.map((c, i) => (
              <div key={i} style={{ position: "absolute", left: monthsX + i * monthW, top: TABLE_TOP - PANEL_Y + HEADER_ROW_H, width: monthW, height: MY_ROW_H, display: "flex", alignItems: "center", justifyContent: "center", background: tw.yellow[50], borderBottom: `1px solid ${tw.yellow[200]}`, fontSize: 13, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                {c}
              </div>
            ))}
            <div style={{ position: "absolute", left: totalColX, top: TABLE_TOP - PANEL_Y + HEADER_ROW_H, width: TOTAL_COL_W, height: MY_ROW_H, display: "flex", alignItems: "center", justifyContent: "center", background: tw.yellow[50], borderBottom: `1px solid ${tw.yellow[200]}`, borderLeft: `1px solid ${tw.yellow[200]}`, fontSize: 13, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap", boxSizing: "border-box" }}>
              {myRow.total}
            </div>
          </React.Fragment>
        ) : null}

        {otherRows.map((row, ri) => {
          const y = TABLE_TOP - PANEL_Y + HEADER_ROW_H + MY_ROW_H + ri * ROW_H;
          return (
            <React.Fragment key={row.name}>
              <div style={{ position: "absolute", left: nameColX, top: y, width: NAME_COL_W, height: ROW_H, display: "flex", alignItems: "center", background: tw.white, borderBottom: `1px solid ${tw.gray[100]}`, borderRight: `1px solid ${tw.gray[100]}`, fontSize: 13, color: tw.gray[700], whiteSpace: "nowrap", boxSizing: "border-box", paddingLeft: 8 }}>
                {row.name}
                <span style={{ fontSize: 11, color: tw.gray[400], marginLeft: 4 }}>({row.primaryGrade})</span>
              </div>
              {row.counts.map((c, i) => (
                <div key={i} style={{ position: "absolute", left: monthsX + i * monthW, top: y, width: monthW, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center", background: tw.white, borderBottom: `1px solid ${tw.gray[100]}`, fontSize: 13, color: tw.gray[600], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                  {c}
                </div>
              ))}
              <div style={{ position: "absolute", left: totalColX, top: y, width: TOTAL_COL_W, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center", background: tw.white, borderBottom: `1px solid ${tw.gray[100]}`, borderLeft: `1px solid ${tw.gray[100]}`, fontSize: 13, fontWeight: 500, color: tw.gray[700], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                {row.total}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
