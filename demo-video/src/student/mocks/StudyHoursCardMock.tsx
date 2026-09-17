// src/app/student/page.tsx 87-112행 이식 — 자율학습 참여시간(이번 달 / 학년도 누계 + 순위) 카드.
// mt-6(페이지 카드 간 간격)는 조립하는 쪽(갤러리·장면) 몫이므로 이 카드 자체는 (0,0)이 카드 왼쪽 위다.
import React from "react";
import type { Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";
import { STUDY_HOURS } from "../data";

const PAD = 16; // 88행 p-4
const TITLE_H = 20; // 89행 text-sm(14) line-height ≈ 20
const TITLE_MB = 12; // 89행 mb-3
const COL_GAP = 16; // 90행 grid gap-4
const BOX_PAD = 12; // 91/98행 p-3

const LABEL_H = 16; // text-xs(12) line-height ≈ 16
const LABEL_MB = 4; // mb-1
const VALUE_H = 32; // text-2xl(24) line-height ≈ 32
const UNIT_H = 16; // text-xs "시간"
const UNIT_MT = 2; // mt-0.5
const RANK_MT = 4; // mt-1
const RANK_H = 14; // text-[11px]

// 이번 달 박스 내용 높이(103행): 라벨 + 값 + "시간".
const MONTH_CONTENT_H = LABEL_H + LABEL_MB + VALUE_H + UNIT_MT + UNIT_H;
// 학년도 누계 박스는 순위 줄이 하나 더 있다(104-108행). 그리드는 두 칸 높이를 맞추므로(align-items: stretch 기본값)
// 카드 전체 높이는 더 긴 쪽(학년도 누계)을 따른다.
const YEAR_CONTENT_H = MONTH_CONTENT_H + RANK_MT + RANK_H;
const BOX_H = BOX_PAD * 2 + YEAR_CONTENT_H;

export const studyHoursCardHeight = () => PAD * 2 + TITLE_H + TITLE_MB + BOX_H;

const boxLayout = (width: number) => {
  const innerW = width - PAD * 2;
  const boxW = (innerW - COL_GAP) / 2;
  const top = PAD + TITLE_H + TITLE_MB;
  const monthRect: Rect = { x: PAD, y: top, w: boxW, h: BOX_H };
  const yearRect: Rect = { x: PAD + boxW + COL_GAP, y: top, w: boxW, h: BOX_H };
  return { monthRect, yearRect };
};

// "month"/"year" 는 색칠된 박스 전체, "rank" 는 학년도 누계 박스 안 순위 배지 줄만 가리킨다.
export const studyHoursRect = (key: "month" | "year" | "rank", width: number): Rect => {
  const { monthRect, yearRect } = boxLayout(width);
  if (key === "month") return monthRect;
  if (key === "year") return yearRect;
  const rankY = yearRect.y + BOX_PAD + MONTH_CONTENT_H + RANK_MT;
  return { x: yearRect.x + BOX_PAD, y: rankY, w: yearRect.w - BOX_PAD * 2, h: RANK_H };
};

export const StudyHoursCardMock: React.FC<{ width: number }> = ({ width }) => {
  const height = studyHoursCardHeight();
  const { monthRect, yearRect } = boxLayout(width);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        boxSizing: "border-box",
        background: tw.white,
        border: `1px solid ${tw.gray[200]}`,
        borderRadius: 8,
        fontFamily: FONT,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: PAD,
          top: PAD,
          height: TITLE_H,
          display: "flex",
          alignItems: "center",
          fontSize: 14,
          fontWeight: 500,
          color: tw.gray[600],
          whiteSpace: "nowrap",
        }}
      >
        자율학습 참여시간
      </span>

      {/* 91-97행: 이번 달 */}
      <div
        style={{
          position: "absolute",
          left: monthRect.x,
          top: monthRect.y,
          width: monthRect.w,
          height: monthRect.h,
          boxSizing: "border-box",
          padding: BOX_PAD,
          borderRadius: 8,
          background: tw.blue[50],
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 12, color: tw.blue[500], whiteSpace: "nowrap" }}>이번 달</div>
        <div style={{ marginTop: LABEL_MB, fontSize: 24, fontWeight: 700, color: tw.blue[700], whiteSpace: "nowrap" }}>
          {STUDY_HOURS.month.toFixed(1)}
        </div>
        <div style={{ marginTop: UNIT_MT, fontSize: 12, color: tw.blue[400], whiteSpace: "nowrap" }}>시간</div>
      </div>

      {/* 98-109행: 학년도 누계 + 순위 */}
      <div
        style={{
          position: "absolute",
          left: yearRect.x,
          top: yearRect.y,
          width: yearRect.w,
          height: yearRect.h,
          boxSizing: "border-box",
          padding: BOX_PAD,
          borderRadius: 8,
          background: tw.indigo[50],
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 12, color: tw.indigo[500], whiteSpace: "nowrap" }}>학년도 누계</div>
        <div style={{ marginTop: LABEL_MB, fontSize: 24, fontWeight: 700, color: tw.indigo[700], whiteSpace: "nowrap" }}>
          {STUDY_HOURS.year.toFixed(1)}
        </div>
        <div style={{ marginTop: UNIT_MT, fontSize: 12, color: tw.indigo[400], whiteSpace: "nowrap" }}>시간</div>
        <div style={{ marginTop: RANK_MT, fontSize: 11, fontWeight: 600, color: tw.amber[600], whiteSpace: "nowrap" }}>
          {STUDY_HOURS.rank}
        </div>
      </div>
    </div>
  );
};
