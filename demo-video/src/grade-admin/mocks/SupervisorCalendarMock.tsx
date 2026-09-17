// src/app/grade-admin/[grade]/page.tsx 106-125행("감독 배정" 탭: 누계 버튼 + MonthlyCalendar) +
// src/components/admin-shared/MonthlyCalendar.tsx(달력 그리드 · 드롭다운) 이식 — 셸 없이 본문만.
// GradeAdminShellMock(T2)이 헤더+6탭 바까지 그린다는 컨트롤러 결정에 따라, 이 목업은 main의
// 좌우 padding(layout.tsx lg:px-4=16)만 스스로 그리고 위쪽은 탭 바로 아래에서 바로 시작한다고 가정한다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { FONT } from "../../fonts";
import { TEACHERS } from "../../app-mocks/data";
import type { Point, Rect } from "../../app-mocks/layout";
import { pressScale, typedSlice, TypedText } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import type { SupervisorDay } from "../../app-mocks/data";

const PAD_X = 16; // grade-admin/[grade]/layout.tsx 6행 lg:px-4

const TOTALS_BTN_W = 46; // page.tsx 109-114행 "누계" px-2.5 py-1 text-xs
const TOTALS_BTN_H = 26;
const GAP_TOTALS_NAV = 12; // 108행 mb-3

const NAV_H = 32; // MonthlyCalendar.tsx 216-248행
const GAP_NAV_GRID = 16; // 216행 mb-4 근사

const DOW_H = 32; // 256-267행 요일 헤더 px-2 py-2 text-sm
const ROW_H = 100; // 276행 isSingleSlot(학년관리는 항상 단일 슬롯) min-h-[100px] (sm+)
const CELL_PAD = 6; // 276행 p-1.5
const DATE_H = 20; // 286-296행 text-sm mb-1
const GAP_DATE_SELECT = 4; // 298행 mt-1
const SELECT_H = 28; // CalendarTeacherSelect(439-449행) isSingleSlot text-sm py-1.5 + border
const GRID_BORDER = 1; // 254행 카드 테두리

const DROPDOWN_W = 192; // 453행 w-48
const DROPDOWN_ROW_H = 44; // 457-479행 li min-h-11
const DROPDOWN_NO_RESULT_H = 24; // 480-482행 검색 결과 없음(min-h-11 아님, px-2 py-1.5)
const DROPDOWN_MAX_H = 192; // 453행 max-h-48
const DROPDOWN_GAP = 2; // 453행 mt-0.5 / bottom-full mb-0.5
const UPWARD_DROPDOWN_WEEKS = 2; // MonthlyCalendar.tsx 24행

const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const TOTALS_Y = 0;
const NAV_Y = TOTALS_Y + TOTALS_BTN_H + GAP_TOTALS_NAV;
const CARD_Y = NAV_Y + NAV_H + GAP_NAV_GRID;

const pad2 = (n: number) => String(n).padStart(2, "0");
const innerW = (width: number) => width - PAD_X * 2 - GRID_BORDER * 2;

// date(YYYY-MM-DD)만으로 격자 위치를 계산 — 그 날짜가 속한 달의 1일 요일만 있으면 되므로
// month prop을 별도로 들고 다닐 필요가 없다(주말 포함 7열 고정, MonthlyCalendar.tsx는 슬롯 수와 무관하게 항상 7열).
const cellPosition = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const index = firstDow + (d - 1);
  return { row: Math.floor(index / 7), col: index % 7 };
};

const monthRowCount = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const lastDate = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Math.ceil((firstDow + lastDate) / 7);
};

const isOpenUpward = (date: string) => {
  const rows = monthRowCount(date.slice(0, 7));
  const { row } = cellPosition(date);
  return row >= rows - UPWARD_DROPDOWN_WEEKS;
};

const dateCellRect = (date: string, width: number): Rect => {
  const { row, col } = cellPosition(date);
  const cw = innerW(width) / 7;
  return {
    x: PAD_X + GRID_BORDER + col * cw,
    y: CARD_Y + GRID_BORDER + DOW_H + row * ROW_H,
    w: cw,
    h: ROW_H,
  };
};

const selectRect = (date: string, width: number): Rect => {
  const cell = dateCellRect(date, width);
  return {
    x: cell.x + CELL_PAD,
    y: cell.y + CELL_PAD + DATE_H + GAP_DATE_SELECT,
    w: cell.w - CELL_PAD * 2 - GRID_BORDER,
    h: SELECT_H,
  };
};

