import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { Cursor } from "../../components/Cursor";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_X, PHONE_Y, phoneAbs } from "../../components/phone";
import { colors } from "../../theme";
import { easeInOut, tween } from "../../anim";
import { GuideScene } from "../../guide/GuideScene";
import { lineAt, lineEnd, lineStart } from "../timing";
import {
  AttendanceBoardMock,
  baseVisual,
  boardDateBarMaxScrollX,
  boardPoint,
  boardRect,
  buildAfternoonGroups,
} from "../../app-mocks/AttendanceBoardMock";
import { textWidth } from "../../app-mocks/AttendanceHeaderMock";
import { vwClamp } from "../../app-mocks/SeatCellMock";
import { GRADE, TODAY_LABEL } from "../../app-mocks/data";
import { PHONE_BODY, type Point, type Rect } from "../../app-mocks/layout";
import type { DemoProps } from "../../props";
import { BOARD_URL, ClipTo, between, countsScrollX, dateBarBand, phoneBoardProps, phoneBox } from "./phone-helpers";

const ID = "AttendanceTour";

// 이 장면만 날짜 바를 직접 움직인다 — 날짜·감독·학년을 가리키는 동안은 스크롤 0, 카운트·다른학년을 가리킬 때
// 끝까지 밀었다가, 마지막에는 카운트가 다 보이는 자리(COUNTS_SCROLL)에 멈춘다. 뒤 폰 장면들이 그 자리에서 이어진다.
const BASE = phoneBoardProps({ tab: "afternoon1", groups: buildAfternoonGroups((id) => baseVisual(id)), dateBarScrollX: 0 });
const MAX_SCROLL_X = boardDateBarMaxScrollX(BASE);
const COUNTS_SCROLL = countsScrollX(BASE);
const SCROLLED = { ...BASE, dateBarScrollX: MAX_SCROLL_X };
const SCROLL_FRAMES = 12;

const boardFrom = lineAt(ID, 0, 0.3);
const barFrom = lineAt(ID, 1, 0);
const dateFrom = lineAt(ID, 1, 0.14);
const supervisorFrom = lineAt(ID, 1, 0.27);
const gradeFrom = lineAt(ID, 1, 0.39);
const scrollFrom = lineAt(ID, 1, 0.5);
const countsFrom = scrollFrom + SCROLL_FRAMES;
const otherGradeFrom = lineAt(ID, 2, 0.12);
const pointFrom = lineAt(ID, 2, 0.3);
const scrollBackFrom = lineEnd(ID, 2);
const sessionTabsFrom = lineAt(ID, 3, 0.1);
const absenceTabFrom = lineAt(ID, 3, 0.56);

// 날짜 바 글자 크기·간격 — AttendanceBoardMock 의 fonts()/BAR_GAP 과 같은 값(목업이 날짜·감독·학년 칸 rect 를 내보내지 않아 직접 계산).
const BAR_GAP = 8;
const BAR_TEXT_H = 26;
const dateFont = vwClamp(13, 3.5, 16, PHONE_BODY.w);
const supervisorFont = vwClamp(11, 2.6, 13, PHONE_BODY.w);
const countsFont = vwClamp(10, 2.4, 12, PHONE_BODY.w);
const OTHER_GRADE_PAD_X = 10;
const OTHER_GRADE_H = 24;

const centered = (p: Point, w: number, h: number): Rect => ({ x: p.x - w / 2, y: p.y - h / 2, w, h });

