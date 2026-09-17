// src/app/grade-admin/[grade]/seats/print/page.tsx + SeatPrintGroup.tsx + ClassroomFrame.tsx(print)
// + PrintRoomGrid.tsx 이식. `/grade-admin/[grade]/layout.tsx` 의 AdminNav 는 print.css 가
// @media print 에서만 숨기므로 브라우저 화면(이 목업이 보여주는 상태)에는 그대로 보인다(SF-7) —
// GradeAdminShellMock.tsx(수정 금지)의 AdminNav 부분을 이 파일 안에 다시 그린다.
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { type Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";
import { GRADE, ME, SEAT_EDITOR, type PrintOrientation } from "../data";

// --- print-layout.ts 상수 복제 -------------------------------------------------------
const MM_TO_PX = 96 / 25.4;
const A4_SHORT_MM = 210;
const A4_LONG_MM = 297;
const PAGE_PADDING_MM = 8;
const SEAT_CELL_WIDTH = 96;
const SEAT_CELL_HEIGHT = 60;
const SEAT_CELL_GAP = 4;
const GROUP_GAP_PX = 16; // SeatPrintGroup.tsx
const PRINT_SIDE_LABEL_WIDTH = 20; // ClassroomFrame.tsx

const pageSizeMm = (o: PrintOrientation) => (o === "landscape" ? { w: A4_LONG_MM, h: A4_SHORT_MM } : { w: A4_SHORT_MM, h: A4_LONG_MM });
const pageSizePx = (o: PrintOrientation) => {
  const mm = pageSizeMm(o);
  return { w: mm.w * MM_TO_PX, h: mm.h * MM_TO_PX };
};
const contentBoxPx = (o: PrintOrientation) => {
  const mm = pageSizeMm(o);
  return { w: (mm.w - PAGE_PADDING_MM * 2) * MM_TO_PX, h: (mm.h - PAGE_PADDING_MM * 2) * MM_TO_PX };
};
const computeFitScale = (contentW: number, contentH: number, o: PrintOrientation) => {
  const box = contentBoxPx(o);
  return Math.min(box.w / contentW, box.h / contentH);
};

// 학급 하나(분단 3개, 2행x2열) — SeatEditorMock 과 같은 AFTERNOON_CLASSROOMS 기하.
const GROUP_DIVISIONS = 3;
const GROUP_ROWS = 2;
const GROUP_COLS = 2;
const DIV_CONTENT_W = GROUP_COLS * SEAT_CELL_WIDTH + (GROUP_COLS - 1) * SEAT_CELL_GAP;
const DIV_LABEL_H = 20; // text-[13px] + mb-1
const DIV_CONTENT_H = GROUP_ROWS * SEAT_CELL_HEIGHT + (GROUP_ROWS - 1) * SEAT_CELL_GAP;
const DIV_BOX_H = DIV_LABEL_H + DIV_CONTENT_H;
const FRAME_CONTENT_W = GROUP_DIVISIONS * DIV_CONTENT_W + (GROUP_DIVISIONS - 1) * GROUP_GAP_PX;
const FRAME_SIDE_TOTAL = (PRINT_SIDE_LABEL_WIDTH + SEAT_CELL_GAP * 2) * 2; // 라벨 + columnGap 양쪽
const DESK_H = 36; // mt-3 + border px-10 py-1 배지
const TITLE_H = 36; // h2 mb-3
const GROUP_CONTENT_W = FRAME_CONTENT_W + FRAME_SIDE_TOTAL;
const GROUP_CONTENT_H = TITLE_H + DIV_BOX_H + DESK_H;

const afternoonAssignmentAt = (classNumber: number, division: number, row: number, col: number) => {
  const cls = SEAT_EDITOR.afternoon.classes.find((c) => c.classNumber === classNumber);
  return cls?.assignments.find((a) => a.seat.division === division && a.seat.row === row && a.seat.col === col) ?? null;
};

// --- AdminNav(56px) — GradeAdminShellMock.tsx(수정 금지, 별도 export 없음)의 헤더를 픽셀 단위로
// 그대로 복제한다. 같은 영상 안에서 이 화면과 6탭 셸이 다른 헤더로 보이면 안 된다(N1).
const ADMIN_NAV_H = 56; // AdminNav.tsx h-14
const NAV_PAD_X = 16; // AdminNav.tsx "max-w-7xl mx-auto px-4"
const LOGO_IMG = 32;
const LOGO_GAP = 8;
const LOGO_TEXT_W = 46; // "출석부" text-lg font-bold 근사
const LOGO_BLOCK_W = LOGO_IMG + LOGO_GAP + LOGO_TEXT_W;
const LOGO_MR = 16;
const NAV_ITEM_GAP = 4;
const GRADE_LABEL = `${GRADE}학년 데이터관리`;
const GRADE_CHIP_X = NAV_PAD_X + LOGO_BLOCK_W + LOGO_MR + NAV_ITEM_GAP;
const GRADE_CHIP_W = 24 + GRADE_LABEL.length * 14;
const GRADE_CHIP_H = 44;
const HOMEROOM_CHIP_LABEL = "담임교사";
const HOMEROOM_CHIP_W = 24 + HOMEROOM_CHIP_LABEL.length * 12;
const BELL_W = 96;
const NAME_W = ME.name.length * 14;
const HELP_HIT = 44;
const HELP_DOT = 28;
const LOGOUT_W = 16 + "로그아웃".length * 13;
const GAP_RIGHT = 12;

type NavRightBlock = { key: string; x: number; w: number };

// GradeAdminShellMock.tsx 의 rightLayout() 과 동일 — 항상 showHelp(GradeAdmin-Shell-Today 스틸 기준).
const navRightLayout = (width: number): NavRightBlock[] => {
  const blocks = [
    { key: "homeroom", w: HOMEROOM_CHIP_W },
    { key: "bell", w: BELL_W },
    { key: "name", w: NAME_W },
    { key: "help", w: HELP_HIT },
    { key: "logout", w: LOGOUT_W },
  ];
  let right = width - NAV_PAD_X;
  const placed: NavRightBlock[] = [];
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const b = blocks[i];
    const x = right - b.w;
    placed.unshift({ key: b.key, x, w: b.w });
    right = x - GAP_RIGHT;
  }
  return placed;
};

