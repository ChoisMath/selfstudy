import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { APP_URL } from "../../app-mocks/data";
import { ParticipationTableMock } from "../../app-mocks/ParticipationTableMock";
import { PcViewport, pcAbs, pcRectAbs, type Rect } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { colors } from "../../theme";
import { padRect } from "../../teacher/scenes/pc-helpers";
import { GRADE, PARTICIPATION_ROWS } from "../data";
import { GRADE_ADMIN_BODY, GradeAdminShellMock, gradeAdminTabPoint } from "../mocks/GradeAdminShellMock";
import { SeatEditorMock, seatEditorRect } from "../mocks/SeatEditorMock";
import { lineAt, lineEnd, lineStart } from "../timing";

const ID = "SeatsTour";
const TAB_TITLE = "포산고 자율학습";
const W = GRADE_ADMIN_BODY.w;

const bodyAbs = (r: Rect) => pcRectAbs({ x: r.x, y: GRADE_ADMIN_BODY.y + r.y, w: r.w, h: r.h });
// 본문에 보이는 만큼만 상자로 두른다 — 좌석 편집기는 세 학급이라 본문(448) 아래로 이어진다.
const visible = (r: Rect): Rect => ({ ...r, h: Math.min(r.h, GRADE_ADMIN_BODY.h - r.y - 6) });

const AFTERNOON_BTN = seatEditorRect("sessionAfternoon");
const NIGHT_BTN = seatEditorRect("sessionNight");
const SESSION_ROW: Rect = { ...AFTERNOON_BTN, w: NIGHT_BTN.x + NIGHT_BTN.w - AFTERNOON_BTN.x };

const PANEL = seatEditorRect("unassignedPanel");
const CONFIG_BTN = seatEditorRect("configButton");
const SAVE_BTN = seatEditorRect("saveButton");
const HEADER_BTNS: Rect = { ...CONFIG_BTN, w: SAVE_BTN.x + SAVE_BTN.w - CONFIG_BTN.x };
// 왼쪽 격자는 미배정 패널 왼쪽까지 — 패널 x 에서 gap-6(24)만큼 물러난 자리가 격자의 오른쪽 끝이다.
const GRID: Rect = { x: AFTERNOON_BTN.x, y: PANEL.y, w: PANEL.x - 24 - AFTERNOON_BTN.x, h: PANEL.h };

const tabClick = lineAt(ID, 0, 0.22);
const pageSwap = tabClick + 3;
const sessionFrom = lineAt(ID, 0, 0.48);
const columnsFrom = lineAt(ID, 1, 0.06);
const headerFrom = lineAt(ID, 2, 0.06);
const cursorOut = tabClick + 14;

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const onSeats = frame >= pageSwap;
  return (
    <BrowserFrame url={`${APP_URL}/grade-admin/${GRADE}`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <GradeAdminShellMock tab={onSeats ? "seats" : "participation"} showHelp tabPressAt={{ tab: "seats", at: tabClick }}>
          {onSeats ? (
            <div style={{ position: "absolute", inset: 0, opacity: tween(frame, [pageSwap, pageSwap + 8], [0, 1]) }}>
              <SeatEditorMock width={W} height={GRADE_ADMIN_BODY.h} session="afternoon" />
            </div>
          ) : (
            // 앞 장면(ParticipationBulk)이 끝난 모습 — 1반만 걸러 둔 참여 설정표.
            <ParticipationTableMock variant="grade" width={W} rows={PARTICIPATION_ROWS} classFilter={1} />
          )}
        </GradeAdminShellMock>
      </PcViewport>
    </BrowserFrame>
  );
};

export const SeatsTourScene: React.FC<DemoProps> = () => {
  const tabPoint = pcAbs(gradeAdminTabPoint("seats"));

  return (
    <GuideScene id={ID} step={9} label="좌석 화면">
      <Stage />

      <Annotation
        from={sessionFrom}
        durationInFrames={lineEnd(ID, 0) - sessionFrom}
        {...padRect(bodyAbs(SESSION_ROW), 5)}
        label="편집할 자습 시간"
        labelPosition="right"
        color={colors.blue600}
      />

      {/* 문장 1 — 도움말 스틸(1, 0.7). 라벨 없이 두 칸을 색으로만 구분한다(스틸에 글자를 얹지 않는다). */}
      <Annotation
        from={columnsFrom}
        durationInFrames={lineEnd(ID, 1) - columnsFrom}
        {...padRect(bodyAbs(visible(GRID)), 5)}
        color={colors.blue600}
      />
      <Annotation
        from={columnsFrom + 6}
        durationInFrames={lineEnd(ID, 1) - columnsFrom - 6}
        {...padRect(bodyAbs(visible(PANEL)), 5)}
        color={colors.green600}
      />

      <Annotation
        from={headerFrom}
        durationInFrames={lineEnd(ID, 2) + 10 - headerFrom}
        {...padRect(bodyAbs(HEADER_BTNS), 5)}
        label="교실 구조 설정 · 출력 · 저장"
        labelPosition="top"
        labelAlign="start"
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 4, x: tabPoint.x + 170, y: tabPoint.y + 210 },
          { frame: tabClick - 6, x: tabPoint.x, y: tabPoint.y },
          { frame: cursorOut, x: tabPoint.x, y: tabPoint.y },
        ]}
        clicks={[tabClick]}
        hideAfter={cursorOut}
      />
    </GuideScene>
  );
};
