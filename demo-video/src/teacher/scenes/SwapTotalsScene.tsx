import React from "react";
import { useCurrentFrame } from "remotion";
import { schedulePoint } from "../../app-mocks/ScheduleCalendarMock";
import { SupervisorSummaryMock, summaryRect } from "../../app-mocks/SupervisorSummaryMock";
import { APP_URL, ME, SUPERVISOR_SUMMARY } from "../../app-mocks/data";
import { PC_VIEWPORT, PcViewport, pcAbs, pcRectAbs } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { colors } from "../../theme";
import { HOMEROOM_BODY, HomeroomShellMock } from "../mocks/HomeroomShellMock";
import { lineAt, lineEnd, lineStart, sceneFrames } from "../timing";
import { SchedulePage, TAB_TITLE, bodyRect, padRect } from "./SwapEntryScene";
import { SWAPPED_SEPT } from "./SwapModalScene";

const ID = "SwapTotals";

const totalsFrom = lineAt(ID, 0, 0.1);
const totalsClick = lineAt(ID, 0, 0.38);
const openAt = totalsClick + 6;
const tableFrom = lineAt(ID, 0, 0.6);
const myRowFrom = lineStart(ID, 1) + 4;

// SupervisorSummaryMock 우회: 표 칸 left 에 뷰포트 x(PANEL_X 포함)를 패널 안에서 그대로 써서 표가 패널 x 만큼 오른쪽으로
// 밀려 패널 밖으로 넘친다. 닫기(×)를 뺀 칸만 되돌려 summaryRect 위치에 맞춘다. 목업이 고쳐지면 이 스타일을 지울 것.
const SUMMARY_PANEL_W = 672;
const SUMMARY_PANEL_X = (PC_VIEWPORT.w - SUMMARY_PANEL_W) / 2;
// summaryRect 는 패널 전체 폭을 준다 — 표는 양옆 16 안쪽에 그려진다.
const SUMMARY_TABLE_PAD_X = 16;
const SUMMARY_FIX_CSS = `[data-summary-fix] > div > div > div:nth-child(n+2) { translate: ${-SUMMARY_PANEL_X}px 0px; }`;

const SupervisorSummary: React.FC<React.ComponentProps<typeof SupervisorSummaryMock>> = (props) => (
  <div data-summary-fix="" style={{ position: "absolute", inset: 0 }}>
    <style>{SUMMARY_FIX_CSS}</style>
    <SupervisorSummaryMock {...props} />
  </div>
);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <BrowserFrame url={`${APP_URL}/homeroom/schedule`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <HomeroomShellMock tab="schedule" role="homeroom" showHelp>
          <SchedulePage assignments={SWAPPED_SEPT} totalsPressAt={totalsClick} />
        </HomeroomShellMock>
        {frame >= openAt ? (
          <SupervisorSummary months={SUPERVISOR_SUMMARY.months} rows={SUPERVISOR_SUMMARY.rows} me={ME.name} openAt={openAt} />
        ) : null}
      </PcViewport>
    </BrowserFrame>
  );
};

export const SwapTotalsScene: React.FC<DemoProps> = () => {
  const totalsPoint = schedulePoint("totals", HOMEROOM_BODY.w);
  const totals = pcAbs(bodyRect({ ...totalsPoint, w: 0, h: 0 }));
  const totalsBox = pcRectAbs(bodyRect({ x: totalsPoint.x - 23, y: totalsPoint.y - 12, w: 46, h: 24 }));
  const tableRect = summaryRect("table");
  const myRowRect = summaryRect("myRow");
  const table = pcRectAbs({ ...tableRect, x: tableRect.x + SUMMARY_TABLE_PAD_X, w: tableRect.w - SUMMARY_TABLE_PAD_X * 2 });
  const myRow = pcRectAbs({ ...myRowRect, x: myRowRect.x + SUMMARY_TABLE_PAD_X, w: myRowRect.w - SUMMARY_TABLE_PAD_X * 2 });
  const endFrame = sceneFrames(ID);

  return (
    <GuideScene id={ID} step={12} label="감독 누계">
      <Stage />
      <Annotation
        from={totalsFrom}
        durationInFrames={openAt - totalsFrom}
        {...padRect(totalsBox, 6)}
        label="누계"
        labelPosition="left"
      />
      <Annotation
        from={tableFrom}
        durationInFrames={lineEnd(ID, 0) - tableFrom}
        {...padRect(table, 4)}
        label="선생님별 · 달마다 감독 횟수"
        labelPosition="bottom"
        labelAlign="end"
        color={colors.blue600}
      />
      <Annotation
        from={myRowFrom}
        durationInFrames={endFrame - myRowFrom}
        {...padRect(myRow, 4)}
        label="내 줄 · 맨 위 노란색"
        labelPosition="left"
      />
      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 6, x: totals.x - 260, y: totals.y + 260 },
          { frame: totalsClick - 4, x: totals.x + 10, y: totals.y + 6 },
          { frame: openAt + 4, x: totals.x + 10, y: totals.y + 6 },
          { frame: tableFrom, x: totals.x + 10, y: totals.y + 240 },
        ]}
        clicks={[totalsClick]}
        hideAfter={tableFrom}
      />
    </GuideScene>
  );
};
