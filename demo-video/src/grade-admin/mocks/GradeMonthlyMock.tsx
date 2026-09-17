// src/components/grade-admin/GradeMonthlyAttendance.tsx 이식 — 셸 없이 본문만 그린다.
// GradeAdminShellMock(T2)이 헤더+6탭 바까지 그린다는 컨트롤러 결정에 따라, 이 목업은 main의
// 좌우 padding(layout.tsx lg:px-4=16)만 스스로 그리고 위쪽은 탭 바로 아래에서 바로 시작한다고 가정한다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { FONT } from "../../fonts";
import type { HomeroomCellValue, Session } from "../../app-mocks/data";
import type { Point, Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import type { MonthlyRow } from "../data";

const SESSIONS: Session[] = ["afternoon1", "afternoon2", "night"];
const SESSION_SHORT: Record<Session, string> = { afternoon1: "오후1", afternoon2: "오후2", night: "야간" };

const PAD_X = 16; // grade-admin/[grade]/layout.tsx lg:px-4

const NAV_H = 32; // GradeMonthlyAttendance.tsx 79-87행
const GAP_NAV_LEGEND = 16; // 79행 mb-4
const LEGEND_TOGGLE_H = 20; // 91-95행
const GAP_TOGGLE_CONTENT = 8; // 96행 mt-2
const LEGEND_CONTENT_H = 20; // 97-105행
const GAP_LEGEND_TABLE = 12; // 90행 mb-3

const CLASS_W = 36; // 118행 min-w-[36px]
const NO_W = 36; // 119행 min-w-[36px]
const NAME_W = 56; // 120행 min-w-[56px]
const STICKY_W = CLASS_W + NO_W + NAME_W;
const SESSION_COL_W = 26; // 125-145행 min-width 없음 — 13일×3칸이 본문 폭 안에 들어오도록 압축
const DAY_COL_W = SESSION_COL_W * SESSIONS.length;
const HOURS_W = 48; // 130행 min-w-[48px]

const HEAD1_H = 30; // 117-131행 px-2 py-2 text-xs
const HEAD2_H = 22; // 132-146행 px-1 py-1
const BODY_H = 26; // 159-213행 px-1/2 py-1.5 text-sm font-extrabold
const FOOT_H = 28; // 218-220행 px-4 py-2 text-xs

const EVEN_CLASS_BG = "#f0f7ff"; // 153행 bg-[#f0f7ff]

// 헤더 네비게이션 행(79-87행)을 좌표 함수와 정확히 맞추기 위해 flex 대신 절대 좌표로 배치한다.
const PREV_W = 32;
const NAV_GAP = 8;
const LABEL_W = 64; // "2026.09" text-lg 근사
const NOW_W = 46; // 83행 "Now" px-3 py-1.5 text-xs
const NEXT_W = 32;
const EXCEL_W = 70; // 86행 "Excel" px-4 py-2 text-sm
const PREV_X = 0;
const LABEL_X = PREV_X + PREV_W + NAV_GAP;
const NOW_X = LABEL_X + LABEL_W + NAV_GAP;
const NEXT_X = NOW_X + NOW_W + NAV_GAP;

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

const tableY = (legendOpen: boolean) =>
  NAV_H + GAP_NAV_LEGEND + LEGEND_TOGGLE_H + (legendOpen ? GAP_TOGGLE_CONTENT + LEGEND_CONTENT_H : 0) + GAP_LEGEND_TABLE;

const dayColX = (dateIndex: number) => STICKY_W + dateIndex * DAY_COL_W;
const sessionColX = (dateIndex: number, session: Session) => dayColX(dateIndex) + SESSIONS.indexOf(session) * SESSION_COL_W;
const rowY = (legendOpen: boolean, rowIndex: number) => tableY(legendOpen) + HEAD1_H + HEAD2_H + rowIndex * BODY_H;

const tableWidth = (dates: string[]) => STICKY_W + dates.length * DAY_COL_W + HOURS_W;

export type GradeMonthlyKey =
  | "prev"
  | "next"
  | "today"
  | "excel"
  | "legendToggle"
  | "table"
  | `cell_${number}_${string}_${Session}`;

export type GradeMonthlyCtx = { dates: string[]; legendOpen: boolean; rowsCount: number };

export const gradeMonthlyRect = (key: GradeMonthlyKey, width: number, ctx: GradeMonthlyCtx): Rect => {
  if (key === "prev") return { x: PAD_X + PREV_X, y: 0, w: PREV_W, h: NAV_H };
  if (key === "today") return { x: PAD_X + NOW_X, y: 0, w: NOW_W, h: NAV_H };
  if (key === "next") return { x: PAD_X + NEXT_X, y: 0, w: NEXT_W, h: NAV_H };
  if (key === "excel") return { x: width - PAD_X - EXCEL_W, y: 0, w: EXCEL_W, h: NAV_H };
  if (key === "legendToggle") return { x: PAD_X, y: NAV_H + GAP_NAV_LEGEND, w: width - PAD_X * 2, h: LEGEND_TOGGLE_H };
  if (key === "table") {
    return { x: PAD_X, y: tableY(ctx.legendOpen), w: tableWidth(ctx.dates), h: HEAD1_H + HEAD2_H + BODY_H * ctx.rowsCount + FOOT_H };
  }
  const parts = key.split("_");
  const rowIndex = Number(parts[1]);
  const date = parts[2];
  const session = parts[3] as Session;
  const dateIndex = ctx.dates.indexOf(date);
  return {
    x: PAD_X + sessionColX(dateIndex, session),
    y: rowY(ctx.legendOpen, rowIndex),
    w: SESSION_COL_W,
    h: BODY_H,
  };
};

export const gradeMonthlyPoint = (key: GradeMonthlyKey, width: number, ctx: GradeMonthlyCtx): Point => {
  const r = gradeMonthlyRect(key, width, ctx);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};

const Th: React.FC<{ x: number; w: number; h: number; children?: React.ReactNode; border?: boolean; bg?: string }> = ({
  x,
  w,
  h,
  children,
  border,
  bg,
}) => (
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
      background: bg,
      whiteSpace: "nowrap",
      boxSizing: "border-box",
    }}
  >
    {children}
  </div>
);

