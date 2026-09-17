// src/app/grade-admin/[grade]/page.tsx(78-101행, activeTab==="seats" 탭 패널: 세션 버튼 2개)
// + src/components/seats/SeatingEditor.tsx + RoomGrid.tsx + UnassignedStudents.tsx 이식.
// 탭은 라우트가 아니라 GradeAdminShellMock(T2) 의 학년관리 6탭 셸 본문(GRADE_ADMIN_BODY) 안에
// 들어가는 화면이므로, 셸의 x:0/w:PC_VIEWPORT.w 를 그대로 받아 lg:px-4(16px) 만 스스로 그린다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { type Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";
import { GRADE, SEAT_EDITOR, type AfternoonSeatAssignment, type NightSeatAssignment } from "../data";

type StudentLike = { id: number; classNumber: number; number: number; name: string };
type CorridorSide = "left" | "right";

// --- roomId 스킴(이 목업 전용, 앱 DB의 room.id 대신 씀) --------------------------------
// 오후: "afternoon:{classNumber}:{division}" (division 1~3). 야간: "night:{room.name}".
export const afternoonRoomId = (classNumber: number, division: number): string =>
  `afternoon:${classNumber}:${division}`;
export const nightRoomId = (roomName: string): string => `night:${roomName}`;

export type SeatCellId = { roomId: string; row: number; col: number };
export type SeatDragSource =
  | { type: "seat"; roomId: string; row: number; col: number }
  | { type: "student"; studentId: number };

// classroom-config.ts corridorLabels() 그대로.
const corridorLabels = (side: CorridorSide): { left: string; right: string } =>
  side === "left" ? { left: "복도", right: "창문" } : { left: "창문", right: "복도" };

// --- 레이아웃 상수 ---------------------------------------------------------------------
// grade-admin/[grade]/layout.tsx: max-w-7xl mx-auto px-2 md:px-3 lg:px-4 py-3.
// GRADE_ADMIN_BODY.y 가 이미 헤더+6탭+탭 밑 mb-3 를 소비했으므로(GradeAdminShellMock.tsx 관례,
// SupervisorCalendarMock/GradeMonthlyMock 과 동일) 본문 목업은 위쪽 패딩 없이 y=0 에서 시작한다.
const PAD_X = 16;
const PAD_TOP = 0;
const CONTENT_W = 1216; // PC_VIEWPORT.w(1248) - PAD_X*2 — seatCellRect 는 이 고정폭을 가정한다.

// page.tsx 82-99행: 세션 버튼 2개(피임 X, 독립 버튼) — "오후 자율학습"/"야간 자율학습".
const SESSION_BTN_H = 36; // px-4 py-2(16) + text-sm 줄높이(20)
const SESSION_BTN_W = 132; // "오후 자율학습"/"야간 자율학습" 7자 근사 + px-4(32)
const SESSION_BTN_GAP = 8; // gap-2
const SESSION_ROW_MB = 16; // mb-4

const HEADER_ROW_H = 44; // min-h-11 버튼 기준
const HEADER_MB = 16; // mb-4

const SESSION_Y = PAD_TOP;
const HEADER_Y = SESSION_Y + SESSION_BTN_H + SESSION_ROW_MB;
const GRID_Y = HEADER_Y + HEADER_ROW_H + HEADER_MB;

const PANEL_W = 280; // xl:grid-cols-[1fr_280px]
const PANEL_GAP = 24; // gap-6
const MAIN_W = CONTENT_W - PANEL_W - PANEL_GAP; // 912

const CONFIG_BTN_W = 132; // "교실 구조 설정"
const PRINT_BTN_W = 72; // "출력"
const SAVE_BTN_W = 168; // "저장 (9개 교실 변경)" 최장 라벨 기준 — 라벨이 바뀌어도 좌표 고정
const BTN_GAP = 8; // gap-2

