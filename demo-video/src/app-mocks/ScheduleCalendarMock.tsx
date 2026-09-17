// src/app/homeroom/schedule/page.tsx 이식 — 담임 셸 본문에 끼워 넣는 감독일정 달력(월 고정 "2026-09").
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../anim";
import { FONT } from "../fonts";
import type { Point, Rect } from "./layout";
import { pressScale } from "./primitives";
import { tw } from "./tw";
import { SWAP_EXAMPLE, type SUPERVISOR_SEPT } from "./data";

// homeroom/layout.tsx 132행 <main className="... px-4 py-6"> 패딩 — HomeroomShellMock은 헤더만 그리므로
// 본문 목업이 각자 이 패딩을 갖는다(Task 6 HomeroomWeeklyMock 등과 동일 컨벤션, py-6(24)는 16으로 축약).
const PAD_X = 16;
const PAD_TOP = 16;

const NAV_H = 36; // 149-169행: 월 네비게이션 행
const GAP_NAV_LEGEND = 10; // mb-4(16행 원본) 축약
const LEGEND_H = 24; // 172-197행: 범례 + 토일 토글 + 누계
const GAP_LEGEND_GRID = 10; // mb-3 축약
const DAY_HEADER_H = 26; // 206-217행: 요일 헤더
const ROW_H = 68; // 220-287행: 날짜 셀 한 칸(데스크탑 min-h-[120px]를 body 안에 5주×5칸으로 압축)
const DATE_ROW_H = 20; // 230-242행: 날짜 숫자
const GRADE_ROW_H = 15; // 245-281행: 학년별 감독 행(min-h-11 터치 타겟은 정지 이미지 목업 범위 밖)

const GRID_Y = PAD_TOP + NAV_H + GAP_NAV_LEGEND + LEGEND_H + GAP_LEGEND_GRID;
const contentW = (width: number) => width - PAD_X * 2;

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금"];
const FULL_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 2026-08-30(일)을 0주차 기준으로 삼아 모든 날짜의 행·열을 계산한다 — month가 "2026-09" 고정이라 안전.
const WEEK_ANCHOR_UTC = Date.UTC(2026, 7, 30);

const dateInfo = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=일 ~ 6=토
  const diffDays = Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - WEEK_ANCHOR_UTC) / 86400000);
  return { dow, row: Math.floor(diffDays / 7) };
};

const TOTALS_BTN_W = 46;
const TOGGLE_BTN_W = 74;
const GAP_BTNS = 8;

const dayCellRect = (date: string, width: number, weekendOn: boolean): Rect => {
  const { dow, row } = dateInfo(date);
  const cols = weekendOn ? 7 : 5;
  const colW = contentW(width) / cols;
  const col = weekendOn ? dow : dow - 1;
  return { x: PAD_X + col * colW, y: GRID_Y + DAY_HEADER_H + row * ROW_H, w: colW, h: ROW_H };
};

const gradeRowRect = (date: string, grade: 1 | 2 | 3, width: number, weekendOn: boolean): Rect => {
  const cell = dayCellRect(date, width, weekendOn);
  return { x: cell.x + 3, y: cell.y + DATE_ROW_H + (grade - 1) * GRADE_ROW_H, w: cell.w - 6, h: GRADE_ROW_H };
};

export const scheduleRect = (
  key: "legend" | `day_${string}` | `row_${string}_${1 | 2 | 3}`,
  width: number,
): Rect => {
  if (key === "legend") {
    return { x: PAD_X, y: PAD_TOP + NAV_H + GAP_NAV_LEGEND, w: 14, h: 14 };
  }
  const parts = key.split("_");
  if (parts[0] === "day") {
    return dayCellRect(parts[1], width, false);
  }
  return gradeRowRect(parts[1], Number(parts[2]) as 1 | 2 | 3, width, false);
};

export const schedulePoint = (
  key: "totals" | "weekendToggle" | "legend" | `row_${string}_${1 | 2 | 3}`,
  width: number,
): Point => {
  if (key === "totals") {
    const x = PAD_X + contentW(width) - TOTALS_BTN_W;
    return { x: x + TOTALS_BTN_W / 2, y: PAD_TOP + NAV_H + GAP_NAV_LEGEND + LEGEND_H / 2 };
  }
  if (key === "weekendToggle") {
    const x = PAD_X + contentW(width) - TOTALS_BTN_W - GAP_BTNS - TOGGLE_BTN_W;
    return { x: x + TOGGLE_BTN_W / 2, y: PAD_TOP + NAV_H + GAP_NAV_LEGEND + LEGEND_H / 2 };
  }
  if (key === "legend") {
    const r = scheduleRect("legend", width);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }
  const r = scheduleRect(key, width);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};

