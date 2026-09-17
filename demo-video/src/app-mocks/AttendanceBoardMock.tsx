// 앱 src/app/attendance/[grade]/page.tsx 886-1104행(고정 날짜 바·탭, 오후1 결과 복사, 교실 카드, 범례) 재현.
// 좌표는 모두 폰 본문(헤더 포함) 기준이고, 화면 요소는 이 파일의 boardLayout 한 곳에서 계산한 위치에 그린다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import {
  ATTENDANCE_HEADER_H,
  AttendanceHeaderMock,
  textWidth,
  type AttendanceHeaderProps,
} from "./AttendanceHeaderMock";
import { ClassroomFrameMock, classroomFrameMetrics } from "./ClassroomFrameMock";
import { SeatCellMock, seatContentHeight, seatMetrics, vwClamp, type SeatCellProps } from "./SeatCellMock";
import {
  AFTERNOON1_BASE,
  AFTERNOON_CLASSROOMS,
  GRADE,
  NIGHT_ROOMS,
  STUDENTS,
  studentById,
  type SeatBase,
} from "./data";
import { PHONE_BODY, type Point, type Rect } from "./layout";
import { pressScale } from "./primitives";

export type BoardTab = "afternoon1" | "afternoon2" | "night" | "absence";
export type SeatView = SeatCellProps & { studentId: number };
export type SeatGroupView = {
  title: string;
  seatCount: number;
  classroom?: { corridorSide: "left" | "right"; divisions: SeatView[][][] };
  rooms?: { name: string; rows: SeatView[][] }[];
};
export type BoardCounts = { present: number; absent: number; unchecked: number; afterSchool: number };

export type AttendanceBoardProps = {
  width: number;
  height: number;
  header: AttendanceHeaderProps;
  dateLabel: string;
  supervisor: string;
  grade: number;
  counts: BoardCounts;
  tab: BoardTab;
  tabPressAt?: { tab: BoardTab; at: number };
  pendingBadge: number;
  groups: SeatGroupView[];
  copyButton?: { visible: boolean; pressAt?: number; busy?: boolean };
  body?: React.ReactNode;
  // 불참신청 탭 본문 높이(px). 주면 스크롤 한계를 계산하고, 없으면 본문 자연 높이로 그린다.
  bodyHeight?: number;
  scrollY?: number;
  // 날짜 바는 폰 폭에서 넘쳐 가로 스크롤된다(카운트 뒤쪽·다른학년이 잘림). 큰 값을 주면 끝까지 민다.
  dateBarScrollX?: number;
  overlay?: React.ReactNode;
};

const PAGE_BG = "#f1f5f9";
const FOREGROUND = "#171717";
const LINE = 1.5;
const CONTAINER_MAX = 960;
const CONTAINER_PAD = 12;
const STICKY_PAD_TOP = 8;
const BAR_H = 44;
const BAR_PAD_X = 14;
const BAR_GAP = 8;
const TAB_H = 44;
const TAB_PAD_TOP = 8;
const TAB_GAP = 4;
const TAB_MIN_W = 64;
const STICKY_H = STICKY_PAD_TOP + BAR_H + TAB_H;
const BOX_PAD = 12;
const BOX_GAP = 20;
const CARD_BORDER = 1;
const TITLE_PAD_Y = 10;
const COPY_H = 44;
const COPY_PAD_X = 16;
const COPY_NEGATIVE_MARGIN = 8;
const DIVISION_GAP = 4;
const EMPTY_SEAT_MIN = 36;
const LEGEND_PAD_Y = 10;
const LEGEND_ITEM_GAP = 4;
const LEGEND_GAP = 8;
const BADGE = 18;

const TAB_ORDER: BoardTab[] = ["afternoon1", "afternoon2", "night", "absence"];
const TAB_LABEL: Record<BoardTab, string> = {
  afternoon1: "오후1",
  afternoon2: "오후2",
  night: "야간",
  absence: "불참신청",
};

