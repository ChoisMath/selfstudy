import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import { FONT } from "../../fonts";
import {
  ABSENCE_REQUESTS,
  APP_HOST,
  GRADE,
  HOMEROOM_PARTICIPATION,
  ME,
  SUPERVISOR_SEPT,
  TODAY,
  TODAY_LABEL,
  type Session,
} from "../../app-mocks/data";
import { PHONE_BODY, PcViewport, pcAbs, pcRectAbs, type Rect } from "../../app-mocks/layout";
import {
  AttendanceBoardMock,
  baseVisual,
  buildAfternoonGroups,
  countsOf,
  groupRect,
  seatRect,
  type AttendanceBoardProps,
  type SeatState,
} from "../../app-mocks/AttendanceBoardMock";
import { MonthlyAttendanceMock, monthlyMaxScrollX } from "../../app-mocks/MonthlyAttendanceMock";
import { ParticipationTableMock, participationRect, type ParticipationRow } from "../../app-mocks/ParticipationTableMock";
import { colors } from "../../theme";
import { lineAt, lineEnd, lineStart } from "../timing";
import { HOMEROOM_BODY, HomeroomShellMock, homeroomTabPoint } from "../mocks/HomeroomShellMock";
import type { DemoProps } from "../../props";

// ── 폰 출석부 인셋: 1-2반 교실 카드만 잘라 확대한다(AbsenceReason 장면도 쓴다) ──────────────────────

const INSET_HEADER_H = 46;
const INSET_PAD = 12;
const CROP_MARGIN = 6;
const HOMEROOM_GROUP_INDEX = 1;

const insetBoardProps = (visualFor: (studentId: number) => SeatState): AttendanceBoardProps => {
  const groups = buildAfternoonGroups(visualFor);
  return {
    width: PHONE_BODY.w,
    height: PHONE_BODY.h,
    header: { width: PHONE_BODY.w, role: "homeroom", name: ME.name, showHelp: true },
    dateLabel: TODAY_LABEL,
    supervisor: SUPERVISOR_SEPT[TODAY][GRADE],
    grade: GRADE,
    counts: countsOf(groups),
    tab: "afternoon1",
    pendingBadge: ABSENCE_REQUESTS.filter((r) => r.status === "pending").length,
    groups,
  };
};

const insetCrop = (props: AttendanceBoardProps): Rect => {
  const card = groupRect(HOMEROOM_GROUP_INDEX, props);
  return { x: card.x - CROP_MARGIN, y: card.y - CROP_MARGIN, w: card.w + CROP_MARGIN * 2, h: card.h + CROP_MARGIN * 2 };
};

export const boardInsetSize = (visualFor: (studentId: number) => SeatState, scale: number) => {
  const crop = insetCrop(insetBoardProps(visualFor));
  return { w: crop.w * scale + INSET_PAD * 2, h: INSET_HEADER_H + crop.h * scale + INSET_PAD };
};

// 인셋 왼쪽 위(x, y) 기준 좌석의 화면 좌표.
export const boardInsetSeat = (
  visualFor: (studentId: number) => SeatState,
  scale: number,
  x: number,
  y: number,
  studentId: number,
) => {
  const props = insetBoardProps(visualFor);
  const crop = insetCrop(props);
  const seat = seatRect(studentId, props);
  return {
    x: x + INSET_PAD + (seat.x - crop.x) * scale,
    y: y + INSET_HEADER_H + (seat.y - crop.y) * scale,
    width: seat.w * scale,
    height: seat.h * scale,
  };
};

export const PhoneBoardInset: React.FC<{
  x: number;
  y: number;
  scale: number;
  from: number;
  to: number;
  visualFor: (studentId: number) => SeatState;
  caption: string;
}> = ({ x, y, scale, from, to, visualFor, caption }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const props = insetBoardProps(visualFor);
  const crop = insetCrop(props);
  const size = boardInsetSize(visualFor, scale);
  const enter = tween(frame, [from, from + 12], [0, 1]);
  const exit = tween(frame, [to - 6, to], [1, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size.w,
        height: size.h,
        background: colors.white,
        borderRadius: 18,
        border: `1px solid ${colors.blue100}`,
        boxShadow: "0 24px 60px rgba(15,23,42,0.22)",
        overflow: "hidden",
        fontFamily: FONT,
        opacity: enter * exit,
        translate: `0px ${(1 - enter) * 18}px`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: INSET_PAD + 4,
          top: 0,
          height: INSET_HEADER_H,
          display: "flex",
          alignItems: "center",
          gap: 10,
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ width: 14, height: 22, borderRadius: 4, border: `2px solid ${colors.gray700}`, boxSizing: "border-box" }} />
        <span style={{ fontSize: 20, fontWeight: 700, color: colors.gray800 }}>휴대폰 출석부</span>
        <span style={{ fontSize: 18, fontWeight: 500, color: colors.gray500 }}>{caption}</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: INSET_PAD,
          top: INSET_HEADER_H,
          width: crop.w * scale,
          height: crop.h * scale,
          overflow: "hidden",
          borderRadius: 10,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: PHONE_BODY.w,
            height: PHONE_BODY.h,
            transform: `scale(${scale}) translate(${-crop.x}px, ${-crop.y}px)`,
            transformOrigin: "top left",
          }}
        >
          <AttendanceBoardMock {...props} />
        </div>
      </div>
    </div>
  );
};

