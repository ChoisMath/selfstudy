// src/components/student/ParticipationScheduleCard.tsx 이식 — 3행(오후1·오후2·야간) × 5요일 참여일정 격자.
// 카드 자체 좌표(왼쪽 위 = (0,0))만 계산한다 — 페이지 안 배치(마진)는 조립하는 쪽(갤러리·장면) 몫이다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { textWidth } from "../../app-mocks/AttendanceHeaderMock";
import { TODAY, type Session } from "../../app-mocks/data";
import type { Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";
import { PARTICIPATION, weekdayLabels } from "../data";

const PAD = 12; // 33행 p-3(휴대폰 폭 390은 sm 640 미만이라 base 값)
const ROW_GAP = 8; // 34행 grid gap-2(세로)
const COL_GAP = 8; // 34행 grid gap-2(가로)
const ROW_H = 44; // 60/73행 min-h-11
const CAPTION_ROW_H = 16; // 87행 "오늘" 캡션 줄(text-[10px])
const LABEL_PR = 4; // 40행 pr-1

// 월=0 ~ 금=4 로 인덱싱한 오늘(TODAY=2026-09-17, 목요일).
const mondayIndexedDay = (date: Date) => (date.getUTCDay() + 6) % 7;
const TODAY_INDEX = mondayIndexedDay(new Date(`${TODAY}T00:00:00Z`));

const geometry = (width: number) => {
  const innerW = width - PAD * 2;
  const labelW =
    Math.max(
      ...PARTICIPATION.map((row) => Math.max(textWidth(row.label, 14, 500), textWidth(row.frequencyLabel, 10, 400))),
    ) + LABEL_PR;
  const dayW = (innerW - labelW - COL_GAP * 5) / 5;
  return { innerW, labelW, dayW };
};

// 요일 열(weekday: 0=월…4=금) 셀의 카드 로컬 좌표.
export const participationCellRect = (session: Session, weekday: number, width: number): Rect => {
  const { labelW, dayW } = geometry(width);
  const rowIndex = PARTICIPATION.findIndex((row) => row.session === session);
  return {
    x: PAD + labelW + COL_GAP + weekday * (dayW + COL_GAP),
    y: PAD + rowIndex * (ROW_H + ROW_GAP),
    w: dayW,
    h: ROW_H,
  };
};

export const participationCardHeight = () => PAD * 2 + 3 * ROW_H + 3 * ROW_GAP + CAPTION_ROW_H;

export type ParticipationCardMockProps = {
  width: number;
  cellPressAt?: { session: Session; weekday: number; at: number };
};

export const ParticipationCardMock: React.FC<ParticipationCardMockProps> = ({ width, cellPressAt }) => {
  const frame = useCurrentFrame();
  const { labelW, dayW } = geometry(width);
  const height = participationCardHeight();
  const captionY = PAD + 3 * (ROW_H + ROW_GAP);

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
      {PARTICIPATION.map((row, rowIndex) => {
        const y = PAD + rowIndex * (ROW_H + ROW_GAP);
        return (
          <React.Fragment key={row.session}>
            {/* 40-47행: 세션 라벨(축약명 + 주 N일) */}
            <div
              style={{
                position: "absolute",
                left: PAD,
                top: y,
                width: labelW - LABEL_PR,
                height: ROW_H,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: tw.gray[700] }}>{row.label}</span>
              <span style={{ fontSize: 10, color: tw.gray[400] }}>{row.frequencyLabel}</span>
            </div>
            {row.days.map((active, weekday) => {
              const rect = participationCellRect(row.session, weekday, width);
              const isToday = weekday === TODAY_INDEX;
              const isNextWeek = active && weekday < TODAY_INDEX;
              const border = isToday ? (active ? tw.blue[700] : tw.gray[400]) : "transparent";
              const pressing =
                cellPressAt && cellPressAt.session === row.session && cellPressAt.weekday === weekday
                  ? cellPressAt.at
                  : null;
              return (
                <div
                  key={weekday}
                  style={{
                    position: "absolute",
                    left: rect.x,
                    top: rect.y,
                    width: rect.w,
                    height: rect.h,
                    boxSizing: "border-box",
                    borderRadius: 8,
                    border: `2px solid ${border}`,
                    background: active ? tw.blue[100] : tw.gray[100],
                    color: active ? tw.blue[700] : tw.gray[300],
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ scale: String(pressScale(frame, pressing)) }}>{weekdayLabels[weekday]}</span>
                  {isNextWeek ? (
                    <span style={{ fontSize: 9, lineHeight: 1, color: tw.blue[500] }}>다음주</span>
                  ) : null}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
      {/* 83-92행: "오늘" 캡션 줄 */}
      {weekdayLabels.map((_, weekday) => {
        const { labelW: lw, dayW: dw } = { labelW, dayW };
        const x = PAD + lw + COL_GAP + weekday * (dw + COL_GAP);
        return (
          <div
            key={weekday}
            style={{
              position: "absolute",
              left: x,
              top: captionY,
              width: dw,
              height: CAPTION_ROW_H,
              textAlign: "center",
              fontSize: 10,
              fontWeight: 600,
              color: tw.blue[700],
              whiteSpace: "nowrap",
            }}
          >
            {weekday === TODAY_INDEX ? "오늘" : ""}
          </div>
        );
      })}
    </div>
  );
};