const LEGEND: { color: string; label: string; border?: string }[] = [
  { color: "#dbeafe", label: "미체크" },
  { color: "#bbf7d0", label: "출석" },
  { color: "#fecaca", label: "결석" },
  { color: "#fef9c3", label: "불참승인" },
  { color: "#fef9c3", label: "방과후", border: "#facc15" },
  { color: "#e5e7eb", label: "비참여" },
  { color: "#2563eb", label: "선택됨" },
];

type BarKey = "date" | "div1" | "supervisor" | "div2" | "grade" | "counts" | "otherGrade";
type BarItem = { key: BarKey; x: number; w: number };
type PlacedSeat = { seat: SeatView; rect: Rect };
type PlacedGroup = {
  group: SeatGroupView;
  rect: Rect;
  titleBarH: number;
  seats: PlacedSeat[];
  frame?: { x: number; y: number; w: number; middleX: number; middleW: number; h: number };
  desk?: { y: number; h: number };
};

const countItems = (counts: BoardCounts) => [
  { label: "출석", value: counts.present, color: "#86efac" },
  { label: "결석", value: counts.absent, color: "#fca5a5" },
  { label: "미체크", value: counts.unchecked, color: undefined },
  { label: "방과후", value: counts.afterSchool, color: "#fde047" },
];

const supervisorName = (props: AttendanceBoardProps) => props.supervisor || "미배정";

const fonts = (width: number) => ({
  date: vwClamp(13, 3.5, 16, width),
  supervisor: vwClamp(11, 2.6, 13, width),
  counts: vwClamp(10, 2.4, 12, width),
  tab: vwClamp(12, 3, 14, width),
  title: vwClamp(12, 3, 14, width),
  seatCount: vwClamp(10, 2.5, 12, width),
  copy: vwClamp(11, 2.8, 13, width),
  legend: vwClamp(9, 2.2, 11, width),
  swatch: vwClamp(10, 2.5, 14, width),
  desk: vwClamp(10, 2.5, 12, width),
});

const canChangeDate = (props: AttendanceBoardProps) => props.header.gradeAdmin !== undefined;

const dateBarLayout = (props: AttendanceBoardProps, barW: number) => {
  const f = fonts(props.width);
  const isAbsence = props.tab === "absence";
  const countsW =
    countItems(props.counts).reduce(
      (sum, c) => sum + textWidth(`${c.label} `, f.counts) + textWidth(String(c.value), f.counts, 700),
      0,
    ) +
    BAR_GAP * 3;
  const widths: { key: BarKey; w: number }[] = [
    { key: "date", w: textWidth(props.dateLabel, f.date, 700) + (canChangeDate(props) ? 4 + textWidth("▾", 11) : 0) },
    { key: "div1", w: 1 },
    {
      key: "supervisor",
      w: textWidth("감독 ", f.supervisor) + textWidth(supervisorName(props), f.supervisor, 600) + 12,
    },
    { key: "div2", w: 1 },
    { key: "grade", w: textWidth(`${props.grade}학년`, f.supervisor, 700) },
    ...(isAbsence ? [] : [{ key: "counts" as const, w: countsW }]),
    { key: "otherGrade", w: textWidth("다른학년", f.counts) + 20 },
  ];
  const otherGradeMargin = isAbsence ? 0 : BAR_GAP;
  const contentW = widths.reduce((sum, i) => sum + i.w, 0) + BAR_GAP * (widths.length - 1) + otherGradeMargin;
  const available = barW - BAR_PAD_X * 2;
  const free = Math.max(0, available - contentW);
  const autoKey: BarKey = isAbsence ? "otherGrade" : "counts";
  let cursor = 0;
  const items: BarItem[] = widths.map((item) => {
    if (item.key === "otherGrade") cursor += otherGradeMargin;
    if (item.key === autoKey) cursor += free;
    const placed = { key: item.key, x: cursor, w: item.w };
    cursor += item.w + BAR_GAP;
    return placed;
  });
  const maxScrollX = Math.max(0, contentW - available);
  const scrollX = Math.min(maxScrollX, Math.max(0, props.dateBarScrollX ?? 0));
  return { items, maxScrollX, scrollX };
};