// --- 툴바 ---------------------------------------------------------------------------
const PAD_X = 16;
const TOOLBAR_PAD_TOP = 12;
const TOOLBAR_ROW_H = 44; // min-h-11
const TOOLBAR_BOX_H = TOOLBAR_ROW_H + 16; // p-2
const TOOLBAR_CAPTION_H = 20;
const TOOLBAR_H = TOOLBAR_BOX_H + TOOLBAR_CAPTION_H;
const CHIP_W = 184;
const CHIP_GAP = 12; // gap-3
const ACTION_W = 72;
const ACTION_GAP = 8; // gap-2
const PAGE_GAP = 24; // mb-6

const navOffset = (showAdminNav: boolean) => (showAdminNav ? ADMIN_NAV_H : 0);
const toolbarYOf = (showAdminNav: boolean) => navOffset(showAdminNav) + TOOLBAR_PAD_TOP;
const pageTopOf = (showAdminNav: boolean) => toolbarYOf(showAdminNav) + TOOLBAR_H + 16; // mb-4

export type SeatPrintGroupState = { classNumber: number; checked: boolean; orientation: PrintOrientation };

export type SeatPrintKey =
  | "toolbar"
  | `groupChip_${number}`
  | `groupCheckbox_${number}`
  | `groupLandscape_${number}`
  | `groupPortrait_${number}`
  | "printButton"
  | "closeButton"
  | `page_${number}`
  | `pageContent_${number}`;

