import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { APP_URL } from "../../app-mocks/data";
import { PcViewport, pcAbs, pcRectAbs, type Point, type Rect } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { FlashNotice } from "../../components/FlashNotice";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { BROWSER, colors } from "../../theme";
import { InsetCard, insetCardSize, padRect, type InsetCrop } from "../../teacher/scenes/pc-helpers";
import { GRADE, MONTHLY_DATES, MONTHLY_ROWS, SUPERVISOR_MONTH } from "../data";
import { GRADE_ADMIN_BODY, GradeAdminShellMock, gradeAdminTabPoint } from "../mocks/GradeAdminShellMock";
import { GradeMonthlyMock, gradeMonthlyRect, type GradeMonthlyCtx } from "../mocks/GradeMonthlyMock";
import { SupervisorCalendarMock } from "../mocks/SupervisorCalendarMock";
import { lineAt, lineEnd, lineStart } from "../timing";

const ID = "Monthly";
const W = GRADE_ADMIN_BODY.w;
const TAB_TITLE = "포산고 자율학습";

const CTX_CLOSED: GradeMonthlyCtx = { dates: MONTHLY_DATES, legendOpen: false, rowsCount: MONTHLY_ROWS.length };
const CTX_OPEN: GradeMonthlyCtx = { ...CTX_CLOSED, legendOpen: true };
const LAST_DATE = MONTHLY_DATES[MONTHLY_DATES.length - 1];

// src/app/api/grade-admin/[grade]/export-attendance/route.ts 147행 파일명.
const EXCEL_FILE = `${GRADE}학년_월간출결_2026-09.xlsx`;

const tabClick = lineAt(ID, 0, 0.22);
const pageSwap = tabClick + 3;
const tableFrom = lineAt(ID, 0, 0.5);
const dayGroupFrom = lineAt(ID, 1, 0.02);
const legendClick = lineAt(ID, 1, 0.3);
const legendOpenAt = legendClick + 3;
const cursorOut = legendClick + 12;
const legendBoxFrom = legendOpenAt + 4;
const legendCardFrom = lineAt(ID, 1, 0.45);
const hoursFrom = lineAt(ID, 2, 0.08);
const navFrom = lineAt(ID, 3, 0.04);
const excelClick = lineAt(ID, 3, 0.6);
const flashFrom = excelClick + 8;

const bodyRect = (r: Rect) => pcRectAbs({ x: GRADE_ADMIN_BODY.x + r.x, y: GRADE_ADMIN_BODY.y + r.y, w: r.w, h: r.h });
const centerOf = (r: { x: number; y: number; width: number; height: number }): Point => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
});

// 본문에 보이는 만큼만 상자로 두른다 — 표는 36줄이라 본문(448) 아래로 잘린다.
const visibleHeight = (r: Rect) => Math.min(r.h, GRADE_ADMIN_BODY.h - r.y - 6);

// 범례 줄(토글 + 펼친 뜻) — 목업이 범례 내용 rect 를 주지 않아 토글과 표 사이 구간으로 잡는다.
const LEGEND_TOGGLE = gradeMonthlyRect("legendToggle", W, CTX_OPEN);
const LEGEND_AREA: Rect = {
  x: 12,
  y: LEGEND_TOGGLE.y - 4,
  w: 404,
  h: gradeMonthlyRect("table", W, CTX_OPEN).y - LEGEND_TOGGLE.y - 8,
};
// 확대 카드는 뜻 줄만 담는다(토글 선은 빼고).
const LEGEND_CROP: InsetCrop = {
  rect: {
    x: LEGEND_AREA.x,
    y: GRADE_ADMIN_BODY.y + LEGEND_TOGGLE.y + LEGEND_TOGGLE.h + 4,
    w: LEGEND_AREA.w,
    h: 28,
  },
  scale: 2,
};
const LEGEND_CARD_SIZE = insetCardSize(LEGEND_CROP);
const LEGEND_CARD: Point = {
  x: BROWSER.x + BROWSER.w - 44 - LEGEND_CARD_SIZE.width,
  y: BROWSER.y + BROWSER.h - 44 - LEGEND_CARD_SIZE.height,
};

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const onMonthly = frame >= pageSwap;
  return (
    <BrowserFrame url={`${APP_URL}/grade-admin/${GRADE}`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <GradeAdminShellMock
          tab={onMonthly ? "monthly" : "supervisors"}
          showHelp
          tabPressAt={{ tab: "monthly", at: tabClick }}
        >
          {onMonthly ? (
            <div style={{ position: "absolute", inset: 0, opacity: tween(frame, [pageSwap, pageSwap + 8], [0, 1]) }}>
              <GradeMonthlyMock
                width={W}
                dates={MONTHLY_DATES}
                rows={MONTHLY_ROWS}
                legendOpen={frame >= legendOpenAt}
                legendPressAt={legendClick}
                excelPressAt={excelClick}
              />
            </div>
          ) : (
            // 앞 장면(SupervisorTotals)이 끝난 모습 — 감독 배정 달력.
            <SupervisorCalendarMock width={W} month="2026-09" assignments={SUPERVISOR_MONTH} myGrade={GRADE} />
          )}
        </GradeAdminShellMock>
      </PcViewport>
    </BrowserFrame>
  );
};

