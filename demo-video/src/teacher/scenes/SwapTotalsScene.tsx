import React from "react";
import { useCurrentFrame } from "remotion";
import { SupervisorSummaryMock, summaryRect } from "../../app-mocks/SupervisorSummaryMock";
import { APP_URL, ME, SUPERVISOR_SUMMARY } from "../../app-mocks/data";
import { PcViewport, pcRectAbs } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { colors } from "../../theme";
import { HomeroomShellMock } from "../mocks/HomeroomShellMock";
import { lineAt, lineEnd, lineStart, sceneFrames } from "../timing";
import { SWAPPED_SEPT, SchedulePage, TAB_TITLE, calendarTotalsRect, padRect } from "./pc-helpers";

const ID = "SwapTotals";

const totalsFrom = lineAt(ID, 0, 0.1);
const totalsClick = lineAt(ID, 0, 0.38);
const openAt = totalsClick + 6;
const tableFrom = lineAt(ID, 0, 0.6);
const myRowFrom = lineStart(ID, 1) + 4;

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <BrowserFrame url={`${APP_URL}/homeroom/schedule`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <HomeroomShellMock tab="schedule" role="homeroom" showHelp>
          <SchedulePage assignments={SWAPPED_SEPT} totalsPressAt={totalsClick} />
        </HomeroomShellMock>
        {frame >= openAt ? (
          <SupervisorSummaryMock months={SUPERVISOR_SUMMARY.months} rows={SUPERVISOR_SUMMARY.rows} me={ME.name} openAt={openAt} />
        ) : null}
      </PcViewport>
    </BrowserFrame>
  );
};

export const SwapTotalsScene: React.FC<DemoProps> = () => {
  const totalsBox = pcRectAbs(calendarTotalsRect());
  const cursorTarget = { x: totalsBox.x + totalsBox.width * 0.5, y: totalsBox.y + totalsBox.height * 0.7 };
  const table = pcRectAbs(summaryRect("table"));
  const myRow = pcRectAbs(summaryRect("myRow"));
  const endFrame = sceneFrames(ID);

  return (
    <GuideScene id={ID} step={12} label="감독 누계">
      <Stage />
      {/* 버튼에 "누계"가 이미 적혀 있어 라벨 없이 상자만 — 라벨을 달면 옆 토일 OFF 토글을 덮는다. */}
      <Annotation from={totalsFrom} durationInFrames={openAt - totalsFrom} {...padRect(totalsBox, 4)} />
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
          { frame: lineStart(ID, 0) + 6, x: cursorTarget.x - 260, y: cursorTarget.y + 260 },
          { frame: totalsClick - 4, x: cursorTarget.x, y: cursorTarget.y },
          { frame: openAt + 4, x: cursorTarget.x, y: cursorTarget.y },
          { frame: tableFrom, x: cursorTarget.x, y: cursorTarget.y + 240 },
        ]}
        clicks={[totalsClick]}
        hideAfter={tableFrom}
      />
    </GuideScene>
  );
};