const chipX = (groups: SeatPrintGroupState[], classNumber: number) => {
  const idx = groups.findIndex((g) => g.classNumber === classNumber);
  return PAD_X + idx * (CHIP_W + CHIP_GAP);
};

const pageY = (groups: SeatPrintGroupState[], classNumber: number, showAdminNav: boolean) => {
  let y = pageTopOf(showAdminNav);
  for (const g of groups) {
    if (!g.checked) continue;
    if (g.classNumber === classNumber) return y;
    y += pageSizePx(g.orientation).h + PAGE_GAP;
  }
  return y;
};

export const seatPrintRect = (key: SeatPrintKey, width: number, groups: SeatPrintGroupState[], showAdminNav = true): Rect => {
  const toolbarY = toolbarYOf(showAdminNav);
  if (key === "toolbar") return { x: PAD_X, y: toolbarY, w: width - PAD_X * 2, h: TOOLBAR_BOX_H };
  if (key === "printButton" || key === "closeButton") {
    const closeX = width - PAD_X - 8 - ACTION_W;
    const printX = closeX - ACTION_GAP - ACTION_W;
    return { x: key === "closeButton" ? closeX : printX, y: toolbarY + 8, w: ACTION_W, h: TOOLBAR_ROW_H };
  }
  if (key.startsWith("groupChip_") || key.startsWith("groupCheckbox_") || key.startsWith("groupLandscape_") || key.startsWith("groupPortrait_")) {
    const classNumber = Number(key.split("_")[1]);
    const x = chipX(groups, classNumber);
    const y = toolbarY + 8;
    if (key.startsWith("groupChip_")) return { x, y, w: CHIP_W, h: TOOLBAR_ROW_H };
    if (key.startsWith("groupCheckbox_")) return { x: x + 8, y: y + (TOOLBAR_ROW_H - 16) / 2, w: 16, h: 16 };
    if (key.startsWith("groupLandscape_")) return { x: x + CHIP_W - 8 - 88, y, w: 44, h: TOOLBAR_ROW_H };
    return { x: x + CHIP_W - 8 - 44, y, w: 44, h: TOOLBAR_ROW_H };
  }

  const classNumber = Number(key.split("_")[1]);
  const group = groups.find((g) => g.classNumber === classNumber);
  const orientation = group?.orientation ?? "landscape";
  const page = pageSizePx(orientation);
  const y = pageY(groups, classNumber, showAdminNav);
  const x = (width - page.w) / 2;
  if (key.startsWith("page_")) return { x, y, w: page.w, h: page.h };

  const scale = computeFitScale(GROUP_CONTENT_W, GROUP_CONTENT_H, orientation);
  const dispW = GROUP_CONTENT_W * scale;
  const dispH = GROUP_CONTENT_H * scale;
  return { x: x + (page.w - dispW) / 2, y: y + (page.h - dispH) / 2, w: dispW, h: dispH };
};

const PrintCell: React.FC<{ x: number; y: number; student: { classNumber: number; number: number; name: string } | null }> = ({ x, y, student }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: SEAT_CELL_WIDTH,
      height: SEAT_CELL_HEIGHT,
      border: `1px solid ${tw.gray[700]}`,
      borderRadius: 2,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}
  >
    {student ? (
      <>
        <span style={{ fontSize: 10, color: tw.gray[500], whiteSpace: "nowrap" }}>
          {student.classNumber}-{student.number}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: tw.black, whiteSpace: "nowrap" }}>{student.name}</span>
      </>
    ) : null}
  </div>
);

