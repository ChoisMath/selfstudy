// src/components/seats/ClassroomConfigModal.tsx 이식(목록 표 + 추가/수정 폼 + 미리보기).
// 1248×570 뷰포트 전체를 덮는 오버레이 — SwapModalMock 과 같은 컨벤션.
import React from "react";
import { useCurrentFrame } from "remotion";
import { PC_VIEWPORT, type Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";
import { GRADE, SEAT_EDITOR } from "../data";

export type CorridorSide = "left" | "right";
export type ClassroomLayoutType = "division" | "single";

const PANEL_W = 672; // max-w-2xl
const PANEL_X = (PC_VIEWPORT.w - PANEL_W) / 2;
const HEADER_H = 56; // px-4 py-3 + border-b
const BODY_PAD = 16; // p-4

const CORRIDOR_LABEL: Record<CorridorSide, { left: string; right: string }> = {
  left: { left: "복도", right: "창문" },
  right: { left: "창문", right: "복도" },
};
const LAYOUT_LABEL: Record<ClassroomLayoutType, string> = { division: "분단형", single: "단독형" };
const CORRIDOR_SIDE_LABEL: Record<CorridorSide, string> = { left: "왼쪽", right: "오른쪽" };
const COLS_BY_LAYOUT: Record<ClassroomLayoutType, number> = { division: 2, single: 1 };

// --- 목록 모드 ---------------------------------------------------------------------
const TOP_ROW_H = 44;
const TOP_ROW_MB = 12;
const TABLE_HEAD_H = 36;
const TABLE_ROW_H = 40;
const COL_W = { class: 84, type: 64, corridor: 64, rows: 108, seats: 64, assigned: 64, actions: 160 };
const TABLE_W = Object.values(COL_W).reduce((a, b) => a + b, 0);
const TABLE_Y = HEADER_H + BODY_PAD + TOP_ROW_H + TOP_ROW_MB;

const EXISTING_CLASSROOMS = SEAT_EDITOR.afternoon.classes.map((cls) => ({
  classNumber: cls.classNumber,
  corridorSide: cls.config.corridorSide as CorridorSide,
  layoutType: "division" as ClassroomLayoutType,
  rowsPerDivision: Array.from({ length: cls.config.divisions }, () => cls.config.rowsPerDivision),
  seatCount: cls.config.divisions * cls.config.rowsPerDivision * cls.config.colsPerDivision,
  assignedCount: cls.assignments.length,
}));

const LIST_PANEL_H = TABLE_Y + TABLE_HEAD_H + TABLE_ROW_H * EXISTING_CLASSROOMS.length + BODY_PAD;

// --- 편집 모드 ---------------------------------------------------------------------
const LABEL_W = 96; // w-24
const FIELD_X = PANEL_X + BODY_PAD + LABEL_W + 12;
const FIELD_W = PANEL_W - BODY_PAD * 2 - LABEL_W - 12;
const ROW_H = 44;
const ROW_GAP = 16; // gap-4
const PREVIEW_H = 118;

const classNumRowY = HEADER_H + BODY_PAD;
const corridorRowY = classNumRowY + ROW_H + ROW_GAP;
const layoutRowY = corridorRowY + ROW_H + ROW_GAP;
const divisionsRowY = layoutRowY + ROW_H + ROW_GAP;
const rowsRowY = divisionsRowY + ROW_H + ROW_GAP;
const previewRowY = rowsRowY + ROW_H + ROW_GAP;
const footerRowY = previewRowY + PREVIEW_H + ROW_GAP;
const EDIT_PANEL_H = footerRowY + ROW_H + BODY_PAD;

// LayoutPreview: 12x8 셀, gap 2px(gap-0.5), 분단 사이 gap 8px(gap-2).
const CELL_W = 12;
const CELL_H = 8;
const CELL_GAP = 2;
const DIV_GAP = 8;
const PREVIEW_SIDE_W = 20;

export type EditingClassroomConfig = {
  classNumberText: string;
  corridorSide: CorridorSide;
  layoutType: ClassroomLayoutType;
  rowsPerDivision: number[];
};

export type ClassroomConfigKey =
  | "panel"
  | "closeButton"
  | "addButton"
  | "table"
  | `tableRow_${number}`
  | `editButton_${number}`
  | `deleteButton_${number}`
  | "classNumberInput"
  | "corridorLeft"
  | "corridorRight"
  | "layoutDivision"
  | "layoutSingle"
  | "divisionsInput"
  | `rowInput_${number}`
  | "preview"
  | "cancelButton"
  | "saveButton";

export const classroomConfigRect = (key: ClassroomConfigKey): Rect => {
  if (key === "panel") return { x: PANEL_X, y: 0, w: PANEL_W, h: Math.max(LIST_PANEL_H, EDIT_PANEL_H) };
  if (key === "closeButton") return { x: PANEL_X + PANEL_W - 16 - 60, y: 6, w: 60, h: HEADER_H - 12 };
  if (key === "addButton") return { x: PANEL_X + PANEL_W - BODY_PAD - 112, y: HEADER_H + BODY_PAD, w: 112, h: TOP_ROW_H };
  if (key === "table") return { x: PANEL_X + BODY_PAD, y: TABLE_Y, w: TABLE_W, h: TABLE_HEAD_H + TABLE_ROW_H * EXISTING_CLASSROOMS.length };

  if (key.startsWith("tableRow_") || key.startsWith("editButton_") || key.startsWith("deleteButton_")) {
    const classNumber = Number(key.split("_")[1]);
    const rowIndex = EXISTING_CLASSROOMS.findIndex((c) => c.classNumber === classNumber);
    const rowY = TABLE_Y + TABLE_HEAD_H + rowIndex * TABLE_ROW_H;
    const actionsX = PANEL_X + BODY_PAD + TABLE_W - COL_W.actions;
    if (key.startsWith("tableRow_")) return { x: PANEL_X + BODY_PAD, y: rowY, w: TABLE_W, h: TABLE_ROW_H };
    if (key.startsWith("editButton_")) return { x: actionsX + 8, y: rowY, w: 60, h: TABLE_ROW_H };
    return { x: actionsX + 8 + 60 + 8, y: rowY, w: 60, h: TABLE_ROW_H };
  }

  switch (key) {
    case "classNumberInput":
      return { x: FIELD_X, y: classNumRowY, w: 96, h: ROW_H };
    case "corridorLeft":
      return { x: FIELD_X + 4, y: corridorRowY + 4, w: 88, h: ROW_H - 8 };
    case "corridorRight":
      return { x: FIELD_X + 4 + 88, y: corridorRowY + 4, w: 88, h: ROW_H - 8 };
    case "layoutDivision":
      return { x: FIELD_X + 4, y: layoutRowY + 4, w: 96, h: ROW_H - 8 };
    case "layoutSingle":
      return { x: FIELD_X + 4 + 96, y: layoutRowY + 4, w: 96, h: ROW_H - 8 };
    case "divisionsInput":
      return { x: FIELD_X, y: divisionsRowY, w: 96, h: ROW_H };
    case "preview":
      return { x: FIELD_X, y: previewRowY, w: FIELD_W, h: PREVIEW_H };
    case "cancelButton":
      return { x: PANEL_X + PANEL_W - BODY_PAD - 64 - 8 - 96, y: footerRowY, w: 64, h: ROW_H };
    case "saveButton":
      return { x: PANEL_X + PANEL_W - BODY_PAD - 96, y: footerRowY, w: 96, h: ROW_H };
    default: {
      const division = Number(key.split("_")[1]);
      return { x: FIELD_X + (division - 1) * 76, y: rowsRowY, w: 68, h: ROW_H };
    }
  }
};

const labelStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  width: LABEL_W,
  height: ROW_H,
  display: "flex",
  alignItems: "center",
  fontSize: 14,
  color: tw.gray[700],
  whiteSpace: "nowrap",
};