// 370-378행: query로 거른 뒤 우리 학년(primaryGrade===myGrade) 먼저, 다른 학년 뒤.
// 455-462행: "미배정"은 query와 무관하게 항상 맨 위 고정.
type OptionRow = { key: string; name: string | null; primaryGrade?: 1 | 2 | 3; dividerAfter: boolean };

const groupOptions = (myGrade: 1 | 2 | 3, query: string): OptionRow[] => {
  const filtered = query ? TEACHERS.filter((t) => t.name.includes(query)) : TEACHERS;
  const primary = filtered.filter((t) => t.primaryGrade === myGrade);
  const others = filtered.filter((t) => t.primaryGrade !== myGrade);
  const separatorAfter = primary.length > 0 && others.length > 0 ? primary.length - 1 : -1;
  const rows: OptionRow[] = [{ key: "unassigned", name: null, dividerAfter: false }];
  [...primary, ...others].forEach((t, i) => {
    rows.push({ key: t.name, name: t.name, primaryGrade: t.primaryGrade, dividerAfter: i === separatorAfter });
  });
  return rows;
};

const dropdownHeight = (myGrade: 1 | 2 | 3, query: string) => {
  const rows = groupOptions(myGrade, query);
  const noResult = query.length > 0 && rows.length === 1; // 미배정 하나만 남음 = 교사 매치 0건
  return Math.min(DROPDOWN_MAX_H, rows.length * DROPDOWN_ROW_H + (noResult ? DROPDOWN_NO_RESULT_H : 0));
};

const dropdownRect = (date: string, width: number, myGrade: 1 | 2 | 3, query: string): Rect => {
  const sel = selectRect(date, width);
  const h = dropdownHeight(myGrade, query);
  const upward = isOpenUpward(date);
  return {
    x: sel.x,
    y: upward ? sel.y - DROPDOWN_GAP - h : sel.y + sel.h + DROPDOWN_GAP,
    w: DROPDOWN_W,
    h,
  };
};

const optionRect = (date: string, width: number, myGrade: 1 | 2 | 3, query: string, optionKey: string): Rect => {
  const d = dropdownRect(date, width, myGrade, query);
  const rows = groupOptions(myGrade, query);
  const idx = Math.max(0, rows.findIndex((r) => r.key === optionKey));
  return { x: d.x, y: d.y + idx * DROPDOWN_ROW_H, w: d.w, h: DROPDOWN_ROW_H };
};

export type SupervisorCalendarKey =
  | "totals"
  | "prevMonth"
  | "nextMonth"
  | "dayHeader"
  | `day_${string}`
  | `select_${string}`
  | `dropdown_${string}`
  | `option_${string}_${string}`;

export const supervisorCalendarRect = (
  key: SupervisorCalendarKey,
  width: number,
  ctx: { myGrade?: 1 | 2 | 3; query?: string } = {},
): Rect => {
  const myGrade = ctx.myGrade ?? 1;
  const query = ctx.query ?? "";
  if (key === "totals") {
    return { x: width - PAD_X - TOTALS_BTN_W, y: TOTALS_Y, w: TOTALS_BTN_W, h: TOTALS_BTN_H };
  }
  if (key === "prevMonth" || key === "nextMonth") {
    const w = 78;
    return { x: key === "prevMonth" ? PAD_X : width - PAD_X - w, y: NAV_Y, w, h: NAV_H };
  }
  if (key === "dayHeader") {
    return { x: PAD_X + GRID_BORDER, y: CARD_Y + GRID_BORDER, w: innerW(width), h: DOW_H };
  }
  const parts = key.split("_");
  if (parts[0] === "day") return dateCellRect(parts[1], width);
  if (parts[0] === "select") return selectRect(parts[1], width);
  if (parts[0] === "dropdown") return dropdownRect(parts[1], width, myGrade, query);
  return optionRect(parts[1], width, myGrade, query, parts[2]);
};

export const supervisorCalendarPoint = (
  key: SupervisorCalendarKey,
  width: number,
  ctx: { myGrade?: 1 | 2 | 3; query?: string } = {},
): Point => {
  const r = supervisorCalendarRect(key, width, ctx);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};