const dateRect = centered(boardPoint("date", BASE), textWidth(TODAY_LABEL, dateFont, 700), BAR_TEXT_H);
const supervisorRect = (() => {
  const chip = boardPoint("supervisor", BASE);
  const chipW = textWidth(BASE.supervisor, supervisorFont, 600) + 12;
  const labelW = textWidth("감독 ", supervisorFont);
  const right = chip.x + chipW / 2;
  const left = chip.x - chipW / 2 - labelW;
  return { x: left, y: chip.y - BAR_TEXT_H / 2, w: right - left, h: BAR_TEXT_H };
})();
// 글자 폭 추정이 ±2px 이라 상자가 "1학년"에 닿지 않게 좌우로 2px 씩 넓힌다.
const GRADE_SLACK = 2;
const gradeRect = (() => {
  const counts = boardRect("counts", BASE);
  const w = textWidth(`${GRADE}학년`, supervisorFont, 700);
  return { x: counts.x + 4 - BAR_GAP - w - GRADE_SLACK, y: dateRect.y, w: w + GRADE_SLACK * 2, h: BAR_TEXT_H };
})();
const countsRect = boardRect("counts", SCROLLED);
const otherGradePoint = boardPoint("otherGrade", SCROLLED);
const otherGradeRect = centered(
  otherGradePoint,
  textWidth("다른학년", countsFont) + OTHER_GRADE_PAD_X * 2,
  OTHER_GRADE_H,
);
const tabsRect = boardRect("tabs", BASE);
// 탭 모양은 탭 칸 위쪽 8px(pt-2) 아래에 그려지고, 네 칸이 4px 간격으로 같은 폭이다.
const TAB_TOP_PAD = 8;
const TAB_GAP = 4;
const tabW = (tabsRect.w - TAB_GAP * 3) / 4;
const tabShapeY = tabsRect.y + TAB_TOP_PAD;
const tabShapeH = tabsRect.h - TAB_TOP_PAD;
// 두 상자가 탭 모양 바깥 2px 을 나눠 갖는다(가운데 간격 4px).
const TAB_BOX_PAD = 2;
const sessionTabsRect: Rect = {
  x: tabsRect.x - TAB_BOX_PAD,
  y: tabShapeY - TAB_BOX_PAD,
  w: tabW * 3 + TAB_GAP * 2 + TAB_BOX_PAD * 2,
  h: tabShapeH + TAB_BOX_PAD * 2,
};
// 불참신청 상자는 네 번째 탭에 맞추고, 위로만 배지(-top-1, 18px)가 테두리 안에 들어오게 넓힌다.
const BADGE_OVERHANG = 4;
const absenceTabRect: Rect = {
  x: tabsRect.x + (tabW + TAB_GAP) * 3 - TAB_BOX_PAD,
  y: tabShapeY - BADGE_OVERHANG - TAB_BOX_PAD,
  w: tabW + TAB_BOX_PAD * 2,
  h: tabShapeH + BADGE_OVERHANG + TAB_BOX_PAD * 2,
};
const dateBarRect = boardRect("dateBar", BASE);
// 상자 글로우가 상자 밖 12px 까지 번지므로, 폰 화면(390×752) 안에서 끝나도록 좌우·아래를 그만큼 들여놓는다.
const GLOW = 12;
const boardAreaRect: Rect = {
  x: dateBarRect.x,
  y: dateBarRect.y - 4,
  w: dateBarRect.w,
  h: PHONE_BODY.h - dateBarRect.y - GLOW,
};

const BAR_BAND = dateBarBand(BASE);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const scrollX =
    frame < scrollBackFrom
      ? tween(frame, [scrollFrom, scrollFrom + SCROLL_FRAMES], [0, MAX_SCROLL_X], easeInOut)
      : tween(frame, [scrollBackFrom, scrollBackFrom + SCROLL_FRAMES], [MAX_SCROLL_X, COUNTS_SCROLL], easeInOut);
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={BOARD_URL}>
      <AttendanceBoardMock {...BASE} dateBarScrollX={scrollX} />
    </PhoneFrame>
  );
};

export const AttendanceTourScene: React.FC<DemoProps> = () => {
  const otherGrade = phoneAbs(otherGradePoint);
  return (
    <GuideScene id={ID} step={2} label="출석부 화면">
      <Stage />

      <Annotation {...between(boardFrom, lineStart(ID, 1))} {...phoneBox(boardAreaRect, 0, "left")} label="담당 학년 출석부" color={colors.blue600} />

      <Annotation {...between(barFrom, dateFrom + 4)} {...phoneBox(dateBarRect, 4, "left")} label="파란 막대" color={colors.blue600} />
      <ClipTo rect={BAR_BAND}>
        <Annotation {...between(dateFrom, supervisorFrom + 4)} {...phoneBox(dateRect, 4, "left")} label="오늘 날짜" color={colors.red600} />
        <Annotation {...between(supervisorFrom, gradeFrom + 4)} {...phoneBox(supervisorRect, 4, "left")} label="감독교사" color={colors.red600} />
        <Annotation {...between(gradeFrom, scrollFrom)} {...phoneBox(gradeRect, 4, "left")} label="학년" color={colors.red600} />
        <Annotation {...between(countsFrom, lineEnd(ID, 1))} {...phoneBox(countsRect, 2, "right")} label="출석 · 결석 · 미체크 · 방과후" color={colors.red600} />
      </ClipTo>

      <ClipTo rect={BAR_BAND}>
        <Annotation {...between(otherGradeFrom, lineEnd(ID, 2))} {...phoneBox(otherGradeRect, 4, "right")} label="다른학년" color={colors.purple600} />
      </ClipTo>
      <Cursor
        path={[
          { frame: pointFrom - 12, x: otherGrade.x - 30, y: otherGrade.y + 90 },
          { frame: pointFrom, x: otherGrade.x - 6, y: otherGrade.y + 8 },
        ]}
        hideAfter={lineEnd(ID, 2) - 8}
      />

      <Annotation {...between(sessionTabsFrom, lineEnd(ID, 3) + 10)} {...phoneBox(sessionTabsRect, 0, "left")} label="오후1 · 오후2 · 야간" color={colors.blue600} />
      <Annotation {...between(absenceTabFrom, lineEnd(ID, 3) + 10)} {...phoneBox(absenceTabRect, 0, "right")} label="불참신청" color={colors.red600} />
    </GuideScene>
  );
};
