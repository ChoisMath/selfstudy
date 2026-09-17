// src/app/grade-admin/[grade]/seats/print/page.tsx + SeatPrintGroup.tsx + ClassroomFrame.tsx(print)
// + PrintRoomGrid.tsx 이식. 별도 페이지(새 탭)라 학년관리 셸이 없다 — width·height 를 받아
// 독립적으로 그린다(컨트롤러 재정). 페이지 물리 크기는 src/lib/seats/print-layout.ts 상수를
// 그대로 복제해 mm→px 변환한다(해당 파일은 읽기 전용, 수정하지 않음).
import React from "react";
import { useCurrentFrame } from "remotion";
import { type Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";
import { GRADE, SEAT_EDITOR, type PrintOrientation } from "../data";

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

// --- 툴바 ---------------------------------------------------------------------------
const PAD_X = 16;
const PAD_TOP = 12;
const TOOLBAR_ROW_H = 44; // min-h-11
const TOOLBAR_BOX_H = TOOLBAR_ROW_H + 16; // p-2
const TOOLBAR_CAPTION_H = 20;
const TOOLBAR_H = TOOLBAR_BOX_H + TOOLBAR_CAPTION_H;
const CHIP_W = 184;
const CHIP_GAP = 12; // gap-3
const ACTION_W = 72;
const ACTION_GAP = 8; // gap-2
const PAGE_TOP = PAD_TOP + TOOLBAR_H + 16; // mb-4
const PAGE_GAP = 24; // mb-6

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

const pageY = (groups: SeatPrintGroupState[], classNumber: number) => {
  let y = PAGE_TOP;
  for (const g of groups) {
    if (!g.checked) continue;
    if (g.classNumber === classNumber) return y;
    y += pageSizePx(g.orientation).h + PAGE_GAP;
  }
  return y;
};

export const seatPrintRect = (key: SeatPrintKey, width: number, groups: SeatPrintGroupState[]): Rect => {
  const toolbarY = PAD_TOP;
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
  const y = pageY(groups, classNumber);
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
  checkboxPressAt?: { classNumber: number; at: number };
  orientationPressAt?: { classNumber: number; orientation: PrintOrientation; at: number };
  printPressAt?: number;
  closePressAt?: number;
}> = ({ width, height, groups, checkboxPressAt, orientationPressAt, printPressAt, closePressAt }) => {
  const frame = useCurrentFrame();
  const visible = groups.filter((g) => g.checked);
  const closeX = width - PAD_X - 8 - ACTION_W;
  const printX = closeX - ACTION_GAP - ACTION_W;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height, background: tw.gray[100], fontFamily: FONT, overflow: "hidden" }}>
      {/* 툴바 */}
      <div style={{ position: "absolute", left: PAD_X, top: PAD_TOP, width: width - PAD_X * 2, height: TOOLBAR_BOX_H, background: tw.white, border: `1px solid ${tw.gray[200]}`, borderRadius: 8, boxSizing: "border-box", padding: 8 }}>
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
      <div style={{ position: "absolute", left: PAD_X, top: PAD_TOP + TOOLBAR_BOX_H + 4, fontSize: 12, color: tw.gray[400], whiteSpace: "nowrap" }}>
        가로·세로 혼합 인쇄는 Chrome·Edge에서 정확히 동작합니다.
      </div>

      {/* A4 페이지들 */}
      {visible.length === 0 ? (
        <div style={{ position: "absolute", left: 0, top: PAGE_TOP, width, textAlign: "center", fontSize: 14, color: tw.gray[400] }}>인쇄할 좌석 배치가 없습니다.</div>
      ) : (
        visible.map((g) => {
          const page = pageSizePx(g.orientation);
          const x = (width - page.w) / 2;
          const y = pageY(groups, g.classNumber);
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