export const MonthlyScene: React.FC<DemoProps> = () => {
  const tabPoint = pcAbs(gradeAdminTabPoint("monthly"));

  const tableClosed = gradeMonthlyRect("table", W, CTX_CLOSED);
  const tableBox = bodyRect({ ...tableClosed, h: visibleHeight(tableClosed) });

  const firstCell = gradeMonthlyRect(`cell_0_${MONTHLY_DATES[0]}_afternoon1`, W, CTX_CLOSED);
  const dayGroup = bodyRect({
    x: firstCell.x,
    y: tableClosed.y,
    w: firstCell.w * 3,
    h: firstCell.y + firstCell.h - tableClosed.y,
  });

  const legendBox = bodyRect(LEGEND_AREA);
  const legendTogglePoint = centerOf(bodyRect(LEGEND_TOGGLE));

  const tableOpen = gradeMonthlyRect("table", W, CTX_OPEN);
  const lastCell = gradeMonthlyRect(`cell_0_${LAST_DATE}_night`, W, CTX_OPEN);
  const hoursX = lastCell.x + lastCell.w;
  const hoursBox = bodyRect({
    x: hoursX,
    y: tableOpen.y,
    w: tableOpen.x + tableOpen.w - hoursX,
    h: visibleHeight(tableOpen),
  });

  const prev = gradeMonthlyRect("prev", W, CTX_OPEN);
  const next = gradeMonthlyRect("next", W, CTX_OPEN);
  const navBox = bodyRect({ x: prev.x, y: prev.y, w: next.x + next.w - prev.x, h: prev.h });
  const excel = gradeMonthlyRect("excel", W, CTX_OPEN);
  const excelBox = bodyRect(excel);
  const excelPoint = centerOf(excelBox);

  return (
    <GuideScene id={ID} step={16} label="월간출결">
      <Stage />

      <Annotation
        from={tableFrom}
        durationInFrames={lineEnd(ID, 0) - tableFrom}
        {...padRect(tableBox, 5)}
        label="학년 전체 한 달 출결"
        labelPosition="bottom"
        labelAlign="end"
        color={colors.blue600}
      />

      <Annotation
        from={dayGroupFrom}
        durationInFrames={legendClick + 4 - dayGroupFrom}
        {...padRect(dayGroup, 4)}
        label="날짜마다 오후1 · 오후2 · 야간"
        labelPosition="right"
        color={colors.blue600}
      />
      <Annotation from={legendBoxFrom} durationInFrames={lineEnd(ID, 1) - legendBoxFrom} {...padRect(legendBox, 4)} />
      <InsetCard card={LEGEND_CARD} crop={LEGEND_CROP} title="범례" from={legendCardFrom} out={lineEnd(ID, 1)}>
        <div style={{ position: "absolute", left: 0, top: GRADE_ADMIN_BODY.y, width: W }}>
          {/* 범례 위치는 행 수와 무관하다 — 확대용이라 한 줄만 그려 가볍게 만든다. */}
          <GradeMonthlyMock width={W} dates={MONTHLY_DATES} rows={MONTHLY_ROWS.slice(0, 1)} legendOpen />
        </div>
      </InsetCard>

      <Annotation
        from={hoursFrom}
        durationInFrames={lineEnd(ID, 2) - hoursFrom}
        {...padRect(hoursBox, 4)}
        label="학생별 출석 시간 합계"
        labelPosition="left"
      />

      <Annotation
        from={navFrom}
        durationInFrames={lineAt(ID, 3, 0.52) - navFrom}
        {...padRect(navBox, 4)}
        label="달 이동"
        labelPosition="right"
        color={colors.blue600}
      />
      <Annotation
        from={excelClick + 4}
        durationInFrames={lineEnd(ID, 3) - excelClick - 4}
        {...padRect(excelBox, 5)}
        label="학년 월간출결 내려받기"
        labelPosition="left"
        color={colors.green600}
      />
      <FlashNotice from={flashFrom} durationInFrames={lineEnd(ID, 3) - flashFrom} text={EXCEL_FILE} hint="다운로드 완료" />

      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 2, x: tabPoint.x + 180, y: tabPoint.y + 220 },
          { frame: tabClick - 6, x: tabPoint.x, y: tabPoint.y },
          { frame: tabClick + 10, x: tabPoint.x, y: tabPoint.y },
        ]}
        clicks={[tabClick]}
        hideAfter={tabClick + 14}
      />
      <Cursor
        path={[
          { frame: lineAt(ID, 1, 0.14), x: legendTogglePoint.x + 240, y: legendTogglePoint.y + 200 },
          { frame: legendClick - 6, x: legendTogglePoint.x, y: legendTogglePoint.y },
          { frame: cursorOut, x: legendTogglePoint.x, y: legendTogglePoint.y },
        ]}
        clicks={[legendClick]}
        hideAfter={cursorOut}
      />
      <Cursor
        path={[
          { frame: lineAt(ID, 3, 0.3), x: excelPoint.x - 200, y: excelPoint.y + 260 },
          { frame: excelClick - 6, x: excelPoint.x, y: excelPoint.y },
          { frame: flashFrom + 6, x: excelPoint.x, y: excelPoint.y },
        ]}
        clicks={[excelClick]}
        hideAfter={flashFrom + 8}
      />
    </GuideScene>
  );
};
