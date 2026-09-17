import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { attendanceHeaderPoint, attendanceHeaderRect } from "../../app-mocks/AttendanceHeaderMock";
import { APP_URL } from "../../app-mocks/data";
import { PC_VIEWPORT, PcViewport, pcAbs, pcRectAbs } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { FONT } from "../../fonts";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { BROWSER, colors } from "../../theme";
import { HOMEROOM_BODY, HomeroomShellMock, homeroomTabPoint, type HomeroomTab } from "../mocks/HomeroomShellMock";
import { HomeroomWeeklyMock } from "../mocks/HomeroomWeeklyMock";
import { lineAt, lineEnd, lineStart } from "../timing";
import { ATTENDANCE_PC_HEADER, AttendancePcPage, TAB_TITLE, padRect } from "./SwapEntryScene";

const ID = "HomeroomTour";

const HOMEROOM_TABS: HomeroomTab[] = ["students", "attendance", "participation", "absenceReasons", "absenceRequests", "schedule", "password"];
const SUPERVISOR_TABS: HomeroomTab[] = ["schedule", "password"];

// homeroomTabPoint 는 탭 가운데만 준다 — 폭은 목업과 같은 규칙(px-3 24 + 글자당 14)으로 되짚는다.
const TAB_LABEL_LENGTH: Record<HomeroomTab, number> = {
  students: 4,
  attendance: 4,
  participation: 4,
  absenceReasons: 6,
  absenceRequests: 4,
  schedule: 4,
  password: 4,
};
const tabRect = (tab: HomeroomTab, role: "homeroom" | "supervisor") => {
  const p = homeroomTabPoint(tab, role);
  const w = 24 + TAB_LABEL_LENGTH[tab] * 14;
  return { x: p.x - w / 2, y: 0, w, h: HOMEROOM_BODY.y };
};

const chipFrom = lineAt(ID, 1, 0.18);
const chipClick = lineAt(ID, 1, 0.5);
const shellAt = chipClick + 8;
const tabsFrom = lineAt(ID, 2, 0.04);
const tabsTo = lineAt(ID, 2, 0.72);
const tabStep = (tabsTo - tabsFrom) / HOMEROOM_TABS.length;
const allTabsFrom = tabsTo + 4;
const insetIn = lineAt(ID, 3, 0.04);
const insetOut = lineEnd(ID, 3);
const PAGE_FADE = 6;

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <BrowserFrame url={frame >= shellAt ? `${APP_URL}/homeroom` : `${APP_URL}/attendance/1`} tabTitle={TAB_TITLE}>
      <PcViewport>
        {frame < shellAt + PAGE_FADE ? (
          <div style={{ position: "absolute", inset: 0, isolation: "isolate" }}>
            <AttendancePcPage chipPressAt={chipClick} />
          </div>
        ) : null}
        {frame >= shellAt ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 1, opacity: tween(frame, [shellAt, shellAt + PAGE_FADE], [0, 1]) }}>
            <HomeroomShellMock tab="students" role="homeroom" showHelp>
              <HomeroomWeeklyMock width={HOMEROOM_BODY.w} height={HOMEROOM_BODY.h} />
            </HomeroomShellMock>
          </div>
        ) : null}
      </PcViewport>
    </BrowserFrame>
  );
};

// 담임이 아닌 선생님의 헤더 — 로고와 탭 두 개가 보이는 왼쪽만 잘라 보여 준다.
const INSET_CROP_W = 420;
const INSET_SCALE = 1.5;
const INSET_PAD = 18;
const INSET_TITLE_H = 40;
const INSET_W = INSET_CROP_W * INSET_SCALE + INSET_PAD * 2;
const INSET_H = INSET_TITLE_H + HOMEROOM_BODY.y * INSET_SCALE + INSET_PAD * 2;
const INSET_X = BROWSER.x + 60;
const INSET_Y = BROWSER.y + BROWSER.chrome + HOMEROOM_BODY.y * 1.25 + 110;
const insetTabsBox = (() => {
  const first = tabRect(SUPERVISOR_TABS[0], "supervisor");
  const last = tabRect(SUPERVISOR_TABS[SUPERVISOR_TABS.length - 1], "supervisor");
  return {
    x: INSET_X + INSET_PAD + first.x * INSET_SCALE,
    y: INSET_Y + INSET_PAD + INSET_TITLE_H,
    width: (last.x + last.w - first.x) * INSET_SCALE,
    height: HOMEROOM_BODY.y * INSET_SCALE,
  };
})();