const copyLabel = (busy?: boolean) => (busy ? "복사 중..." : "오후1 결과 복사");

const legendRows = (width: number, innerW: number) => {
  const f = fonts(width);
  const itemWidths = LEGEND.map((item) => f.swatch + LEGEND_ITEM_GAP + textWidth(item.label, f.legend));
  let rows = 1;
  let lineW = 0;
  itemWidths.forEach((w) => {
    const next = lineW === 0 ? w : lineW + LEGEND_GAP + w;
    if (next > innerW && lineW > 0) {
      rows += 1;
      lineW = w;
    } else {
      lineW = next;
    }
  });
  const itemH = Math.max(f.swatch, f.legend * LINE);
  return { rows, height: LEGEND_PAD_Y * 2 + rows * itemH + (rows - 1) * LEGEND_GAP };
};

const rowHeight = (row: SeatView[], width: number) =>
  row.length === 0 ? EMPTY_SEAT_MIN : Math.max(...row.map((seat) => seatContentHeight(seat.visual, width)));

const placeGroup = (group: SeatGroupView, x: number, y: number, w: number, width: number): PlacedGroup => {
  const f = fonts(width);
  const titleBarH = TITLE_PAD_Y * 2 + Math.max(f.title, f.seatCount) * LINE;
  const innerX = x + CARD_BORDER;
  const innerW = w - CARD_BORDER * 2;
  const contentTop = y + CARD_BORDER + titleBarH + 1;
  const gridPad = vwClamp(4, 1, 8, width);
  const seatGap = vwClamp(2, 0.6, 4, width);
  const seats: PlacedSeat[] = [];

  const placeRows = (rows: SeatView[][], left: number, top: number, areaW: number) => {
    const cols = Math.max(1, ...rows.map((r) => r.length));
    const seatW = (areaW - gridPad * 2 - seatGap * (cols - 1)) / cols;
    let rowY = top + gridPad;
    rows.forEach((row) => {
      const h = rowHeight(row, width);
      row.forEach((seat, col) => {
        seats.push({ seat, rect: { x: left + gridPad + col * (seatW + seatGap), y: rowY, w: seatW, h } });
      });
      rowY += h + seatGap;
    });
    return rowY + gridPad - top;
  };

  if (group.classroom) {
    const bodyPad = vwClamp(6, 1.5, 12, width);
    const fm = classroomFrameMetrics("screen", width);
    const frameX = innerX + bodyPad;
    const frameY = contentTop + bodyPad;
    const frameW = innerW - bodyPad * 2;
    const middleX = frameX + fm.sideLabelWidth + fm.columnGap;
    const middleW = frameW - (fm.sideLabelWidth + fm.columnGap) * 2;
    const divisions = group.classroom.divisions;
    const divW = (middleW - DIVISION_GAP * (divisions.length - 1)) / divisions.length;
    const frameH = Math.max(
      ...divisions.map((rows, d) => placeRows(rows, middleX + d * (divW + DIVISION_GAP), frameY, divW)),
    );
    const h = frameY + frameH + fm.deskBlockHeight + bodyPad + CARD_BORDER - y;
    return {
      group,
      rect: { x, y, w, h },
      titleBarH,
      seats,
      frame: { x: frameX, y: frameY, w: frameW, middleX, middleW, h: frameH },
    };
  }

  let gridY = contentTop;
  (group.rooms ?? []).forEach((room) => {
    gridY += placeRows(room.rows, innerX, gridY, innerW);
  });
  const deskH = 1 + 12 + f.desk * LINE;
  return {
    group,
    rect: { x, y, w, h: gridY + deskH + CARD_BORDER - y },
    titleBarH,
    seats,
    desk: { y: gridY, h: deskH },
  };
};