// ── 장면 ─────────────────────────────────────────────────────────────────────────────

const ID = "HomeroomParticipation";
const W = HOMEROOM_BODY.w;

const tabClick = lineAt(ID, 0, 0.2);
const pageSwap = tabClick + 3;
const offClick = lineAt(ID, 2, 0.3);
const dayClick = lineAt(ID, 3, 0.48);
const afterSchoolClick = lineAt(ID, 4, 0.28);
const saveClick = lineAt(ID, 5, 0.1);
const insetFrom = lineAt(ID, 4, 0.42);
const insetTo = lineEnd(ID, 5) + 12;

// 마지막 클릭의 "저장 중..."은 문장 5가 설명하는 대상이라, 목업 기본(20프레임)보다 조금 길게 띄워 읽히게 한다.
const SAVE_NOTICE_FRAMES = 36;
const SAVING_TEXT: Rect = { x: 16, y: 24, w: 52, h: 20 };

const INSET_SCALE = 1.4;
const INSET_X = 1196;
const INSET_Y = 246;

type Toggle = {
  studentNo: number;
  session: Session;
  control: "participating" | `day_${number}` | `afterSchool_${number}`;
  at: number;
};

// 황수아 야간 참가 끄기 → 권도윤 오후1 목 끄기 → 전가은 오후1 목 방과후 켜기 → 권도윤 오후2 목 끄기.
// 뒤의 세 동작은 data.ts 참여설정(권도윤 목 불참·전가은 목 방과후)에 도달하도록 반대 상태에서 시작한다.
const TOGGLES: Toggle[] = [
  { studentNo: 4, session: "night", control: "participating", at: offClick },
  { studentNo: 3, session: "afternoon1", control: "day_3", at: dayClick },
  { studentNo: 8, session: "afternoon1", control: "afterSchool_3", at: afterSchoolClick },
  { studentNo: 3, session: "afternoon2", control: "day_3", at: saveClick },
];

const flip = (rows: ParticipationRow[], t: Toggle): ParticipationRow[] =>
  rows.map((row) => {
    if (row.studentNo !== t.studentNo) return row;
    const s = row.sessions[t.session];
    const next = { participating: s.participating, days: [...s.days], afterSchool: [...s.afterSchool] };
    if (t.control === "participating") {
      next.participating = !next.participating;
    } else {
      const [kind, index] = t.control.split("_");
      const i = Number(index);
      if (kind === "day") next.days[i] = !next.days[i];
      else next.afterSchool[i] = !next.afterSchool[i];
    }
    return { ...row, sessions: { ...row.sessions, [t.session]: next } };
  });

const DATA_ROWS: ParticipationRow[] = Object.entries(HOMEROOM_PARTICIPATION)
  .map(([studentNo, sessions]) => ({ studentNo: Number(studentNo), sessions }))
  .sort((a, b) => a.studentNo - b.studentNo);

const START_ROWS = TOGGLES.slice(1).reduce(flip, DATA_ROWS);

// 이 장면이 끝난 뒤의 참여설정 — 다음 장면(AbsenceReason)이 탭을 옮기기 전 화면으로 쓴다.
export const PARTICIPATION_END_ROWS = TOGGLES.reduce(flip, START_ROWS);

// 오늘(목) 오후1 출석부 체크 전 모습 — 권도윤 회색, 전가은 노란 방과후.
const insetVisual = (studentId: number): SeatState => baseVisual(studentId);