// 오후: ClassroomFrame(복도/창문 세로 라벨) + 분단 3개(2행 x 2열).
const AF_DIVISIONS = 3;
const AF_ROWS = 2; // AFTERNOON_CLASSROOMS.rowsPerDivision
const AF_COLS = 2; // AFTERNOON_CLASSROOMS.colsPerDivision
const AF_DIV_GAP = 12; // gap-3
const FRAME_SIDE_W = 20; // 세로 라벨(복도/창문) 근사 폭
const FRAME_SIDE_GAP = 4; // columnGap: "4px"(screen 변형)
const AF_FRAME_CONTENT_W = MAIN_W - (FRAME_SIDE_W + FRAME_SIDE_GAP) * 2;
const AF_DIV_W = (AF_FRAME_CONTENT_W - AF_DIV_GAP * (AF_DIVISIONS - 1)) / AF_DIVISIONS;
const AF_ROOM_PAD = 8; // compact: p-2
const AF_CELL_GAP = 4; // gap-1
const AF_CELL_W = (AF_DIV_W - AF_ROOM_PAD * 2 - AF_CELL_GAP * (AF_COLS - 1)) / AF_COLS;
const CELL_H = 56; // h-14
const AF_DIV_HEADER_H = 32; // compact 이름(text-sm) + mb-3 — 박스 자체 padding(AF_ROOM_PAD)은 별도로 더한다
const AF_DIV_CONTENT_H = AF_ROWS * CELL_H + (AF_ROWS - 1) * AF_CELL_GAP;
const AF_DIV_BOX_H = AF_ROOM_PAD * 2 + AF_DIV_HEADER_H + AF_DIV_CONTENT_H;
const AF_DESK_H = 34; // ClassroomFrame mt-2 + 교탁 배지
const AF_CLASS_TITLE_H = 32; // h3 font-semibold mb-2
const AF_CLASS_FRAME_H = AF_DIV_BOX_H + AF_DESK_H;
const AF_CLASS_BLOCK_H = AF_CLASS_TITLE_H + AF_CLASS_FRAME_H;
const AF_CLASS_GAP = 24; // space-y-6

// 야간: ClassroomFrame 없이 RoomGrid만(옆에 나란히 아님, 위아래로 쌓임). NIGHT_ROOMS: 3행 x 4열.
const NI_ROOM_PAD = 16; // p-4(!compact)
const NI_HEADER_H = 36; // 이름 + "N행 x M열" 줄 — 박스 자체 padding(NI_ROOM_PAD)은 별도로 더한다
const NI_ROWS = 3;
const NI_COLS = 4;
const NI_CELL_GAP = 4;
const NI_CELL_W = 96;
const NI_CONTENT_H = NI_ROWS * CELL_H + (NI_ROWS - 1) * NI_CELL_GAP;
const NI_DESK_H = 40; // mt-3 + 교탁 배지(!hideTeacherDesk)
const NI_BOX_H = NI_ROOM_PAD * 2 + NI_HEADER_H + NI_CONTENT_H + NI_DESK_H;
const NI_GAP = 24; // space-y-6

const PANEL_PAD = 16; // p-4
const PANEL_HEADER_H = 24; // "미배정 학생 (N명)"
const PANEL_HELPER_H = 30; // 안내문 1줄 + mb-2
const PANEL_SEARCH_H = 26;
const PANEL_SEARCH_MB = 12; // mb-3
const PANEL_LIST_ROW_H = 44; // min-h-11
const PANEL_GROUP_LABEL_H = 18;
const PANEL_ROW_GAP = 8; // space-y-2
const PANEL_GROUP_GAP = 12; // space-y-3
const PANEL_EMPTY_H = 48; // "모든 학생이 배정되었습니다" padding 16 0 + 줄높이

const ACTION_BAR_W = 384; // sm:w-96
const ACTION_BAR_H = 60;

// --- 좌석 조회 헬퍼 ----------------------------------------------------------------
const afternoonAssignmentAt = (classNumber: number, division: number, row: number, col: number) => {
  const cls = SEAT_EDITOR.afternoon.classes.find((c) => c.classNumber === classNumber);
  return cls?.assignments.find((a) => a.seat.division === division && a.seat.row === row && a.seat.col === col) ?? null;
};

const nightAssignmentAt = (roomName: string, row: number, col: number) => {
  const room = SEAT_EDITOR.night.rooms.find((r) => r.name === roomName);
  return room?.assignments.find((a) => a.seat.row === row && a.seat.col === col) ?? null;
};

