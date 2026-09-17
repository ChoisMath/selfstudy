import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { APP_URL, TODAY, type SupervisorDay } from "../../app-mocks/data";
import { ScheduleCalendarMock, scheduleRect } from "../../app-mocks/ScheduleCalendarMock";
import { PC_VIEWPORT, PcViewport, pcRectAbs, type Point, type Rect } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { BROWSER, colors } from "../../theme";
import { InsetCard, insetCardSize, insetRectAbs, padRect, type InsetCrop } from "../../teacher/scenes/pc-helpers";
import { GRADE, SUPERVISOR_ASSIGN_EXAMPLE, SUPERVISOR_MONTH } from "../data";
import { GRADE_ADMIN_BODY, GradeAdminShellMock } from "../mocks/GradeAdminShellMock";
import { SupervisorCalendarMock, supervisorCalendarRect } from "../mocks/SupervisorCalendarMock";
import { lineAt, lineEnd, lineStart } from "../timing";

const ID = "SupervisorAssign";
const W = GRADE_ADMIN_BODY.w;
const TAB_TITLE = "포산고 자율학습";

const ASSIGN = SUPERVISOR_ASSIGN_EXAMPLE; // 9/28 → 윤서진
// 검색어 한 글자면 우리 학년(윤서진)과 다른 학년(한도윤)이 함께 남아 목록 정렬 규칙이 보인다.
const SEARCH = "윤";
const CTX = { myGrade: GRADE, query: SEARCH } as const;
const CTX_ALL = { myGrade: GRADE, query: "" } as const;

// 배정 전 상태 — 그날 항목을 통째로 빼면 목업이 "미배정"으로 그린다(SupervisorDay 는 null 을 담지 못한다).
const BEFORE_ASSIGN: Record<string, SupervisorDay> = Object.fromEntries(
  Object.entries(SUPERVISOR_MONTH).filter(([date]) => date !== ASSIGN.date),
);

// 달력은 620px 인데 본문은 448px 이다 — 마지막 주(9/28)를 드러내려면 셸 스크롤이 필요하다.
const LAST_CELL = supervisorCalendarRect("day_2026-09-30", W);
const SCROLL = Math.max(0, LAST_CELL.y + LAST_CELL.h + 1 - GRADE_ADMIN_BODY.h);

const bodyRect = (r: Rect, scrollY: number) =>
  pcRectAbs({ x: GRADE_ADMIN_BODY.x + r.x, y: GRADE_ADMIN_BODY.y + r.y - scrollY, w: r.w, h: r.h });

const bodyPoint = (r: Rect, scrollY: number): Point => {
  const abs = bodyRect(r, scrollY);
  return { x: abs.x + abs.width / 2, y: abs.y + abs.height / 2 };
};

const scrollFrom = lineAt(ID, 1, 0.02);
const scrollTo = lineAt(ID, 1, 0.1);
const cellClick = lineAt(ID, 1, 0.17);
const openAt = cellClick + 3;
const typeFrom = lineAt(ID, 1, 0.23);
const groupFrom = lineAt(ID, 1, 0.3);
const pickAt = lineAt(ID, 1, 0.42);
const cursorOut = pickAt + 10;
const savingEnd = pickAt + 20;
const assignedFrom = savingEnd + 4;
const sessionsFrom = lineAt(ID, 2, 0.12);
const reopenClick = lineAt(ID, 3, 0.25);
const reopenAt = reopenClick + 3;
const reopenEnd = lineEnd(ID, 3) + 6;
const insetFrom = lineAt(ID, 4, 0.12);
const scrollBackFrom = lineAt(ID, 4, 0.72);
const scrollBackTo = lineAt(ID, 4, 0.9);

// 배정한 선생님 본인이 보는 감독일정 화면 — 9/28 칸만 잘라 인셋으로 보여 준다.
const SCHEDULE_DAY = scheduleRect(`day_${ASSIGN.date}`, PC_VIEWPORT.w);
const SCHEDULE_CROP: InsetCrop = {
  rect: { x: SCHEDULE_DAY.x + 1, y: SCHEDULE_DAY.y + 1, w: SCHEDULE_DAY.w - 2, h: SCHEDULE_DAY.h - 2 },
  scale: 2.1,
};
const SCHEDULE_CARD_SIZE = insetCardSize(SCHEDULE_CROP);
const SCHEDULE_CARD: Point = {
  x: BROWSER.x + BROWSER.w - 44 - SCHEDULE_CARD_SIZE.width,
  y: BROWSER.y + BROWSER.h - 44 - SCHEDULE_CARD_SIZE.height,
};

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const scrollY =
    frame < scrollBackFrom
      ? tween(frame, [scrollFrom, scrollTo], [0, SCROLL])
      : tween(frame, [scrollBackFrom, scrollBackTo], [SCROLL, 0]);
  const reopening = frame >= reopenAt && frame < reopenEnd;
  const editing = frame >= openAt && frame < savingEnd;
  const openCell = reopening
    ? { date: ASSIGN.date, search: { text: "" } }
    : editing
      ? { date: ASSIGN.date, search: { text: SEARCH, typeFrom }, pickAt, picked: ASSIGN.teacher }
      : undefined;
  return (
    <BrowserFrame url={`${APP_URL}/grade-admin/${GRADE}`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <GradeAdminShellMock tab="supervisors" showHelp scrollY={scrollY}>
          <SupervisorCalendarMock
            width={W}
            month="2026-09"
            assignments={frame >= savingEnd ? SUPERVISOR_MONTH : BEFORE_ASSIGN}
            myGrade={GRADE}
            cellPressAt={{ date: ASSIGN.date, at: reopening ? reopenClick : cellClick }}
            savingDate={frame >= pickAt && frame < savingEnd ? ASSIGN.date : undefined}
            openCell={openCell}
          />
        </GradeAdminShellMock>
      </PcViewport>
    </BrowserFrame>
  );
};

