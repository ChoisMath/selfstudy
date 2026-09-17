// src/components/student/SeatCheckCard.tsx + src/components/seats/StudentSeatGrid.tsx 이식.
// 오후자습은 담임 편 자리(app-mocks/data.ts AFTERNOON_CLASSROOMS)를 그대로 써 ClassroomFrameMock(계획 2)으로
// 복도/창문/교탁을 그리고, 야간자습은 분단 없는 단일 방(NIGHT_ROOMS[0])이라 교탁 없이 격자만 그린다
// (앱 SeatCheckCard.tsx 60-76행: kind==="classroom"일 때만 ClassroomFrame, "교탁" 캡션도 kind==="room"이면서
// tab==="afternoon"일 때뿐이라 야간에는 표시되지 않는다).
import React from "react";
import { useCurrentFrame } from "remotion";
import { textWidth } from "../../app-mocks/AttendanceHeaderMock";
import { ClassroomFrameMock, classroomFrameMetrics } from "../../app-mocks/ClassroomFrameMock";
import { AFTERNOON_CLASSROOMS, NIGHT_ROOMS, STUDENTS, type AfternoonClassroom, type Student } from "../../app-mocks/data";
import type { Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";
import { ME_STUDENT, MY_SEAT } from "../data";

export type SeatCheckTab = "afternoon" | "night";

const PAD = 16; // 82행 p-4
const HEADER_H = 44; // 86-98행 min-h-11 탭
const HEADER_MB = 12; // 83행 mb-3
const TITLE_H = 20; // 54행 items-baseline 줄(text-sm/text-xs 중 큰 쪽)
const TITLE_MB = 4; // 54행 mb-1
const SUBTITLE_H = 16; // 58행 text-xs
const SUBTITLE_MB = 12; // 58행 mb-3
const SEAT_H = 44; // StudentSeatGrid.tsx min-h-11
const SEAT_ROW_MB = 4; // StudentSeatGrid.tsx 29행 marginBottom(모든 행에 적용 — 마지막 행도 예외 없음)
const SEAT_GAP = 4; // StudentSeatGrid.tsx 26행 gap-1
const DIVISION_GAP = 4; // SeatCheckCard.tsx 62행 분단 사이 grid gap-1

const SEAT_TABS: { tab: SeatCheckTab; label: string }[] = [
  { tab: "afternoon", label: "오후자습" },
  { tab: "night", label: "야간자습" },
];

const AFTERNOON_CLASSROOM: AfternoonClassroom = (() => {
  const found = AFTERNOON_CLASSROOMS.find((c) => c.classNumber === ME_STUDENT.classNumber);
  if (!found) throw new Error(`AFTERNOON_CLASSROOMS에 ${ME_STUDENT.classNumber}반 없음`);
  return found;
})();
const NIGHT_ROOM = NIGHT_ROOMS[0];

// student/data.ts의 비export 계산과 같은 규칙(분단1→분단3, 분단 안 행→열, 번호 1~12) — 그 반 학생 전원의 자리를
// 구해야 해서 이 파일에도 같은 공식을 둔다(1인분만 계산하는 student/data.ts와 달리 이쪽은 반 전체가 필요).
const afternoonSeatOf = (seatNumber: number) => {
  const perDivision = AFTERNOON_CLASSROOM.rowsPerDivision * AFTERNOON_CLASSROOM.colsPerDivision;
  const division = Math.floor((seatNumber - 1) / perDivision) + 1;
  const indexInDivision = (seatNumber - 1) % perDivision;
  return {
    division,
    row: Math.floor(indexInDivision / AFTERNOON_CLASSROOM.colsPerDivision) + 1,
    col: (indexInDivision % AFTERNOON_CLASSROOM.colsPerDivision) + 1,
  };
};
const nightSeatOf = (seatNumber: number) => ({
  row: Math.floor((seatNumber - 1) / NIGHT_ROOM.cols) + 1,
  col: ((seatNumber - 1) % NIGHT_ROOM.cols) + 1,
});

// 명단: 오후는 실제 담임반 그대로(3반 12명). 야간은 student/data.ts MY_SEAT.night가 이미 NIGHT_ROOMS[0]에
// ME_STUDENT(3반)를 배정하는 가상 설정(교사 편 명단은 1반, task-1 보고서에 flag된 서사적 선택)이라 이 카드도
// 같은 설정을 따라 3반 학생 12명을 같은 방에 채운다.
const CLASSMATES: Student[] = STUDENTS.filter((s) => s.classNumber === ME_STUDENT.classNumber);

type AfternoonGeometry = {
  kind: "afternoon";
  innerW: number;
  seatTop: number;
  sideLabelWidth: number;
  columnGap: number;
  middleW: number;
  middleX: number;
  rightLabelX: number;
  divisionW: number;
  seatW: number;
  rowsH: number;
  frameH: number;
  cardHeight: number;
};
type NightGeometry = {
  kind: "night";
  innerW: number;
  seatTop: number;
  seatW: number;
  gridH: number;
  cardHeight: number;
};

const geometry = (width: number, tab: SeatCheckTab): AfternoonGeometry | NightGeometry => {
  const innerW = width - PAD * 2;
  const seatTop = PAD + HEADER_H + HEADER_MB + TITLE_H + TITLE_MB + SUBTITLE_H + SUBTITLE_MB;

  if (tab === "afternoon") {
    const metrics = classroomFrameMetrics("screen", width);
    const middleW = innerW - (metrics.sideLabelWidth + metrics.columnGap) * 2;
    const divisions = AFTERNOON_CLASSROOM.divisions;
    const divisionW = (middleW - DIVISION_GAP * (divisions - 1)) / divisions;
    const seatW = (divisionW - SEAT_GAP * (AFTERNOON_CLASSROOM.colsPerDivision - 1)) / AFTERNOON_CLASSROOM.colsPerDivision;
    const rowsH = AFTERNOON_CLASSROOM.rowsPerDivision * (SEAT_H + SEAT_ROW_MB);
    const frameH = rowsH + metrics.deskBlockHeight;
    const middleX = PAD + metrics.sideLabelWidth + metrics.columnGap;
    return {
      kind: "afternoon",
      innerW,
      seatTop,
      sideLabelWidth: metrics.sideLabelWidth,
      columnGap: metrics.columnGap,
      middleW,
      middleX,
      rightLabelX: middleX + middleW + metrics.columnGap,
      divisionW,
      seatW,
      rowsH,
      frameH,
      cardHeight: seatTop + frameH + PAD,
    };
  }

  const seatW = (innerW - SEAT_GAP * (NIGHT_ROOM.cols - 1)) / NIGHT_ROOM.cols;
  const gridH = NIGHT_ROOM.rows * (SEAT_H + SEAT_ROW_MB);
  return { kind: "night", innerW, seatTop, seatW, gridH, cardHeight: seatTop + gridH + PAD };
};

export const seatCheckCardHeight = (width: number, tab: SeatCheckTab) => geometry(width, tab).cardHeight;

const tabWidth = (label: string) => 24 + textWidth(label, 14, 500); // px-3(12+12)

export const seatCheckRect = (
  key: "tabs" | "mySeat" | "title" | "corridor",
  width: number,
  tab: SeatCheckTab,
): Rect => {
  const g = geometry(width, tab);

  if (key === "title") {
    const title = tab === "afternoon" ? MY_SEAT.afternoon.title : MY_SEAT.night.title;
    return { x: PAD, y: PAD + HEADER_H + HEADER_MB, w: textWidth(title, 14, 700), h: TITLE_H };
  }

  if (key === "tabs") {
    const tabsW = SEAT_TABS.reduce((sum, t, i) => sum + tabWidth(t.label) + (i > 0 ? 4 : 0), 0);
    return { x: PAD + g.innerW - tabsW, y: PAD, w: tabsW, h: HEADER_H };
  }

  if (key === "corridor") {
    if (g.kind !== "afternoon") {
      throw new Error("corridor는 오후자습(교실+ClassroomFrame)에만 있다 — 야간실은 분단 없는 단일 방");
    }
    // AFTERNOON_CLASSROOMS 는 모두 corridorSide "right" → corridorLabels("right").right === "복도".
    return { x: g.rightLabelX, y: g.seatTop, w: g.sideLabelWidth, h: g.rowsH };
  }

  // mySeat
  if (g.kind === "afternoon") {
    const { division, row, col } = afternoonSeatOf(ME_STUDENT.number);
    return {
      x: g.middleX + (division - 1) * (g.divisionW + DIVISION_GAP) + (col - 1) * (g.seatW + SEAT_GAP),
      y: g.seatTop + (row - 1) * (SEAT_H + SEAT_ROW_MB),
      w: g.seatW,
      h: SEAT_H,
    };
  }
  const { row, col } = nightSeatOf(ME_STUDENT.number);
  return {
    x: PAD + (col - 1) * (g.seatW + SEAT_GAP),
    y: g.seatTop + (row - 1) * (SEAT_H + SEAT_ROW_MB),
    w: g.seatW,
    h: SEAT_H,
  };
};

const SeatCell: React.FC<{ student: Student; isMine: boolean; rect: { x: number; y: number; w: number; h: number } }> = ({
  student,
  isMine,
  rect,
}) => (
  <div
    style={{
      position: "absolute",
      left: rect.x,
      top: rect.y,
      width: rect.w,
      height: rect.h,
      boxSizing: "border-box",
      borderRadius: 6,
      border: `1px solid ${isMine ? tw.blue[700] : tw.gray[200]}`,
      background: isMine ? tw.blue[600] : tw.white,
      color: isMine ? tw.white : tw.gray[800],
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      whiteSpace: "nowrap",
    }}
  >
    <span style={{ fontSize: 10, color: isMine ? tw.blue[100] : tw.gray[400] }}>
      {student.classNumber}-{student.number}
    </span>
    <span style={{ fontSize: 12, fontWeight: isMine ? 700 : 400, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
      {student.name}
    </span>
  </div>
);

export type SeatCheckCardMockProps = { width: number; tab: SeatCheckTab; tabPressAt?: number };

export const SeatCheckCardMock: React.FC<SeatCheckCardMockProps> = ({ width, tab, tabPressAt }) => {
  const frame = useCurrentFrame();
  const g = geometry(width, tab);
  const title = tab === "afternoon" ? MY_SEAT.afternoon.title : MY_SEAT.night.title;
  const mySeatLabel = tab === "afternoon" ? MY_SEAT.afternoon.label : MY_SEAT.night.label;
  // 탭은 둘뿐이라 누르는 애니메이션은 항상 "지금 보이지 않는 쪽"(다음에 눌러 전환할 탭)에 붙인다.
  const pressingTab: SeatCheckTab | null = tabPressAt !== undefined ? (tab === "afternoon" ? "night" : "afternoon") : null;

  let tabX = PAD + g.innerW - SEAT_TABS.reduce((sum, t, i) => sum + tabWidth(t.label) + (i > 0 ? 4 : 0), 0);

  return (
    <div
      style={{
        position: "relative",
        width,
        height: g.cardHeight,
        boxSizing: "border-box",
        background: tw.white,
        border: `1px solid ${tw.gray[200]}`,
        borderRadius: 8,
        fontFamily: FONT,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: PAD,
          top: PAD,
          height: HEADER_H,
          display: "flex",
          alignItems: "center",
          fontSize: 14,
          fontWeight: 500,
          color: tw.gray[600],
          whiteSpace: "nowrap",
        }}
      >
        좌석 확인
      </span>

      {SEAT_TABS.map((t) => {
        const w = tabWidth(t.label);
        const x = tabX;
        tabX += w + 4;
        const active = t.tab === tab;
        const pressing = pressingTab === t.tab ? tabPressAt ?? null : null;
        return (
          <div
            key={t.tab}
            style={{
              position: "absolute",
              left: x,
              top: PAD,
              width: w,
              height: HEADER_H,
              boxSizing: "border-box",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: "nowrap",
              background: active ? tw.blue[600] : tw.gray[100],
              color: active ? tw.white : tw.gray[600],
            }}
          >
            <span style={{ scale: String(pressScale(frame, pressing)) }}>{t.label}</span>
          </div>
        );
      })}

      <span
        style={{
          position: "absolute",
          left: PAD,
          top: PAD + HEADER_H + HEADER_MB,
          height: TITLE_H,
          display: "flex",
          alignItems: "center",
          fontSize: 14,
          fontWeight: 700,
          color: tw.gray[800],
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
      <span
        style={{
          position: "absolute",
          right: PAD,
          top: PAD + HEADER_H + HEADER_MB,
          height: TITLE_H,
          display: "flex",
          alignItems: "center",
          fontSize: 12,
          color: tw.gray[400],
          whiteSpace: "nowrap",
        }}
      >
        {CLASSMATES.length}석
      </span>

      <span
        style={{
          position: "absolute",
          left: PAD,
          top: PAD + HEADER_H + HEADER_MB + TITLE_H + TITLE_MB,
          height: SUBTITLE_H,
          display: "flex",
          alignItems: "center",
          fontSize: 12,
          color: tw.blue[700],
          whiteSpace: "nowrap",
        }}
      >
        내 자리: {mySeatLabel}
      </span>

      {g.kind === "afternoon" ? (
        <div style={{ position: "absolute", left: PAD, top: g.seatTop, width: g.innerW }}>
          <ClassroomFrameMock corridorSide="right" variant="screen" viewportWidth={width}>
            <div style={{ position: "relative", width: g.middleW, height: g.rowsH }}>
              {CLASSMATES.map((student) => {
                const { division, row, col } = afternoonSeatOf(student.number);
                const x = (division - 1) * (g.divisionW + DIVISION_GAP) + (col - 1) * (g.seatW + SEAT_GAP);
                const y = (row - 1) * (SEAT_H + SEAT_ROW_MB);
                return (
                  <SeatCell
                    key={student.id}
                    student={student}
                    isMine={student.id === ME_STUDENT.id}
                    rect={{ x, y, w: g.seatW, h: SEAT_H }}
                  />
                );
              })}
            </div>
          </ClassroomFrameMock>
        </div>
      ) : (
        <div style={{ position: "absolute", left: PAD, top: g.seatTop, width: g.innerW, height: g.gridH }}>
          {CLASSMATES.map((student) => {
            const { row, col } = nightSeatOf(student.number);
            const x = (col - 1) * (g.seatW + SEAT_GAP);
            const y = (row - 1) * (SEAT_H + SEAT_ROW_MB);
            return (
              <SeatCell
                key={student.id}
                student={student}
                isMine={student.id === ME_STUDENT.id}
                rect={{ x, y, w: g.seatW, h: SEAT_H }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
