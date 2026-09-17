// src/app/attendance/[grade]/page.tsx renderWeeklyContent (580-698행) + 모바일 모달 래퍼(1197-1244행) 이식.
// 1024px 미만 = 모달 변형만 그린다(데스크톱 인라인 팝업은 대상 아님).
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import type { Rect } from "../../app-mocks/layout";
import { TypedText } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";
import { WEEKLY_INFO, studentById } from "../../app-mocks/data";

const OUTER_PAD = 16; // p-4 (1212행)
const DIALOG_MAX_W = 448; // max-w-md (1223행)
const DIALOG_PAD = 16; // p-4 (1223행)
const DIALOG_RADIUS = 12; // rounded-xl
const CLOSE_SIZE = 44; // w-11 h-11 (1229행)
const CLOSE_MARGIN = 8; // top-2 right-2
const CONTENT_PR = 48; // pr-12, 닫기 버튼과 겹치지 않게(1238행)

const TITLE_ROW_H = 16;
const TITLE_MB = 8; // mb-2 (596행)
const LABEL_COL_W = 26;
const CELL_GAP = 3; // gap-[clamp(2px,0.6vw,4px)] (607행)
const DAY_HEADER_H = 18;
const CELL_ROW_H = 22;
const NOTE_ROW_H = 20;
const TOTALS_MT = 12; // mt-3 (674행)
const TOTALS_PT = 12; // pt-3
const TOTALS_H = 30;

const TABLE_H = DAY_HEADER_H + CELL_ROW_H * 2 + NOTE_ROW_H;
const CONTENT_H = TITLE_ROW_H + TITLE_MB + TABLE_H + TOTALS_MT + TOTALS_PT + TOTALS_H;
const DIALOG_H = CONTENT_H + DIALOG_PAD * 2;

// 셀 라벨 → weeklyCellStyle(570-577행) 색. "-"는 오늘 이후 미체크로 취급.
const CELL_STYLE: Record<string, { bg: string; color: string }> = {
  출석: { bg: "#bbf7d0", color: "#166534" },
  결석: { bg: "#fecaca", color: "#991b1b" },
  방과후: { bg: "#fef9c3", color: "#ca8a04" },
  불참승인: { bg: "#fef9c3", color: "#ca8a04" },
  "-": { bg: "#f3f4f6", color: "#9ca3af" },
};

const dialogGeometry = (width: number, height: number) => {
  const w = Math.min(DIALOG_MAX_W, width - OUTER_PAD * 2);
  const x = (width - w) / 2;
  const y = (height - DIALOG_H) / 2;
  return { x, y, w, h: DIALOG_H };
};

const contentGeometry = (width: number, height: number) => {
  const dialog = dialogGeometry(width, height);
  const x = dialog.x + DIALOG_PAD;
  const y = dialog.y + DIALOG_PAD;
  const w = dialog.w - DIALOG_PAD - CONTENT_PR;
  return { x, y, w };
};

export const weeklyInfoRect = (key: "table" | "notes" | "totals" | "close", width: number, height: number): Rect => {
  const dialog = dialogGeometry(width, height);
  if (key === "close") {
    return {
      x: dialog.x + dialog.w - CLOSE_MARGIN - CLOSE_SIZE,
      y: dialog.y + CLOSE_MARGIN,
      w: CLOSE_SIZE,
      h: CLOSE_SIZE,
    };
  }
  const content = contentGeometry(width, height);
  const tableY = content.y + TITLE_ROW_H + TITLE_MB;
  if (key === "table") {
    return { x: content.x, y: tableY, w: content.w, h: TABLE_H };
  }
  if (key === "notes") {
    return { x: content.x, y: tableY + DAY_HEADER_H + CELL_ROW_H * 2, w: content.w, h: NOTE_ROW_H };
  }
  return { x: content.x, y: tableY + TABLE_H + TOTALS_MT, w: content.w, h: TOTALS_H };
};

const dayColX = (content: { x: number; w: number }, dayIndex: number) => {
  const dayW = (content.w - LABEL_COL_W - CELL_GAP * 5) / 5;
  return content.x + LABEL_COL_W + CELL_GAP + dayIndex * (dayW + CELL_GAP);
};

const dayColW = (content: { w: number }) => (content.w - LABEL_COL_W - CELL_GAP * 5) / 5;