const SupervisorInset: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < insetIn || frame > insetOut + 6) {
    return null;
  }
  const opacity = tween(frame, [insetIn, insetIn + 10], [0, 1]) * tween(frame, [insetOut, insetOut + 6], [1, 0]);
  const lift = tween(frame, [insetIn, insetIn + 12], [16, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: INSET_X,
        top: INSET_Y,
        width: INSET_W,
        height: INSET_H,
        opacity,
        translate: `0px ${lift}px`,
        background: colors.white,
        borderRadius: 16,
        boxShadow: "0 18px 44px rgba(15,23,42,0.22), 0 0 0 1px rgba(15,23,42,0.08)",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: INSET_PAD,
          top: INSET_PAD,
          height: INSET_TITLE_H,
          display: "flex",
          alignItems: "center",
          fontSize: 22,
          fontWeight: 700,
          color: colors.gray700,
          whiteSpace: "nowrap",
        }}
      >
        담임이 아닌 선생님의 화면
      </div>
      <div
        style={{
          position: "absolute",
          left: INSET_PAD,
          top: INSET_PAD + INSET_TITLE_H,
          width: INSET_CROP_W * INSET_SCALE,
          height: HOMEROOM_BODY.y * INSET_SCALE,
          overflow: "hidden",
          borderRadius: 8,
          boxShadow: `0 0 0 1px ${colors.gray200}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: PC_VIEWPORT.w,
            height: PC_VIEWPORT.h,
            transform: `scale(${INSET_SCALE})`,
            transformOrigin: "top left",
          }}
        >
          <HomeroomShellMock tab="schedule" role="supervisor" showHelp>
            {null}
          </HomeroomShellMock>
        </div>
      </div>
    </div>
  );
};

export const HomeroomTourScene: React.FC<DemoProps> = () => {
  const chip = pcRectAbs(attendanceHeaderRect("homeroom", ATTENDANCE_PC_HEADER));
  const chipPoint = pcAbs(attendanceHeaderPoint("homeroom", ATTENDANCE_PC_HEADER));
  const chipCursor = { x: chipPoint.x + 18, y: chipPoint.y + 10 };
  const firstTab = tabRect(HOMEROOM_TABS[0], "homeroom");
  const lastTab = tabRect(HOMEROOM_TABS[HOMEROOM_TABS.length - 1], "homeroom");
  const allTabs = pcRectAbs({ x: firstTab.x, y: 0, w: lastTab.x + lastTab.w - firstTab.x, h: HOMEROOM_BODY.y });

  return (
    <GuideScene id={ID} step={13} label="담임 메뉴">
      <Stage />
      <Annotation
        from={chipFrom}
        durationInFrames={shellAt - chipFrom}
        {...padRect(chip, 6)}
        label="담임교사 버튼"
        labelPosition="left"
      />
      {HOMEROOM_TABS.map((tab, i) => {
        const from = Math.round(tabsFrom + i * tabStep);
        return (
          <Annotation
            key={tab}
            from={from}
            durationInFrames={Math.round(tabStep) + 8}
            {...padRect(pcRectAbs(tabRect(tab, "homeroom")), 2)}
          />
        );
      })}
      <Annotation
        from={allTabsFrom}
        durationInFrames={lineEnd(ID, 2) - allTabsFrom}
        {...padRect(allTabs, 2)}
        label="담임교사 탭 7개"
        labelPosition="bottom"
      />
      <SupervisorInset />
      <Annotation
        from={insetIn + 10}
        durationInFrames={insetOut - insetIn - 10}
        {...padRect(insetTabsBox, 2)}
        label="감독일정 · 비밀번호만"
        labelPosition="right"
      />
      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 10, x: 1500, y: 780 },
          { frame: lineEnd(ID, 0), x: 1480, y: 520 },
          { frame: chipClick - 8, x: chipCursor.x, y: chipCursor.y },
          { frame: shellAt + 6, x: chipCursor.x, y: chipCursor.y },
          { frame: lineEnd(ID, 1), x: chipCursor.x - 60, y: chipCursor.y + 320 },
        ]}
        clicks={[chipClick]}
        hideAfter={lineEnd(ID, 1)}
      />
    </GuideScene>
  );
};