export type SupervisorCalendarMockProps = {
  width: number;
  month: "2026-09";
  assignments: Record<string, SupervisorDay>;
  myGrade: 1 | 2 | 3;
  totalsPressAt?: number;
  cellPressAt?: { date: string; at: number };
  // 날짜 칸을 눌러 드롭다운을 여는 상태 — 검색창은 별도 필드가 아니라 셀의 입력창 자체가 바뀐다(439-449행 CalendarTeacherSelect와 동일).
  openCell?: {
    date: string;
    search: { text: string; typeFrom?: number };
    pickAt?: number;
    picked?: string | null; // 확정된 값. null = 미배정. undefined면 아직 목록만 보여준다.
  };
};

const SupervisorDropdown: React.FC<{ date: string; width: number; myGrade: 1 | 2 | 3; query: string }> = ({
  date,
  width,
  myGrade,
  query,
}) => {
  const rows = groupOptions(myGrade, query);
  const noResult = query.length > 0 && rows.length === 1;
  const rect = dropdownRect(date, width, myGrade, query);
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        background: tw.white,
        border: `1px solid ${tw.gray[200]}`,
        borderRadius: 6,
        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        overflow: "hidden",
        boxSizing: "border-box",
        zIndex: 50,
      }}
    >
      {rows.map((r) => (
        <div
          key={r.key}
          style={{
            height: DROPDOWN_ROW_H,
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "0 8px",
            borderBottom: r.dividerAfter ? `1px solid ${tw.gray[200]}` : "none",
            fontSize: 14,
            color: r.name === null ? tw.gray[400] : tw.gray[700],
            whiteSpace: "nowrap",
            boxSizing: "border-box",
          }}
        >
          <span>{r.name ?? "미배정"}</span>
          {r.primaryGrade ? (
            <span style={{ fontSize: 10, color: tw.gray[400] }}>{r.primaryGrade}학년</span>
          ) : null}
        </div>
      ))}
      {noResult ? (
        <div style={{ height: DROPDOWN_NO_RESULT_H, display: "flex", alignItems: "center", padding: "0 8px", fontSize: 13, color: tw.gray[400], whiteSpace: "nowrap" }}>
          검색 결과 없음
        </div>
      ) : null}
    </div>
  );
};

