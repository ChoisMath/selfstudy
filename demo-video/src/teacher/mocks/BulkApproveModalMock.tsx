// src/app/attendance/[grade]/page.tsx 불참신청 일괄승인 모달(1107-1195행) 이식. 폰 폭(390) 기준으로 좁혀 그린다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import type { Point } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { ABSENCE_REASON_META } from "../../app-mocks/data";
import { FONT } from "../../fonts";

export type BulkApproveRow = { student: string; date: string; session: string; reason: string; detail: string };

const OUTER_PAD = 16; // p-4 (1109행)
const DIALOG_RADIUS = 12; // rounded-xl
const HEADER_H = 52; // px-4 py-3 (1121행)
const CLOSE_SIZE = 44; // w-11 h-11 (1130행)
const BODY_PAD = 16; // p-4 (1136행)
const THEAD_H = 26;
const ROW_H = 24;
const FOOTER_H = 60; // px-4 py-3, 버튼 min-h-11 (1175행)
const BTN_H = 44; // min-h-11
const BTN_GAP = 8; // gap-2 (1175행)

// 사유 열은 앱과 같이 사유별 색으로 쓴다(reasonColors, page.tsx:718-723). 행은 라벨만 들고 오므로 라벨에서 색을 찾는다.
const REASON_COLOR: Record<string, string> = Object.fromEntries(
  Object.values(ABSENCE_REASON_META).map((meta) => [meta.label, meta.color]),
);
const DEFAULT_REASON_COLOR = ABSENCE_REASON_META.custom.color;

const COL_FRACTIONS = { student: 0.32, date: 0.16, session: 0.18, reason: 0.14, detail: 0.2 } as const;

const dialogGeometry = (width: number, height: number, rowCount: number) => {
  const w = width - OUTER_PAD * 2;
  const tableH = THEAD_H + ROW_H * rowCount;
  const bodyH = BODY_PAD * 2 + tableH;
  const h = HEADER_H + bodyH + FOOTER_H;
  return { x: OUTER_PAD, y: Math.max(OUTER_PAD, (height - h) / 2), w, h, tableH, bodyH };
};

export const bulkModalPoint = (
  key: "confirm" | "cancel" | "table",
  width: number,
  height: number,
  rowCount: number,
): Point => {
  const dialog = dialogGeometry(width, height, rowCount);
  if (key === "table") {
    return { x: dialog.x + dialog.w / 2, y: dialog.y + HEADER_H + BODY_PAD + dialog.tableH / 2 };
  }
  const footerY = dialog.y + dialog.h - FOOTER_H;
  const confirmW = 96;
  const cancelW = 64;
  const rightEdge = dialog.x + dialog.w - BODY_PAD;
  if (key === "confirm") {
    return { x: rightEdge - confirmW / 2, y: footerY + FOOTER_H / 2 };
  }
  return { x: rightEdge - confirmW - BTN_GAP - cancelW / 2, y: footerY + FOOTER_H / 2 };
};

