import React from "react";
import { useCurrentFrame } from "remotion";
import { easeInOut, tween } from "../../anim";
import { APP_URL, studentById, type Student } from "../../app-mocks/data";
import { PcViewport, pcRectAbs, type Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { colors } from "../../theme";
import { padRect } from "../../teacher/scenes/pc-helpers";
import { GRADE, SEAT_EDITOR } from "../data";
import { GRADE_ADMIN_BODY, GradeAdminShellMock } from "../mocks/GradeAdminShellMock";
import { SeatEditorMock, afternoonRoomId, seatCellRect, seatEditorRect } from "../mocks/SeatEditorMock";
import { lineAt, lineEnd, lineStart } from "../timing";

const ID = "SeatAssign";
const TAB_TITLE = "포산고 자율학습";
const W = GRADE_ADMIN_BODY.w;

// 미배정 1-6 강민재를 1-1반 분단2의 빈 자리(6번 좌석)로 끈다 — data.ts 가 비워 둔 실제 좌석이다.
const MOVER: Student = studentById(106);
const TARGET_ROOM = afternoonRoomId(1, 2);
const TARGET_SEAT = seatCellRect(TARGET_ROOM, 1, 2);
const TARGET = { roomId: TARGET_ROOM, row: 1, col: 2 };

// --- 미배정 패널 목록 기하(UnassignedStudents.tsx 이식분과 같은 상수) ----------------
const SEARCH = seatEditorRect("unassignedSearch");
const PANEL = seatEditorRect("unassignedPanel");
const LIST_X = SEARCH.x;
const LIST_W = SEARCH.w;
const LIST_Y = SEARCH.y + SEARCH.h + 12; // mb-3
const LABEL_H = 18;
const ROW_H = 44;
const ROW_GAP = 8;
const GROUP_GAP = 12;

type Group = { classNumber: number; students: Student[] };

const groupsOf = (students: Student[]): Group[] => {
  const byClass = new Map<number, Student[]>();
  [...students]
    .sort((a, b) => a.classNumber - b.classNumber || a.number - b.number)
    .forEach((s) => byClass.set(s.classNumber, [...(byClass.get(s.classNumber) ?? []), s]));
  return [...byClass.entries()].map(([classNumber, list]) => ({ classNumber, students: list }));
};

const groupHeight = (g: Group) => LABEL_H + g.students.length * ROW_H + (g.students.length - 1) * ROW_GAP;

const groupTop = (groups: Group[], index: number) =>
  LIST_Y + groups.slice(0, index).reduce((sum, g) => sum + groupHeight(g) + GROUP_GAP, 0);

const groupRect = (groups: Group[], index: number): Rect => ({
  x: LIST_X,
  y: groupTop(groups, index),
  w: LIST_W,
  h: groupHeight(groups[index]),
});

const rowRect = (groups: Group[], classNumber: number, studentId: number): Rect => {
  const index = groups.findIndex((g) => g.classNumber === classNumber);
  const position = groups[index].students.findIndex((s) => s.id === studentId);
  return { x: LIST_X, y: groupTop(groups, index) + LABEL_H + position * (ROW_H + ROW_GAP), w: LIST_W, h: ROW_H };
};

const BASE_GROUPS = groupsOf(SEAT_EDITOR.afternoon.unassigned);
const AFTER_GROUPS = groupsOf(SEAT_EDITOR.afternoon.unassigned.filter((s) => s.id !== MOVER.id));
const SOURCE_ROW = rowRect(BASE_GROUPS, MOVER.classNumber, MOVER.id);

// 목업은 SEAT_EDITOR 를 그대로 그린다 — 배정이 끝난 뒤의 목록·좌석은 장면이 덮어 그린다.
const UnassignedOverlay: React.FC<{ groups: Group[] }> = ({ groups }) => {
  const count = groups.reduce((sum, g) => sum + g.students.length, 0);
  return (
    <div style={{ position: "absolute", left: 0, top: 0 }}>
      <div
        style={{
          position: "absolute",
          left: PANEL.x + 1,
          top: PANEL.y + 14,
          width: PANEL.w - 2,
          height: 28,
          background: tw.white,
        }}
      />
      <div style={{ position: "absolute", left: LIST_X, top: PANEL.y + 16, fontSize: 15, fontWeight: 600, color: tw.gray[800], whiteSpace: "nowrap" }}>
        미배정 학생 <span style={{ fontSize: 13, fontWeight: 400, color: tw.gray[400] }}>({count}명)</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: PANEL.x + 1,
          top: LIST_Y - 4,
          width: PANEL.w - 2,
          height: PANEL.y + PANEL.h - LIST_Y + 3,
          background: tw.white,
        }}
      />
      {groups.map((g, i) => (
        <div key={g.classNumber} style={{ position: "absolute", left: LIST_X, top: groupTop(groups, i), width: LIST_W }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: tw.gray[400], marginBottom: 4, whiteSpace: "nowrap" }}>{g.classNumber}반</div>
          {g.students.map((s, ri) => (
            <div
              key={s.id}
              style={{
                position: "absolute",
                left: 0,
                top: LABEL_H + ri * (ROW_H + ROW_GAP),
                width: LIST_W,
                height: ROW_H,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 8px",
                borderRadius: 4,
                border: `1px solid ${tw.gray[200]}`,
                background: tw.white,
                boxSizing: "border-box",
                fontSize: 12,
              }}
            >
              <span style={{ color: tw.gray[400], minWidth: 32, whiteSpace: "nowrap" }}>
                {s.classNumber}-{s.number}
              </span>
              <span style={{ fontWeight: 500, color: tw.gray[800], whiteSpace: "nowrap" }}>{s.name}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const FilledSeat: React.FC<{ seat: Rect; student: Student }> = ({ seat, student }) => (
  <div
    style={{
      position: "absolute",
      left: seat.x,
      top: seat.y,
      width: seat.w,
      height: seat.h,
      borderRadius: 6,
      border: `1px solid ${tw.gray[200]}`,
      background: tw.white,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      lineHeight: 1.2,
    }}
  >
    <span>
      <span style={{ display: "block", fontSize: 10, color: tw.gray[400], whiteSpace: "nowrap" }}>
        {student.classNumber}-{student.number}
      </span>
      <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: tw.gray[800], whiteSpace: "nowrap" }}>{student.name}</span>
    </span>
  </div>
);

const CHIP_W = 164;
const CHIP_H = 44;

const DragChip: React.FC<{ from: { x: number; y: number }; to: { x: number; y: number }; start: number; end: number; student: Student }> = ({
  from,
  to,
  start,
  end,
  student,
}) => {
  const frame = useCurrentFrame();
  if (frame < start || frame > end) {
    return null;
  }
  const x = tween(frame, [start, end], [from.x, to.x], easeInOut);
  const y = tween(frame, [start, end], [from.y, to.y], easeInOut);
  return (
    <div
      style={{
        position: "absolute",
        left: x - CHIP_W / 2,
        top: y - CHIP_H / 2,
        width: CHIP_W,
        height: CHIP_H,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 8px",
        borderRadius: 6,
        border: `1px solid ${tw.blue[300]}`,
        background: tw.white,
        boxShadow: "0 10px 24px rgba(15,23,42,0.28)",
        boxSizing: "border-box",
        fontSize: 12,
        rotate: "-3deg",
      }}
    >
      <span style={{ color: tw.gray[400], minWidth: 32, whiteSpace: "nowrap" }}>
        {student.classNumber}-{student.number}
      </span>
      <span style={{ fontWeight: 500, color: tw.gray[800], whiteSpace: "nowrap" }}>{student.name}</span>
    </div>
  );
};

// --- 타이밍 ---------------------------------------------------------------------------
const SCROLL = 50; // 문장 2부터 — 미배정 패널 전체(3반 그룹까지)가 본문에 들어오는 위치.
const scrollFrom = lineStart(ID, 2);
const scrollTo = scrollFrom + 12;

const panelFrom = lineAt(ID, 0, 0.1);
const afternoonFrom = lineAt(ID, 1, 0.04);
const nightFrom = lineAt(ID, 1, 0.5);
const groupsFrom = lineAt(ID, 2, 0.1);
const searchFrom = lineAt(ID, 2, 0.5);
const dragStart = lineAt(ID, 3, 0.06);
const hoverFrom = lineAt(ID, 3, 0.28);
const dropAt = lineAt(ID, 3, 0.45);
const cursorHide = lineAt(ID, 3, 0.5);
const seatBoxFrom = dropAt + 4;

const bodyAbs = (r: Rect, scrollY = 0) => pcRectAbs({ x: r.x, y: GRADE_ADMIN_BODY.y + r.y - scrollY, w: r.w, h: r.h });
const bodyPoint = (x: number, y: number, scrollY = 0) => {
  const r = bodyAbs({ x, y, w: 0, h: 0 }, scrollY);
  return { x: r.x, y: r.y };
};
const visible = (r: Rect): Rect => ({ ...r, h: Math.min(r.h, GRADE_ADMIN_BODY.h - r.y - 6) });

const SOURCE_CENTER = { x: SOURCE_ROW.x + SOURCE_ROW.w / 2, y: SOURCE_ROW.y + SOURCE_ROW.h / 2 };
const TARGET_CENTER = { x: TARGET_SEAT.x + TARGET_SEAT.w / 2, y: TARGET_SEAT.y + TARGET_SEAT.h / 2 };

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const dragging = frame >= dragStart && frame < dropAt;
  const dropped = frame >= dropAt;
  return (
    <BrowserFrame url={`${APP_URL}/grade-admin/${GRADE}`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <GradeAdminShellMock tab="seats" showHelp scrollY={tween(frame, [scrollFrom, scrollTo], [0, SCROLL])}>
          <SeatEditorMock
            width={W}
            height={GRADE_ADMIN_BODY.h + SCROLL}
            session="afternoon"
            dragging={dragging ? { type: "student", studentId: MOVER.id } : undefined}
            hoverSeat={frame >= hoverFrom && frame < dropAt ? TARGET : undefined}
          />
          {dropped ? (
            <>
              <FilledSeat seat={TARGET_SEAT} student={MOVER} />
              <UnassignedOverlay groups={AFTER_GROUPS} />
            </>
          ) : null}
          <DragChip from={SOURCE_CENTER} to={TARGET_CENTER} start={dragStart} end={dropAt} student={MOVER} />
        </GradeAdminShellMock>
      </PcViewport>
    </BrowserFrame>
  );
};

export const SeatAssignScene: React.FC<DemoProps> = () => {
  const dragFromPoint = bodyPoint(SOURCE_CENTER.x, SOURCE_CENTER.y, SCROLL);
  const dragToPoint = bodyPoint(TARGET_CENTER.x, TARGET_CENTER.y, SCROLL);

  return (
    <GuideScene id={ID} step={11} label="좌석 배정">
      <Stage />

      <Annotation
        from={panelFrom}
        durationInFrames={lineEnd(ID, 0) - panelFrom}
        {...padRect(bodyAbs(visible(PANEL)), 5)}
        label="참여 설정에서 참가인 학생만"
        labelPosition="top"
        labelAlign="end"
        labelGap={84}
        color={colors.green600}
      />

      <Annotation
        from={afternoonFrom}
        durationInFrames={nightFrom - afternoonFrom}
        {...padRect(bodyAbs(seatEditorRect("sessionAfternoon")), 5)}
        label="오후1·오후2 중 하나라도 참가"
        labelPosition="right"
        // 야간 버튼을 덮지 않도록 두 버튼 오른쪽 빈 띠까지 밀어낸다.
        labelGap={190}
        color={colors.blue600}
      />
      <Annotation
        from={nightFrom}
        durationInFrames={lineEnd(ID, 1) - nightFrom}
        {...padRect(bodyAbs(seatEditorRect("sessionNight")), 5)}
        label="야간 참가 학생"
        labelPosition="right"
        color={colors.blue600}
      />

      {BASE_GROUPS.map((g, i) => (
        <Annotation
          key={g.classNumber}
          from={groupsFrom + i * 5}
          durationInFrames={lineEnd(ID, 2) - groupsFrom - i * 5}
          {...padRect(bodyAbs(groupRect(BASE_GROUPS, i), SCROLL), 4)}
          color={colors.blue600}
        />
      ))}
      <Annotation
        from={searchFrom}
        durationInFrames={lineEnd(ID, 2) - searchFrom}
        {...padRect(bodyAbs(SEARCH, SCROLL), 4)}
        color={colors.green600}
      />

      {/* 문장 3 — 도움말 스틸(3, 0.7)은 커서가 사라진 뒤의 배정 완료 상태. */}
      <Annotation
        from={seatBoxFrom}
        durationInFrames={lineEnd(ID, 3) + 10 - seatBoxFrom}
        {...padRect(bodyAbs(TARGET_SEAT, SCROLL), 5)}
        label="자리 배정 완료"
        labelPosition="top"
        labelAlign="start"
        color={colors.green600}
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 3) - 10, x: dragFromPoint.x + 130, y: dragFromPoint.y + 150 },
          { frame: dragStart, x: dragFromPoint.x, y: dragFromPoint.y },
          { frame: dropAt, x: dragToPoint.x, y: dragToPoint.y },
          { frame: cursorHide, x: dragToPoint.x, y: dragToPoint.y },
        ]}
        clicks={[dragStart, dropAt]}
        hideAfter={cursorHide}
      />
    </GuideScene>
  );
};