const boardLayout = (props: AttendanceBoardProps) => {
  const width = props.width;
  const f = fonts(width);
  const containerW = Math.min(width, CONTAINER_MAX);
  const barX = (width - containerW) / 2 + CONTAINER_PAD;
  const barW = containerW - CONTAINER_PAD * 2;
  const tabW = Math.max(TAB_MIN_W, (barW - TAB_GAP * 3) / 4);
  const dateBar = dateBarLayout(props, barW);

  const boxTop = ATTENDANCE_HEADER_H + STICKY_H;
  const innerX = barX + BOX_PAD;
  const innerW = barW - BOX_PAD * 2;
  let y = boxTop + BOX_PAD;

  const isAbsence = props.tab === "absence";
  const showCopy =
    props.tab === "afternoon2" && (props.copyButton?.visible ?? true) && props.groups.length > 0;
  const copyW = textWidth(copyLabel(props.copyButton?.busy), f.copy, 600) + COPY_PAD_X * 2 + 2;
  const copyRect: Rect = { x: innerX + innerW - copyW, y, w: copyW, h: COPY_H };

  let body: Rect | null = null;
  let legend: Rect | null = null;
  const groups: PlacedGroup[] = [];

  if (isAbsence) {
    body = { x: innerX, y, w: innerW, h: props.bodyHeight ?? 0 };
    y += body.h;
  } else {
    if (showCopy) {
      y += COPY_H - COPY_NEGATIVE_MARGIN + BOX_GAP;
    }
    props.groups.forEach((group, i) => {
      if (i > 0) y += BOX_GAP;
      const placed = placeGroup(group, innerX, y, innerW, width);
      groups.push(placed);
      y += placed.rect.h;
    });
    if (props.groups.length > 0) {
      y += BOX_GAP;
      legend = { x: innerX, y, w: innerW, h: legendRows(width, innerW).height };
      y += legend.h;
    }
  }

  const box: Rect = { x: barX, y: boxTop, w: barW, h: y + BOX_PAD - boxTop };
  const pageHeight = box.y + box.h + CONTAINER_PAD;
  const knowsHeight = !isAbsence || props.bodyHeight !== undefined;
  const maxScrollY = knowsHeight ? Math.max(0, pageHeight - props.height) : Infinity;
  const scrollY = Math.min(maxScrollY, Math.max(0, props.scrollY ?? 0));
  // 헤더는 함께 스크롤되고 날짜 바·탭 묶음(sticky top-0)은 화면 맨 위에 붙는다.
  const stickyY = Math.max(ATTENDANCE_HEADER_H - scrollY, 0);

  return {
    barX,
    barW,
    tabW,
    dateBar,
    box,
    innerX,
    innerW,
    showCopy,
    copyRect,
    body,
    legend,
    groups,
    pageHeight,
    maxScrollY,
    scrollY,
    stickyY,
    knowsHeight,
  };
};

type BoardLayout = ReturnType<typeof boardLayout>;

const barItem = (layout: BoardLayout, key: BarKey) => {
  const item = layout.dateBar.items.find((i) => i.key === key);
  if (!item) throw new Error(`date bar item missing: ${key}`);
  return item;
};

const barItemRect = (layout: BoardLayout, key: BarKey): Rect => {
  const item = barItem(layout, key);
  return {
    x: layout.barX + BAR_PAD_X + item.x - layout.dateBar.scrollX,
    y: layout.stickyY + STICKY_PAD_TOP,
    w: item.w,
    h: BAR_H,
  };
};

const center = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const scrolled = (r: Rect, layout: BoardLayout): Rect => ({ ...r, y: r.y - layout.scrollY });

export const boardMaxScrollY = (props: AttendanceBoardProps) => boardLayout(props).maxScrollY;
export const boardDateBarMaxScrollX = (props: AttendanceBoardProps) => boardLayout(props).dateBar.maxScrollX;

