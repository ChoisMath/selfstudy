import React from "react";
import { useCurrentFrame } from "remotion";
import { attendanceHeaderPoint, attendanceHeaderRect } from "../../app-mocks/AttendanceHeaderMock";
import { APP_URL } from "../../app-mocks/data";
import { pcAbs, pcRectAbs } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { BROWSER } from "../../theme";
import { HOMEROOM_BODY, HomeroomShellMock, homeroomTabPoint, type HomeroomTab } from "../mocks/HomeroomShellMock";
import { HomeroomWeeklyMock } from "../mocks/HomeroomWeeklyMock";
import { lineAt, lineEnd, lineStart } from "../timing";
import {
  ATTENDANCE_PC_HEADER,
  BoardToShell,
  InsetCard,
  TAB_TITLE,
  insetCardSize,
  insetRectAbs,
  padRect,
  wordAt,
  type InsetCrop,
} from "./pc-helpers";

const ID = "HomeroomTour";

// homeroomTabPoint 는 탭 가운데만 준다 — 폭은 목업과 같은 규칙(px-3 24 + 글자당 14)으로 되짚는다.
const TAB_LABEL: Record<HomeroomTab, string> = {
  students: "학생관리",
  attendance: "월간출결",
  participation: "참여설정",
  absenceReasons: "불참사유등록",
  absenceRequests: "불참신청",
  schedule: "감독일정",
  password: "비밀번호",
};
const HOMEROOM_TABS: HomeroomTab[] = ["students", "attendance", "participation", "absenceReasons", "absenceRequests", "schedule", "password"];
const SUPERVISOR_TABS: HomeroomTab[] = ["schedule", "password"];

const tabRect = (tab: HomeroomTab, role: "homeroom" | "supervisor") => {
  const p = homeroomTabPoint(tab, role);
  const w = 24 + TAB_LABEL[tab].length * 14;
  return { x: p.x - w / 2, y: 0, w, h: HOMEROOM_BODY.y };
};

const chipFrom = lineAt(ID, 1, 0.18);
const chipClick = lineAt(ID, 1, 0.5);
const shellAt = chipClick + 8;
// 탭 상자는 문장 안에서 그 탭 이름이 나오는 글자 위치에 맞춰 차례로 뜬다.
const ANNOTATION_FADE = 8;
const tabFrom = HOMEROOM_TABS.map((tab) => wordAt(ID, 2, TAB_LABEL[tab]));
const allTabsFrom = wordAt(ID, 2, "비밀번호", "end") - ANNOTATION_FADE;
const insetIn = lineAt(ID, 3, 0.04);
const insetOut = lineEnd(ID, 3);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <BrowserFrame url={frame >= shellAt ? `${APP_URL}/homeroom` : `${APP_URL}/attendance/1`} tabTitle={TAB_TITLE}>
      <BoardToShell shellAt={shellAt} chipPressAt={chipClick} tab="students">
        <HomeroomWeeklyMock width={HOMEROOM_BODY.w} height={HOMEROOM_BODY.h} />
      </BoardToShell>
    </BrowserFrame>
  );
};

// 담임이 아닌 선생님의 헤더 — 로고와 탭 두 개가 보이는 왼쪽만 잘라 보여 준다.
const INSET_CROP: InsetCrop = { rect: { x: 0, y: 0, w: 420, h: HOMEROOM_BODY.y }, scale: 1.5 };
const INSET_SIZE = insetCardSize(INSET_CROP);
const INSET_CARD = { x: BROWSER.x + 60, y: BROWSER.y + BROWSER.chrome + HOMEROOM_BODY.y * 1.25 + 110 };
const INSET_BOTTOM = INSET_CARD.y + INSET_SIZE.height;

const SUPERVISOR_TABS_RECT = (() => {
  const first = tabRect(SUPERVISOR_TABS[0], "supervisor");
  const last = tabRect(SUPERVISOR_TABS[SUPERVISOR_TABS.length - 1], "supervisor");
  return { x: first.x, y: 0, w: last.x + last.w - first.x, h: HOMEROOM_BODY.y };
})();

export const HomeroomTourScene: React.FC<DemoProps> = () => {
  const chip = pcRectAbs(attendanceHeaderRect("homeroom", ATTENDANCE_PC_HEADER));
  const chipPoint = pcAbs(attendanceHeaderPoint("homeroom", ATTENDANCE_PC_HEADER));
  const chipCursor = { x: chipPoint.x + 18, y: chipPoint.y + 10 };
  const firstTab = tabRect(HOMEROOM_TABS[0], "homeroom");
  const lastTab = tabRect(HOMEROOM_TABS[HOMEROOM_TABS.length - 1], "homeroom");
  const allTabs = pcRectAbs({ x: firstTab.x, y: 0, w: lastTab.x + lastTab.w - firstTab.x, h: HOMEROOM_BODY.y });
  const insetTabsBox = insetRectAbs(INSET_CARD, INSET_CROP, SUPERVISOR_TABS_RECT);
  // 라벨은 카드 경계에 걸치지 않게 카드 아래(완전히 바깥)에 둔다.
  const insetLabelGap = INSET_BOTTOM - (insetTabsBox.y + insetTabsBox.height + 2) + 10;

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
      {HOMEROOM_TABS.map((tab, i) => (
        <Annotation
          key={tab}
          from={tabFrom[i]}
          durationInFrames={(tabFrom[i + 1] ?? allTabsFrom) - tabFrom[i] + ANNOTATION_FADE}
          {...padRect(pcRectAbs(tabRect(tab, "homeroom")), 2)}
        />
      ))}
      <Annotation
        from={allTabsFrom}
        durationInFrames={lineEnd(ID, 2) - allTabsFrom}
        {...padRect(allTabs, 2)}
        label="담임교사 탭 7개"
        labelPosition="bottom"
      />
      <InsetCard card={INSET_CARD} crop={INSET_CROP} title="담임이 아닌 선생님의 화면" from={insetIn} out={insetOut}>
        <HomeroomShellMock tab="schedule" role="supervisor" showHelp>
          {null}
        </HomeroomShellMock>
      </InsetCard>
      <Annotation
        from={insetIn + 10}
        durationInFrames={insetOut - insetIn - 10}
        {...padRect(insetTabsBox, 2)}
        label="감독일정 · 비밀번호만"
        labelPosition="bottom"
        labelGap={insetLabelGap}
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
