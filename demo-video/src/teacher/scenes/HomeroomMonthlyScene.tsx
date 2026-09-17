import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { FlashNotice } from "../../components/FlashNotice";
import { GuideScene } from "../../guide/GuideScene";
import { APP_HOST, HOMEROOM_MONTH } from "../../app-mocks/data";
import { PcViewport, pcAbs, pcRectAbs, type Rect } from "../../app-mocks/layout";
import { MonthlyAttendanceMock, monthlyMaxScrollX, monthlyRect } from "../../app-mocks/MonthlyAttendanceMock";
import { colors } from "../../theme";
import { lineAt, lineEnd, lineStart } from "../timing";
import { HOMEROOM_BODY, HomeroomShellMock, homeroomTabPoint } from "../mocks/HomeroomShellMock";
import { HomeroomWeeklyMock } from "../mocks/HomeroomWeeklyMock";
import { WEEKLY_PAGE_SCROLL } from "./HomeroomWeeklyScene";
import type { DemoProps } from "../../props";

const ID = "HomeroomMonthly";
const W = HOMEROOM_BODY.w;

// MonthlyAttendanceMock 내부 치수(앱 attendance/page.tsx) — 날짜 묶음·월 이동 묶음은 rect 키가 없어 장면에서 잡는다.
const STICKY_W = 92;
const DATE_GROUP_W = 90;
const TABLE_HEAD_H = 40;
const MONTH_NAV_W = 140;

const tabClick = lineAt(ID, 0, 0.22);
const pageSwap = tabClick + 3;
const scrollFrom = lineAt(ID, 1, 0.45);
const scrollTo = lineAt(ID, 1, 0.6);
const excelClick = lineAt(ID, 2, 0.5);

const bodyRect = (r: Rect) => pcRectAbs({ x: HOMEROOM_BODY.x + r.x, y: HOMEROOM_BODY.y + r.y, w: r.w, h: r.h });

const box = (r: { x: number; y: number; width: number; height: number }, pad = 6) => ({
  x: r.x - pad,
  y: r.y - pad,
  width: r.width + pad * 2,
  height: r.height + pad * 2,
});

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const onMonthly = frame >= pageSwap;
  const scrollX = tween(frame, [scrollFrom, scrollTo], [0, monthlyMaxScrollX(W)]);
  return (
    <BrowserFrame url={`${APP_HOST}/homeroom${onMonthly ? "/attendance" : ""}`} tabTitle="포산고 자율학습">
      <PcViewport>
        <HomeroomShellMock
          tab={onMonthly ? "attendance" : "students"}
          role="homeroom"
          tabPressAt={{ tab: "attendance", at: tabClick }}
        >
          {onMonthly ? (
            <div style={{ position: "absolute", inset: 0, opacity: tween(frame, [pageSwap, pageSwap + 8], [0, 1]) }}>
              <MonthlyAttendanceMock
                variant="homeroom"
                width={W}
                height={HOMEROOM_BODY.h}
                scrollX={scrollX}
                excelPressAt={excelClick}
              />
            </div>
          ) : (
            // 앞 장면(HomeroomWeekly)이 끝난 모습 — 합계 줄까지 내려 둔 주간표.
            <div style={{ position: "absolute", left: 0, top: -WEEKLY_PAGE_SCROLL }}>
              <HomeroomWeeklyMock width={W} height={HOMEROOM_BODY.h + WEEKLY_PAGE_SCROLL} highlightRow="totals" />
            </div>
          )}
        </HomeroomShellMock>
      </PcViewport>
    </BrowserFrame>
  );
};

export const HomeroomMonthlyScene: React.FC<DemoProps> = () => {
  const table = monthlyRect("table", "homeroom", W);
  const nav = monthlyRect("monthNav", "homeroom", W);
  const excel = bodyRect(monthlyRect("excel", "homeroom", W));
  const hours = monthlyRect("hoursColumn", "homeroom", W);
  const firstDate = bodyRect({ x: table.x + 1 + STICKY_W, y: table.y, w: DATE_GROUP_W, h: TABLE_HEAD_H });
  const hoursWithHead = bodyRect({ ...hours, y: table.y, h: hours.y + hours.h - table.y });
  const tableVisible = bodyRect({ ...table, h: Math.min(table.h, HOMEROOM_BODY.h - table.y - 10) });

  const tab = pcAbs(homeroomTabPoint("attendance", "homeroom"));
  const excelPoint = { x: excel.x + excel.width / 2, y: excel.y + excel.height / 2 };
  const [year, month] = [HOMEROOM_MONTH.year, HOMEROOM_MONTH.month];

  return (
    <GuideScene id={ID} step={15} label="월간출결">
      <Stage />

      <Annotation
        from={lineAt(ID, 0, 0.5)}
        durationInFrames={lineEnd(ID, 0) - lineAt(ID, 0, 0.5)}
        {...box(tableVisible)}
        label={`${month}월 한 달 출결표`}
        labelPosition="bottom"
        labelAlign="end"
        color={colors.blue600}
      />

      <Annotation
        from={lineAt(ID, 1, 0.05)}
        durationInFrames={lineAt(ID, 1, 0.44) - lineAt(ID, 1, 0.05)}
        {...box(firstDate, 4)}
        label="날짜마다 오후1 · 오후2 · 야간"
        labelPosition="top"
        color={colors.blue600}
      />
      <Annotation
        from={scrollTo + 2}
        durationInFrames={lineEnd(ID, 1) - scrollTo - 2}
        {...box(hoursWithHead, 4)}
        label="학생별 출석 시간"
        labelPosition="top"
        labelAlign="end"
      />

      <Annotation
        from={lineAt(ID, 2, 0.02)}
        durationInFrames={lineAt(ID, 2, 0.42) - lineAt(ID, 2, 0.02)}
        {...box(bodyRect({ x: nav.x, y: nav.y, w: MONTH_NAV_W, h: nav.h }))}
        label="달 이동"
        labelPosition="right"
      />
      <Annotation
        from={excelClick + 4}
        durationInFrames={lineEnd(ID, 2) + 10 - excelClick - 4}
        {...box(excel)}
        label="엑셀로 내려받기"
        labelPosition="left"
        color={colors.green600}
      />
      <FlashNotice
        from={excelClick + 8}
        durationInFrames={lineEnd(ID, 2) - excelClick - 8}
        text={`${year}년 ${month}월_출결.xlsx`}
        hint="다운로드 완료"
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 0), x: 1100, y: 640 },
          { frame: tabClick - 6, x: tab.x, y: tab.y },
          { frame: tabClick + 10, x: tab.x, y: tab.y },
          { frame: scrollFrom - 4, x: 1100, y: 640 },
          { frame: lineAt(ID, 2, 0.3), x: 1300, y: 560 },
          { frame: excelClick - 6, x: excelPoint.x, y: excelPoint.y },
        ]}
        clicks={[tabClick, excelClick]}
        hideAfter={lineEnd(ID, 2)}
      />
    </GuideScene>
  );
};
