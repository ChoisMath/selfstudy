import React from "react";
import { useCurrentFrame } from "remotion";
import { easeInOut, tween } from "../../anim";
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
import { ABSENCE_REQUESTS, APP_HOST, TODAY_LABEL, type Session } from "../../app-mocks/data";
import { PHONE_BODY, PcViewport, pcAbs, pcRectAbs, type Rect } from "../../app-mocks/layout";
import { ParticipationTableMock, participationRect } from "../../app-mocks/ParticipationTableMock";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { InsetCard, insetCardSize, insetRectAbs, padRect, type InsetCrop } from "../../teacher/scenes/pc-helpers";
import { colors } from "../../theme";
import { GRADE, ME, PARTICIPATION_ROWS, TODAY_STATS, type ParticipationRow } from "../data";
import { GRADE_ADMIN_BODY, GradeAdminShellMock, gradeAdminTabPoint } from "../mocks/GradeAdminShellMock";
import { StudentTableMock } from "../mocks/StudentTableMock";
import { lineAt, lineEnd, lineStart } from "../timing";
import { HELPER_END_CLASS, HELPER_END_ROWS, HELPER_END_SCROLL } from "./HelperScene";

const ID = "Participation";
const TAB_TITLE = "포산고 자율학습";
const W = GRADE_ADMIN_BODY.w;

// ParticipationTableMock 내부 상수(헤더 1행 높이·본문 행 높이) — 좌표 함수가 열 단위 상자를 내보내지 않아 되계산한다.
const HEAD1_H = 24;
const ROW_H = 45;
// 스크롤 0에서 끝까지 보이는 행 수.
const VISIBLE_ROWS = 7;

// 오늘(목) 칸. 요일 버튼·방과후 체크박스 모두 목요일을 쓴다.
const THU = 3;
// 1-1 3번 박지민 — 목요일에 빠지는 학생(HOMEROOM_PARTICIPATION 3번 override).
const DAY_STUDENT = 103;
// 1-1 7번 조예린 — 오늘 오후1 출석부에서 노란 방과후 좌석인 학생(AFTERNOON1_BASE 107).
const AFTER_SCHOOL_STUDENT = 107;
// 1-1 11번 한지유 — 오늘 오후1 참여하지 않아 회색 좌석인 학생(AFTERNOON1_BASE 111).
const INACTIVE_STUDENT = 111;

type Toggle = {
  studentId: number;
  session: Session;
  control: "participating" | `day_${number}` | `afterSchool_${number}`;
  at: number;
};

const tabClick = lineAt(ID, 0, 0.22);
const pageSwap = tabClick + 3;

const mixDownFrom = lineAt(ID, 1, 0.2);
const mixDownTo = mixDownFrom + 30;
const mixUpFrom = lineAt(ID, 1, 0.84);
const mixUpTo = lineAt(ID, 2, 0.12);
// 1반 끝 ~ 2반 시작이 한 화면에 들어오는 위치 — "학년 전체"를 눈으로 보여 준다.
const MIX_SCROLL = 500;

const dayClick = lineAt(ID, 3, 0.5);
const afterSchoolClick = lineAt(ID, 4, 0.18);
const saveClick = lineAt(ID, 5, 0.12);

const TOGGLES: Toggle[] = [
  { studentId: DAY_STUDENT, session: "afternoon1", control: `day_${THU}`, at: dayClick },
  { studentId: AFTER_SCHOOL_STUDENT, session: "afternoon1", control: `afterSchool_${THU}`, at: afterSchoolClick },
  { studentId: DAY_STUDENT, session: "afternoon2", control: `day_${THU}`, at: saveClick },
];

