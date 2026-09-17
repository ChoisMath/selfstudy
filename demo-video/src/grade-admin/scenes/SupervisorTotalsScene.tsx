import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { APP_URL, ME, SUPERVISOR_SUMMARY } from "../../app-mocks/data";
import { PcViewport, pcRectAbs, type Point, type Rect } from "../../app-mocks/layout";
import { SupervisorSummaryMock, summaryRect } from "../../app-mocks/SupervisorSummaryMock";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { FlashNotice } from "../../components/FlashNotice";
import { GuideScene } from "../../guide/GuideScene";
import { FONT } from "../../fonts";
import type { DemoProps } from "../../props";
import { BROWSER, colors } from "../../theme";
import { padRect } from "../../teacher/scenes/pc-helpers";
import { GRADE, SUPERVISOR_MONTH } from "../data";
import { GRADE_ADMIN_BODY, GradeAdminShellMock } from "../mocks/GradeAdminShellMock";
import { SupervisorCalendarMock, supervisorCalendarRect } from "../mocks/SupervisorCalendarMock";
import { lineAt, lineEnd, lineStart } from "../timing";

const ID = "SupervisorTotals";
const W = GRADE_ADMIN_BODY.w;
const TAB_TITLE = "포산고 자율학습";

// 달력 월 이동 줄 가운데의 Excel 배지 — SupervisorCalendarMock 이 rect 키를 주지 않아 렌더로 재어 적는다.
const EXCEL_BTN: Rect = { x: 681, y: 40, w: 48, h: 28 };

// src/app/api/grade-admin/[grade]/supervisor-assignments/export/route.ts 99행 파일명,
// src/lib/excel/supervisor-export.ts 126·228행 시트 이름.
const EXCEL_FILE = `${GRADE}학년_감독배정_2026-09.xlsx`;
const MONTH_SHEET = "2026-09";
const SUMMARY_SHEET = "누계";

const totalsFrom = lineAt(ID, 0, 0.1);
const totalsClick = lineAt(ID, 0, 0.35);
const openAt = totalsClick + 6;
const tableFrom = lineAt(ID, 0, 0.6);
const closeClick = lineAt(ID, 1, 0.05);
const closeAt = closeClick + 4;
const excelClick = lineAt(ID, 1, 0.42);
const sheetFrom = excelClick + 8;

const bodyRect = (r: Rect) => pcRectAbs({ x: GRADE_ADMIN_BODY.x + r.x, y: GRADE_ADMIN_BODY.y + r.y, w: r.w, h: r.h });
const centerOf = (r: { x: number; y: number; width: number; height: number }): Point => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
});

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <BrowserFrame url={`${APP_URL}/grade-admin/${GRADE}`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <GradeAdminShellMock tab="supervisors" showHelp>
          <SupervisorCalendarMock
            width={W}
            month="2026-09"
            assignments={SUPERVISOR_MONTH}
            myGrade={GRADE}
            totalsPressAt={totalsClick}
          />
        </GradeAdminShellMock>
        {frame >= openAt && frame < closeAt ? (
          <SupervisorSummaryMock
            months={SUPERVISOR_SUMMARY.months}
            rows={SUPERVISOR_SUMMARY.rows}
            me={ME.name}
            openAt={openAt}
          />
        ) : null}
      </PcViewport>
    </BrowserFrame>
  );
};

// 내려받은 엑셀 파일 — 달 시트와 누계 시트 두 장이 들어 있다는 것만 보여 주는 그림.
const SHEET_ROWS: (number | null)[][] = [
  [null, null, 1, 2, 3, 4, null],
  [null, 7, 8, 9, 10, 11, null],
];
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const CARD_W = 560;
const CARD_H = 296;
const CARD: Point = { x: BROWSER.x + BROWSER.w - 44 - CARD_W, y: BROWSER.y + BROWSER.h - 44 - CARD_H };
const COL_W = 72;
const HEAD_H = 30;
const ROW_H = 52;