const savingFromAt = (frame: number, active: Toggle | undefined) => {
  if (!active) return undefined;
  const from = active.at + 2;
  const isLast = active === TOGGLES[TOGGLES.length - 1];
  return isLast && frame >= from && frame < from + SAVE_NOTICE_FRAMES ? frame : from;
};

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const onParticipation = frame >= pageSwap;
  const done = TOGGLES.filter((t) => t.at <= frame);
  const active = done[done.length - 1];
  const rows = done.slice(0, -1).reduce(flip, START_ROWS);
  return (
    <BrowserFrame url={`${APP_HOST}/homeroom/${onParticipation ? "participation" : "attendance"}`} tabTitle="포산고 자율학습">
      <PcViewport>
        <HomeroomShellMock
          tab={onParticipation ? "participation" : "attendance"}
          role="homeroom"
          tabPressAt={{ tab: "participation", at: tabClick }}
        >
          {onParticipation ? (
            <div style={{ position: "absolute", inset: 0, opacity: tween(frame, [pageSwap, pageSwap + 8], [0, 1]) }}>
              <ParticipationTableMock
                variant="homeroom"
                width={W}
                height={HOMEROOM_BODY.h}
                rows={rows}
                toggle={active}
                savingFrom={savingFromAt(frame, active)}
              />
            </div>
          ) : (
            <MonthlyAttendanceMock variant="homeroom" width={W} height={HOMEROOM_BODY.h} scrollX={monthlyMaxScrollX(W)} />
          )}
        </HomeroomShellMock>
      </PcViewport>
    </BrowserFrame>
  );
};

const bodyRect = (r: Rect) => pcRectAbs({ x: HOMEROOM_BODY.x + r.x, y: HOMEROOM_BODY.y + r.y, w: r.w, h: r.h });

const box = (r: { x: number; y: number; width: number; height: number }, pad = 6) => ({
  x: r.x - pad,
  y: r.y - pad,
  width: r.width + pad * 2,
  height: r.height + pad * 2,
});

const control = (studentNo: number, session: Session, name: string) =>
  participationRect(`control_${studentNo}_${session}_${name}`, "homeroom", W);

const center = (r: { x: number; y: number; width: number; height: number }) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

// 참여설정 표 헤더 1행(오후1 자습 등) 높이 — 참가/요일 머리칸은 그 아래에서 시작한다.
const HEAD1_H = 24;
const DAYS = 5;
const AFTER_SCHOOL_BOX = 16;