export type ScheduleCalendarMockProps = {
  width: number;
  month: "2026-09";
  assignments: typeof SUPERVISOR_SEPT;
  highlightTeacher: string;
  today: string;
  weekendOn?: boolean;
  rowPressAt?: { date: string; grade: 1 | 2 | 3; at: number };
  totalsPressAt?: number;
  // SWAP_EXAMPLE 전환만 표시한다(데이터에 다른 교체 사례가 없음): old=SWAP_EXAMPLE.from, new=assignments 값.
  changedCell?: { date: string; grade: 1 | 2 | 3; from: number };
};

const CellName: React.FC<{
  date: string;
  grade: 1 | 2 | 3;
  newName: string;
  changedCell?: ScheduleCalendarMockProps["changedCell"];
}> = ({ date, grade, newName, changedCell }) => {
  const frame = useCurrentFrame();
  const isChanging = changedCell && changedCell.date === date && changedCell.grade === grade;
  if (!isChanging) {
    return <>{newName}</>;
  }
  const oldOpacity = tween(frame, [changedCell.from, changedCell.from + 10], [1, 0]);
  const newOpacity = tween(frame, [changedCell.from, changedCell.from + 10], [0, 1]);
  return (
    <span style={{ position: "relative" }}>
      <span style={{ opacity: oldOpacity }}>{SWAP_EXAMPLE.from}</span>
      <span style={{ position: "absolute", left: 0, top: 0, opacity: newOpacity }}>{newName}</span>
    </span>
  );
};