const PrintPageContent: React.FC<{ classNumber: number }> = ({ classNumber }) => (
  <div style={{ position: "relative", width: GROUP_CONTENT_W, height: GROUP_CONTENT_H, fontFamily: FONT }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: GROUP_CONTENT_W, height: TITLE_H, textAlign: "center", fontSize: 18, fontWeight: 700, color: tw.black, whiteSpace: "nowrap" }}>
      {GRADE}학년 오후자습 — {GRADE}-{classNumber}반
    </div>
    {(["left", "right"] as const).map((side) => (
      <div
        key={side}
        style={{
          position: "absolute",
          left: side === "left" ? 0 : GROUP_CONTENT_W - PRINT_SIDE_LABEL_WIDTH,
          top: TITLE_H,
          width: PRINT_SIDE_LABEL_WIDTH,
          height: DIV_BOX_H,
          writingMode: "vertical-rl",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: tw.black,
          whiteSpace: "nowrap",
        }}
      >
        {side === "left" ? "창문" : "복도"}
      </div>
    ))}
    {Array.from({ length: GROUP_DIVISIONS }, (_, di) => {
      const division = di + 1;
      const divX = PRINT_SIDE_LABEL_WIDTH + SEAT_CELL_GAP * 2 + di * (DIV_CONTENT_W + GROUP_GAP_PX);
      return (
        <div key={division} style={{ position: "absolute", left: divX, top: TITLE_H, width: DIV_CONTENT_W }}>
          <div style={{ height: DIV_LABEL_H, textAlign: "center", fontSize: 13, fontWeight: 600, color: tw.black, whiteSpace: "nowrap" }}>분단{division}</div>
          {Array.from({ length: GROUP_ROWS }, (_, ri) =>
            Array.from({ length: GROUP_COLS }, (_, ci) => {
              const row = ri + 1;
              const col = ci + 1;
              const assignment = afternoonAssignmentAt(classNumber, division, row, col);
              return (
                <PrintCell
                  key={`${row}-${col}`}
                  x={ci * (SEAT_CELL_WIDTH + SEAT_CELL_GAP)}
                  y={DIV_LABEL_H + ri * (SEAT_CELL_HEIGHT + SEAT_CELL_GAP)}
                  student={assignment?.student ?? null}
                />
              );
            }),
          )}
        </div>
      );
    })}
    <div style={{ position: "absolute", left: 0, top: TITLE_H + DIV_BOX_H + 8, width: GROUP_CONTENT_W, textAlign: "center" }}>
      <span style={{ display: "inline-block", border: `1px solid ${tw.gray[700]}`, padding: "4px 40px", fontSize: 13, color: tw.black, whiteSpace: "nowrap" }}>교탁</span>
    </div>
  </div>
);