const unassignedOf = (session: "afternoon" | "night"): StudentLike[] =>
  session === "afternoon" ? SEAT_EDITOR.afternoon.unassigned : SEAT_EDITOR.night.unassigned;

// 미배정 패널의 실제 내용 높이 — UnassignedStudents.tsx 는 패널 자체가 내용만큼 늘어난다(SF-1).
const unassignedPanelHeight = (students: StudentLike[]): number => {
  if (students.length === 0) {
    return PANEL_PAD + PANEL_HEADER_H + PANEL_HELPER_H + PANEL_SEARCH_H + PANEL_SEARCH_MB + PANEL_EMPTY_H + PANEL_PAD;
  }
  const counts = new Map<number, number>();
  students.forEach((s) => counts.set(s.classNumber, (counts.get(s.classNumber) ?? 0) + 1));
  const groupsH = [...counts.values()].reduce(
    (sum, count) => sum + PANEL_GROUP_LABEL_H + count * PANEL_LIST_ROW_H + (count - 1) * PANEL_ROW_GAP + PANEL_GROUP_GAP,
    0,
  );
  return (
    PANEL_PAD +
    PANEL_HEADER_H +
    PANEL_HELPER_H +
    PANEL_SEARCH_H +
    PANEL_SEARCH_MB +
    groupsH -
    PANEL_GROUP_GAP + // 마지막 그룹 뒤엔 간격 없음
    PANEL_PAD
  );
};

// --- rect 함수 ----------------------------------------------------------------------
export type SeatEditorKey =
  | "sessionAfternoon"
  | "sessionNight"
  | "editorHeader"
  | "configButton"
  | "printButton"
  | "saveButton"
  | "unassignedPanel"
  | "unassignedSearch"
  | "actionBar"
  | "actionBarUnassign"
  | "actionBarCancel";

export type SeatEditorRectOptions = {
  /** actionBar 계열 rect 의 y 계산에 필요(호출부의 height prop 과 동일한 값을 넘긴다). */
  height?: number;
  /** unassignedPanel/unassignedSearch 높이 계산에 쓰인다. 생략하면 "afternoon"(4명) 기준. */
  session?: "afternoon" | "night";
};

export const seatEditorRect = (key: SeatEditorKey, opts: SeatEditorRectOptions = {}): Rect => {
  const headerRight = PAD_X + CONTENT_W;
  const saveX = headerRight - SAVE_BTN_W;
  const printX = saveX - BTN_GAP - PRINT_BTN_W;
  const configX = printX - BTN_GAP - CONFIG_BTN_W;
  const panelX = PAD_X + MAIN_W + PANEL_GAP;

  if (key === "actionBar" || key === "actionBarUnassign" || key === "actionBarCancel") {
    if (opts.height === undefined) {
      throw new Error(`seatEditorRect("${key}") requires opts.height (same value passed to <SeatEditorMock height>)`);
    }
    const barY = opts.height - 8 - ACTION_BAR_H;
    if (key === "actionBar") return { x: PAD_X, y: barY, w: ACTION_BAR_W, h: ACTION_BAR_H };
    if (key === "actionBarUnassign") return { x: PAD_X + ACTION_BAR_W - 8 - 84 - 8 - 60, y: barY + 8, w: 84, h: 44 };
    return { x: PAD_X + ACTION_BAR_W - 8 - 60, y: barY + 8, w: 60, h: 44 };
  }

  switch (key) {
    case "sessionAfternoon":
      return { x: PAD_X, y: SESSION_Y, w: SESSION_BTN_W, h: SESSION_BTN_H };
    case "sessionNight":
      return { x: PAD_X + SESSION_BTN_W + SESSION_BTN_GAP, y: SESSION_Y, w: SESSION_BTN_W, h: SESSION_BTN_H };
    case "editorHeader":
      return { x: PAD_X, y: HEADER_Y, w: CONTENT_W, h: HEADER_ROW_H };
    case "configButton":
      return { x: configX, y: HEADER_Y, w: CONFIG_BTN_W, h: HEADER_ROW_H };
    case "printButton":
      return { x: printX, y: HEADER_Y, w: PRINT_BTN_W, h: HEADER_ROW_H };
    case "saveButton":
      return { x: saveX, y: HEADER_Y, w: SAVE_BTN_W, h: HEADER_ROW_H };
    case "unassignedPanel":
      return { x: panelX, y: GRID_Y, w: PANEL_W, h: unassignedPanelHeight(unassignedOf(opts.session ?? "afternoon")) };
    default: {
      // unassignedSearch
      return { x: panelX + PANEL_PAD, y: GRID_Y + PANEL_PAD + PANEL_HEADER_H + PANEL_HELPER_H, w: PANEL_W - PANEL_PAD * 2, h: PANEL_SEARCH_H };
    }
  }
};

