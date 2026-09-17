import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { AttendanceBoardMock } from "../../app-mocks/AttendanceBoardMock";
import { ATTENDANCE_HEADER_H } from "../../app-mocks/AttendanceHeaderMock";
import { APP_HOST } from "../../app-mocks/data";
import { PC_VIEWPORT, PcViewport, pcRectAbs, type Rect } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { colors } from "../../theme";
import { PC_BOARD_PROPS, padRect } from "../../teacher/scenes/pc-helpers";
import { AttendanceTopBarMock, attendanceTopBarRect } from "../mocks/AttendanceTopBarMock";
import { GRADE_ADMIN_BODY, GradeAdminShellMock, gradeAdminTabPoint, type GradeAdminTab } from "../mocks/GradeAdminShellMock";
import { TodayDashboardMock } from "../mocks/TodayDashboardMock";
import { lineAt, lineEnd, lineStart } from "../timing";

const ID = "Enter";
const TAB_TITLE = "포산고 자율학습";

const chipFrom = lineAt(ID, 0, 0.42);
const chipClick = lineAt(ID, 1, 0.1);
const shellAt = chipClick + 6;
const PAGE_FADE = 6;
const cursorHide = chipClick + 17;

// gradeAdminTabPoint 는 탭 가운데만 준다 — 폭은 셸과 같은 규칙(px-5 40 + 글자당 14)으로 되짚는다.
const TAB_LABEL: Record<GradeAdminTab, string> = {
  today: "오늘출결",
  students: "학생 관리",
  participation: "참여 설정",
  seats: "좌석 배치",
  supervisors: "감독 배정",
  monthly: "월간출결",
};
const TABS: GradeAdminTab[] = ["today", "students", "participation", "seats", "supervisors", "monthly"];
const TAB_H = 42;

const tabRect = (tab: GradeAdminTab): Rect => {
  const p = gradeAdminTabPoint(tab);
  const w = 40 + TAB_LABEL[tab].length * 14;
  return { x: p.x - w / 2, y: p.y - TAB_H / 2, w, h: TAB_H };
};

const TAB_STEP = 11;
const ANNOTATION_FADE = 8;
const tabFrom = TABS.map((_, i) => lineStart(ID, 2) + 4 + i * TAB_STEP);
const allTabsFrom = tabFrom[TABS.length - 1] + TAB_STEP;

const ALL_TABS: Rect = (() => {
  const first = tabRect(TABS[0]);
  const last = tabRect(TABS[TABS.length - 1]);
  return { x: first.x, y: first.y, w: last.x + last.w - first.x, h: TAB_H };
})();

// 출석부 화면. AttendanceTopBarMock 이 헤더를 그리고, 그 아래는 실제 출석부 본문(AttendanceBoardMock)을
// 자기 헤더 높이만큼 끌어올려 붙인다 — 상단바 목업은 헤더만 있어 본문이 없기 때문이다.
const TOP_BAR_H = attendanceTopBarRect("logo").h;

const AttendancePage: React.FC<{ chipPressAt: number }> = ({ chipPressAt }) => (
  <div style={{ position: "absolute", inset: 0, isolation: "isolate", background: "#F9FAFB" }}>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: TOP_BAR_H,
        width: PC_VIEWPORT.w,
        height: PC_VIEWPORT.h - TOP_BAR_H,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 0, top: -ATTENDANCE_HEADER_H, width: PC_VIEWPORT.w }}>
        <AttendanceBoardMock {...PC_BOARD_PROPS} height={PC_VIEWPORT.h + ATTENDANCE_HEADER_H} />
      </div>
    </div>
    <AttendanceTopBarMock width={PC_VIEWPORT.w} gradePressAt={chipPressAt} />
  </div>
);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const onShell = frame >= shellAt;
  return (
    <BrowserFrame url={`${APP_HOST}/${onShell ? "grade-admin/1" : "attendance/1"}`} tabTitle={TAB_TITLE}>
      <PcViewport>
        {frame < shellAt + PAGE_FADE ? <AttendancePage chipPressAt={chipClick} /> : null}
        {onShell ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              opacity: tween(frame, [shellAt, shellAt + PAGE_FADE], [0, 1]),
            }}
          >
            <GradeAdminShellMock tab="today" showHelp>
              <TodayDashboardMock width={GRADE_ADMIN_BODY.w} />
            </GradeAdminShellMock>
          </div>
        ) : null}
      </PcViewport>
    </BrowserFrame>
  );
};

export const EnterScene: React.FC<DemoProps> = () => {
  const chip = pcRectAbs(attendanceTopBarRect("gradeAdmin"));
  const chipCenter = { x: chip.x + chip.width / 2, y: chip.y + chip.height / 2 };

  return (
    <GuideScene id={ID} step={1} label="학년관리 열기">
      <Stage />

      <Annotation
        from={chipFrom}
        durationInFrames={shellAt - chipFrom}
        {...padRect(chip, 6)}
        label="학년관리자에게만 보이는 버튼"
        // 아래로 내리면 출석부 날짜 바의 카운트를 덮는다 — 헤더의 빈 가운데로 보낸다("?" 버튼 왼쪽).
        labelPosition="left"
        labelGap={80}
        color={colors.green600}
      />

      {TABS.map((tab, i) => (
        <Annotation
          key={tab}
          from={tabFrom[i]}
          durationInFrames={(tabFrom[i + 1] ?? allTabsFrom) - tabFrom[i] + ANNOTATION_FADE}
          {...padRect(pcRectAbs(tabRect(tab)), 2)}
          color={colors.blue600}
        />
      ))}
      <Annotation
        from={allTabsFrom}
        durationInFrames={lineEnd(ID, 2) + 10 - allTabsFrom}
        {...padRect(pcRectAbs(ALL_TABS), 3)}
        label="여섯 가지 업무"
        labelPosition="bottom"
        color={colors.blue600}
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 8, x: 1560, y: 760 },
          { frame: chipClick - 14, x: chipCenter.x, y: chipCenter.y },
          { frame: cursorHide, x: chipCenter.x, y: chipCenter.y },
        ]}
        clicks={[chipClick]}
        hideAfter={cursorHide}
      />
    </GuideScene>
  );
};