export const WeeklyInfoModalMock: React.FC<{
  width: number;
  height: number;
  openAt?: number;
  noteTyping?: { day: string; text: string; typeFrom: number };
}> = ({ width, height, openAt, noteTyping }) => {
  const frame = useCurrentFrame();
  if (openAt !== undefined && frame < openAt) {
    return null;
  }
  const enter = openAt !== undefined ? tween(frame, [openAt, openAt + 10], [0, 1]) : 1;
  const dialog = dialogGeometry(width, height);
  const content = contentGeometry(width, height);

  const student = studentById(WEEKLY_INFO.studentId);
  const rowLabelStyle: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 600,
    color: "#6b7280",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

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
          background: "#eff6ff",
          border: "2px solid #2563eb",
          borderRadius: DIALOG_RADIUS,
          boxSizing: "border-box",
          opacity: enter,
          scale: String(0.94 + 0.06 * enter),
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: dialog.w - CLOSE_MARGIN - CLOSE_SIZE,
            top: CLOSE_MARGIN,
            width: CLOSE_SIZE,
            height: CLOSE_SIZE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 700,
            color: tw.gray[600],
          }}
        >
          ✕
        </div>

        {/* 제목 줄 */}
        <div
          style={{
            position: "absolute",
            left: content.x - dialog.x,
            top: content.y - dialog.y,
            width: content.w,
            height: TITLE_ROW_H,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", whiteSpace: "nowrap" }}>
            {student.name} ({student.grade}-{student.classNumber})
          </span>
          <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>{WEEKLY_INFO.weekLabel}</span>
        </div>

        {/* 요일 헤더 */}
        {WEEKLY_INFO.days.map((day, i) => {
          const isToday = i === WEEKLY_INFO.todayIndex;
          const y = content.y - dialog.y + TITLE_ROW_H + TITLE_MB;
          return (
            <div
              key={`h-${day}`}
              style={{
                position: "absolute",
                left: dayColX(content, i) - dialog.x,
                top: y,
                width: dayColW(content),
                height: DAY_HEADER_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: isToday ? 800 : 500,
                color: isToday ? "#1e40af" : "#6b7280",
                borderBottom: isToday ? "3px solid #2563eb" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {day}
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: content.x - dialog.x,
            top: content.y - dialog.y + TITLE_ROW_H + TITLE_MB,
            width: LABEL_COL_W,
            height: DAY_HEADER_H,
          }}
        />

        {/* 오후1 / 오후2 행 */}
        {([
          { label: "오후1", values: WEEKLY_INFO.afternoon1 },
          { label: "오후2", values: WEEKLY_INFO.afternoon2 },
        ] as const).map((row, rowIndex) => {
          const y = content.y - dialog.y + TITLE_ROW_H + TITLE_MB + DAY_HEADER_H + rowIndex * CELL_ROW_H;
          return (
            <React.Fragment key={row.label}>
              <div style={{ position: "absolute", left: content.x - dialog.x, top: y, width: LABEL_COL_W, height: CELL_ROW_H, ...rowLabelStyle }}>
                {row.label}
              </div>
              {row.values.map((label, i) => {
                const isToday = i === WEEKLY_INFO.todayIndex;
                const style = CELL_STYLE[label] ?? CELL_STYLE["-"];
                return (
                  <div
                    key={`${row.label}-${i}`}
                    style={{
                      position: "absolute",
                      left: dayColX(content, i) - dialog.x,
                      top: y,
                      width: dayColW(content),
                      height: CELL_ROW_H - 3,
                      borderRadius: 4,
                      background: style.bg,
                      color: style.color,
                      fontSize: 9,
                      fontWeight: isToday ? 700 : 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      whiteSpace: "nowrap",
                      boxSizing: "border-box",
                      border: isToday ? "2px solid #2563eb" : "none",
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* 비고 행 */}
        <div
          style={{
            position: "absolute",
            left: content.x - dialog.x,
            top: content.y - dialog.y + TITLE_ROW_H + TITLE_MB + DAY_HEADER_H + CELL_ROW_H * 2,
            width: LABEL_COL_W,
            height: NOTE_ROW_H,
            ...rowLabelStyle,
          }}
        >
          비고
        </div>
        {WEEKLY_INFO.days.map((day, i) => {
          const typing = noteTyping?.day === day ? noteTyping : undefined;
          const staticValue = WEEKLY_INFO.remarks[day];
          const hasValue = typing ? true : Boolean(staticValue);
          const y = content.y - dialog.y + TITLE_ROW_H + TITLE_MB + DAY_HEADER_H + CELL_ROW_H * 2;
          return (
            <div
              key={`note-${day}`}
              style={{
                position: "absolute",
                left: dayColX(content, i) - dialog.x,
                top: y + 2,
                width: dayColW(content),
                height: NOTE_ROW_H - 4,
                borderRadius: 4,
                border: `1px solid ${hasValue ? "#ea580c" : "#cbd5e1"}`,
                background: hasValue ? "#fff7ed" : "#fff",
                color: hasValue ? "#ea580c" : "#374151",
                fontSize: 8,
                fontWeight: hasValue ? 500 : 400,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              {typing ? (
                <TypedText text={typing.text} from={typing.typeFrom} placeholder="비고" />
              ) : (
                <TypedText text={staticValue ?? ""} placeholder="비고" />
              )}
            </div>
          );
        })}

        {/* 누계·랭킹 */}
        {(() => {
          const y = content.y - dialog.y + TITLE_ROW_H + TITLE_MB + TABLE_H + TOTALS_MT;
          const colW = content.w / 3;
          const [rankValue, rankSuffix] = WEEKLY_INFO.rank.split(/ (?=\()/);
          return (
            <div
              style={{
                position: "absolute",
                left: content.x - dialog.x,
                top: y,
                width: content.w,
                height: TOTALS_H,
                borderTop: "1px solid #bfdbfe",
                paddingTop: TOTALS_PT,
                boxSizing: "border-box",
                display: "flex",
              }}
            >
              <div style={{ width: colW, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: tw.gray[500], whiteSpace: "nowrap" }}>이번 달</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: tw.blue[700], whiteSpace: "nowrap" }}>
                  {WEEKLY_INFO.monthlyHours}
                </div>
              </div>
              <div style={{ width: colW, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: tw.gray[500], whiteSpace: "nowrap" }}>학년도</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: tw.indigo[700], whiteSpace: "nowrap" }}>
                  {WEEKLY_INFO.yearHours}
                </div>
              </div>
              <div style={{ width: colW, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: tw.gray[500], whiteSpace: "nowrap" }}>학년 내 순위</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: tw.amber[600], whiteSpace: "nowrap" }}>
                  {rankValue}{" "}
                  <span style={{ fontSize: 10, fontWeight: 400, color: tw.gray[500] }}>{rankSuffix}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