// roomId 접두어만으로 좌표를 정한다(afternoon/night 은 동시에 화면에 나오지 않는다).
export const seatCellRect = (roomId: string, row: number, col: number): Rect => {
  if (roomId.startsWith("afternoon:")) {
    const [, classNumberStr, divisionStr] = roomId.split(":");
    const classNumber = Number(classNumberStr);
    const division = Number(divisionStr);
    const classes = SEAT_EDITOR.afternoon.classes.map((c) => c.classNumber).sort((a, b) => a - b);
    const classIndex = classes.indexOf(classNumber);
    const frameY = GRID_Y + classIndex * (AF_CLASS_BLOCK_H + AF_CLASS_GAP) + AF_CLASS_TITLE_H;
    const frameX = PAD_X + FRAME_SIDE_W + FRAME_SIDE_GAP;
    const divX = frameX + (division - 1) * (AF_DIV_W + AF_DIV_GAP);
    // 렌더의 SeatCellView 와 동일: 분단 박스 padding(AF_ROOM_PAD) + 헤더(AF_DIV_HEADER_H) 이후부터 좌석.
    const contentY = frameY + AF_ROOM_PAD + AF_DIV_HEADER_H;
    return {
      x: divX + AF_ROOM_PAD + (col - 1) * (AF_CELL_W + AF_CELL_GAP),
      y: contentY + (row - 1) * (CELL_H + AF_CELL_GAP),
      w: AF_CELL_W,
      h: CELL_H,
    };
  }

  const roomName = roomId.slice("night:".length);
  const roomIndex = SEAT_EDITOR.night.rooms.findIndex((r) => r.name === roomName);
  const roomY = GRID_Y + Math.max(roomIndex, 0) * (NI_BOX_H + NI_GAP);
  const contentY = roomY + NI_ROOM_PAD + NI_HEADER_H;
  return {
    x: PAD_X + NI_ROOM_PAD + (col - 1) * (NI_CELL_W + NI_CELL_GAP),
    y: contentY + (row - 1) * (CELL_H + NI_CELL_GAP),
    w: NI_CELL_W,
    h: CELL_H,
  };
};

// --- 좌석 셀 ---------------------------------------------------------------------------
const SeatCellView: React.FC<{
  x: number;
  y: number;
  w: number;
  student: StudentLike | null;
  row: number;
  col: number;
  isSelected: boolean;
  isHover: boolean;
  isGhost: boolean;
}> = ({ x, y, w, student, row, col, isSelected, isHover, isGhost }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: CELL_H,
      borderRadius: 6,
      border: `1px solid ${isHover ? tw.blue[400] : tw.gray[200]}`,
      borderStyle: isHover ? "dashed" : "solid",
      background: isHover ? tw.blue[50] : student ? tw.white : tw.gray[50],
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: isSelected ? `0 0 0 1px ${tw.white}, 0 0 0 3px ${tw.blue[500]}` : undefined,
    }}
  >
    {student ? (
      <span style={{ opacity: isGhost ? 0.4 : 1, textAlign: "center", lineHeight: 1.2 }}>
        <span style={{ display: "block", fontSize: 10, color: tw.gray[400], whiteSpace: "nowrap" }}>
          {student.classNumber}-{student.number}
        </span>
        <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: tw.gray[800], whiteSpace: "nowrap" }}>
          {student.name}
        </span>
      </span>
    ) : (
      <span style={{ fontSize: 10, color: tw.gray[300], whiteSpace: "nowrap" }}>
        {row}-{col}
      </span>
    )}
  </div>
);