export const ClassroomConfigMock: React.FC<{
  width: number;
  height: number;
  mode: "list" | "edit";
  editing?: EditingClassroomConfig;
  closePressAt?: number;
  addPressAt?: number;
  editPressAt?: { classNumber: number; at: number };
  deletePressAt?: { classNumber: number; at: number };
  corridorPressAt?: { side: CorridorSide; at: number };
  layoutPressAt?: { type: ClassroomLayoutType; at: number };
  cancelPressAt?: number;
  savePressAt?: number;
}> = ({ mode, editing, closePressAt, addPressAt, editPressAt, deletePressAt, corridorPressAt, layoutPressAt, cancelPressAt, savePressAt }) => {
  const frame = useCurrentFrame();
  const panelH = mode === "list" ? LIST_PANEL_H : EDIT_PANEL_H;
  const cfg = editing ?? { classNumberText: "", corridorSide: "right" as CorridorSide, layoutType: "division" as ClassroomLayoutType, rowsPerDivision: [3, 3, 3] };
  const cols = COLS_BY_LAYOUT[cfg.layoutType];
  const seatCount = cfg.rowsPerDivision.reduce((sum, r) => sum + r, 0) * cols;
  const previewMaxRows = Math.max(...cfg.rowsPerDivision, 1);
  const previewGridH = previewMaxRows * CELL_H + (previewMaxRows - 1) * CELL_GAP;
  const corridorLabels = CORRIDOR_LABEL[cfg.corridorSide];
  const divisionWord = cfg.layoutType === "division" ? "분단" : "열";

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: PC_VIEWPORT.w, height: PC_VIEWPORT.h, background: "rgba(0,0,0,0.4)", fontFamily: FONT }}>
      <div style={{ position: "absolute", left: PANEL_X, top: (PC_VIEWPORT.h - panelH) / 2, width: PANEL_W, height: panelH, background: tw.white, borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.25)", boxSizing: "border-box", overflow: "hidden" }}>
        {/* 헤더 */}
        <div style={{ position: "absolute", left: 0, top: 0, width: PANEL_W, height: HEADER_H, borderBottom: `1px solid ${tw.gray[200]}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap" }}>{GRADE}학년 교실 구조 설정</span>
          <span style={{ fontSize: 14, color: tw.gray[600], whiteSpace: "nowrap", scale: String(pressScale(frame, closePressAt ?? null)) }}>닫기</span>
        </div>

        {mode === "list" ? (
          <div style={{ position: "absolute", left: 0, top: HEADER_H, width: PANEL_W, padding: BODY_PAD, boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: TOP_ROW_H, marginBottom: TOP_ROW_MB }}>
              <span style={{ fontSize: 14, color: tw.gray[500], whiteSpace: "nowrap" }}>칠판·교탁은 항상 아래쪽입니다.</span>
              <div style={{ minHeight: 44, padding: "0 16px", borderRadius: 6, background: tw.blue[600], color: tw.white, fontSize: 14, display: "flex", alignItems: "center", whiteSpace: "nowrap", scale: String(pressScale(frame, addPressAt ?? null)) }}>
                학급 추가
              </div>
            </div>
            <div style={{ border: `1px solid ${tw.gray[200]}`, borderRadius: 8, overflow: "hidden", width: TABLE_W }}>
              <div style={{ position: "relative", height: TABLE_HEAD_H, background: tw.gray[50] }}>
                {(["학급", "유형", "복도", "행 수", "좌석", "배정", ""] as const).map((label, i) => {
                  const widths = [COL_W.class, COL_W.type, COL_W.corridor, COL_W.rows, COL_W.seats, COL_W.assigned, COL_W.actions];
                  const x = widths.slice(0, i).reduce((a, b) => a + b, 0);
                  return (
                    <div key={label + i} style={{ position: "absolute", left: x, top: 0, width: widths[i], height: TABLE_HEAD_H, display: "flex", alignItems: "center", paddingLeft: 12, fontSize: 12, color: tw.gray[600], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                      {label}
                    </div>
                  );
                })}
              </div>
              {EXISTING_CLASSROOMS.map((c) => {
                const widths = [COL_W.class, COL_W.type, COL_W.corridor, COL_W.rows, COL_W.seats, COL_W.assigned, COL_W.actions];
                const xs = widths.reduce<number[]>((acc, w, i) => [...acc, i === 0 ? 0 : acc[i - 1] + widths[i - 1]], []);
                return (
                  <div key={c.classNumber} style={{ position: "relative", height: TABLE_ROW_H, borderTop: `1px solid ${tw.gray[200]}` }}>
                    <div style={{ position: "absolute", left: xs[0], top: 0, width: widths[0], height: TABLE_ROW_H, display: "flex", alignItems: "center", paddingLeft: 12, fontSize: 13, fontWeight: 500, color: tw.gray[900], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                      {GRADE}-{c.classNumber}반
                    </div>
                    <div style={{ position: "absolute", left: xs[1], top: 0, width: widths[1], height: TABLE_ROW_H, display: "flex", alignItems: "center", paddingLeft: 12, fontSize: 13, color: tw.gray[700], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                      {LAYOUT_LABEL[c.layoutType]}
                    </div>
                    <div style={{ position: "absolute", left: xs[2], top: 0, width: widths[2], height: TABLE_ROW_H, display: "flex", alignItems: "center", paddingLeft: 12, fontSize: 13, color: tw.gray[700], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                      {CORRIDOR_SIDE_LABEL[c.corridorSide]}
                    </div>
                    <div style={{ position: "absolute", left: xs[3], top: 0, width: widths[3], height: TABLE_ROW_H, display: "flex", alignItems: "center", paddingLeft: 12, fontSize: 13, color: tw.gray[700], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                      {c.rowsPerDivision.join(" / ")}
                    </div>
                    <div style={{ position: "absolute", left: xs[4], top: 0, width: widths[4], height: TABLE_ROW_H, display: "flex", alignItems: "center", paddingLeft: 12, fontSize: 13, color: tw.gray[700], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                      {c.seatCount}석
                    </div>
                    <div style={{ position: "absolute", left: xs[5], top: 0, width: widths[5], height: TABLE_ROW_H, display: "flex", alignItems: "center", paddingLeft: 12, fontSize: 13, color: tw.gray[700], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                      {c.assignedCount}명
                    </div>
                    <div style={{ position: "absolute", left: xs[6] + 8, top: 0, width: widths[6] - 8, height: TABLE_ROW_H, display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          minHeight: 44,
                          display: "flex",
                          alignItems: "center",
                          padding: "0 12px",
                          borderRadius: 6,
                          border: `1px solid ${tw.gray[300]}`,
                          fontSize: 13,
                          color: tw.gray[700],
                          whiteSpace: "nowrap",
                          scale: String(pressScale(frame, editPressAt && editPressAt.classNumber === c.classNumber ? editPressAt.at : null)),
                        }}
                      >
                        수정
                      </span>
                      <span
                        style={{
                          minHeight: 44,
                          display: "flex",
                          alignItems: "center",
                          padding: "0 12px",
                          borderRadius: 6,
                          border: `1px solid ${tw.red[200]}`,
                          fontSize: 13,
                          color: tw.red[600],
                          whiteSpace: "nowrap",
                          scale: String(pressScale(frame, deletePressAt && deletePressAt.classNumber === c.classNumber ? deletePressAt.at : null)),
                        }}
                      >
                        삭제
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ position: "absolute", left: BODY_PAD, top: 0, width: PANEL_W - BODY_PAD * 2 }}>
            {/* 반 번호 */}
            <div style={{ position: "absolute", left: 0, top: classNumRowY, height: ROW_H }}>
              <span style={labelStyle}>반 번호</span>
              <div style={{ position: "absolute", left: LABEL_W + 12, top: 0, width: 96, height: ROW_H, borderRadius: 6, border: `1px solid ${tw.gray[300]}`, boxSizing: "border-box", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 14, color: tw.gray[900] }}>
                {cfg.classNumberText}
              </div>
            </div>

            {/* 복도 위치 */}
            <div style={{ position: "absolute", left: 0, top: classNumRowY + ROW_H + ROW_GAP, height: ROW_H }}>
              <span style={labelStyle}>복도 위치</span>
              <div style={{ position: "absolute", left: LABEL_W + 12, top: 0, height: ROW_H, borderRadius: 8, background: tw.gray[100], padding: 4, display: "flex", gap: 4, boxSizing: "border-box" }}>
                {(["left", "right"] as const).map((side) => (
                  <div
                    key={side}
                    style={{
                      minHeight: 36,
                      padding: "0 16px",
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: cfg.corridorSide === side ? 500 : 400,
                      background: cfg.corridorSide === side ? tw.white : "transparent",
                      color: cfg.corridorSide === side ? tw.blue[700] : tw.gray[600],
                      boxShadow: cfg.corridorSide === side ? "0 1px 2px rgba(0,0,0,0.08)" : undefined,
                      whiteSpace: "nowrap",
                      scale: String(pressScale(frame, corridorPressAt && corridorPressAt.side === side ? corridorPressAt.at : null)),
                    }}
                  >
                    {CORRIDOR_SIDE_LABEL[side]}
                  </div>
                ))}
              </div>
            </div>

            {/* 배치 유형 */}
            <div style={{ position: "absolute", left: 0, top: classNumRowY + (ROW_H + ROW_GAP) * 2, height: ROW_H }}>
              <span style={labelStyle}>배치 유형</span>
              <div style={{ position: "absolute", left: LABEL_W + 12, top: 0, height: ROW_H, borderRadius: 8, background: tw.gray[100], padding: 4, display: "flex", gap: 4, boxSizing: "border-box" }}>
                {(["division", "single"] as const).map((type) => (
                  <div
                    key={type}
                    style={{
                      minHeight: 36,
                      padding: "0 16px",
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: cfg.layoutType === type ? 500 : 400,
                      background: cfg.layoutType === type ? tw.white : "transparent",
                      color: cfg.layoutType === type ? tw.blue[700] : tw.gray[600],
                      boxShadow: cfg.layoutType === type ? "0 1px 2px rgba(0,0,0,0.08)" : undefined,
                      whiteSpace: "nowrap",
                      scale: String(pressScale(frame, layoutPressAt && layoutPressAt.type === type ? layoutPressAt.at : null)),
                    }}
                  >
                    {LAYOUT_LABEL[type]}
                  </div>
                ))}
              </div>
            </div>

            {/* 분단 개수 */}
            <div style={{ position: "absolute", left: 0, top: classNumRowY + (ROW_H + ROW_GAP) * 3, height: ROW_H }}>
              <span style={labelStyle}>{divisionWord} 개수</span>
              <div style={{ position: "absolute", left: LABEL_W + 12, top: 0, width: 96, height: ROW_H, borderRadius: 6, border: `1px solid ${tw.gray[300]}`, boxSizing: "border-box", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 14, color: tw.gray[900] }}>
                {cfg.rowsPerDivision.length}
              </div>
            </div>

            {/* 분단별 행 수 */}
            <div style={{ position: "absolute", left: 0, top: classNumRowY + (ROW_H + ROW_GAP) * 4, height: ROW_H }}>
              <span style={{ ...labelStyle, alignItems: "flex-start", paddingTop: 12 }}>{divisionWord}별 행 수</span>
              <div style={{ position: "absolute", left: LABEL_W + 12, top: 0, display: "flex", gap: 8 }}>
                {cfg.rowsPerDivision.map((rows, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, color: tw.gray[600] }}>
                    <span style={{ whiteSpace: "nowrap" }}>{divisionWord}{i + 1}</span>
                    <div style={{ width: 44, height: ROW_H, borderRadius: 6, border: `1px solid ${tw.gray[300]}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: tw.gray[900] }}>
                      {rows}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 미리보기 — 복도/창문 라벨 + 총 좌석 수 + 아래쪽 칠판 라벨: 앱의 작은 캡션("아래가 칠판")을
                가이드 영상에서 또렷이 보이도록 좌우 라벨과 칠판 바를 추가했다(브리프 지시, 앱 원본엔 없음). */}
            <div style={{ position: "absolute", left: 0, top: classNumRowY + (ROW_H + ROW_GAP) * 5, height: PREVIEW_H, borderRadius: 8, background: tw.gray[50], border: `1px solid ${tw.gray[200]}`, boxSizing: "border-box", padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: tw.gray[500], whiteSpace: "nowrap" }}>미리보기 (아래가 칠판)</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: tw.gray[700], whiteSpace: "nowrap" }}>총 {seatCount}석</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: PREVIEW_SIDE_W, textAlign: "center", writingMode: "vertical-rl", fontSize: 10, color: tw.slate[400], whiteSpace: "nowrap" }}>
                  {corridorLabels.left}
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: DIV_GAP, height: previewGridH }}>
                  {cfg.rowsPerDivision.map((rows, di) => (
                    <div key={di} style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${CELL_W}px)`, gap: CELL_GAP }}>
                      {Array.from({ length: rows * cols }, (_, i) => (
                        <div key={i} style={{ width: CELL_W, height: CELL_H, borderRadius: 2, border: `1px solid ${tw.gray[400]}`, background: tw.white, boxSizing: "border-box" }} />
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ width: PREVIEW_SIDE_W, textAlign: "center", writingMode: "vertical-rl", fontSize: 10, color: tw.slate[400], whiteSpace: "nowrap" }}>
                  {corridorLabels.right}
                </div>
              </div>
              <div style={{ marginTop: 8, textAlign: "center", fontSize: 10, color: tw.gray[400], borderTop: `1px dashed ${tw.gray[300]}`, paddingTop: 4, whiteSpace: "nowrap" }}>
                칠판
              </div>
            </div>

            {/* 취소 / 저장 */}
            <div style={{ position: "absolute", left: 0, top: classNumRowY + (ROW_H + ROW_GAP) * 5 + PREVIEW_H + ROW_GAP, height: ROW_H, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <div style={{ minHeight: 44, padding: "0 16px", borderRadius: 6, border: `1px solid ${tw.gray[300]}`, color: tw.gray[700], fontSize: 14, display: "flex", alignItems: "center", whiteSpace: "nowrap", scale: String(pressScale(frame, cancelPressAt ?? null)) }}>
                취소
              </div>
              <div style={{ minHeight: 44, padding: "0 16px", borderRadius: 6, background: tw.blue[600], color: tw.white, fontSize: 14, display: "flex", alignItems: "center", whiteSpace: "nowrap", scale: String(pressScale(frame, savePressAt ?? null)) }}>
                저장
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
