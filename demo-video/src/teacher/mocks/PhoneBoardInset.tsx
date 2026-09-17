// 담임 장면들이 함께 쓰는 확대 인셋 — 흰 카드(InsetCard)와 그 안에 넣는 폰 출석부(1-2반 교실 카드).
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { FONT } from "../../fonts";
import {
  ABSENCE_REQUESTS,
  GRADE,
  ME,
  SUPERVISOR_SEPT,
  TODAY,
  TODAY_LABEL,
} from "../../app-mocks/data";
import {
  AttendanceBoardMock,
  buildAfternoonGroups,
  countsOf,
  groupRect,
  seatRect,
  type AttendanceBoardProps,
  type SeatState,
} from "../../app-mocks/AttendanceBoardMock";
import { PHONE_BODY, type Rect } from "../../app-mocks/layout";
import { colors } from "../../theme";

export const INSET_HEADER_H = 46;
export const INSET_PAD = 12;

// 주간표(약 555px)가 본문 높이(514px)보다 길어 "총 12명"까지 보이도록 페이지를 내리는 양 —
// HomeroomWeekly 가 내려 두고 HomeroomMonthly 가 그 화면에서 시작한다.
export const WEEKLY_PAGE_SCROLL = 66;

const CROP_MARGIN = 6;
const HOMEROOM_GROUP_INDEX = 1;

export const InsetCard: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  from: number;
  to: number;
  title: string;
  caption: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ x, y, w, h, from, to, title, caption, icon, children }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const enter = tween(frame, [from, from + 12], [0, 1]);
  const exit = tween(frame, [to - 6, to], [1, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
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
        {icon}
        <span style={{ fontSize: 20, fontWeight: 700, color: colors.gray800 }}>{title}</span>
        <span style={{ fontSize: 18, fontWeight: 500, color: colors.gray500 }}>{caption}</span>
      </div>
      {children}
    </div>
  );
};

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

const PhoneIcon: React.FC = () => (
  <div style={{ width: 14, height: 22, borderRadius: 4, border: `2px solid ${colors.gray700}`, boxSizing: "border-box" }} />
);

export const PhoneBoardInset: React.FC<{
  x: number;
  y: number;
  scale: number;
  from: number;
  to: number;
  visualFor: (studentId: number) => SeatState;
  caption: string;
}> = ({ x, y, scale, from, to, visualFor, caption }) => {
  const props = insetBoardProps(visualFor);
  const crop = insetCrop(props);
  const size = boardInsetSize(visualFor, scale);
  return (
    <InsetCard
      x={x}
      y={y}
      w={size.w}
      h={size.h}
      from={from}
      to={to}
      title="휴대폰 출석부"
      caption={caption}
      icon={<PhoneIcon />}
    >
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
    </InsetCard>
  );
};