const CorridorLabel: React.FC<{ x: number; y: number; h: number; text: string }> = ({ x, y, h, text }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: FRAME_SIDE_W,
      height: h,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      writingMode: "vertical-rl",
      fontSize: 11,
      color: tw.slate[400],
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);

export type SeatEditorMockProps = {
  width: number;
  height: number;
  session: "afternoon" | "night";
  sessionPressAt?: { session: "afternoon" | "night"; at: number };
  selectedSeat?: SeatCellId | null;
  dragging?: SeatDragSource;
  hoverSeat?: SeatCellId | null;
  unassignedHover?: boolean;
  configPressAt?: number;
  printPressAt?: number;
  savePressAt?: number;
  dirtyCount?: number;
  saving?: boolean;
};

export const SeatEditorMock: React.FC<SeatEditorMockProps> = ({
  width,
  height,
  session,
  sessionPressAt,
  selectedSeat,
  dragging,
  hoverSeat,
  unassignedHover,
  configPressAt,
  printPressAt,
  savePressAt,
  dirtyCount = 0,
  saving = false,
}) => {
  const frame = useCurrentFrame();
  const headerRight = PAD_X + CONTENT_W;
  const saveX = headerRight - SAVE_BTN_W;
  const printX = saveX - BTN_GAP - PRINT_BTN_W;
  const configX = printX - BTN_GAP - CONFIG_BTN_W;
  const panelX = PAD_X + MAIN_W + PANEL_GAP;

  const isGhostSeat = (roomId: string, row: number, col: number) =>
    dragging?.type === "seat" && dragging.roomId === roomId && dragging.row === row && dragging.col === col;
  const isSelected = (roomId: string, row: number, col: number) =>
    Boolean(selectedSeat && selectedSeat.roomId === roomId && selectedSeat.row === row && selectedSeat.col === col);
  const isHover = (roomId: string, row: number, col: number) =>
    Boolean(hoverSeat && hoverSeat.roomId === roomId && hoverSeat.row === row && hoverSeat.col === col);

  const saveLabel = saving ? "저장 중..." : dirtyCount > 0 ? `저장 (${dirtyCount}개 교실 변경)` : "저장";

  const unassigned = unassignedOf(session);
  const panelH = unassignedPanelHeight(unassigned);
  const grouped = new Map<number, StudentLike[]>();
  [...unassigned]
    .sort((a, b) => a.classNumber - b.classNumber || a.number - b.number)
    .forEach((s) => {
      const arr = grouped.get(s.classNumber) ?? [];
      arr.push(s);
      grouped.set(s.classNumber, arr);
    });

  let selectedInfo: { roomLabel: string; student: StudentLike } | null = null;
  if (selectedSeat) {
    if (selectedSeat.roomId.startsWith("afternoon:")) {
      const [, classNumberStr, divisionStr] = selectedSeat.roomId.split(":");
      const found = afternoonAssignmentAt(Number(classNumberStr), Number(divisionStr), selectedSeat.row, selectedSeat.col);
      if (found) selectedInfo = { roomLabel: `${GRADE}-${classNumberStr}반 분단${divisionStr}`, student: found.student };
    } else {
      const roomName = selectedSeat.roomId.slice("night:".length);
      const found = nightAssignmentAt(roomName, selectedSeat.row, selectedSeat.col);
      if (found) selectedInfo = { roomLabel: roomName, student: found.student };
    }
  }

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height, background: tw.gray[50], fontFamily: FONT, overflow: "hidden" }}>
      {/* 세션 버튼 2개(page.tsx 82-99행) — 회색 pill 이 아니라 독립 버튼 */}
      {(["afternoon", "night"] as const).map((s, i) => {
        const active = s === session;
        const pressing = sessionPressAt && sessionPressAt.session === s ? sessionPressAt.at : null;
        return (
          <div
            key={s}
            style={{
              position: "absolute",
              left: PAD_X + i * (SESSION_BTN_W + SESSION_BTN_GAP),
              top: SESSION_Y,
              width: SESSION_BTN_W,
              height: SESSION_BTN_H,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 500,
              background: active ? tw.blue[600] : tw.gray[100],
              color: active ? tw.white : tw.gray[600],
              whiteSpace: "nowrap",
              boxSizing: "border-box",
              scale: String(pressScale(frame, pressing)),
            }}
          >
            {s === "afternoon" ? "오후 자율학습" : "야간 자율학습"}
          </div>
        );
      })}

      {/* 좌석 편집 헤더 */}
      <div style={{ position: "absolute", left: PAD_X, top: HEADER_Y, width: CONTENT_W, height: HEADER_ROW_H, fontSize: 20, fontWeight: 700, color: tw.gray[900], display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
        좌석 편집
      </div>
      {session === "afternoon" ? (
        <div
          style={{
            position: "absolute",
            left: configX,
            top: HEADER_Y,
            width: CONFIG_BTN_W,
            height: HEADER_ROW_H,
            borderRadius: 6,
            border: `1px solid ${tw.gray[300]}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: tw.gray[700],
            whiteSpace: "nowrap",
            boxSizing: "border-box",
            scale: String(pressScale(frame, configPressAt ?? null)),
          }}
        >
          교실 구조 설정
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: printX,
          top: HEADER_Y,
          width: PRINT_BTN_W,
          height: HEADER_ROW_H,
          borderRadius: 6,
          border: `1px solid ${tw.gray[300]}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: tw.gray[700],
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          scale: String(pressScale(frame, printPressAt ?? null)),
        }}
      >
        출력
      </div>
      <div
        style={{
          position: "absolute",
          left: saveX,
          top: HEADER_Y,
          width: SAVE_BTN_W,
          height: HEADER_ROW_H,
          borderRadius: 6,
          background: tw.blue[600],
          opacity: dirtyCount === 0 && !saving ? 0.5 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: tw.white,
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          scale: String(pressScale(frame, savePressAt ?? null)),
        }}
      >
        {saveLabel}
      </div>

      {/* 학급 격자 */}
      {session === "afternoon"
        ? SEAT_EDITOR.afternoon.classes.map((cls, classIndex) => {
            const classY = GRID_Y + classIndex * (AF_CLASS_BLOCK_H + AF_CLASS_GAP);
            const frameY = classY + AF_CLASS_TITLE_H;
            const frameX = PAD_X + FRAME_SIDE_W + FRAME_SIDE_GAP;
            const labels = corridorLabels(cls.config.corridorSide);
            return (
              <React.Fragment key={cls.classNumber}>
                <div style={{ position: "absolute", left: PAD_X, top: classY, width: MAIN_W, height: AF_CLASS_TITLE_H, fontSize: 16, fontWeight: 600, color: tw.gray[700], display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
                  {GRADE}-{cls.classNumber}반
                </div>
                <CorridorLabel x={PAD_X} y={frameY} h={AF_DIV_BOX_H} text={labels.left} />
                <CorridorLabel x={PAD_X + FRAME_SIDE_W + FRAME_SIDE_GAP + AF_FRAME_CONTENT_W + FRAME_SIDE_GAP} y={frameY} h={AF_DIV_BOX_H} text={labels.right} />
                {Array.from({ length: AF_DIVISIONS }, (_, di) => {
                  const division = di + 1;
                  const roomId = afternoonRoomId(cls.classNumber, division);
                  const divX = frameX + di * (AF_DIV_W + AF_DIV_GAP);
                  return (
                    <div key={roomId} style={{ position: "absolute", left: divX, top: frameY, width: AF_DIV_W, height: AF_DIV_BOX_H, background: tw.white, borderRadius: 8, border: `1px solid ${tw.gray[200]}`, boxSizing: "border-box" }}>
                      <div style={{ position: "absolute", left: AF_ROOM_PAD, top: AF_ROOM_PAD, fontSize: 13, fontWeight: 600, color: tw.gray[800], whiteSpace: "nowrap" }}>분단{division}</div>
                      {Array.from({ length: AF_ROWS }, (_, ri) =>
                        Array.from({ length: AF_COLS }, (_, ci) => {
                          const row = ri + 1;
                          const col = ci + 1;
                          const assignment = afternoonAssignmentAt(cls.classNumber, division, row, col) as AfternoonSeatAssignment | null;
                          return (
                            <SeatCellView
                              key={`${row}-${col}`}
                              x={AF_ROOM_PAD + ci * (AF_CELL_W + AF_CELL_GAP)}
                              y={AF_ROOM_PAD + AF_DIV_HEADER_H + ri * (CELL_H + AF_CELL_GAP)}
                              w={AF_CELL_W}
                              student={assignment?.student ?? null}
                              row={row}
                              col={col}
                              isSelected={isSelected(roomId, row, col)}
                              isHover={isHover(roomId, row, col)}
                              isGhost={Boolean(isGhostSeat(roomId, row, col))}
                            />
                          );
                        }),
                      )}
                    </div>
                  );
                })}
                <div
                  style={{
                    position: "absolute",
                    left: PAD_X,
                    top: frameY + AF_DIV_BOX_H + 8,
                    width: MAIN_W,
                    textAlign: "center",
                    fontSize: 11,
                    color: tw.gray[400],
                    background: tw.gray[50],
                    borderTop: `1px dashed ${tw.gray[300]}`,
                    padding: "6px 0",
                    whiteSpace: "nowrap",
                  }}
                >
                  교탁
                </div>
              </React.Fragment>
            );
          })
        : SEAT_EDITOR.night.rooms.map((room, roomIndex) => {
            const roomY = GRID_Y + roomIndex * (NI_BOX_H + NI_GAP);
            const roomId = nightRoomId(room.name);
            return (
              <div key={room.name} style={{ position: "absolute", left: PAD_X, top: roomY, width: MAIN_W, height: NI_BOX_H, background: tw.white, borderRadius: 8, border: `1px solid ${tw.gray[200]}`, boxSizing: "border-box" }}>
                <div style={{ position: "absolute", left: NI_ROOM_PAD, top: NI_ROOM_PAD, width: MAIN_W - NI_ROOM_PAD * 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: tw.gray[800], whiteSpace: "nowrap" }}>{room.name}</span>
                  <span style={{ fontSize: 12, color: tw.gray[400], whiteSpace: "nowrap" }}>
                    {room.config.rows}행 x {room.config.cols}열
                  </span>
                </div>
                {Array.from({ length: NI_ROWS }, (_, ri) =>
                  Array.from({ length: NI_COLS }, (_, ci) => {
                    const row = ri + 1;
                    const col = ci + 1;
                    const assignment = nightAssignmentAt(room.name, row, col) as NightSeatAssignment | null;
                    return (
                      <SeatCellView
                        key={`${row}-${col}`}
                        x={NI_ROOM_PAD + ci * (NI_CELL_W + NI_CELL_GAP)}
                        y={NI_ROOM_PAD + NI_HEADER_H + ri * (CELL_H + NI_CELL_GAP)}
                        w={NI_CELL_W}
                        student={assignment?.student ?? null}
                        row={row}
                        col={col}
                        isSelected={isSelected(roomId, row, col)}
                        isHover={isHover(roomId, row, col)}
                        isGhost={Boolean(isGhostSeat(roomId, row, col))}
                      />
                    );
                  }),
                )}
                <div style={{ position: "absolute", left: NI_ROOM_PAD, right: NI_ROOM_PAD, top: NI_ROOM_PAD + NI_HEADER_H + NI_CONTENT_H + 12, textAlign: "center" }}>
                  <span style={{ display: "inline-block", background: tw.gray[200], color: tw.gray[500], fontSize: 12, padding: "4px 24px", borderRadius: 4, whiteSpace: "nowrap" }}>
                    교탁
                  </span>
                </div>
              </div>
            );
          })}

      {/* 미배정 학생 패널 — 내용만큼 늘어난다(SF-1) */}
      <div
        style={{
          position: "absolute",
          left: panelX,
          top: GRID_Y,
          width: PANEL_W,
          height: panelH,
          borderRadius: 8,
          boxSizing: "border-box",
          padding: PANEL_PAD,
          background: unassignedHover ? tw.red[50] : tw.white,
          border: `1px solid ${unassignedHover ? tw.red[300] : tw.gray[200]}`,
          boxShadow: unassignedHover ? `0 0 0 2px ${tw.red[200]}` : undefined,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: tw.gray[800], whiteSpace: "nowrap" }}>
          미배정 학생 <span style={{ fontSize: 13, fontWeight: 400, color: tw.gray[400] }}>({unassigned.length}명)</span>
        </div>
        <div style={{ fontSize: 11, color: tw.gray[400], marginTop: 4, marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          좌석을 탭하거나 여기로 끌어오면 배정이 해제됩니다
        </div>
        <div style={{ width: "100%", height: PANEL_SEARCH_H, marginBottom: PANEL_SEARCH_MB, border: `1px solid ${tw.gray[200]}`, borderRadius: 4, boxSizing: "border-box", display: "flex", alignItems: "center", padding: "0 8px", fontSize: 12, color: tw.gray[400], whiteSpace: "nowrap" }}>
          이름 또는 반-번호 검색
        </div>
        {unassigned.length === 0 ? (
          <div style={{ textAlign: "center", padding: "16px 0", fontSize: 12, color: tw.gray[400] }}>모든 학생이 배정되었습니다</div>
        ) : (
          [...grouped.keys()].sort((a, b) => a - b).map((cn, gi, arr) => {
            const rows = grouped.get(cn) ?? [];
            const groupY = gi === 0 ? 0 : arr.slice(0, gi).reduce((sum, prevCn) => {
              const prevRows = grouped.get(prevCn) ?? [];
              return sum + PANEL_GROUP_LABEL_H + prevRows.length * PANEL_LIST_ROW_H + (prevRows.length - 1) * PANEL_ROW_GAP + PANEL_GROUP_GAP;
            }, 0);
            return (
              <div key={cn} style={{ position: "absolute", left: PANEL_PAD, top: PANEL_PAD + PANEL_HEADER_H + PANEL_HELPER_H + PANEL_SEARCH_H + PANEL_SEARCH_MB + groupY, width: PANEL_W - PANEL_PAD * 2 }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: tw.gray[400], marginBottom: 4, whiteSpace: "nowrap" }}>{cn}반</div>
                {rows.map((s, ri) => {
                  const isDim = dragging?.type === "student" && dragging.studentId === s.id;
                  return (
                    <div
                      key={s.id}
                      style={{
                        position: "absolute",
                        left: 0,
                        top: PANEL_GROUP_LABEL_H + ri * (PANEL_LIST_ROW_H + PANEL_ROW_GAP),
                        width: PANEL_W - PANEL_PAD * 2,
                        height: PANEL_LIST_ROW_H,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "0 8px",
                        borderRadius: 4,
                        border: `1px solid ${tw.gray[200]}`,
                        background: tw.white,
                        boxSizing: "border-box",
                        opacity: isDim ? 0.4 : 1,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ color: tw.gray[400], minWidth: 32, whiteSpace: "nowrap" }}>
                        {s.classNumber}-{s.number}
                      </span>
                      <span style={{ fontWeight: 500, color: tw.gray[800], whiteSpace: "nowrap" }}>{s.name}</span>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* 선택 좌석 액션바 */}
      {selectedInfo ? (
        <div
          style={{
            position: "absolute",
            left: PAD_X,
            top: height - 8 - ACTION_BAR_H,
            width: ACTION_BAR_W,
            height: ACTION_BAR_H,
            background: tw.white,
            border: `1px solid ${tw.blue[300]}`,
            borderRadius: 8,
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            boxSizing: "border-box",
            padding: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: tw.gray[800], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {selectedInfo.roomLabel} · {selectedInfo.student.classNumber}-{selectedInfo.student.number} {selectedInfo.student.name}
          </span>
          <div style={{ minHeight: 44, width: 84, borderRadius: 6, background: tw.red[600], color: tw.white, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap", boxSizing: "border-box" }}>
            배정 해제
          </div>
          <div style={{ minHeight: 44, width: 60, borderRadius: 6, border: `1px solid ${tw.gray[300]}`, color: tw.gray[700], fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap", boxSizing: "border-box" }}>
            취소
          </div>
        </div>
      ) : null}
    </div>
  );
};
