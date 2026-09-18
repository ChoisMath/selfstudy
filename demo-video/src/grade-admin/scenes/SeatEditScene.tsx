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

const ID = "SeatEdit";
const TAB_TITLE = "포산고 자율학습";
const W = GRADE_ADMIN_BODY.w;

// 미배정 패널 전체와 1반 좌석·2반 첫 줄·헤더가 함께 보이는 스크롤 위치.
const SCROLL = 50;
// 액션바는 목업이 height 기준 하단 고정으로 그린다 — 보이는 본문의 아래쪽에 붙게 스크롤만큼 더한다.
const EDITOR_H = GRADE_ADMIN_BODY.h + SCROLL;

// 앞 장면(SeatAssign)에서 1-1반 분단2 빈 자리로 옮긴 학생.
const MOVED: Student = studentById(106);
const MOVED_SEAT = seatCellRect(afternoonRoomId(1, 2), 1, 2);

// 교환: 1-1반 분단1 (1,1) 김도현 ↔ 같은 반 분단3 (1,1) 장서아.
const SWAP_A = { roomId: afternoonRoomId(1, 1), row: 1, col: 1 };
const SWAP_B = { roomId: afternoonRoomId(1, 3), row: 1, col: 1 };
const SEAT_A = seatCellRect(SWAP_A.roomId, SWAP_A.row, SWAP_A.col);
const SEAT_B = seatCellRect(SWAP_B.roomId, SWAP_B.row, SWAP_B.col);
const STUDENT_A: Student = studentById(101);
const STUDENT_B: Student = studentById(109);

// 해제: 1-2반 분단3 (1,1) 홍유찬 — 액션바(x 16~400)에 가리지 않는 오른쪽 분단이다.
const FREE = { roomId: afternoonRoomId(2, 3), row: 1, col: 1 };
const FREE_SEAT = seatCellRect(FREE.roomId, FREE.row, FREE.col);
const FREED: Student = studentById(209);

// --- 미배정 패널 목록 기하(UnassignedStudents.tsx 이식분과 같은 상수) ----------------
const SEARCH = seatEditorRect("unassignedSearch");
const PANEL = seatEditorRect("unassignedPanel");
const LIST_X = SEARCH.x;
const LIST_W = SEARCH.w;
const LIST_Y = SEARCH.y + SEARCH.h + 12;
const LABEL_H = 18;
const ROW_H = 44;
const ROW_GAP = 8;
const GROUP_GAP = 12;
const HELPER_LINE: Rect = { x: LIST_X, y: PANEL.y + 16 + 24, w: LIST_W, h: 30 };

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

const rowRect = (groups: Group[], studentId: number): Rect => {
  const index = groups.findIndex((g) => g.students.some((s) => s.id === studentId));
  const position = groups[index].students.findIndex((s) => s.id === studentId);
  return { x: LIST_X, y: groupTop(groups, index) + LABEL_H + position * (ROW_H + ROW_GAP), w: LIST_W, h: ROW_H };
};

// 앞 장면에서 한 명이 빠진 목록 → 해제 뒤 홍유찬이 돌아온 목록.
const BEFORE = SEAT_EDITOR.afternoon.unassigned.filter((s) => s.id !== MOVED.id);
const BEFORE_GROUPS = groupsOf(BEFORE);
const AFTER_GROUPS = groupsOf([...BEFORE, FREED]);
const FREED_ROW = rowRect(AFTER_GROUPS, FREED.id);

const UnassignedOverlay: React.FC<{ groups: Group[] }> = ({ groups }) => {
  const count = groups.reduce((sum, g) => sum + g.students.length, 0);
  return (
    <div style={{ position: "absolute", left: 0, top: 0 }}>
      <div style={{ position: "absolute", left: PANEL.x + 1, top: PANEL.y + 14, width: PANEL.w - 2, height: 28, background: tw.white }} />
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

const SeatOverlay: React.FC<{ seat: Rect; student?: Student; row?: number; col?: number }> = ({ seat, student, row, col }) => (
  <div
    style={{
      position: "absolute",
      left: seat.x,
      top: seat.y,
      width: seat.w,
      height: seat.h,
      borderRadius: 6,
      border: `1px solid ${tw.gray[200]}`,
      background: student ? tw.white : tw.gray[50],
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      lineHeight: 1.2,
    }}
  >
    {student ? (
      <span>
        <span style={{ display: "block", fontSize: 10, color: tw.gray[400], whiteSpace: "nowrap" }}>
          {student.classNumber}-{student.number}
        </span>
        <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: tw.gray[800], whiteSpace: "nowrap" }}>{student.name}</span>
      </span>
    ) : (
      <span style={{ fontSize: 10, color: tw.gray[300], whiteSpace: "nowrap" }}>
        {row}-{col}
      </span>
    )}
  </div>
);

