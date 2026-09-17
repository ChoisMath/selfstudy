import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { boardRect } from "../../app-mocks/AttendanceBoardMock";
import {
  ATTENDANCE_HEADER_H,
  AttendanceHeaderMock,
  attendanceHeaderPoint,
  attendanceHeaderRect,
  type AttendanceHeaderProps,
} from "../../app-mocks/AttendanceHeaderMock";
import { APP_URL, SWAP_EXAMPLE, TEACHERS, TODAY } from "../../app-mocks/data";
import { PC_VIEWPORT, pcAbs, pcRectAbs } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { BROWSER, colors } from "../../theme";
import { HOMEROOM_BODY, homeroomTabPoint, type HomeroomTab } from "../mocks/HomeroomShellMock";
import { HomeroomWeeklyMock, homeroomWeeklyRect } from "../mocks/HomeroomWeeklyMock";
import { lineAt, lineEnd, lineStart, sceneFrames } from "../timing";
import {
  ATTENDANCE_PC_HEADER,
  BoardToShell,
  InsetCard,
  PAGE_FADE,
  PC_BOARD_PROPS,
  SchedulePage,
  TAB_TITLE,
  bodyRect,
  calendarDayHeaderRect,
  calendarDayRect,
  calendarLegendRect,
  calendarRowRect,
  insetCardSize,
  insetRectAbs,
  labelGapBelowCell,
  padRect,
  type InsetCrop,
} from "./pc-helpers";

const ID = "SwapEntry";

// 1·2·3학년이 모두 다른 선생님인 날 — 첫 주에 두면 "1·2·3학년 감독교사" 라벨이 달력 위 빈 띠에 들어간다.
const GRADES_DAY = "2026-09-02";

// 담임이 아닌 선생님 경로 — 같은 자리에 "감독일정" 칩이 있는 헤더 오른쪽을 잘라 보여 준다.
const SUPERVISOR_HEADER: AttendanceHeaderProps = { width: PC_VIEWPORT.w, role: "supervisor", name: TEACHERS[1].name, showHelp: true };
const SUP_CHIP = attendanceHeaderRect("schedule", SUPERVISOR_HEADER);
const INSET_CROP: InsetCrop = {
  rect: { x: SUP_CHIP.x - 24, y: 0, w: PC_VIEWPORT.w - (SUP_CHIP.x - 24), h: ATTENDANCE_HEADER_H },
  scale: 1.5,
};
const INSET_SIZE = insetCardSize(INSET_CROP);
// 탭 줄 아래에 놓아 불참신청 배지를 자르지 않게 한다.
const BOARD_TABS = boardRect("tabs", PC_BOARD_PROPS);
const INSET_CARD = {
  x: BROWSER.x + BROWSER.w - 40 - INSET_SIZE.width,
  y: pcAbs({ x: 0, y: BOARD_TABS.y + BOARD_TABS.h }).y + 12,
};

const insetIn = lineAt(ID, 1, 0.02);
const insetChipClick = lineAt(ID, 1, 0.25);
const insetOut = lineAt(ID, 1, 0.42);
const homeroomChipFrom = lineAt(ID, 1, 0.46);
const homeroomChipClick = lineAt(ID, 1, 0.6);
const shellAt = homeroomChipClick + 8;
const scheduleTabFrom = shellAt + 14;
const scheduleTabClick = lineAt(ID, 1, 0.86);
const calendarAt = scheduleTabClick + 6;
const gradesFrom = lineAt(ID, 2, 0.06);
const mineFrom = lineAt(ID, 2, 0.45);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const tab: HomeroomTab = frame >= calendarAt ? "schedule" : "students";
  const url = frame >= calendarAt ? `${APP_URL}/homeroom/schedule` : frame >= shellAt ? `${APP_URL}/homeroom` : `${APP_URL}/attendance/1`;
  return (
    <BrowserFrame url={url} tabTitle={TAB_TITLE}>
      <BoardToShell shellAt={shellAt} chipPressAt={homeroomChipClick} tab={tab} tabPressAt={{ tab: "schedule", at: scheduleTabClick }}>
        {frame >= calendarAt ? (
          <div style={{ position: "absolute", inset: 0, opacity: tween(frame, [calendarAt, calendarAt + PAGE_FADE], [0, 1]) }}>
            <SchedulePage />
          </div>
        ) : (
          <HomeroomWeeklyMock width={HOMEROOM_BODY.w} height={HOMEROOM_BODY.h} />
        )}
      </BoardToShell>
    </BrowserFrame>
  );
};