export const boardRect = (
  key: "dateBar" | "tabs" | "counts" | "copy" | "legend" | "body" | "header",
  props: AttendanceBoardProps,
): Rect => {
  const layout = boardLayout(props);
  switch (key) {
    case "dateBar":
      return { x: layout.barX, y: layout.stickyY + STICKY_PAD_TOP, w: layout.barW, h: BAR_H };
    case "tabs":
      return { x: layout.barX, y: layout.stickyY + STICKY_PAD_TOP + BAR_H, w: layout.barW, h: TAB_H };
    case "counts": {
      const r = barItemRect(layout, props.tab === "absence" ? "grade" : "counts");
      const h = fonts(props.width).counts * LINE + 8;
      return { x: r.x - 4, y: r.y + (BAR_H - h) / 2, w: r.w + 8, h };
    }
    case "copy":
      return scrolled(layout.copyRect, layout);
    case "legend":
      return scrolled(layout.legend ?? layout.box, layout);
    case "body":
      return scrolled(layout.body ?? { x: layout.innerX, y: layout.box.y + BOX_PAD, w: layout.innerW, h: 0 }, layout);
    default:
      return { x: 0, y: -layout.scrollY, w: props.width, h: ATTENDANCE_HEADER_H };
  }
};

export const boardPoint = (
  key: "date" | "supervisor" | "counts" | "otherGrade" | `tab_${BoardTab}` | "copy" | "legend",
  props: AttendanceBoardProps,
): Point => {
  const layout = boardLayout(props);
  if (key.startsWith("tab_")) {
    const index = TAB_ORDER.indexOf(key.slice(4) as BoardTab);
    return {
      x: layout.barX + index * (layout.tabW + TAB_GAP) + layout.tabW / 2,
      y: layout.stickyY + STICKY_PAD_TOP + BAR_H + TAB_PAD_TOP + (TAB_H - TAB_PAD_TOP) / 2,
    };
  }
  switch (key) {
    case "date":
      return center(barItemRect(layout, "date"));
    case "supervisor": {
      const r = barItemRect(layout, "supervisor");
      const labelW = textWidth("감독 ", fonts(props.width).supervisor);
      return { x: r.x + labelW + (r.w - labelW) / 2, y: r.y + r.h / 2 };
    }
    case "otherGrade":
      return center(barItemRect(layout, "otherGrade"));
    case "counts":
      return center(boardRect("counts", props));
    case "copy":
      return center(scrolled(layout.copyRect, layout));
    default:
      return center(boardRect("legend", props));
  }
};

export const seatRect = (studentId: number, props: AttendanceBoardProps): Rect => {
  const layout = boardLayout(props);
  for (const group of layout.groups) {
    const placed = group.seats.find((s) => s.seat.studentId === studentId);
    if (placed) return scrolled(placed.rect, layout);
  }
  throw new Error(`seat not on board: ${studentId}`);
};

export const groupRect = (index: number, props: AttendanceBoardProps): Rect => {
  const layout = boardLayout(props);
  const group = layout.groups[index];
  if (!group) throw new Error(`group not on board: ${index}`);
  return scrolled(group.rect, layout);
};

export type SeatState = Pick<
  SeatCellProps,
  "visual" | "afterSchoolStatus" | "pending" | "pressAt" | "longPressFrom" | "longPressTo"
>;

// data.ts SeatBase → 앱 SeatCell 우선순위(비참여 > 방과후 > 불참승인 > 미체크)의 기본 모습.
export const baseVisual = (studentId: number, base: Record<number, SeatBase> = AFTERNOON1_BASE): SeatState => {
  const b = base[studentId];
  if (!b) return { visual: "unchecked" };
  const pending = b.pendingRequest;
  if (!b.participating) return { visual: "inactive", pending };
  if (b.afterSchool) return { visual: "afterschool", afterSchoolStatus: "unchecked", pending };
  if (b.approvedAbsence) return { visual: "approved", pending };
  return { visual: "unchecked", pending };
};

const nominalSeatSize = (viewportWidth: number) => ({
  width: 42,
  height: seatMetrics(viewportWidth).baseHeight,
});

const seatView = (
  studentId: number,
  visualFor: (studentId: number) => SeatState,
  size: { width: number; height: number },
): SeatView => {
  const s = studentById(studentId);
  return {
    studentId,
    name: s.name,
    gradeClass: `${s.grade}-${s.classNumber}`,
    width: size.width,
    height: size.height,
    ...visualFor(studentId),
  };
};