const LegendItem: React.FC<{ symbol: string; color: string; bg?: string; label: string }> = ({ symbol, color, bg, label }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
    <span style={{ fontSize: 13, fontWeight: 800, color, background: bg, padding: bg ? "0 2px" : undefined, borderRadius: bg ? 2 : undefined }}>
      {symbol}
    </span>
    <span style={{ fontSize: 11, color: tw.gray[500] }}>{label}</span>
  </span>
);

export type GradeMonthlyMockProps = {
  width: number;
  dates: string[];
  rows: MonthlyRow[];
  legendOpen: boolean;
  prevPressAt?: number;
  nextPressAt?: number;
  excelPressAt?: number;
  legendPressAt?: number;
};

export const GradeMonthlyMock: React.FC<GradeMonthlyMockProps> = ({
  width,
  dates,
  rows,
  legendOpen,
  prevPressAt,
  nextPressAt,
  excelPressAt,
  legendPressAt,
}) => {
  const frame = useCurrentFrame();
  const y0 = tableY(legendOpen);
  const tableW = tableWidth(dates);
  const totalH = y0 + HEAD1_H + HEAD2_H + rows.length * BODY_H + FOOT_H + 8;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height: totalH, fontFamily: FONT }}>
      {/* 헤더: 월 네비게이션 + Excel(79-87행) — 좌표 함수와 맞도록 절대 좌표로 배치 */}
      <div style={{ position: "absolute", left: PAD_X, top: 0, width: width - PAD_X * 2, height: NAV_H }}>
        <div style={{ position: "absolute", left: PREV_X, top: 0, width: PREV_W, height: NAV_H, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${tw.gray[300]}`, borderRadius: 6, background: tw.white, fontSize: 13, color: tw.gray[700], boxSizing: "border-box", scale: String(pressScale(frame, prevPressAt ?? null)) }}>
          &larr;
        </div>
        <span style={{ position: "absolute", left: LABEL_X, top: 0, width: LABEL_W, height: NAV_H, display: "flex", alignItems: "center", fontSize: 16, fontWeight: 600, color: tw.gray[800], whiteSpace: "nowrap" }}>
          2026.09
        </span>
        <div style={{ position: "absolute", left: NOW_X, top: 0, width: NOW_W, height: NAV_H, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${tw.blue[200]}`, borderRadius: 6, background: tw.blue[50], color: tw.blue[600], fontSize: 11, whiteSpace: "nowrap", boxSizing: "border-box" }}>
          Now
        </div>
        <div style={{ position: "absolute", left: NEXT_X, top: 0, width: NEXT_W, height: NAV_H, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${tw.gray[300]}`, borderRadius: 6, background: tw.white, fontSize: 13, color: tw.gray[700], boxSizing: "border-box", scale: String(pressScale(frame, nextPressAt ?? null)) }}>
          &rarr;
        </div>
        <div style={{ position: "absolute", left: width - PAD_X * 2 - EXCEL_W, top: 0, width: EXCEL_W, height: NAV_H, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, background: tw.green[600], color: tw.white, fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", boxSizing: "border-box", scale: String(pressScale(frame, excelPressAt ?? null)) }}>
          Excel
        </div>
      </div>

      {/* 범례 토글(90-106행) */}
      <div style={{ position: "absolute", left: PAD_X, top: NAV_H + GAP_NAV_LEGEND, width: width - PAD_X * 2, height: LEGEND_TOGGLE_H, display: "flex", alignItems: "center", gap: 6, scale: String(pressScale(frame, legendPressAt ?? null)) }}>
        <span style={{ flex: 1, borderTop: `1px solid ${tw.gray[200]}` }} />
        <span style={{ fontSize: 10, color: tw.gray[400] }}>{legendOpen ? "▲" : "▼"}</span>
        <span style={{ flex: 1, borderTop: `1px solid ${tw.gray[200]}` }} />
      </div>
      {legendOpen ? (
        <div style={{ position: "absolute", left: PAD_X, top: NAV_H + GAP_NAV_LEGEND + LEGEND_TOGGLE_H + GAP_TOGGLE_CONTENT, width: width - PAD_X * 2, height: LEGEND_CONTENT_H, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
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
      ) : null}

      {/* 표(113-221행) */}
      <div style={{ position: "absolute", left: PAD_X, top: y0, width: tableW, background: tw.white, border: `1px solid ${tw.gray[300]}`, borderRadius: 8, overflow: "hidden", boxSizing: "border-box" }}>
        {/* 헤더 1행: 반/번/이름 sticky + 날짜(colSpan 3) + 시간 */}
        <div style={{ position: "relative", height: HEAD1_H, background: tw.gray[50], borderBottom: `1px solid ${tw.gray[300]}` }}>
          <Th x={0} w={CLASS_W} h={HEAD1_H} bg={tw.gray[50]}>반</Th>
          <Th x={CLASS_W} w={NO_W} h={HEAD1_H} bg={tw.gray[50]}>번</Th>
          <Th x={CLASS_W + NO_W} w={NAME_W} h={HEAD1_H} bg={tw.gray[50]}>이름</Th>
          {dates.map((date, i) => {
            const d = new Date(`${date}T00:00:00Z`);
            const dayName = ["일", "월", "화", "수", "목", "금", "토"][d.getUTCDay()];
            return (
              <Th key={date} x={dayColX(i)} w={DAY_COL_W} h={HEAD1_H} border>
                {date.slice(8)}/{dayName}
              </Th>
            );
          })}
          <Th x={STICKY_W + dates.length * DAY_COL_W} w={HOURS_W} h={HEAD1_H} border>
            시간
          </Th>
        </div>
        {/* 헤더 2행: 오후1/오후2/야간 */}
        <div style={{ position: "relative", height: HEAD2_H, background: tw.gray[50], borderBottom: `1px solid ${tw.gray[300]}` }}>
          <Th x={0} w={CLASS_W} h={HEAD2_H} bg={tw.gray[50]} />
          <Th x={CLASS_W} w={NO_W} h={HEAD2_H} bg={tw.gray[50]} />
          <Th x={CLASS_W + NO_W} w={NAME_W} h={HEAD2_H} bg={tw.gray[50]} />
          {dates.map((date, i) =>
            SESSIONS.map((session, si) => (
              <Th key={`${date}-${session}`} x={sessionColX(i, session)} w={SESSION_COL_W} h={HEAD2_H} border={si === 0}>
                <span style={{ fontSize: 9, color: tw.gray[400] }}>{SESSION_SHORT[session]}</span>
              </Th>
            )),
          )}
          <Th x={STICKY_W + dates.length * DAY_COL_W} w={HOURS_W} h={HEAD2_H} border />
        </div>

        {/* 본문 */}
        {rows.map((row, index) => {
          const prevClassNumber = index === 0 ? -1 : rows[index - 1].student.classNumber;
          const showClass = row.student.classNumber !== prevClassNumber;
          const isEvenClass = row.student.classNumber % 2 === 0;
          const rowBg = isEvenClass ? EVEN_CLASS_BG : tw.white;
          return (
            <div key={row.student.id} style={{ position: "relative", height: BODY_H, background: rowBg, borderBottom: `1px solid ${tw.gray[300]}`, boxSizing: "border-box" }}>
              <div style={{ position: "absolute", left: 0, top: 0, width: CLASS_W, height: BODY_H, background: rowBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: tw.gray[800], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                {showClass ? row.student.classNumber : ""}
              </div>
              <div style={{ position: "absolute", left: CLASS_W, top: 0, width: NO_W, height: BODY_H, background: rowBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: tw.gray[600], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                {row.student.number}
              </div>
              <div style={{ position: "absolute", left: CLASS_W + NO_W, top: 0, width: NAME_W, height: BODY_H, background: rowBg, display: "flex", alignItems: "center", paddingLeft: 6, fontSize: 13, fontWeight: 500, color: tw.gray[900], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                {row.student.name}
              </div>
              {dates.map((date, i) =>
                SESSIONS.map((session, si) => {
                  const v = row.cells[date][session];
                  return (
                    <div
                      key={`${date}-${session}`}
                      style={{
                        position: "absolute",
                        left: sessionColX(i, session),
                        top: 0,
                        width: SESSION_COL_W,
                        height: BODY_H,
                        borderLeft: si === 0 ? `1px solid ${tw.gray[300]}` : undefined,
                        background: CELL_BG[v],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxSizing: "border-box",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 800, color: CELL_TEXT[v] }}>{CELL_SYMBOL[v]}</span>
                    </div>
                  );
                }),
              )}
              <div style={{ position: "absolute", left: STICKY_W + dates.length * DAY_COL_W, top: 0, width: HOURS_W, height: BODY_H, borderLeft: `1px solid ${tw.gray[300]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: tw.blue[600], boxSizing: "border-box" }}>
                {Number(row.hours) > 0 ? row.hours : "-"}
              </div>
            </div>
          );
        })}

        {/* 총원(218-220행) */}
        <div style={{ height: FOOT_H, background: tw.gray[50], display: "flex", alignItems: "center", paddingLeft: 16, fontSize: 12, color: tw.gray[500], whiteSpace: "nowrap", boxSizing: "border-box" }}>
          총 {rows.length}명
        </div>
      </div>
    </div>
  );
};