export const BulkApproveModalMock: React.FC<{
  width: number;
  height: number;
  rows: BulkApproveRow[];
  openAt?: number;
  confirmPressAt?: number;
  busy?: boolean;
}> = ({ width, height, rows, openAt, confirmPressAt, busy }) => {
  const frame = useCurrentFrame();
  if (openAt !== undefined && frame < openAt) {
    return null;
  }
  const enter = openAt !== undefined ? tween(frame, [openAt, openAt + 10], [0, 1]) : 1;
  const dialog = dialogGeometry(width, height, rows.length);
  const tableW = dialog.w - BODY_PAD * 2;
  const disabled = Boolean(busy) || rows.length === 0;

  const colWidths = {
    student: tableW * COL_FRACTIONS.student,
    date: tableW * COL_FRACTIONS.date,
    session: tableW * COL_FRACTIONS.session,
    reason: tableW * COL_FRACTIONS.reason,
    detail: tableW * COL_FRACTIONS.detail,
  };
  const colX = {
    student: 0,
    date: colWidths.student,
    session: colWidths.student + colWidths.date,
    reason: colWidths.student + colWidths.date + colWidths.session,
    detail: colWidths.student + colWidths.date + colWidths.session + colWidths.reason,
  };

  const headerCell = (label: string, x: number, w: number, align: "left" | "center") => (
    <div
      key={label}
      style={{
        position: "absolute",
        left: x,
        top: 0,
        width: w,
        height: THEAD_H,
        display: "flex",
        alignItems: "center",
        justifyContent: align === "left" ? "flex-start" : "center",
        fontSize: 10,
        fontWeight: 600,
        color: "#475569",
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        padding: "0 6px",
      }}
    >
      {label}
    </div>
  );

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height, overflow: "hidden", fontFamily: FONT }}>
      <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${0.5 * enter})` }} />
      <div
        style={{
          position: "absolute",
          left: dialog.x,
          top: dialog.y,
          width: dialog.w,
          height: dialog.h,
          background: "#fff",
          borderRadius: DIALOG_RADIUS,
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
          opacity: enter,
          scale: String(0.94 + 0.06 * enter),
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: dialog.w,
            height: HEADER_H,
            borderBottom: "1px solid #e2e8f0",
            boxSizing: "border-box",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>불참신청 일괄승인</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, whiteSpace: "nowrap" }}>{rows.length}건을 승인합니다.</div>
          </div>
          <div
            style={{
              width: CLOSE_SIZE,
              height: CLOSE_SIZE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              color: "#64748b",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            ×
          </div>
        </div>

        {/* 본문 — 표 */}
        <div style={{ position: "absolute", left: 0, top: HEADER_H, width: dialog.w, height: dialog.bodyH, boxSizing: "border-box", padding: BODY_PAD }}>
          <div style={{ position: "relative", width: tableW, height: dialog.tableH, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", boxSizing: "border-box" }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: tableW, height: THEAD_H, background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {headerCell("학생", colX.student, colWidths.student, "left")}
              {headerCell("날짜", colX.date, colWidths.date, "center")}
              {headerCell("시간", colX.session, colWidths.session, "center")}
              {headerCell("사유", colX.reason, colWidths.reason, "center")}
              {headerCell("상세", colX.detail, colWidths.detail, "left")}
            </div>
            {rows.map((row, i) => {
              const [name, ...rest] = row.student.split(" ");
              const info = rest.join(" ");
              const y = THEAD_H + i * ROW_H;
              return (
                <div key={`${row.student}-${i}`} style={{ position: "absolute", left: 0, top: y, width: tableW, height: ROW_H, borderTop: i > 0 ? "1px solid #f1f5f9" : "none", boxSizing: "border-box" }}>
                  <div style={{ position: "absolute", left: colX.student, top: 0, width: colWidths.student, height: ROW_H, display: "flex", alignItems: "center", padding: "0 6px", boxSizing: "border-box", whiteSpace: "nowrap", overflow: "hidden" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>{name}</span>
                    <span style={{ fontSize: 9, color: "#94a3b8", marginLeft: 4 }}>{info}</span>
                  </div>
                  <div style={{ position: "absolute", left: colX.date, top: 0, width: colWidths.date, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#475569", whiteSpace: "nowrap" }}>
                    {row.date}
                  </div>
                  <div style={{ position: "absolute", left: colX.session, top: 0, width: colWidths.session, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#475569", whiteSpace: "nowrap" }}>
                    {row.session}
                  </div>
                  <div style={{ position: "absolute", left: colX.reason, top: 0, width: colWidths.reason, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, whiteSpace: "nowrap", color: REASON_COLOR[row.reason] ?? DEFAULT_REASON_COLOR }}>
                    {row.reason}
                  </div>
                  <div style={{ position: "absolute", left: colX.detail, top: 0, width: colWidths.detail, height: ROW_H, display: "flex", alignItems: "center", padding: "0 6px", boxSizing: "border-box", fontSize: 10, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {row.detail || "-"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 푸터 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: dialog.h - FOOTER_H,
            width: dialog.w,
            height: FOOTER_H,
            borderTop: "1px solid #e2e8f0",
            boxSizing: "border-box",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: BTN_GAP,
          }}
        >
          <div
            style={{
              minHeight: BTN_H,
              padding: "0 16px",
              borderRadius: 6,
              background: "#f1f5f9",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxSizing: "border-box",
            }}
          >
            취소
          </div>
          <div
            style={{
              minHeight: BTN_H,
              padding: "0 16px",
              borderRadius: 6,
              background: disabled ? "#cbd5e1" : "#2563eb",
              color: disabled ? "#64748b" : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxSizing: "border-box",
              scale: String(pressScale(frame, confirmPressAt)),
            }}
          >
            {busy ? "승인 중..." : "일괄승인"}
          </div>
        </div>
      </div>
    </div>
  );
};