const flip = (rows: ParticipationRow[], t: Toggle): ParticipationRow[] =>
  rows.map((row) => {
    if (row.student.id !== t.studentId) return row;
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

// 두 요일 토글은 data.ts 의 참여설정(박지민 목 불참)에 도달하도록 반대 상태에서 시작한다.
// 방과후 토글만 반대 방향 — 끄고 시작해 켜면 오늘 출석부의 노란 방과후 좌석(107)과 표가 맞아떨어진다.
const START_ROWS = flip(flip(PARTICIPATION_ROWS, TOGGLES[0]), TOGGLES[2]);

// 다음 장면(ParticipationBulk)이 이어받는 상태.
export const PARTICIPATION_END_ROWS = TOGGLES.reduce(flip, START_ROWS);

// 마지막 누름의 "저장 중..."은 문장 5가 설명하는 대상이라 목업 기본(20프레임)보다 길게 띄운다.
const SAVE_NOTICE_FRAMES = 44;

const savingFromAt = (frame: number, active: Toggle | undefined) => {
  if (!active) return undefined;
  const from = active.at + 2;
  const isLast = active === TOGGLES[TOGGLES.length - 1];
  return isLast && frame >= from && frame < from + SAVE_NOTICE_FRAMES ? frame : from;
};

const scrollAt = (frame: number) =>
  frame >= mixUpFrom
    ? tween(frame, [mixUpFrom, mixUpTo], [MIX_SCROLL, 0], easeInOut)
    : tween(frame, [mixDownFrom, mixDownTo], [0, MIX_SCROLL], easeInOut);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const onParticipation = frame >= pageSwap;
  const done = TOGGLES.filter((t) => t.at <= frame);
  const active = done[done.length - 1];
  const rows = done.slice(0, -1).reduce(flip, START_ROWS);
  return (
    <BrowserFrame url={`${APP_HOST}/grade-admin/${GRADE}`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <GradeAdminShellMock
          tab={onParticipation ? "participation" : "students"}
          showHelp
          tabPressAt={{ tab: "participation", at: tabClick }}
          scrollY={onParticipation ? scrollAt(frame) : HELPER_END_SCROLL}
        >
          {onParticipation ? (
            <div style={{ opacity: tween(frame, [pageSwap, pageSwap + 8], [0, 1]) }}>
              <ParticipationTableMock
                variant="grade"
                width={W}
                rows={rows}
                toggle={active}
                savingFrom={savingFromAt(frame, active)}
              />
            </div>
          ) : (
            <StudentTableMock width={W} rows={HELPER_END_ROWS} classFilter={HELPER_END_CLASS} />
          )}
        </GradeAdminShellMock>
      </PcViewport>
    </BrowserFrame>
  );
};

// ── 표 좌표 ──

const bodyRect = (r: Rect, scrollY = 0): Rect => ({
  ...r,
  x: r.x + GRADE_ADMIN_BODY.x,
  y: r.y + GRADE_ADMIN_BODY.y - scrollY,
});

const HEADER = participationRect("header", "grade", W, PARTICIPATION_ROWS);
const ROWS_TOP = HEADER.y + HEADER.h;
const ROWS_BOTTOM = ROWS_TOP + VISIBLE_ROWS * ROW_H;

const control = (studentId: number, session: Session, name: string) =>
  participationRect(`control_${studentId}_${session}_${name}`, "grade", W, PARTICIPATION_ROWS);

const joinColumn = (session: Session): Rect => {
  const cell = control(101, session, "participating");
  return { x: cell.x, y: HEADER.y + HEAD1_H, w: cell.w, h: ROWS_BOTTOM - (HEADER.y + HEAD1_H) };
};

const DAY_BUTTONS = ((first: Rect) => ({ ...first, w: first.w * 5 }))(control(DAY_STUDENT, "afternoon1", `day_0`));
const THU_BUTTON = control(DAY_STUDENT, "afternoon1", `day_${THU}`);
const THU_BUTTON2 = control(DAY_STUDENT, "afternoon2", `day_${THU}`);
const AS_CELL = control(AFTER_SCHOOL_STUDENT, "afternoon1", `afterSchool_${THU}`);
// 실제 체크박스는 칸 가운데 12px 정사각형이다(AS_SIZE).
const AS_BOX_SIZE = 12;
const AS_BOX: Rect = {
  x: AS_CELL.x + (AS_CELL.w - AS_BOX_SIZE) / 2,
  y: AS_CELL.y,
  w: AS_BOX_SIZE,
  h: AS_BOX_SIZE,
};
// 반 열(가로 스크롤 콘텐츠 첫 칸) — 좌표 함수가 열 키를 내보내지 않아 참가 칸에서 되짚는다.
// y 는 콘텐츠 좌표라 MIX_SCROLL 만큼 내려간 위치에 잡아야 화면 가운데에 온다.
const CLASS_COLUMN_W = 44;
const CLASS_COLUMN: Rect = {
  x: control(101, "afternoon1", "participating").x - CLASS_COLUMN_W * 2,
  y: MIX_SCROLL + 12,
  w: CLASS_COLUMN_W,
  h: GRADE_ADMIN_BODY.h - 26,
};
const SAVING_TEXT: Rect = { x: W - 16 - 56, y: 10, w: 56, h: 24 };

// ── 확대 카드 ──

const ZOOM_SCALE = 1.9;
const zoomCrop = (studentId: number): InsetCrop => {
  const row = control(studentId, "afternoon1", "participating");
  const first = control(studentId, "afternoon1", `day_0`);
  return {
    rect: bodyRect({ x: first.x - 6, y: row.y - 2, w: first.w * 5 + 12, h: row.h }),
    scale: ZOOM_SCALE,
  };
};

const DAY_ZOOM = zoomCrop(DAY_STUDENT);
const DAY_ZOOM_SIZE = insetCardSize(DAY_ZOOM);
const DAY_ZOOM_CARD = { x: 1740 - DAY_ZOOM_SIZE.width - 24, y: 560 };

const AS_ZOOM = zoomCrop(AFTER_SCHOOL_STUDENT);
const AS_ZOOM_SIZE = insetCardSize(AS_ZOOM);
const AS_ZOOM_CARD = { x: 1740 - AS_ZOOM_SIZE.width - 24, y: 300 };

const dayZoomFrom = dayClick - 26;
const dayZoomOut = lineEnd(ID, 3) + 2;
const asZoomFrom = afterSchoolClick - 22;
const asZoomOut = lineAt(ID, 4, 0.5);

// ── 출석부 인셋(1-1반 교실 카드) ──

const insetVisual = (studentId: number): SeatState => baseVisual(studentId);
const BOARD_GROUPS = buildAfternoonGroups(insetVisual);
const BOARD_PROPS: AttendanceBoardProps = {
  width: PHONE_BODY.w,
  height: PHONE_BODY.h,
  header: { width: PHONE_BODY.w, role: "homeroom", name: ME.name, showHelp: true },
  dateLabel: TODAY_LABEL,
  supervisor: TODAY_STATS.afternoon1.supervisor,
  grade: GRADE,
  counts: countsOf(BOARD_GROUPS),
  tab: "afternoon1",
  pendingBadge: ABSENCE_REQUESTS.filter((r) => r.status === "pending").length,
  groups: BOARD_GROUPS,
};

// PhoneBoardInset 은 1-2반 카드(그룹 1)로 고정돼 있어 1-1반을 보여 줄 수 없다 — 공용 InsetCard 로 직접 자른다.
const BOARD_CROP: InsetCrop = ((card: Rect) => ({
  rect: { x: card.x - 6, y: card.y - 6, w: card.w + 12, h: card.h + 12 },
  scale: 1.25,
}))(groupRect(0, BOARD_PROPS));
const BOARD_SIZE = insetCardSize(BOARD_CROP);
const BOARD_CARD = { x: 1740 - BOARD_SIZE.width - 22, y: 870 - BOARD_SIZE.height - 22 };

const boardFrom = lineAt(ID, 4, 0.34);
const boardOut = lineEnd(ID, 5) + 10;

// 확대 카드 안에 같은 화면을 그대로 다시 그려 토글이 살아 움직이게 한다.
const TableInCard: React.FC = () => {
  const frame = useCurrentFrame();
  const done = TOGGLES.filter((t) => t.at <= frame);
  const active = done[done.length - 1];
  const rows = done.slice(0, -1).reduce(flip, START_ROWS);
  return (
    <GradeAdminShellMock tab="participation" showHelp>
      <ParticipationTableMock variant="grade" width={W} rows={rows} toggle={active} />
    </GradeAdminShellMock>
  );
};

export const ParticipationScene: React.FC<DemoProps> = () => {
  const table = pcRectAbs(bodyRect({ x: HEADER.x, y: HEADER.y, w: HEADER.w, h: ROWS_BOTTOM - HEADER.y }));
  const classFilter = pcRectAbs(bodyRect(participationRect("classFilter", "grade", W, PARTICIPATION_ROWS)));
  const classColumn = pcRectAbs(bodyRect(CLASS_COLUMN, MIX_SCROLL));
  const joinColumns = (["afternoon1", "afternoon2", "night"] as Session[]).map((s) => pcRectAbs(bodyRect(joinColumn(s))));
  const dayButtons = pcRectAbs(bodyRect(DAY_BUTTONS));
  const thursday = pcRectAbs(bodyRect(THU_BUTTON));
  const afterSchool = pcRectAbs(bodyRect(AS_BOX));
  const saving = pcRectAbs(bodyRect(SAVING_TEXT));

  const tab = pcAbs(gradeAdminTabPoint("participation"));
  const thursdayPoint = { x: thursday.x + thursday.width / 2, y: thursday.y + thursday.height / 2 };
  const afterSchoolPoint = { x: afterSchool.x + afterSchool.width / 2, y: afterSchool.y + afterSchool.height / 2 };
  const secondThursday = pcRectAbs(bodyRect(THU_BUTTON2));
  const secondThursdayPoint = { x: secondThursday.x + secondThursday.width / 2, y: secondThursday.y + secondThursday.height / 2 };

  const afterSchoolSeat = insetRectAbs(BOARD_CARD, BOARD_CROP, seatRect(AFTER_SCHOOL_STUDENT, BOARD_PROPS));
  const inactiveSeat = insetRectAbs(BOARD_CARD, BOARD_CROP, seatRect(INACTIVE_STUDENT, BOARD_PROPS));

  return (
    <GuideScene id={ID} step={7} label="참여 설정">
      <Stage />

      <Annotation
        from={pageSwap + 14}
        durationInFrames={lineEnd(ID, 0) + 4 - pageSwap - 14}
        {...padRect(table, 5)}
        label="학생별 · 시간별 · 요일별 참여 설정"
        labelPosition="top"
        labelAlign="end"
        color={colors.blue600}
      />

      <Annotation
        from={lineStart(ID, 1) + 2}
        durationInFrames={mixDownFrom + 8 - lineStart(ID, 1) - 2}
        {...padRect(classFilter, 5)}
        label="전체 반"
        labelPosition="right"
        color={colors.indigo600}
      />
      <Annotation
        from={mixDownTo - 4}
        durationInFrames={mixUpFrom + 4 - mixDownTo + 4}
        {...padRect(classColumn, 4)}
        label="학년관리자는 1·2·3반 전부"
        labelPosition="bottom"
        color={colors.indigo600}
      />

      {joinColumns.map((box, i) => (
        <Annotation
          key={i}
          from={lineAt(ID, 2, 0.18) + i * 6}
          durationInFrames={lineEnd(ID, 2) + 4 - lineAt(ID, 2, 0.18) - i * 6}
          {...padRect(box, 3)}
          label={i === 0 ? "참가 체크박스 = 그 시간 전체" : undefined}
          labelPosition="top"
          labelGap={46}
          color={colors.blue600}
        />
      ))}

      <Annotation
        from={lineStart(ID, 3) + 2}
        durationInFrames={dayClick - 6 - lineStart(ID, 3) - 2}
        {...padRect(dayButtons, 4)}
        label="파란색 = 참여하는 날"
        labelPosition="top"
        color={colors.blue600}
      />
      <Annotation
        from={dayClick + 6}
        durationInFrames={lineEnd(ID, 3) + 2 - dayClick - 6}
        {...padRect(thursday, 4)}
        label="회색 = 참여하지 않는 날"
        labelPosition="top"
      />
      <InsetCard card={DAY_ZOOM_CARD} crop={DAY_ZOOM} title={`${GRADE}-1 3번 박지민 · 오후1 요일`} from={dayZoomFrom} out={dayZoomOut}>
        <TableInCard />
      </InsetCard>

      <Annotation
        from={afterSchoolClick + 6}
        durationInFrames={lineEnd(ID, 4) + 8 - afterSchoolClick - 6}
        {...padRect(afterSchool, 5)}
        label="방과후 체크"
        labelPosition="top"
        labelAlign="end"
        color={colors.amber300}
      />
      <InsetCard card={AS_ZOOM_CARD} crop={AS_ZOOM} title={`${GRADE}-1 7번 조예린 · 방과후 체크`} from={asZoomFrom} out={asZoomOut}>
        <TableInCard />
      </InsetCard>

      <InsetCard card={BOARD_CARD} crop={BOARD_CROP} title={`${TODAY_LABEL.slice(5)} 오후1 출석부`} from={boardFrom} out={boardOut}>
        <AttendanceBoardMock {...BOARD_PROPS} />
      </InsetCard>
      <Annotation
        from={boardFrom + 14}
        durationInFrames={lineEnd(ID, 4) + 6 - boardFrom - 14}
        {...padRect(afterSchoolSeat, 4)}
        label="노란 방과후 좌석"
        labelPosition="bottom"
        color={colors.amber300}
      />

      <Annotation
        from={saveClick + 2}
        durationInFrames={SAVE_NOTICE_FRAMES + 10}
        {...padRect(saving, 8)}
        label="누르는 즉시 저장"
        labelPosition="left"
        color={colors.green600}
      />
      <Annotation
        from={lineAt(ID, 5, 0.46)}
        durationInFrames={boardOut - lineAt(ID, 5, 0.46)}
        {...padRect(inactiveSeat, 4)}
        label="참여하지 않는 학생 = 회색"
        labelPosition="bottom"
        labelAlign="end"
        color={colors.gray700}
      />

      {/* 문장 1~2 는 스크롤과 주석만 보여 준다 — 커서가 표 위에 떠 있지 않도록 누름마다 따로 띄운다. */}
      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 4, x: 980, y: 720 },
          { frame: tabClick - 8, x: tab.x, y: tab.y },
          { frame: tabClick + 12, x: tab.x, y: tab.y },
        ]}
        clicks={[tabClick]}
        hideAfter={tabClick + 12}
      />
      <Cursor
        path={[
          { frame: dayClick - 26, x: thursdayPoint.x - 90, y: thursdayPoint.y + 110 },
          { frame: dayClick - 8, x: thursdayPoint.x, y: thursdayPoint.y },
          { frame: afterSchoolClick - 12, x: afterSchoolPoint.x, y: afterSchoolPoint.y },
          { frame: afterSchoolClick + 10, x: afterSchoolPoint.x, y: afterSchoolPoint.y },
        ]}
        clicks={[dayClick, afterSchoolClick]}
        hideAfter={afterSchoolClick + 10}
      />
      <Cursor
        path={[
          { frame: saveClick - 24, x: secondThursdayPoint.x + 90, y: secondThursdayPoint.y + 110 },
          { frame: saveClick - 6, x: secondThursdayPoint.x, y: secondThursdayPoint.y },
        ]}
        clicks={[saveClick]}
        hideAfter={lineEnd(ID, 5)}
      />
    </GuideScene>
  );
};