// 이 장면이 저장한 최종 배치 — 뒤따르는 SeatPrint 가 편집기와 A4 양쪽에 그대로 이어 받는다.
export type SavedSeat = { classNumber: number; division: number; row: number; col: number; student: Student | null };

export const SAVED_SEATS: SavedSeat[] = [
  { classNumber: 1, division: 2, row: 1, col: 2, student: MOVED },
  { classNumber: 1, division: 1, row: SWAP_A.row, col: SWAP_A.col, student: STUDENT_B },
  { classNumber: 1, division: 3, row: SWAP_B.row, col: SWAP_B.col, student: STUDENT_A },
  { classNumber: 2, division: 3, row: FREE.row, col: FREE.col, student: null },
];

export const SavedSeatLayout: React.FC = () => (
  <>
    {SAVED_SEATS.map((s) => (
      <SeatOverlay
        key={`${s.classNumber}-${s.division}-${s.row}-${s.col}`}
        seat={seatCellRect(afternoonRoomId(s.classNumber, s.division), s.row, s.col)}
        student={s.student ?? undefined}
        row={s.row}
        col={s.col}
      />
    ))}
    <UnassignedOverlay groups={AFTER_GROUPS} />
  </>
);

const CHIP_W = 164;
const CHIP_H = 44;