export const SwapEntryScene: React.FC<DemoProps> = () => {
  const homeroomChip = pcRectAbs(attendanceHeaderRect("homeroom", ATTENDANCE_PC_HEADER));
  const homeroomChipPoint = pcAbs(attendanceHeaderPoint("homeroom", ATTENDANCE_PC_HEADER));
  const scheduleTab = homeroomTabPoint("schedule", "homeroom");
  const scheduleTabPoint = pcAbs(scheduleTab);
  const scheduleTabBox = pcRectAbs({ x: scheduleTab.x - 40, y: 0, w: 80, h: HOMEROOM_BODY.y });
  // 주간표의 "9/14 ~ 9/18" 줄을 덮지 않도록 라벨을 그 아래 빈 띠로 내린다.
  const weekNav = pcRectAbs(bodyRect(homeroomWeeklyRect("weekNav", HOMEROOM_BODY.w)));
  const scheduleTabLabelGap = weekNav.y + weekNav.height - (scheduleTabBox.y + scheduleTabBox.height) - 2;

  const insetChip = insetRectAbs(INSET_CARD, INSET_CROP, SUP_CHIP);
  const insetChipPoint = { x: insetChip.x + insetChip.width * 0.7, y: insetChip.y + insetChip.height * 0.7 };

  const dayRowsBox = padRect(pcRectAbs(calendarDayRect(GRADES_DAY)), 3);
  const dayHeader = pcRectAbs(calendarDayHeaderRect());
  const todayRow = pcRectAbs(calendarRowRect(TODAY, 1));
  const swapRow = pcRectAbs(calendarRowRect(SWAP_EXAMPLE.date, 1));
  const legendBox = pcRectAbs(calendarLegendRect());
  const endFrame = sceneFrames(ID);

  return (
    <GuideScene id={ID} step={10} label="감독일정">
      <Stage />
      <InsetCard card={INSET_CARD} crop={INSET_CROP} title="담임이 아닌 선생님의 출석부 화면" from={insetIn} out={insetOut}>
        <AttendanceHeaderMock {...SUPERVISOR_HEADER} pressKey="schedule" pressAt={insetChipClick} />
      </InsetCard>
      <Annotation
        from={insetIn + 10}
        durationInFrames={insetOut - insetIn - 10}
        {...padRect(insetChip, 6)}
        color={colors.red600}
      />
      <Annotation
        from={homeroomChipFrom}
        durationInFrames={shellAt - homeroomChipFrom}
        {...padRect(homeroomChip, 6)}
        label="담임 선생님"
        labelPosition="left"
      />
      <Annotation
        from={scheduleTabFrom}
        durationInFrames={calendarAt - scheduleTabFrom}
        {...padRect(scheduleTabBox, 2)}
        label="감독일정 탭"
        labelPosition="bottom"
        labelGap={scheduleTabLabelGap}
      />
      <Annotation
        from={gradesFrom}
        durationInFrames={endFrame - gradesFrom}
        {...dayRowsBox}
        label="1·2·3학년 감독교사"
        labelPosition="top"
        labelGap={dayRowsBox.y - dayHeader.y + 6}
        color={colors.blue600}
      />
      <Annotation
        from={mineFrom}
        durationInFrames={endFrame - mineFrom}
        {...padRect(todayRow, 2)}
        color={colors.red600}
      />
      <Annotation
        from={mineFrom}
        durationInFrames={endFrame - mineFrom}
        {...padRect(swapRow, 2)}
        label="노란 줄 = 내가 배정된 날"
        labelPosition="bottom"
        labelGap={labelGapBelowCell(SWAP_EXAMPLE.date, 1, 2)}
        color={colors.red600}
      />
      <Annotation
        from={mineFrom + 6}
        durationInFrames={endFrame - mineFrom - 6}
        {...padRect(legendBox, 3)}
        color={colors.red600}
      />
      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 20, x: 1600, y: 760 },
          { frame: lineEnd(ID, 0), x: 1640, y: 700 },
          { frame: insetChipClick - 10, x: insetChipPoint.x, y: insetChipPoint.y },
          { frame: insetOut, x: insetChipPoint.x, y: insetChipPoint.y },
          { frame: homeroomChipClick - 8, x: homeroomChipPoint.x, y: homeroomChipPoint.y },
          { frame: scheduleTabFrom, x: homeroomChipPoint.x, y: homeroomChipPoint.y },
          { frame: scheduleTabClick - 8, x: scheduleTabPoint.x, y: scheduleTabPoint.y },
          { frame: lineStart(ID, 2), x: scheduleTabPoint.x + 120, y: scheduleTabPoint.y + 160 },
        ]}
        clicks={[insetChipClick, homeroomChipClick, scheduleTabClick]}
        hideAfter={lineStart(ID, 2)}
      />
    </GuideScene>
  );
};
