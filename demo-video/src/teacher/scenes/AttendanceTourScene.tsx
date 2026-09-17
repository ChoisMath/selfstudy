import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { Cursor } from "../../components/Cursor";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_CROP, PHONE_X, PHONE_Y, phoneAbs, phoneLeftLabelGap, phoneRectAbs } from "../../components/phone";
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
  countsOf,
  type AttendanceBoardProps,
} from "../../app-mocks/AttendanceBoardMock";
import { textWidth } from "../../app-mocks/AttendanceHeaderMock";
import { vwClamp } from "../../app-mocks/SeatCellMock";
import { ABSENCE_REQUESTS, APP_HOST, GRADE, ME, SUPERVISOR_SEPT, TODAY, TODAY_LABEL } from "../../app-mocks/data";
import { PHONE_BODY, type Point, type Rect } from "../../app-mocks/layout";
import type { DemoProps } from "../../props";

// 교사 폰 장면(Login·AttendanceTour·SeatTap·CopySession)이 함께 쓰는 출석부 기본값과 주석 도우미.
export const BOARD_URL = `${APP_HOST}/attendance/${GRADE}`;

export const boardProps = (
  overrides: Partial<AttendanceBoardProps> & Pick<AttendanceBoardProps, "tab" | "groups">,
): AttendanceBoardProps => ({
  width: PHONE_BODY.w,
  height: PHONE_BODY.h,
  header: { width: PHONE_BODY.w, role: "homeroom", name: ME.name, showHelp: true },
  dateLabel: TODAY_LABEL,
  supervisor: SUPERVISOR_SEPT[TODAY][GRADE],
  grade: GRADE,
  counts: countsOf(overrides.groups),
  pendingBadge: ABSENCE_REQUESTS.filter((r) => r.status === "pending").length,
  ...overrides,
});

export const between = (from: number, to: number) => ({ from, durationInFrames: to - from });

const RIGHT_LABEL_EDGE = PHONE_CROP.x + PHONE_CROP.w + 4;

// 폰 안 요소 상자. 가이드 스틸은 폰만 잘라 쓰므로 라벨은 가까운 쪽 폰 바깥에 둔다.
export const phoneBox = (r: Rect, pad: number, side: "left" | "right") => {
  const a = phoneRectAbs(r);
  const box = { x: a.x - pad, y: a.y - pad, width: a.width + pad * 2, height: a.height + pad * 2 };
  return side === "left"
    ? { ...box, labelPosition: "left" as const, labelGap: phoneLeftLabelGap(box.x) }
    : { ...box, labelPosition: "right" as const, labelGap: RIGHT_LABEL_EDGE - (box.x + box.width) };
};

// 폰 화면을 손가락으로 누르듯 누를 때만 커서가 잠깐 나타났다 사라진다 — 스틸에 커서가 남지 않게.
export const TapCursor: React.FC<{ at: number; target: Point }> = ({ at, target }) => {
  const p = phoneAbs(target);
  return (
    <Cursor
      path={[
        { frame: at - 14, x: p.x + 40, y: p.y + 48 },
        { frame: at - 3, x: p.x, y: p.y },
      ]}
      clicks={[at]}
      hideAfter={at + 8}
    />
  );
};

const ID = "AttendanceTour";

const BASE = boardProps({ tab: "afternoon1", groups: buildAfternoonGroups((id) => baseVisual(id)) });
const MAX_SCROLL_X = boardDateBarMaxScrollX(BASE);
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
const gradeRect = (() => {
  const counts = boardRect("counts", BASE);
  const w = textWidth(`${GRADE}학년`, supervisorFont, 700);
  return { x: counts.x + 4 - BAR_GAP - w, y: dateRect.y, w, h: BAR_TEXT_H };
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
// 두 상자가 가운데 간격 4px 을 나눠 갖는다. 불참신청 상자는 탭 오른쪽 위로 튀어나온 배지가 테두리 안쪽에 오도록 더 키운다.
const sessionTabsRect: Rect = {
  x: tabsRect.x - 2,
  y: tabShapeY - 2,
  w: tabW * 3 + TAB_GAP * 2 + 4,
  h: tabShapeH + 4,
};
const ABSENCE_BOX_EXTRA = 5;
const absenceTabRect: Rect = {
  x: sessionTabsRect.x + sessionTabsRect.w,
  y: tabsRect.y - ABSENCE_BOX_EXTRA,
  w: tabW + TAB_GAP + ABSENCE_BOX_EXTRA,
  h: tabShapeH + TAB_TOP_PAD + ABSENCE_BOX_EXTRA + 2,
};
const dateBarRect = boardRect("dateBar", BASE);
const boardAreaRect: Rect = {
  x: dateBarRect.x - 4,
  y: dateBarRect.y - 4,
  w: dateBarRect.w + 8,
  h: PHONE_BODY.h - dateBarRect.y,
};

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const scrollX =
    frame < scrollBackFrom
      ? tween(frame, [scrollFrom, scrollFrom + SCROLL_FRAMES], [0, MAX_SCROLL_X], easeInOut)
      : tween(frame, [scrollBackFrom, scrollBackFrom + SCROLL_FRAMES], [MAX_SCROLL_X, 0], easeInOut);
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
      <Annotation {...between(dateFrom, supervisorFrom + 4)} {...phoneBox(dateRect, 4, "left")} label="오늘 날짜" color={colors.red600} />
      <Annotation {...between(supervisorFrom, gradeFrom + 4)} {...phoneBox(supervisorRect, 4, "left")} label="감독교사" color={colors.red600} />
      <Annotation {...between(gradeFrom, scrollFrom)} {...phoneBox(gradeRect, 5, "left")} label="학년" color={colors.red600} />
      <Annotation {...between(countsFrom, lineEnd(ID, 1))} {...phoneBox(countsRect, 2, "right")} label="출석 · 결석 · 미체크 · 방과후" color={colors.red600} />

      <Annotation {...between(otherGradeFrom, lineEnd(ID, 2))} {...phoneBox(otherGradeRect, 5, "right")} label="다른학년" color={colors.purple600} />
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