export const SeatPrintMock: React.FC<{
  width: number;
  height: number;
  groups: SeatPrintGroupState[];
  /** 브라우저 화면에는 AdminNav 가 보인다(print.css 는 @media print 에서만 숨김, SF-7). 기본 true. */
  showAdminNav?: boolean;
  checkboxPressAt?: { classNumber: number; at: number };
  orientationPressAt?: { classNumber: number; orientation: PrintOrientation; at: number };
  printPressAt?: number;
  closePressAt?: number;
}> = ({ width, height, groups, showAdminNav = true, checkboxPressAt, orientationPressAt, printPressAt, closePressAt }) => {
  const frame = useCurrentFrame();
  const visible = groups.filter((g) => g.checked);
  const closeX = width - PAD_X - 8 - ACTION_W;
  const printX = closeX - ACTION_GAP - ACTION_W;
  const toolbarY = toolbarYOf(showAdminNav);
  const pageTop = pageTopOf(showAdminNav);

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height, background: tw.gray[100], fontFamily: FONT, overflow: "hidden" }}>
      {/* AdminNav — grade-admin/[grade]/layout.tsx 가 항상 화면에 보여준다(SF-7). GradeAdminShellMock.tsx
          의 헤더와 칩 순서·간격·폭이 픽셀 단위로 같아야 한다(N1) — rightLayout() 그대로 복제. */}
      {showAdminNav ? (
        <div style={{ position: "absolute", left: 0, top: 0, width, height: ADMIN_NAV_H, background: tw.white, borderBottom: `1px solid ${tw.gray[200]}`, boxSizing: "border-box" }}>
          <Img
            src={staticFile("posan.svg")}
            alt=""
            width={LOGO_IMG}
            height={LOGO_IMG}
            style={{ position: "absolute", left: NAV_PAD_X, top: (ADMIN_NAV_H - LOGO_IMG) / 2, width: LOGO_IMG, height: LOGO_IMG }}
          />
          <span style={{ position: "absolute", left: NAV_PAD_X + LOGO_IMG + LOGO_GAP, top: 0, height: ADMIN_NAV_H, display: "flex", alignItems: "center", fontSize: 18, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap" }}>
            출석부
          </span>
          <div
            style={{
              position: "absolute",
              left: GRADE_CHIP_X,
              top: (ADMIN_NAV_H - GRADE_CHIP_H) / 2,
              width: GRADE_CHIP_W,
              height: GRADE_CHIP_H,
              borderRadius: 6,
              background: tw.green[50],
              color: tw.green[700],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: "nowrap",
              boxSizing: "border-box",
            }}
          >
            {GRADE_LABEL}
          </div>
          {navRightLayout(width).map((b) => {
            if (b.key === "homeroom") {
              return (
                <div
                  key={b.key}
                  style={{
                    position: "absolute",
                    left: b.x,
                    top: (ADMIN_NAV_H - 44) / 2,
                    width: b.w,
                    height: 44,
                    borderRadius: 6,
                    background: tw.blue[50],
                    color: tw.blue[700],
                    border: `1px solid ${tw.blue[200]}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    boxSizing: "border-box",
                  }}
                >
                  {HOMEROOM_CHIP_LABEL}
                </div>
              );
            }
            if (b.key === "bell") {
              return (
                <div key={b.key} style={{ position: "absolute", left: b.x, top: 0, width: b.w, height: ADMIN_NAV_H, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 14, color: tw.gray[600], whiteSpace: "nowrap" }}>
                  <span>🔕</span>
                  <span>알림 켜기</span>
                </div>
              );
            }
            if (b.key === "name") {
              return (
                <div key={b.key} style={{ position: "absolute", left: b.x, top: 0, width: b.w, height: ADMIN_NAV_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: tw.gray[500], whiteSpace: "nowrap" }}>
                  {ME.name}
                </div>
              );
            }
            if (b.key === "help") {
              return (
                <div key={b.key} style={{ position: "absolute", left: b.x, top: (ADMIN_NAV_H - HELP_HIT) / 2, width: HELP_HIT, height: HELP_HIT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: HELP_DOT, height: HELP_DOT, borderRadius: HELP_DOT / 2, border: `2px solid ${tw.gray[500]}`, color: tw.gray[500], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", boxSizing: "border-box" }}>
                    ?
                  </div>
                </div>
              );
            }
            return (
              <div key={b.key} style={{ position: "absolute", left: b.x, top: 0, width: b.w, height: ADMIN_NAV_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: tw.gray[500], whiteSpace: "nowrap" }}>
                로그아웃
              </div>
            );
          })}
        </div>
      ) : null}

      {/* 툴바 */}
      <div style={{ position: "absolute", left: PAD_X, top: toolbarY, width: width - PAD_X * 2, height: TOOLBAR_BOX_H, background: tw.white, border: `1px solid ${tw.gray[200]}`, borderRadius: 8, boxSizing: "border-box", padding: 8 }}>
        {groups.map((g) => {
          const x = chipX(groups, g.classNumber) - PAD_X;
          const checkboxPress = checkboxPressAt && checkboxPressAt.classNumber === g.classNumber ? checkboxPressAt.at : null;
          const landscapePress = orientationPressAt && orientationPressAt.classNumber === g.classNumber && orientationPressAt.orientation === "landscape" ? orientationPressAt.at : null;
          const portraitPress = orientationPressAt && orientationPressAt.classNumber === g.classNumber && orientationPressAt.orientation === "portrait" ? orientationPressAt.at : null;
          return (
            <div key={g.classNumber} style={{ position: "absolute", left: x, top: 8, width: CHIP_W, height: TOOLBAR_ROW_H, display: "flex", alignItems: "center", gap: 4, padding: "0 8px", border: `1px solid ${tw.gray[300]}`, borderRadius: 6, boxSizing: "border-box" }}>
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: `1px solid ${tw.gray[400]}`,
                  background: g.checked ? tw.blue[600] : tw.white,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: tw.white,
                  fontSize: 11,
                  scale: String(pressScale(frame, checkboxPress)),
                }}
              >
                {g.checked ? "✓" : ""}
              </span>
              <span style={{ fontSize: 14, color: tw.gray[800], whiteSpace: "nowrap" }}>
                {GRADE}-{g.classNumber}반
              </span>
              <div style={{ marginLeft: "auto", display: "flex", border: `1px solid ${tw.gray[300]}`, borderRadius: 4, overflow: "hidden" }}>
                <span
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    background: g.orientation === "landscape" ? tw.blue[600] : tw.white,
                    color: g.orientation === "landscape" ? tw.white : tw.gray[600],
                    whiteSpace: "nowrap",
                    scale: String(pressScale(frame, landscapePress)),
                  }}
                >
                  가로
                </span>
                <span
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    background: g.orientation === "portrait" ? tw.blue[600] : tw.white,
                    color: g.orientation === "portrait" ? tw.white : tw.gray[600],
                    whiteSpace: "nowrap",
                    scale: String(pressScale(frame, portraitPress)),
                  }}
                >
                  세로
                </span>
              </div>
            </div>
          );
        })}

        <div style={{ position: "absolute", left: printX, top: 8, width: ACTION_W, height: TOOLBAR_ROW_H, borderRadius: 6, background: visible.length === 0 ? tw.blue[300] : tw.blue[600], color: tw.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, whiteSpace: "nowrap", scale: String(pressScale(frame, printPressAt ?? null)) }}>
          인쇄
        </div>
        <div style={{ position: "absolute", left: closeX, top: 8, width: ACTION_W, height: TOOLBAR_ROW_H, borderRadius: 6, border: `1px solid ${tw.gray[300]}`, color: tw.gray[700], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, whiteSpace: "nowrap", scale: String(pressScale(frame, closePressAt ?? null)) }}>
          닫기
        </div>
      </div>
      <div style={{ position: "absolute", left: PAD_X, top: toolbarY + TOOLBAR_BOX_H + 4, fontSize: 12, color: tw.gray[400], whiteSpace: "nowrap" }}>
        가로·세로 혼합 인쇄는 Chrome·Edge에서 정확히 동작합니다.
      </div>

      {/* A4 페이지들 */}
      {visible.length === 0 ? (
        <div style={{ position: "absolute", left: 0, top: pageTop, width, textAlign: "center", fontSize: 14, color: tw.gray[400] }}>인쇄할 좌석 배치가 없습니다.</div>
      ) : (
        visible.map((g) => {
          const page = pageSizePx(g.orientation);
          const x = (width - page.w) / 2;
          const y = pageY(groups, g.classNumber, showAdminNav);
          const scale = computeFitScale(GROUP_CONTENT_W, GROUP_CONTENT_H, g.orientation);
          return (
            <div key={g.classNumber} style={{ position: "absolute", left: x, top: y, width: page.w, height: page.h, background: tw.white, boxShadow: "0 4px 16px rgba(0,0,0,0.18)", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: (page.w - GROUP_CONTENT_W * scale) / 2, top: (page.h - GROUP_CONTENT_H * scale) / 2, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                <PrintPageContent classNumber={g.classNumber} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