// 좌석 크기는 AttendanceBoardMock 이 자기 폭으로 다시 계산한다 — seatSize 는 SeatCellMock 단독 표시용 기본값.
export const buildAfternoonGroups = (
  visualFor: (studentId: number) => SeatState,
  seatSize: { width: number; height: number } = nominalSeatSize(PHONE_BODY.w),
): SeatGroupView[] =>
  AFTERNOON_CLASSROOMS.map((room) => {
    const perDivision = room.rowsPerDivision * room.colsPerDivision;
    const divisions = Array.from({ length: room.divisions }, (_, d) =>
      Array.from({ length: room.rowsPerDivision }, (__, r) =>
        Array.from({ length: room.colsPerDivision }, (___, c) => room.classNumber * 100 + d * perDivision + r * room.colsPerDivision + c + 1)
          .filter((id) => STUDENTS.some((s) => s.id === id))
          .map((id) => seatView(id, visualFor, seatSize)),
      ),
    );
    return {
      title: `${GRADE}-${room.classNumber}반`,
      seatCount: divisions.flat(2).length,
      classroom: { corridorSide: room.corridorSide, divisions },
    };
  });

// 야간실 i 번째 = (i+1)반 학생 번호순.
export const buildNightGroups = (
  visualFor: (studentId: number) => SeatState,
  seatSize: { width: number; height: number } = nominalSeatSize(PHONE_BODY.w),
): SeatGroupView[] =>
  NIGHT_ROOMS.map((room, i) => {
    const classNumber = i + 1;
    const rows = Array.from({ length: room.rows }, (_, r) =>
      Array.from({ length: room.cols }, (__, c) => classNumber * 100 + r * room.cols + c + 1)
        .filter((id) => STUDENTS.some((s) => s.id === id))
        .map((id) => seatView(id, visualFor, seatSize)),
    );
    return { title: room.name, seatCount: rows.flat().length, rooms: [{ name: room.name, rows }] };
  });

const allSeats = (groups: SeatGroupView[]): SeatView[] =>
  groups.flatMap((g) => [...(g.classroom?.divisions.flat(2) ?? []), ...(g.rooms ?? []).flatMap((r) => r.rows.flat())]);

// 앱 출석 카운트(269-283행): 참여 학생만 세고, 불참승인·선택 칸은 기록이 없으면 미체크에 들어간다.
export const countsOf = (groups: SeatGroupView[]): BoardCounts => {
  const participating = allSeats(groups).filter((s) => s.visual !== "inactive" && s.visual !== "activated");
  const statusOf = (s: SeatView) => (s.visual === "afterschool" ? s.afterSchoolStatus ?? "unchecked" : s.visual);
  const present = participating.filter((s) => statusOf(s) === "present").length;
  const absent = participating.filter((s) => statusOf(s) === "absent").length;
  const afterSchool = participating.filter((s) => s.visual === "afterschool" && statusOf(s) === "unchecked").length;
  return { present, absent, afterSchool, unchecked: participating.length - present - absent - afterSchool };
};

