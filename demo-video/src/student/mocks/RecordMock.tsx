// src/app/student/attendance/page.tsx 이식. 헤더 없이 폰 본문 폭(390) 기준, 페이지 자체의 여백
// (main px-2 py-6, student/layout.tsx:83)을 이 목업이 직접 그린다. 데이터는 항상 student/data.ts의
// MY_RECORD(이번 주 9/14~9/18, 이번 달 9월 1~17일)를 그대로 쓴다 — 주/월 네비게이션은 프레임 연출용
// pressAt만 받고 실제로 다른 주·달을 보여주지 않는다(고정 데이터).
import React from "react";
import { useCurrentFrame } from "remotion";
import { pressScale } from "../../app-mocks/primitives";
import type { Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import type { Session } from "../../app-mocks/data";
import { MY_RECORD, sessionLabels, weekdayLabels } from "../data";
import { FONT } from "../../fonts";

const PAD_X = 8; // main px-2 (student/layout.tsx:83)
const PAD_TOP = 24; // main py-6

const TITLE_H = 28; // text-xl font-bold "출결기록" (page.tsx:102)
const TITLE_MB = 16; // mb-4

const TAB_H = 44; // min-h-11 (106-125행)
const TAB_GAP = 8; // gap-2
const TAB_MB = 16; // mb-4

const NAV_H = 44; // min-h-11 min-w-11 (<, > 버튼)
const NAV_MB = 16; // mb-4

const SESSION_ORDER: Session[] = ["afternoon1", "afternoon2", "night"]; // src/lib/sessions.ts:1

// -- 주간 표 --
const COL0_W = 64; // w-16 (226행)
const TABLE_HEAD_H = 44; // th py-2.5, 요일+날짜 두 줄 (227-237행)
const TABLE_ROW_H = 40; // td py-3 (243-256행)
const TABLE_H = TABLE_HEAD_H + TABLE_ROW_H * SESSION_ORDER.length;

const REASONS_MT = 16; // mt-4 (266행)
const REASONS_TITLE_H = 16; // h4 text-sm (268행)
const REASONS_GAP = 8; // space-y-2 (267행)
const REASON_ITEM_H = 36; // text-sm px-3 py-2 (270-276행)

// -- 월간 달력 --
const CAL_HEAD_H = 28; // 요일 헤더 py-2 text-xs (381-390행)
const CAL_CELL_H = 72; // min-h-[72px] (396,409행)
const CAL_ROWS = 5; // 2026-09: 1일=화, 30일 → 5행
const CALENDAR_H = CAL_HEAD_H + CAL_CELL_H * CAL_ROWS;

const LEGEND_MT = 12; // mt-3 (437행)
const LEGEND_H = 16; // text-xs 한 줄 (438-446행)

// MY_RECORD.week.range="9/14 ~ 9/18"(월~금 연속) 에서 매일의 "M/D" 라벨을 뽑는다.
const weekDayDates: string[] = (() => {
  const [monthStr, startDay] = MY_RECORD.week.range.split(" ~ ")[0].split("/");
  return weekdayLabels.map((_, i) => `${monthStr}/${Number(startDay) + i}`);
})();

const pillW = (label: string) => label.length * 13 + 32; // px-4 + 글자당 근사폭(text-sm)

const TAB_WEEK_W = pillW("이번 주");
const TAB_MONTH_W = pillW("이번 달");

const layout = () => {
  const titleY = PAD_TOP;
  const tabsY = titleY + TITLE_H + TITLE_MB;
  const navY = tabsY + TAB_H + TAB_MB;
  const contentY = navY + NAV_H + NAV_MB;
  return { titleY, tabsY, navY, contentY };
};

// view는 table/reasons(주간)와 calendar/legend(월간)가 서로 배타적이라는 걸 문서화하는 용도 —
// toggle_*/nav_* 위치는 두 뷰에서 동일해 실제 계산에는 쓰이지 않는다.
export const recordRect = (
  key: "toggle_week" | "toggle_month" | "table" | "reasons" | "calendar" | "legend" | "nav_prev" | "nav_next",
  width: number,
  view: "week" | "month",
): Rect => {
  void view;
  const L = layout();
  const cw = width - PAD_X * 2;
  if (key === "toggle_week") return { x: PAD_X, y: L.tabsY, w: TAB_WEEK_W, h: TAB_H };
  if (key === "toggle_month") return { x: PAD_X + TAB_WEEK_W + TAB_GAP, y: L.tabsY, w: TAB_MONTH_W, h: TAB_H };
  if (key === "nav_prev") return { x: PAD_X, y: L.navY, w: NAV_H, h: NAV_H };
  if (key === "nav_next") return { x: PAD_X + cw - NAV_H, y: L.navY, w: NAV_H, h: NAV_H };
  if (key === "table") return { x: PAD_X, y: L.contentY, w: cw, h: TABLE_H };
  if (key === "reasons") {
    const h = REASONS_TITLE_H + REASONS_GAP + REASON_ITEM_H * MY_RECORD.week.reasons.length;
    return { x: PAD_X, y: L.contentY + TABLE_H + REASONS_MT, w: cw, h };
  }
  if (key === "calendar") return { x: PAD_X, y: L.contentY, w: cw, h: CALENDAR_H };
  return { x: PAD_X, y: L.contentY + CALENDAR_H + LEGEND_MT, w: cw, h: LEGEND_H }; // legend
};

const NavButton: React.FC<{ label: string; scale: number }> = ({ label, scale }) => (
  <div
    style={{
      width: NAV_H,
      height: NAV_H,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: tw.gray[500],
      fontSize: 16,
      whiteSpace: "nowrap",
      boxSizing: "border-box",
      scale: String(scale),
    }}
  >
    {label}
  </div>
);

const WeeklyTable: React.FC<{ x: number; y: number; width: number }> = ({ x, y, width }) => {
  const colW = (width - COL0_W) / weekdayLabels.length;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        borderRadius: 8,
        border: `1px solid ${tw.gray[200]}`,
        background: tw.white,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", background: tw.gray[50], borderBottom: `1px solid ${tw.gray[200]}`, height: TABLE_HEAD_H }}>
        <div style={{ width: COL0_W, flexShrink: 0 }} />
        {weekdayLabels.map((d, i) => (
          <div
            key={d}
            style={{
              width: colW,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 500,
              color: tw.gray[600],
              whiteSpace: "nowrap",
            }}
          >
            <div>{d}</div>
            <div style={{ fontSize: 10, color: tw.gray[400], fontWeight: 400 }}>{weekDayDates[i]}</div>
          </div>
        ))}
      </div>
      {SESSION_ORDER.map((session) => (
        <div key={session} style={{ display: "flex", height: TABLE_ROW_H, borderTop: `1px solid ${tw.gray[100]}` }}>
          <div
            style={{
              width: COL0_W,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              paddingLeft: 12,
              fontSize: 13,
              fontWeight: 500,
              color: tw.gray[600],
              whiteSpace: "nowrap",
              boxSizing: "border-box",
              background: tw.white,
            }}
          >
            {sessionLabels[session]}
          </div>
          {MY_RECORD.week.cells[session].map((cell, i) => (
            <div key={i} style={{ width: colW, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: cell === "-" ? 400 : 700,
                  color: cell === "O" ? tw.green[600] : cell === "X" ? tw.red[600] : tw.gray[300],
                }}
              >
                {cell}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const WeekAbsenceReasons: React.FC<{ x: number; y: number; width: number }> = ({ x, y, width }) => (
  <div style={{ position: "absolute", left: x, top: y, width }}>
    <div style={{ fontSize: 12, fontWeight: 500, color: tw.gray[600], whiteSpace: "nowrap" }}>결석 사유</div>
    {MY_RECORD.week.reasons.map((r, i) => (
      <div
        key={i}
        style={{
          marginTop: REASONS_GAP,
          height: REASON_ITEM_H,
          borderRadius: 8,
          background: tw.red[50],
          color: tw.gray[500],
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          boxSizing: "border-box",
          fontSize: 12,
          whiteSpace: "nowrap",
        }}
      >
        {r.dateLabel} {sessionLabels[r.session]}: {r.label}
      </div>
    ))}
  </div>
);

const YEAR = 2026;
const MONTH = 9; // student/data.ts TODAY="2026-09-17" 기준

const calendarCells = (): (number | null)[] => {
  const firstDow = new Date(Date.UTC(YEAR, MONTH - 1, 1)).getUTCDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1; // 월요일 시작
  const daysInMonth = new Date(Date.UTC(YEAR, MONTH, 0)).getUTCDate();
  const cells: (number | null)[] = Array.from({ length: startOffset }, () => null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  return cells;
};

const dateStr = (day: number) => `${YEAR}-${String(MONTH).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const monthDotMap = (() => {
  const map = new Map<string, Map<Session, "present" | "absent">>();
  MY_RECORD.month.forEach((dot) => {
    if (!map.has(dot.date)) map.set(dot.date, new Map());
    map.get(dot.date)!.set(dot.session, dot.status);
  });
  return map;
})();

const Calendar: React.FC<{ x: number; y: number; width: number }> = ({ x, y, width }) => {
  const cells = calendarCells();
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        borderRadius: 8,
        border: `1px solid ${tw.gray[200]}`,
        background: tw.white,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* grid-cols-7 (page.tsx:381) — flex+wrap 대신 grid를 써야 colW가 정수가 아닐 때(390/7 등) 반올림 오차로
          7번째 칸이 다음 줄로 밀리는 문제가 없다. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: tw.gray[50], borderBottom: `1px solid ${tw.gray[200]}`, height: CAL_HEAD_H }}>
        {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
          <div key={d} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: tw.gray[500] }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e${idx}`} style={{ height: CAL_CELL_H, borderTop: `1px solid ${tw.gray[100]}`, borderRight: `1px solid ${tw.gray[100]}`, boxSizing: "border-box" }} />;
          const dow = new Date(Date.UTC(YEAR, MONTH - 1, day)).getUTCDay();
          const isWeekend = dow === 0 || dow === 6;
          const dots = monthDotMap.get(dateStr(day));
          return (
            <div
              key={day}
              style={{
                height: CAL_CELL_H,
                borderTop: `1px solid ${tw.gray[100]}`,
                borderRight: `1px solid ${tw.gray[100]}`,
                boxSizing: "border-box",
                background: isWeekend ? tw.gray[50] : tw.white,
                padding: 6,
              }}
            >
              <div style={{ fontSize: 11, color: isWeekend ? tw.gray[400] : tw.gray[700], marginBottom: 4 }}>{day}</div>
              {!isWeekend && dots
                ? SESSION_ORDER.map((session) => {
                    const status = dots.get(session);
                    return (
                      <div key={session} style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                        <span style={{ fontSize: 10, color: tw.gray[400], whiteSpace: "nowrap" }}>{sessionLabels[session]}</span>
                        {status ? (
                          <span
                            style={{
                              display: "inline-block",
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: status === "present" ? tw.green[500] : tw.red[500],
                            }}
                          />
                        ) : null}
                      </div>
                    );
                  })
                : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Legend: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", gap: 16, fontSize: 11, color: tw.gray[500] }}>
    <div style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: tw.green[500] }} />
      출석
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: tw.red[500] }} />
      결석
    </div>
  </div>
);

export const RecordMock: React.FC<{
  width: number;
  view: "week" | "month";
  togglePressAt?: { view: "week" | "month"; at: number };
  navPressAt?: { dir: "prev" | "next"; at: number };
}> = ({ width, view, togglePressAt, navPressAt }) => {
  const frame = useCurrentFrame();
  const L = layout();
  const cw = width - PAD_X * 2;
  const navLabel = view === "week" ? MY_RECORD.week.range : `${YEAR}년 ${MONTH}월`;
  const prevScale = pressScale(frame, navPressAt?.dir === "prev" ? navPressAt.at : undefined);
  const nextScale = pressScale(frame, navPressAt?.dir === "next" ? navPressAt.at : undefined);

  const contentH = view === "week" ? TABLE_H + REASONS_MT + REASONS_TITLE_H + REASONS_GAP + REASON_ITEM_H * MY_RECORD.week.reasons.length : CALENDAR_H + LEGEND_MT + LEGEND_H;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height: L.contentY + contentH + PAD_TOP, background: tw.gray[50], fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: PAD_X, top: L.titleY, fontSize: 20, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap" }}>출결기록</div>

      {(["week", "month"] as const).map((tab, i) => {
        const selected = view === tab;
        const w = tab === "week" ? TAB_WEEK_W : TAB_MONTH_W;
        const xOff = i === 0 ? 0 : TAB_WEEK_W + TAB_GAP;
        const bounceAt = togglePressAt?.view === tab ? togglePressAt.at : undefined;
        return (
          <div
            key={tab}
            style={{
              position: "absolute",
              left: PAD_X + xOff,
              top: L.tabsY,
              width: w,
              height: TAB_H,
              borderRadius: 8,
              background: selected ? tw.blue[600] : tw.gray[100],
              color: selected ? tw.white : tw.gray[600],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: "nowrap",
              boxSizing: "border-box",
              scale: String(pressScale(frame, bounceAt)),
            }}
          >
            {tab === "week" ? "이번 주" : "이번 달"}
          </div>
        );
      })}

      <div style={{ position: "absolute", left: PAD_X, top: L.navY, width: cw, height: NAV_H, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <NavButton label="<" scale={prevScale} />
        <span style={{ fontSize: 13, fontWeight: 500, color: tw.gray[700], whiteSpace: "nowrap" }}>{navLabel}</span>
        <NavButton label=">" scale={nextScale} />
      </div>

      {view === "week" ? (
        <>
          <WeeklyTable x={PAD_X} y={L.contentY} width={cw} />
          {MY_RECORD.week.reasons.length > 0 ? (
            <WeekAbsenceReasons x={PAD_X} y={L.contentY + TABLE_H + REASONS_MT} width={cw} />
          ) : null}
        </>
      ) : (
        <>
          <Calendar x={PAD_X} y={L.contentY} width={cw} />
          <Legend x={PAD_X} y={L.contentY + CALENDAR_H + LEGEND_MT} />
        </>
      )}
    </div>
  );
};