export const ScheduleCalendarMock: React.FC<ScheduleCalendarMockProps> = ({
  width,
  assignments,
  highlightTeacher,
  today,
  weekendOn = false,
  rowPressAt,
  totalsPressAt,
  changedCell,
}) => {
  const frame = useCurrentFrame();
  const dates = Object.keys(assignments).sort();
  const rows = dates.reduce((max, d) => Math.max(max, dateInfo(d).row), 0) + 1;
  const totalH = GRID_Y + DAY_HEADER_H + rows * ROW_H;
  const cols = weekendOn ? 7 : 5;
  const cw = contentW(width);
  const colW = cw / cols;
  const labels = weekendOn ? FULL_LABELS : WEEKDAY_LABELS;

  const toggleX = cw - TOTALS_BTN_W - GAP_BTNS - TOGGLE_BTN_W;
  const totalsX = cw - TOTALS_BTN_W;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height: totalH, fontFamily: FONT }}>
      {/* 월 네비게이션(149-169행) — 이 목업 범위에서는 "2026-09" 고정, 이전/다음 상호작용 없음 */}
      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: PAD_TOP,
          width: cw,
          height: NAV_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 13, color: tw.gray[400], whiteSpace: "nowrap" }}>&larr;</span>
        <span style={{ fontSize: 16, fontWeight: 600, color: tw.gray[800], whiteSpace: "nowrap" }}>2026.09</span>
        <span style={{ fontSize: 13, color: tw.gray[400], whiteSpace: "nowrap" }}>&rarr;</span>
      </div>

      {/* 범례 + 토일 토글 + 누계(172-197행) */}
      <div style={{ position: "absolute", left: PAD_X, top: PAD_TOP + NAV_H + GAP_NAV_LEGEND, width: cw, height: LEGEND_H }}>
        <div style={{ position: "absolute", left: 0, top: 5, width: 14, height: 14, borderRadius: 3, background: tw.yellow[100], border: `1px solid ${tw.yellow[300]}`, boxSizing: "border-box" }} />
        <span style={{ position: "absolute", left: 20, top: 0, fontSize: 12, color: tw.gray[500], lineHeight: `${LEGEND_H}px`, whiteSpace: "nowrap" }}>
          내 배정
        </span>
        <span style={{ position: "absolute", left: 90, top: 0, fontSize: 12, color: tw.gray[500], lineHeight: `${LEGEND_H}px`, whiteSpace: "nowrap" }}>
          학년별 1명 (오후1·오후2·야간)
        </span>
        <div
          style={{
            position: "absolute",
            left: toggleX,
            top: 0,
            width: TOGGLE_BTN_W,
            height: LEGEND_H,
            borderRadius: 6,
            border: `1px solid ${weekendOn ? tw.blue[200] : tw.gray[200]}`,
            background: weekendOn ? tw.blue[50] : tw.gray[50],
            color: weekendOn ? tw.blue[600] : tw.gray[500],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 500,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
          }}
        >
          {weekendOn ? "토일 ON" : "토일 OFF"}
        </div>
        <div
          style={{
            position: "absolute",
            left: totalsX,
            top: 0,
            width: TOTALS_BTN_W,
            height: LEGEND_H,
            borderRadius: 6,
            border: `1px solid ${tw.gray[200]}`,
            background: tw.gray[50],
            color: tw.gray[500],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 500,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
            scale: String(pressScale(frame, totalsPressAt ?? null)),
          }}
        >
          누계
        </div>
      </div>

      {/* 달력 그리드(204-289행) */}
      <div style={{ position: "absolute", left: PAD_X, top: GRID_Y, width: cw, height: DAY_HEADER_H + rows * ROW_H, border: `1px solid ${tw.gray[200]}`, borderRadius: 8, overflow: "hidden", boxSizing: "border-box" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: cw, height: DAY_HEADER_H, background: tw.gray[50], borderBottom: `1px solid ${tw.gray[200]}`, display: "flex", boxSizing: "border-box" }}>
          {labels.map((label, i) => (
            <div
              key={label}
              style={{
                width: colW,
                height: DAY_HEADER_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 500,
                color: label === "일" ? tw.red[400] : label === "토" ? tw.blue[400] : tw.gray[500],
                whiteSpace: "nowrap",
                boxSizing: "border-box",
                borderRight: i < labels.length - 1 ? `1px solid ${tw.gray[100]}` : "none",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {dates.map((date) => {
          const cell = dayCellRect(date, width, weekendOn);
          const isToday = date === today;
          const dow = dateInfo(date).dow;
          return (
            <div key={date} style={{ position: "absolute", left: cell.x - PAD_X, top: cell.y - GRID_Y - DAY_HEADER_H, width: cell.w, height: cell.h, borderTop: `1px solid ${tw.gray[100]}`, borderRight: `1px solid ${tw.gray[100]}`, boxSizing: "border-box", padding: "3px 3px 0" }}>
              <div
                style={{
                  width: isToday ? 18 : "auto",
                  height: isToday ? 18 : DATE_ROW_H,
                  borderRadius: isToday ? 9 : 0,
                  background: isToday ? tw.blue[600] : "transparent",
                  color: isToday ? tw.white : dow === 0 ? tw.red[400] : dow === 6 ? tw.blue[400] : tw.gray[700],
                  fontSize: 11,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {Number(date.slice(8, 10))}
              </div>
              {(([1, 2, 3] as const)).map((grade) => {
                const newName = assignments[date]?.[grade] ?? "-";
                const isMine = newName === highlightTeacher;
                const isFutureOrToday = date >= today;
                const pressing = rowPressAt && rowPressAt.date === date && rowPressAt.grade === grade ? rowPressAt.at : null;
                return (
                  <div
                    key={grade}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      height: GRADE_ROW_H,
                      borderRadius: 3,
                      padding: "0 2px",
                      boxSizing: "border-box",
                      background: isMine ? tw.yellow[100] : "transparent",
                      border: isMine ? `1px solid ${tw.yellow[300]}` : "1px solid transparent",
                      scale: String(pressScale(frame, pressing)),
                    }}
                  >
                    <span style={{ fontSize: 9, color: tw.gray[400], whiteSpace: "nowrap" }}>{grade}</span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 11,
                        fontWeight: isMine ? 700 : 500,
                        color: isMine ? tw.yellow[900] : newName === "-" ? tw.gray[300] : tw.gray[800],
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      <CellName date={date} grade={grade} newName={newName} changedCell={changedCell} />
                    </span>
                    {newName !== "-" && isFutureOrToday ? (
                      <span style={{ fontSize: 9, fontWeight: 500, color: tw.blue[600], whiteSpace: "nowrap" }}>교체</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