export const SupervisorCalendarMock: React.FC<SupervisorCalendarMockProps> = ({
  width,
  month,
  assignments,
  myGrade,
  totalsPressAt,
  cellPressAt,
  openCell,
}) => {
  const frame = useCurrentFrame();
  const [y, m] = month.split("-").map(Number);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const lastDate = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days: (string | null)[] = Array.from({ length: firstDow }, () => null);
  for (let d = 1; d <= lastDate; d += 1) days.push(`${y}-${pad2(m)}-${pad2(d)}`);
  const rows = Math.ceil(days.length / 7);
  const cw = innerW(width) / 7;
  const cardW = innerW(width) + GRID_BORDER * 2;
  const cardH = GRID_BORDER * 2 + DOW_H + rows * ROW_H;
  const totalH = CARD_Y + cardH;

  const isPicked = openCell?.picked !== undefined && (openCell.pickAt === undefined || frame >= openCell.pickAt);
  const editingDate = openCell && !isPicked ? openCell.date : null;
  const query = editingDate ? typedSlice(openCell!.search.text, frame, openCell!.search.typeFrom) : "";

  const displayName = (date: string): string | null => {
    if (openCell && isPicked && openCell.date === date) return openCell.picked ?? null;
    return assignments[date]?.[myGrade] ?? null;
  };

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height: totalH, fontFamily: FONT }}>
      {/* 누계(page.tsx 109-114행) */}
      <div
        style={{
          position: "absolute",
          left: width - PAD_X - TOTALS_BTN_W,
          top: TOTALS_Y,
          width: TOTALS_BTN_W,
          height: TOTALS_BTN_H,
          borderRadius: 6,
          border: `1px solid ${tw.gray[200]}`,
          background: tw.gray[50],
          color: tw.gray[500],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          scale: String(pressScale(frame, totalsPressAt ?? null)),
        }}
      >
        누계
      </div>

      {/* 월 네비게이션(MonthlyCalendar.tsx 216-248행) */}
      <div style={{ position: "absolute", left: PAD_X, top: NAV_Y, width: innerW(width) + GRID_BORDER * 2, height: NAV_H }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 78, height: NAV_H, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${tw.gray[300]}`, borderRadius: 6, background: tw.white, fontSize: 13, color: tw.gray[700], whiteSpace: "nowrap", boxSizing: "border-box" }}>
          &larr; 이전달
        </div>
        <div style={{ position: "absolute", left: 0, top: 0, width: innerW(width) + GRID_BORDER * 2, height: NAV_H, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: tw.gray[800], whiteSpace: "nowrap" }}>{y}년 {m}월</span>
          <span style={{ fontSize: 11, color: tw.blue[600], background: tw.blue[50], border: `1px solid ${tw.blue[200]}`, borderRadius: 6, padding: "4px 10px", whiteSpace: "nowrap" }}>이번달</span>
          <span style={{ fontSize: 11, color: tw.emerald[700], background: tw.emerald[50], border: `1px solid ${tw.emerald[200]}`, borderRadius: 6, padding: "4px 10px", whiteSpace: "nowrap" }}>Excel</span>
        </div>
        <div style={{ position: "absolute", left: innerW(width) + GRID_BORDER * 2 - 78, top: 0, width: 78, height: NAV_H, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${tw.gray[300]}`, borderRadius: 6, background: tw.white, fontSize: 13, color: tw.gray[700], whiteSpace: "nowrap", boxSizing: "border-box" }}>
          다음달 &rarr;
        </div>
      </div>

      {/* 달력 카드(254-338행) */}
      <div style={{ position: "absolute", left: PAD_X, top: CARD_Y, width: cardW, height: cardH, background: tw.white, border: `${GRID_BORDER}px solid ${tw.gray[200]}`, borderRadius: 8, boxSizing: "border-box", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: innerW(width), height: DOW_H, display: "flex", background: tw.gray[50], borderBottom: `1px solid ${tw.gray[200]}`, boxSizing: "border-box" }}>
          {DOW_LABELS.map((label, i) => (
            <div key={label} style={{ width: cw, height: DOW_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 500, color: i === 0 ? tw.red[400] : i === 6 ? tw.blue[400] : tw.gray[500], whiteSpace: "nowrap", boxSizing: "border-box" }}>
              {label}
            </div>
          ))}
        </div>

        {days.map((date, i) => {
          const col = i % 7;
          const row = Math.floor(i / 7);
          const x = col * cw;
          const top = DOW_H + row * ROW_H;
          if (!date) {
            return <div key={`blank-${i}`} style={{ position: "absolute", left: x, top, width: cw, height: ROW_H, background: tw.gray[50], borderBottom: `1px solid ${tw.gray[100]}`, borderRight: `1px solid ${tw.gray[100]}`, boxSizing: "border-box" }} />;
          }
          const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
          const isWeekend = dow === 0 || dow === 6;
          const name = displayName(date);
          const isEditing = editingDate === date;
          const pressing = cellPressAt?.date === date ? cellPressAt.at : null;
          const justPicked = openCell?.date === date && isPicked && openCell.pickAt !== undefined ? openCell.pickAt : null;
          return (
            <div key={date} style={{ position: "absolute", left: x, top, width: cw, height: ROW_H, background: isWeekend ? tw.gray[50] : undefined, borderBottom: `1px solid ${tw.gray[100]}`, borderRight: `1px solid ${tw.gray[100]}`, boxSizing: "border-box", padding: CELL_PAD }}>
              <div style={{ height: DATE_H, lineHeight: `${DATE_H}px`, fontSize: 14, fontWeight: 600, color: dow === 0 ? tw.red[400] : dow === 6 ? tw.blue[400] : tw.gray[700], whiteSpace: "nowrap" }}>
                {Number(date.slice(8, 10))}
              </div>
              {!isWeekend ? (
                <div
                  style={{
                    marginTop: GAP_DATE_SELECT,
                    width: cw - CELL_PAD * 2 - GRID_BORDER,
                    height: SELECT_H,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 6px",
                    borderRadius: 4,
                    boxSizing: "border-box",
                    background: isEditing ? tw.white : name ? tw.blue[50] : tw.white,
                    border: `1px solid ${isEditing ? tw.blue[400] : name ? tw.blue[200] : tw.gray[200]}`,
                    scale: String(pressScale(frame, pressing ?? justPicked)),
                  }}
                >
                  {isEditing ? (
                    <TypedText text={openCell!.search.text} from={openCell!.search.typeFrom} placeholder="미배정" />
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 500, color: name ? tw.blue[800] : tw.gray[400], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {name ?? "미배정"}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {editingDate ? <SupervisorDropdown date={editingDate} width={width} myGrade={myGrade} query={query} /> : null}
    </div>
  );
};