export const SupervisorAssignScene: React.FC<DemoProps> = () => {
  const dayHeader = supervisorCalendarRect("dayHeader", W);
  const monthNav = supervisorCalendarRect("prevMonth", W);
  // 달력 전체(월 이동 줄 ~ 본문 아래 끝)
  const calendarBox = bodyRect(
    { x: dayHeader.x - 1, y: monthNav.y, w: dayHeader.w + 2, h: GRADE_ADMIN_BODY.h - monthNav.y - 6 },
    0,
  );

  const cell = supervisorCalendarRect(`select_${ASSIGN.date}`, W);
  const cellBox = bodyRect(cell, SCROLL);
  const cellPoint = bodyPoint(cell, SCROLL);
  const myOption = supervisorCalendarRect(`option_${ASSIGN.date}_${ASSIGN.teacher}`, W, CTX);
  const myOptionBox = bodyRect(myOption, SCROLL);
  const myOptionPoint = bodyPoint(myOption, SCROLL);
  const unassigned = supervisorCalendarRect(`option_${ASSIGN.date}_unassigned`, W, CTX_ALL);
  const unassignedBox = bodyRect(unassigned, SCROLL);
  const unassignedPoint = bodyPoint(unassigned, SCROLL);

  const insetRow = insetRectAbs(SCHEDULE_CARD, SCHEDULE_CROP, scheduleRect(`row_${ASSIGN.date}_${GRADE}`, PC_VIEWPORT.w));

  return (
    <GuideScene id={ID} step={14} label="감독 배정">
      <Stage />

      <Annotation
        from={lineAt(ID, 0, 0.22)}
        durationInFrames={lineEnd(ID, 0) - lineAt(ID, 0, 0.22)}
        {...padRect(calendarBox, 4)}
        label="한 달 달력"
        labelPosition="bottom"
        labelAlign="end"
        color={colors.blue600}
      />

      <Annotation
        from={groupFrom}
        durationInFrames={pickAt - groupFrom}
        {...padRect(myOptionBox, 4)}
        label="우리 학년 선생님이 목록 위쪽"
        labelPosition="right"
        color={colors.blue600}
      />
      <Annotation
        from={assignedFrom}
        durationInFrames={lineEnd(ID, 1) - assignedFrom}
        {...padRect(cellBox, 5)}
        label="고르면 바로 저장"
        labelPosition="right"
      />

      <Annotation
        from={sessionsFrom}
        durationInFrames={lineEnd(ID, 2) - sessionsFrom}
        {...padRect(cellBox, 5)}
        label="그날 오후1 · 오후2 · 야간 감독"
        labelPosition="right"
        color={colors.blue600}
      />

      <Annotation
        from={reopenAt + 4}
        durationInFrames={reopenEnd - reopenAt - 4}
        {...padRect(unassignedBox, 4)}
        label="배정 지우기"
        labelPosition="right"
      />

      <InsetCard
        card={SCHEDULE_CARD}
        crop={SCHEDULE_CROP}
        title={`${ASSIGN.teacher} 선생님의 감독일정 화면`}
        from={insetFrom}
        out={lineEnd(ID, 4)}
      >
        <ScheduleCalendarMock
          width={PC_VIEWPORT.w}
          month="2026-09"
          assignments={SUPERVISOR_MONTH}
          highlightTeacher={ASSIGN.teacher}
          today={TODAY}
        />
      </InsetCard>
      <Annotation
        from={insetFrom + 12}
        durationInFrames={lineEnd(ID, 4) - insetFrom - 12}
        {...padRect(insetRow, 5)}
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 1), x: cellPoint.x + 150, y: cellPoint.y + 120 },
          { frame: cellClick - 8, x: cellPoint.x, y: cellPoint.y },
          { frame: openAt + 6, x: cellPoint.x, y: cellPoint.y },
          { frame: pickAt - 8, x: myOptionPoint.x, y: myOptionPoint.y },
          { frame: cursorOut, x: myOptionPoint.x, y: myOptionPoint.y },
        ]}
        clicks={[cellClick, pickAt]}
        hideAfter={cursorOut}
      />
      <Cursor
        path={[
          { frame: lineStart(ID, 3), x: cellPoint.x + 130, y: cellPoint.y + 110 },
          { frame: reopenClick - 6, x: cellPoint.x, y: cellPoint.y },
          { frame: reopenAt + 8, x: cellPoint.x, y: cellPoint.y },
          { frame: lineEnd(ID, 3) - 6, x: unassignedPoint.x, y: unassignedPoint.y },
        ]}
        clicks={[reopenClick]}
        hideAfter={lineEnd(ID, 3)}
      />
    </GuideScene>
  );
};