export const HomeroomParticipationScene: React.FC<DemoProps> = () => {
  const header = participationRect("header", "homeroom", W);
  const tableVisible = bodyRect({ ...header, h: HOMEROOM_BODY.h - header.y - 10 });

  const joinRow1 = control(1, "afternoon1", "participating");
  const dayRow3 = control(3, "afternoon1", "day_0");
  const columnsTop = header.y + HEAD1_H;
  const columnsBottom = dayRow3.y + control(3, "afternoon1", "participating").h - 5;
  const joinColumn = bodyRect({ x: joinRow1.x, y: columnsTop, w: joinRow1.w, h: columnsBottom - columnsTop });
  const dayColumns = bodyRect({ x: control(1, "afternoon1", "day_0").x, y: columnsTop, w: dayRow3.w * DAYS, h: columnsBottom - columnsTop });

  const nightJoin = control(4, "night", "participating");
  const nightGroup = bodyRect({ x: nightJoin.x, y: nightJoin.y, w: nightJoin.w + control(4, "night", "day_0").w * DAYS, h: nightJoin.h });
  const nightJoinBox = bodyRect(nightJoin);

  const dayButtons = bodyRect({ ...dayRow3, w: dayRow3.w * DAYS });
  const thursday = bodyRect(control(3, "afternoon1", "day_3"));
  const afterSchoolCell = control(8, "afternoon1", "afterSchool_3");
  const afterSchool = bodyRect({
    x: afterSchoolCell.x + (afterSchoolCell.w - AFTER_SCHOOL_BOX) / 2,
    y: afterSchoolCell.y + (afterSchoolCell.h - AFTER_SCHOOL_BOX) / 2,
    w: AFTER_SCHOOL_BOX,
    h: AFTER_SCHOOL_BOX,
  });
  const secondThursday = bodyRect(control(3, "afternoon2", "day_3"));

  const tab = pcAbs(homeroomTabPoint("participation", "homeroom"));
  const joinPoint = center(nightJoinBox);
  const thursdayPoint = center(thursday);
  const afterSchoolPoint = center(afterSchool);
  const secondThursdayPoint = center(secondThursday);

  const afterSchoolSeat = boardInsetSeat(insetVisual, INSET_SCALE, INSET_X, INSET_Y, 208);
  const inactiveSeat = boardInsetSeat(insetVisual, INSET_SCALE, INSET_X, INSET_Y, 203);

  return (
    <GuideScene id={ID} step={16} label="참여설정">
      <Stage />

      <Annotation
        from={pageSwap + 20}
        durationInFrames={lineEnd(ID, 0) - pageSwap - 20}
        {...box(tableVisible)}
        label="학생별 참여 시간 설정"
        labelPosition="top"
        labelAlign="end"
        color={colors.blue600}
      />

      <Annotation
        from={lineAt(ID, 1, 0.05)}
        durationInFrames={lineEnd(ID, 1) - lineAt(ID, 1, 0.05)}
        {...box(joinColumn, 4)}
        label="참가 체크박스"
        labelPosition="top"
        labelAlign="end"
        color={colors.blue600}
      />
      <Annotation
        from={lineAt(ID, 1, 0.45)}
        durationInFrames={lineEnd(ID, 1) - lineAt(ID, 1, 0.45)}
        {...box(dayColumns, 4)}
        label="월~금 요일 버튼"
        labelPosition="top"
        labelAlign="end"
        color={colors.blue600}
      />

      <Annotation
        from={offClick + 6}
        durationInFrames={lineEnd(ID, 2) - offClick - 6}
        {...box(nightGroup, 3)}
        label="이 시간은 아예 불참"
        labelPosition="top"
        labelAlign="end"
      />

      <Annotation
        from={lineAt(ID, 3, 0.02)}
        durationInFrames={dayClick - 4 - lineAt(ID, 3, 0.02)}
        {...box(dayButtons, 4)}
        label="파란색 = 참여하는 날"
        labelPosition="top"
        color={colors.blue600}
      />
      <Annotation
        from={dayClick + 6}
        durationInFrames={lineEnd(ID, 3) - dayClick - 6}
        {...box(thursday, 4)}
        label="회색 = 참여하지 않는 날"
        labelPosition="top"
      />

      <Annotation
        from={afterSchoolClick + 6}
        durationInFrames={lineEnd(ID, 4) - afterSchoolClick - 6}
        {...box(afterSchool, 4)}
        label="방과후 체크"
        labelPosition="left"
      />
      <PhoneBoardInset
        x={INSET_X}
        y={INSET_Y}
        scale={INSET_SCALE}
        from={insetFrom}
        to={insetTo}
        visualFor={insetVisual}
        caption={`${TODAY_LABEL.slice(5)} 오후1`}
      />
      <Annotation
        from={insetFrom + 14}
        durationInFrames={lineEnd(ID, 4) - insetFrom - 14}
        {...box(afterSchoolSeat, 4)}
        label="노란 방과후 좌석"
        labelPosition="bottom"
      />

      <Annotation
        from={saveClick + 2}
        durationInFrames={SAVE_NOTICE_FRAMES + 8}
        {...box(bodyRect(SAVING_TEXT), 5)}
        label="누르는 즉시 저장"
        labelPosition="right"
        color={colors.green600}
      />
      <Annotation
        from={lineAt(ID, 5, 0.45)}
        durationInFrames={insetTo - lineAt(ID, 5, 0.45)}
        {...box(inactiveSeat, 4)}
        label="참여하지 않는 학생 = 회색"
        labelPosition="bottom"
        color={colors.gray700}
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 0), x: 1100, y: 640 },
          { frame: tabClick - 6, x: tab.x, y: tab.y },
          { frame: tabClick + 10, x: tab.x, y: tab.y },
          { frame: offClick - 8, x: joinPoint.x, y: joinPoint.y },
          { frame: offClick + 8, x: joinPoint.x, y: joinPoint.y },
          { frame: dayClick - 6, x: thursdayPoint.x, y: thursdayPoint.y },
          { frame: dayClick + 8, x: thursdayPoint.x, y: thursdayPoint.y },
          { frame: afterSchoolClick - 6, x: afterSchoolPoint.x, y: afterSchoolPoint.y },
          { frame: lineEnd(ID, 4) - 10, x: afterSchoolPoint.x, y: afterSchoolPoint.y },
          { frame: saveClick - 6, x: secondThursdayPoint.x, y: secondThursdayPoint.y },
        ]}
        clicks={[tabClick, offClick, dayClick, afterSchoolClick, saveClick]}
        hideAfter={lineEnd(ID, 5)}
      />
    </GuideScene>
  );
};