const DateBar: React.FC<{ props: AttendanceBoardProps; layout: BoardLayout }> = ({ props, layout }) => {
  const f = fonts(props.width);
  const at = (key: BarKey) => {
    const item = layout.dateBar.items.find((i) => i.key === key);
    return item ? { left: BAR_PAD_X + item.x - layout.dateBar.scrollX, width: item.w } : null;
  };
  const slot = (key: BarKey, children: React.ReactNode) => {
    const pos = at(key);
    if (!pos) return null;
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          height: BAR_H,
          ...pos,
          display: "flex",
          alignItems: "center",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </div>
    );
  };
  const divider = <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.3)" }} />;

  return (
    <div
      style={{
        position: "absolute",
        left: layout.barX,
        top: STICKY_PAD_TOP,
        width: layout.barW,
        height: BAR_H,
        borderRadius: 10,
        overflow: "hidden",
        background: "linear-gradient(135deg, #1e40af, #2563eb)",
        color: "#fff",
      }}
    >
      {slot(
        "date",
        <span style={{ fontSize: f.date, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
          {props.dateLabel}
          {canChangeDate(props) ? <span style={{ fontSize: 11, lineHeight: 1 }}>▾</span> : null}
        </span>,
      )}
      {slot("div1", divider)}
      {slot(
        "supervisor",
        <span style={{ fontSize: f.supervisor, opacity: 0.9 }}>
          감독{" "}
          <span style={{ background: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
            {supervisorName(props)}
          </span>
        </span>,
      )}
      {slot("div2", divider)}
      {slot("grade", <span style={{ fontSize: f.supervisor, fontWeight: 700 }}>{props.grade}학년</span>)}
      {slot(
        "counts",
        <div style={{ display: "flex", gap: BAR_GAP, fontSize: f.counts }}>
          {countItems(props.counts).map((c) => (
            <span key={c.label} style={{ opacity: 0.9 }}>
              {c.label} <b style={{ fontWeight: 700, color: c.color }}>{c.value}</b>
            </span>
          ))}
        </div>,
      )}
      {slot(
        "otherGrade",
        <span
          style={{
            fontSize: f.counts,
            background: "rgba(255,255,255,0.2)",
            padding: "4px 10px",
            borderRadius: 6,
          }}
        >
          다른학년
        </span>,
      )}
    </div>
  );
};

const Tabs: React.FC<{ props: AttendanceBoardProps; layout: BoardLayout }> = ({ props, layout }) => {
  const frame = useCurrentFrame();
  const f = fonts(props.width);
  return (
    <>
      {TAB_ORDER.map((tab, i) => {
        const active = props.tab === tab;
        const scale = props.tabPressAt?.tab === tab ? pressScale(frame, props.tabPressAt.at) : 1;
        return (
          <div
            key={tab}
            style={{
              position: "absolute",
              left: layout.barX + i * (layout.tabW + TAB_GAP),
              top: STICKY_PAD_TOP + BAR_H + TAB_PAD_TOP,
              width: layout.tabW,
              height: TAB_H - TAB_PAD_TOP,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "10px 10px 0 0",
              fontSize: f.tab,
              fontWeight: 600,
              whiteSpace: "nowrap",
              background: active ? "#fff" : "#e2e8f0",
              color: active ? "#2563eb" : "#94a3b8",
              boxShadow: active ? "0 -2px 8px rgba(0,0,0,0.06)" : undefined,
              transform: `scale(${scale})`,
            }}
          >
            {TAB_LABEL[tab]}
            {tab === "absence" && props.pendingBadge > 0 ? (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: 0,
                  width: BADGE,
                  height: BADGE,
                  borderRadius: "50%",
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {props.pendingBadge}
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
};

const GroupCard: React.FC<{ placed: PlacedGroup; width: number }> = ({ placed, width }) => {
  const f = fonts(width);
  const { rect, group, frame } = placed;
  const innerOrigin = { x: rect.x + CARD_BORDER, y: rect.y + CARD_BORDER };
  const seatCell = (p: PlacedSeat, origin: Point) => (
    <div
      key={p.seat.studentId}
      style={{ position: "absolute", left: p.rect.x - origin.x, top: p.rect.y - origin.y }}
    >
      <SeatCellMock {...p.seat} width={p.rect.w} height={p.rect.h} viewportWidth={width} />
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        boxSizing: "border-box",
        border: `${CARD_BORDER}px solid #e2e8f0`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: placed.titleBarH + 1,
          boxSizing: "border-box",
          padding: "0 14px",
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          lineHeight: LINE,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: f.title, fontWeight: 700, color: "#334155" }}>{group.title}</span>
        <span style={{ fontSize: f.seatCount, fontWeight: 500, color: "#94a3b8" }}>{group.seatCount}석</span>
      </div>
      {frame && group.classroom ? (
        <div
          style={{
            position: "absolute",
            left: frame.x - innerOrigin.x,
            top: frame.y - innerOrigin.y,
            width: frame.w,
          }}
        >
          <ClassroomFrameMock corridorSide={group.classroom.corridorSide} variant="screen" viewportWidth={width}>
            <div style={{ position: "relative", width: frame.middleW, height: frame.h }}>
              {placed.seats.map((p) => seatCell(p, { x: frame.middleX, y: frame.y }))}
            </div>
          </ClassroomFrameMock>
        </div>
      ) : null}
      {placed.desk ? (
        <>
          {placed.seats.map((p) => seatCell(p, innerOrigin))}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: placed.desk.y - innerOrigin.y,
              height: placed.desk.h,
              boxSizing: "border-box",
              paddingTop: 6,
              textAlign: "center",
              background: "#f9fafb",
              borderTop: "1px dashed #d1d5db",
              color: "#9ca3af",
              fontSize: f.desk,
              lineHeight: LINE,
              whiteSpace: "nowrap",
            }}
          >
            교탁
          </div>
        </>
      ) : null}
    </div>
  );
};

const Legend: React.FC<{ rect: Rect; width: number }> = ({ rect, width }) => {
  const f = fonts(width);
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        boxSizing: "border-box",
        padding: `${LEGEND_PAD_Y}px 0`,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignContent: "flex-start",
        gap: LEGEND_GAP,
      }}
    >
      {LEGEND.map((item) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: LEGEND_ITEM_GAP,
            fontSize: f.legend,
            lineHeight: LINE,
            whiteSpace: "nowrap",
          }}
        >
          <div
            style={{
              width: f.swatch,
              height: f.swatch,
              boxSizing: "border-box",
              borderRadius: 3,
              flexShrink: 0,
              background: item.color,
              border: item.border ? `2px solid ${item.border}` : undefined,
            }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
};

export const AttendanceBoardMock: React.FC<AttendanceBoardProps> = (props) => {
  const frame = useCurrentFrame();
  const layout = boardLayout(props);
  const f = fonts(props.width);
  const copy = props.copyButton;

  return (
    <div
      style={{
        position: "relative",
        width: props.width,
        height: props.height,
        overflow: "hidden",
        background: PAGE_BG,
        fontFamily: FONT,
        color: FOREGROUND,
      }}
    >
      <div style={{ position: "absolute", left: 0, top: -layout.scrollY, width: props.width }}>
        <AttendanceHeaderMock {...props.header} width={props.width} />
        {props.tab === "absence" ? (
          <div
            style={{
              position: "absolute",
              left: layout.box.x,
              top: layout.box.y,
              width: layout.box.w,
              height: props.bodyHeight !== undefined ? layout.box.h : undefined,
              boxSizing: "border-box",
              padding: BOX_PAD,
              background: "#fff",
              borderRadius: "0 0 12px 12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {props.body}
          </div>
        ) : (
          <>
            <div
              style={{
                position: "absolute",
                left: layout.box.x,
                top: layout.box.y,
                width: layout.box.w,
                height: layout.box.h,
                background: "#fff",
                borderRadius: "0 0 12px 12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            />
            {layout.showCopy ? (
              <div
                style={{
                  position: "absolute",
                  left: layout.copyRect.x,
                  top: layout.copyRect.y,
                  width: layout.copyRect.w,
                  height: layout.copyRect.h,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: f.copy,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  opacity: copy?.busy ? 0.5 : 1,
                  transform: `scale(${pressScale(frame, copy?.pressAt)})`,
                }}
              >
                {copyLabel(copy?.busy)}
              </div>
            ) : null}
            {layout.groups.map((placed) => (
              <GroupCard key={placed.group.title} placed={placed} width={props.width} />
            ))}
            {layout.legend ? <Legend rect={layout.legend} width={props.width} /> : null}
          </>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: layout.stickyY,
          width: props.width,
          height: STICKY_H,
          background: PAGE_BG,
          zIndex: 100,
        }}
      >
        <DateBar props={props} layout={layout} />
        <Tabs props={props} layout={layout} />
      </div>
      {props.overlay ? <div style={{ position: "absolute", inset: 0, zIndex: 200 }}>{props.overlay}</div> : null}
    </div>
  );
};