const DragChip: React.FC<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  start: number;
  end: number;
  student: Student;
  fade?: boolean;
}> = ({ from, to, start, end, student, fade }) => {
  const frame = useCurrentFrame();
  if (frame < start || frame > end) {
    return null;
  }
  return (
    <div
      style={{
        position: "absolute",
        left: tween(frame, [start, end], [from.x, to.x], easeInOut) - CHIP_W / 2,
        top: tween(frame, [start, end], [from.y, to.y], easeInOut) - CHIP_H / 2,
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
        opacity: fade ? tween(frame, [end - 8, end], [1, 0]) : 1,
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
const dragStart = lineAt(ID, 0, 0.24);
const hoverFrom = lineAt(ID, 0, 0.5);
const swapAt = lineAt(ID, 0, 0.62);
const cursorHide1 = lineAt(ID, 0, 0.72);

const helperFrom = lineAt(ID, 1, 0.04);
const seatClick = lineAt(ID, 1, 0.36);
const barFrom = seatClick + 4;
const unassignClick = lineAt(ID, 1, 0.66);
const unassignAt = unassignClick + 3;
const chipLand = unassignAt + 20;
const cursorHide2 = unassignClick + 12;

const saveBoxFrom = lineAt(ID, 2, 0.08);
const savePress = lineAt(ID, 2, 0.84);
const savingFrom = savePress + 4;

const centerOf = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const bodyAbs = (r: Rect) => pcRectAbs({ x: r.x, y: GRADE_ADMIN_BODY.y + r.y - SCROLL, w: r.w, h: r.h });
const bodyPoint = (p: { x: number; y: number }) => {
  const r = bodyAbs({ x: p.x, y: p.y, w: 0, h: 0 });
  return { x: r.x, y: r.y };
};

const UNASSIGN_BTN = seatEditorRect("actionBarUnassign", { height: EDITOR_H });

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const dragging = frame >= dragStart && frame < swapAt;
  const swapped = frame >= swapAt;
  const freed = frame >= unassignAt;
  return (
    <BrowserFrame url={`${APP_URL}/grade-admin/${GRADE}`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <GradeAdminShellMock tab="seats" showHelp scrollY={SCROLL}>
          <SeatEditorMock
            width={W}
            height={EDITOR_H}
            session="afternoon"
            dragging={dragging ? { type: "seat", ...SWAP_A } : undefined}
            hoverSeat={frame >= hoverFrom && frame < swapAt ? SWAP_B : undefined}
            selectedSeat={frame >= seatClick && frame < unassignAt ? FREE : undefined}
            savePressAt={savePress}
            saving={frame >= savingFrom}
            dirtyCount={freed ? 2 : 1}
          />
          <SeatOverlay seat={MOVED_SEAT} student={MOVED} />
          {swapped ? (
            <>
              <SeatOverlay seat={SEAT_A} student={STUDENT_B} />
              <SeatOverlay seat={SEAT_B} student={STUDENT_A} />
            </>
          ) : null}
          {freed ? <SeatOverlay seat={FREE_SEAT} row={FREE.row} col={FREE.col} /> : null}
          <UnassignedOverlay groups={frame >= chipLand ? AFTER_GROUPS : BEFORE_GROUPS} />
          <DragChip from={centerOf(SEAT_A)} to={centerOf(SEAT_B)} start={dragStart} end={swapAt} student={STUDENT_A} />
          <DragChip from={centerOf(FREE_SEAT)} to={centerOf(FREED_ROW)} start={unassignAt} end={chipLand} student={FREED} fade />
        </GradeAdminShellMock>
      </PcViewport>
    </BrowserFrame>
  );
};

export const SeatEditScene: React.FC<DemoProps> = () => {
  const dragFrom = bodyPoint(centerOf(SEAT_A));
  const dragTo = bodyPoint(centerOf(SEAT_B));
  const freePoint = bodyPoint(centerOf(FREE_SEAT));
  const unassignPoint = bodyPoint(centerOf(UNASSIGN_BTN));

  return (
    <GuideScene id={ID} step={12} label="교환·해제">
      <Stage />

      <Annotation from={swapAt + 4} durationInFrames={lineEnd(ID, 0) - swapAt - 4} {...padRect(bodyAbs(SEAT_A), 5)} />
      <Annotation from={swapAt + 4} durationInFrames={lineEnd(ID, 0) - swapAt - 4} {...padRect(bodyAbs(SEAT_B), 5)} />

      <Annotation
        from={helperFrom}
        durationInFrames={seatClick - helperFrom}
        {...padRect(bodyAbs(HELPER_LINE), 4)}
        color={colors.green600}
      />
      <Annotation from={barFrom + 4} durationInFrames={unassignAt - barFrom - 4} {...padRect(bodyAbs(UNASSIGN_BTN), 5)} />
      <Annotation
        from={chipLand}
        durationInFrames={lineEnd(ID, 1) - chipLand}
        {...padRect(bodyAbs(FREED_ROW), 4)}
        color={colors.green600}
      />

      {/* 문장 2 — 도움말 스틸(2, 0.6): 교환·해제가 끝나고 저장 버튼에 2개 교실이 찍힌 상태. */}
      <Annotation
        from={saveBoxFrom}
        durationInFrames={lineEnd(ID, 2) + 10 - saveBoxFrom}
        {...padRect(bodyAbs(seatEditorRect("saveButton")), 5)}
        label="바뀐 교실 수"
        labelPosition="top"
        labelAlign="end"
        color={colors.blue600}
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 6, x: dragFrom.x - 90, y: dragFrom.y + 170 },
          { frame: dragStart, x: dragFrom.x, y: dragFrom.y },
          { frame: swapAt, x: dragTo.x, y: dragTo.y },
          { frame: cursorHide1, x: dragTo.x, y: dragTo.y },
        ]}
        clicks={[dragStart, swapAt]}
        hideAfter={cursorHide1}
      />
      <Cursor
        path={[
          { frame: lineAt(ID, 1, 0.2), x: freePoint.x + 150, y: freePoint.y - 130 },
          { frame: seatClick - 6, x: freePoint.x, y: freePoint.y },
          { frame: seatClick + 12, x: freePoint.x, y: freePoint.y },
          { frame: unassignClick - 8, x: unassignPoint.x, y: unassignPoint.y },
          { frame: cursorHide2, x: unassignPoint.x, y: unassignPoint.y },
        ]}
        clicks={[seatClick, unassignClick]}
        hideAfter={cursorHide2}
      />
      <Cursor
        path={[
          { frame: savePress - 15, x: bodyAbs(seatEditorRect("saveButton")).x - 140, y: bodyAbs(seatEditorRect("saveButton")).y + 260 },
          { frame: savePress - 5, x: bodyPoint(centerOf(seatEditorRect("saveButton"))).x, y: bodyPoint(centerOf(seatEditorRect("saveButton"))).y },
          { frame: savePress + 10, x: bodyPoint(centerOf(seatEditorRect("saveButton"))).x, y: bodyPoint(centerOf(seatEditorRect("saveButton"))).y },
        ]}
        clicks={[savePress]}
        hideAfter={savePress + 12}
      />
    </GuideScene>
  );
};