const ExcelCard: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = tween(frame, [sheetFrom, sheetFrom + 12], [0, 1]);
  const tabAt = sheetFrom + 14;
  return (
    <div
      style={{
        position: "absolute",
        left: CARD.x,
        top: CARD.y,
        width: CARD_W,
        height: CARD_H,
        background: colors.white,
        borderRadius: 16,
        boxShadow: "0 18px 44px rgba(15,23,42,0.24), 0 0 0 1px rgba(15,23,42,0.08)",
        opacity: enter,
        translate: `0px ${(1 - enter) * 16}px`,
        fontFamily: FONT,
      }}
    >
      <div style={{ position: "absolute", left: 22, top: 18, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 22, height: 22, borderRadius: 5, background: colors.green600 }} />
        <span style={{ fontSize: 20, fontWeight: 700, color: colors.gray800, whiteSpace: "nowrap" }}>{EXCEL_FILE}</span>
      </div>

      <div style={{ position: "absolute", left: 22, top: 58, width: COL_W * 7, height: HEAD_H + ROW_H * 2, border: `1px solid ${colors.gray300}` }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: COL_W * 7, height: HEAD_H, display: "flex", background: colors.gray100 }}>
          {DOW.map((d, i) => (
            <span
              key={d}
              style={{
                width: COL_W,
                height: HEAD_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 700,
                color: i === 0 ? colors.red600 : i === 6 ? colors.blue600 : colors.gray800,
                borderRight: i === 6 ? undefined : `1px solid ${colors.gray300}`,
                boxSizing: "border-box",
                whiteSpace: "nowrap",
              }}
            >
              {d}
            </span>
          ))}
        </div>
        {SHEET_ROWS.map((row, r) => (
          <div key={r} style={{ position: "absolute", left: 0, top: HEAD_H + r * ROW_H, width: COL_W * 7, height: ROW_H, display: "flex" }}>
            {row.map((day, c) => (
              <span
                key={c}
                style={{
                  width: COL_W,
                  height: ROW_H,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 2,
                  paddingLeft: 8,
                  borderTop: `1px solid ${colors.gray300}`,
                  borderRight: c === 6 ? undefined : `1px solid ${colors.gray300}`,
                  background: c === 0 || c === 6 ? colors.gray50 : undefined,
                  boxSizing: "border-box",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 14, color: colors.gray500 }}>{day ?? ""}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: colors.gray900 }}>
                  {day ? SUPERVISOR_MONTH[`2026-09-${String(day).padStart(2, "0")}`]?.[GRADE] ?? "" : ""}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>

      <div style={{ position: "absolute", left: 22, top: CARD_H - 52, display: "flex", gap: 8 }}>
        {[MONTH_SHEET, SUMMARY_SHEET].map((name, i) => (
          <span
            key={name}
            style={{
              padding: "8px 18px",
              borderRadius: "8px 8px 0 0",
              fontSize: 17,
              fontWeight: 700,
              whiteSpace: "nowrap",
              background: i === 0 ? colors.white : colors.gray100,
              color: i === 0 ? colors.green600 : colors.gray500,
              border: `1px solid ${colors.gray300}`,
              borderBottom: "none",
              opacity: tween(frame, [tabAt + i * 6, tabAt + i * 6 + 10], [0, 1]),
            }}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
};

export const SupervisorTotalsScene: React.FC<DemoProps> = () => {
  const totalsBox = bodyRect(supervisorCalendarRect("totals", W));
  const totalsPoint = centerOf(totalsBox);
  const table = pcRectAbs(summaryRect("table"));
  const panel = pcRectAbs(summaryRect("panel"));
  const closePoint: Point = { x: panel.x + panel.width - 18, y: panel.y + 18 };
  const excelBox = bodyRect(EXCEL_BTN);
  const excelPoint = centerOf(excelBox);

  return (
    <GuideScene id={ID} step={15} label="감독 누계">
      <Stage />
      {/* 버튼에 "누계"라고 적혀 있어 라벨 없이 상자만 — 라벨을 달면 달력 오른쪽 위가 가려진다. */}
      <Annotation from={totalsFrom} durationInFrames={openAt - totalsFrom} {...padRect(totalsBox, 5)} />
      <Annotation
        from={tableFrom}
        durationInFrames={lineEnd(ID, 0) - tableFrom}
        {...padRect(table, 6)}
        label="우리 학년 선생님 · 달마다 감독 횟수와 총계"
        labelPosition="bottom"
        labelAlign="end"
        color={colors.blue600}
      />

      <Annotation
        from={excelClick + 4}
        durationInFrames={lineEnd(ID, 1) - excelClick - 4}
        {...padRect(excelBox, 5)}
        label="이 달 배정표 + 누계"
        labelPosition="bottom"
        color={colors.green600}
      />
      <FlashNotice from={sheetFrom} durationInFrames={lineEnd(ID, 1) - sheetFrom} text={EXCEL_FILE} hint="다운로드 완료" />
      <ExcelCard />

      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 4, x: totalsPoint.x - 220, y: totalsPoint.y + 240 },
          { frame: totalsClick - 6, x: totalsPoint.x, y: totalsPoint.y },
          { frame: openAt + 6, x: totalsPoint.x, y: totalsPoint.y },
        ]}
        clicks={[totalsClick]}
        hideAfter={openAt + 8}
      />
      <Cursor
        path={[
          { frame: lineStart(ID, 1) - 10, x: closePoint.x + 120, y: closePoint.y + 140 },
          { frame: closeClick - 4, x: closePoint.x, y: closePoint.y },
          { frame: closeAt + 8, x: closePoint.x, y: closePoint.y },
          { frame: excelClick - 8, x: excelPoint.x, y: excelPoint.y },
          { frame: sheetFrom, x: excelPoint.x, y: excelPoint.y },
        ]}
        clicks={[closeClick, excelClick]}
        hideAfter={sheetFrom + 4}
      />
    </GuideScene>
  );
};
