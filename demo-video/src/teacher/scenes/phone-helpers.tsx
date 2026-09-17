// 교사 편 폰 장면 10개(Login·AttendanceTour·SeatTap·CopySession·SeatColors·LongPress·WeeklyInfo·AbsenceTab·BulkApprove)가
// 함께 쓰는 출석부 기본값, 좌표 도우미, 주석·커서 장치. 장면끼리 import 하지 않고 모두 여기서 가져온다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { Cursor } from "../../components/Cursor";
import { PHONE_CROP, PHONE_X, phoneAbs, phoneLeftLabelGap, phoneRectAbs } from "../../components/phone";
import { FONT } from "../../fonts";
import { colors, WIDTH } from "../../theme";
import {
  baseVisual,
  boardPoint,
  boardRect,
  buildAfternoonGroups,
  countsOf,
  seatRect,
  type AttendanceBoardProps,
  type BoardTab,
  type SeatState,
} from "../../app-mocks/AttendanceBoardMock";
import { textWidth } from "../../app-mocks/AttendanceHeaderMock";
import { SeatCellMock, seatMetrics } from "../../app-mocks/SeatCellMock";
import {
  ABSENCE_REQUESTS,
  AFTERNOON1_BASE,
  AFTERNOON1_RESULT,
  APP_HOST,
  GRADE,
  ME,
  STUDENTS,
  SUPERVISOR_SEPT,
  TODAY,
  TODAY_LABEL,
  type AbsenceRequest,
  type AttendanceStatus,
  type SeatBase,
} from "../../app-mocks/data";
import { PHONE_BODY, type Point, type Rect } from "../../app-mocks/layout";
import {
  AbsencePanelMock,
  absenceCardRect,
  absencePanelPoint,
  CARD_BTN_H,
  CARD_BTN_W,
  type AbsenceFilter,
} from "../mocks/AbsencePanelMock";

// ── 출석부 기본값 ──

export const BOARD_URL = `${APP_HOST}/attendance/${GRADE}`;

export const PENDING_COUNT = ABSENCE_REQUESTS.filter((r) => r.status === "pending").length;

export const phoneBoardProps = (
  overrides: Partial<AttendanceBoardProps> & Pick<AttendanceBoardProps, "tab" | "groups">,
): AttendanceBoardProps => ({
  width: PHONE_BODY.w,
  height: PHONE_BODY.h,
  header: { width: PHONE_BODY.w, role: "homeroom", name: ME.name, showHelp: true },
  dateLabel: TODAY_LABEL,
  supervisor: SUPERVISOR_SEPT[TODAY][GRADE],
  grade: GRADE,
  counts: countsOf(overrides.groups),
  pendingBadge: PENDING_COUNT,
  ...overrides,
});

// ── 좌석 상태 (장면에서 장면으로 이어지는 출석 기록) ──

type SeatOverrides = Record<number, SeatState>;

const withStatus = (state: SeatState, status: AttendanceStatus): SeatState =>
  state.visual === "afterschool" ? { ...state, afterSchoolStatus: status } : { ...state, visual: status };

// CopySession 이 끝난 시점의 오후1 — AFTERNOON1_RESULT 로 체크가 끝난 상태.
export const afternoon1ResultVisual = (id: number): SeatState => {
  const result = AFTERNOON1_RESULT[id];
  return result ? withStatus(baseVisual(id), result.status) : baseVisual(id);
};

export const afternoon1Visual =
  (overrides: SeatOverrides = {}) =>
  (studentId: number): SeatState =>
    overrides[studentId] ?? afternoon1ResultVisual(studentId);

// 앱 카운트는 참여 학생만 센다 — 꾹 눌러 체크한 비참여 좌석이 초록이 되어도 숫자는 그대로다.
export const afternoon1Counts = (visualFor: (studentId: number) => SeatState) =>
  countsOf(
    buildAfternoonGroups((id) => (AFTERNOON1_BASE[id].participating ? visualFor(id) : { visual: "inactive" })),
  );

// LongPress 에서 꾹 눌러 체크한 비참여 좌석 — 그 뒤 장면들이 이어받는다.
export const CARRIED_SEATS: SeatOverrides = {
  111: { visual: "present" },
};

// 불참승인·불참신청 표시는 교시별이다 — 오후2 좌석은 오후2 신청으로 다시 고른다.
const afternoon2RequestIds = (status: "approved" | "pending") =>
  ABSENCE_REQUESTS.filter((r) => r.date === TODAY && r.session === "afternoon2" && r.status === status).map(
    (r) => r.studentId,
  );

export const AFTERNOON2_BASE: Record<number, SeatBase> = Object.fromEntries(
  Object.entries(AFTERNOON1_BASE).map(([id, base]) => [
    id,
    {
      ...base,
      approvedAbsence: afternoon2RequestIds("approved").includes(Number(id)),
      pendingRequest: afternoon2RequestIds("pending").includes(Number(id)),
    },
  ]),
);

// 앱 lib/attendance/copy-session.ts planSessionCopy: 오후2 에 참여하고 불참신청이 없는 미체크 학생에게
// 오후1 출석과 사유 없는 결석만 옮긴다.
const copyTargets = STUDENTS.filter((s) => {
  const target = AFTERNOON2_BASE[s.id];
  return target.participating && !target.approvedAbsence && !target.pendingRequest;
});

export const COPIED_TO_AFTERNOON2 = copyTargets.flatMap((s) => {
  const source = AFTERNOON1_RESULT[s.id];
  if (source?.status === "present" || (source?.status === "absent" && !source.reasonLabel)) {
    return [{ studentId: s.id, status: source.status }];
  }
  return [];
});

export const COPY_SKIPPED_COUNT = copyTargets.length - COPIED_TO_AFTERNOON2.length;

// 1-1반 6번 강민재 — 복사 뒤 오후2에만 빠진 학생을 한 번 눌러 결석으로 고친다.
export const COPY_FIX_SEAT_ID = 106;

const copiedStatusById = new Map(COPIED_TO_AFTERNOON2.map((c) => [c.studentId, c.status] as const));

// CopySession 이 복사와 수정까지 마친 오후2 — LongPress 가 탭을 옮겨 잠깐 보여 준다.
export const afternoon2SettledVisual = (id: number): SeatState => {
  const base = baseVisual(id, AFTERNOON2_BASE);
  const status = copiedStatusById.get(id);
  const filled = status ? withStatus(base, status) : base;
  return id === COPY_FIX_SEAT_ID ? withStatus(filled, "absent") : filled;
};

// CopySession 의 좌석 채우기 중간 상태(frame 기준)는 그 장면이 직접 만든다 — 여기서는 재료만 내보낸다.
export const withAttendance = withStatus;

// ── 좌표·주석 도우미 ──

export const between = (from: number, to: number) => ({ from, durationInFrames: to - from });

const RIGHT_LABEL_EDGE = PHONE_CROP.x + PHONE_CROP.w + 4;

// 폰 안 요소 상자. 가이드 스틸은 폰만 잘라 쓰므로 라벨은 가까운 쪽 폰 바깥에 둔다.
export const phoneBox = (r: Rect, pad: number, side?: "left" | "right") => {
  const a = phoneRectAbs(r);
  const box = { x: a.x - pad, y: a.y - pad, width: a.width + pad * 2, height: a.height + pad * 2 };
  if (side === "left") {
    return { ...box, labelPosition: "left" as const, labelGap: phoneLeftLabelGap(box.x) };
  }
  if (side === "right") {
    return { ...box, labelPosition: "right" as const, labelGap: RIGHT_LABEL_EDGE - (box.x + box.width) };
  }
  return box;
};

export const leftLabeled = (r: Rect, pad: number) => phoneBox(r, pad, "left");

export const rightLabeled = (r: Rect, pad: number) => phoneBox(r, pad, "right");

// 폰 본문 좌표계의 중심.
export const rectCenter = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// 화면 좌표계의 중심(확대 카드 세로 위치 등).
export const phoneCenter = (r: Rect) => phoneAbs(rectCenter(r));

// 탭의 보이는 모양(pt-2 아래 둥근 칸). 목업은 탭 중심만 내보내므로 탭 줄 폭에서 나눠 구한다.
const TAB_COUNT = 4;
const TAB_GAP = 4;
const TAB_PAD_TOP = 8;

export const boardTabRect = (tab: BoardTab, props: AttendanceBoardProps): Rect => {
  const center = boardPoint(`tab_${tab}`, props);
  const tabs = boardRect("tabs", props);
  const w = (tabs.w - TAB_GAP * (TAB_COUNT - 1)) / TAB_COUNT;
  return { x: center.x - w / 2, y: tabs.y + TAB_PAD_TOP, w, h: tabs.h - TAB_PAD_TOP };
};

// 좌석 오른쪽 위 "i" 버튼(top-0.5 right-0.5).
export const seatInfoRect = (studentId: number, props: AttendanceBoardProps): Rect => {
  const seat = seatRect(studentId, props);
  const size = seatMetrics(props.width).infoSize;
  return { x: seat.x + seat.w - 2 - size, y: seat.y + 2, w: size, h: size };
};

// 손가락으로 누르듯 누를 때만 커서가 잠깐 나타난다(가이드 스틸에 커서가 남지 않게). holdTo 까지 누른 채 머문다.
// target 은 폰 본문 좌표. endAt 을 주면 클릭 파문까지 통째로 사라진다(창이 닫힌 뒤 버튼 위에 파문이 남지 않게).
export const PhoneTap: React.FC<{ at: number; target: Point; holdTo?: number; endAt?: number }> = ({
  at,
  target,
  holdTo = at,
  endAt,
}) => {
  const frame = useCurrentFrame();
  const p = phoneAbs(target);
  const gone = endAt !== undefined ? tween(frame, [endAt, endAt + 4], [1, 0]) : 1;
  if (gone === 0) return null;
  const cursor = (
    <Cursor
      path={[
        { frame: at - 14, x: p.x + 40, y: p.y + 48 },
        { frame: at - 3, x: p.x, y: p.y },
      ]}
      clicks={[at]}
      hideAfter={holdTo + 8}
    />
  );
  return gone === 1 ? cursor : <div style={{ opacity: gone }}>{cursor}</div>;
};

// Annotation 의 글로우(상자 밖 최대 12px)가 날짜 바·폰 화면 밖으로 번지지 않게 잘라 낸다.
// 감싸기만 하므로 안쪽 좌표는 그대로 화면 좌표다.
export const ClipTo: React.FC<{ rect: { x: number; y: number; width: number; height: number }; children: React.ReactNode }> = ({
  rect,
  children,
}) => (
  <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.width, height: rect.height, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: -rect.x, top: -rect.y, width: WIDTH, height: 0 }}>{children}</div>
  </div>
);

// 날짜 바 안 항목 상자의 글로우가 파란 막대 밖으로 번지지 않게 자를 영역.
// 라벨은 막대 세로 가운데에 놓이므로 좌우는 화면 끝까지 열어 둔다.
export const dateBarBand = (props: AttendanceBoardProps) => {
  const bar = phoneRectAbs(boardRect("dateBar", props));
  return { x: 0, y: bar.y, width: WIDTH, height: bar.height };
};

// ── 좌석 확대 카드 ──

const ZOOM = 3;
const ZOOM_CARD_GAP = 44;
export const ZOOM_CARD_PAD = 18;
export const ZOOM_ENTER = 12;
export const ZOOM_EXIT = 8;
// 카드 오른쪽 끝 — 폰(PHONE_CROP) 왼쪽 바깥.
export const ZOOM_CARD_RIGHT = WIDTH - PHONE_X + ZOOM_CARD_GAP;

const seatViewOf = (studentId: number, props: AttendanceBoardProps) => {
  const seat = props.groups
    .flatMap((g) => [...(g.classroom?.divisions.flat(2) ?? []), ...(g.rooms ?? []).flatMap((r) => r.rows.flat())])
    .find((s) => s.studentId === studentId);
  if (!seat) throw new Error(`seat not on board: ${studentId}`);
  return seat;
};

// 폰 안 좌석은 42px 남짓이라 영상에서 글자가 읽히지 않는다 — 같은 좌석을 3배로 키운 카드를 폰 왼쪽에 띄운다(영상 장치).
export type ZoomLabel = { at: number; title: string; sub: string; color: string };

const ZOOM_TITLE_FONT = 30;
const ZOOM_SUB_FONT = 20;
// 글자 폭은 추정값이라 2px 여유를 둔다.
const ZOOM_TEXT_SLACK = 2;

// 카드 안 설명이 바뀌어도 폭이 튀지 않게, 가장 긴 줄에 맞춘 글자 칸 폭.
export const zoomTextWidth = (labels: { title: string; sub: string }[]) =>
  Math.max(
    ...labels.map((l) =>
      Math.max(textWidth(l.title, ZOOM_TITLE_FONT, 800), textWidth(l.sub, ZOOM_SUB_FONT, 500)),
    ),
  ) + ZOOM_TEXT_SLACK;

export const SeatZoomCard: React.FC<{
  from: number;
  to: number;
  studentId: number;
  propsAt: (frame: number) => AttendanceBoardProps;
  centerY: number;
  // 시간순. 좌석 상태가 바뀌는 순간 설명도 같은 카드 안에서 바꾼다.
  labels: ZoomLabel[];
  // 설명이 바뀌어도 카드 폭이 튀지 않게 가장 긴 줄에 맞춘 고정 폭.
  textWidth?: number;
}> = ({ from, to, studentId, propsAt, centerY, labels, textWidth: textColumnWidth }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const { title, sub, color } = [...labels].reverse().find((l) => l.at <= frame) ?? labels[0];
  const shown = tween(frame, [from, from + ZOOM_ENTER], [0, 1]) * tween(frame, [to - ZOOM_EXIT, to], [1, 0]);
  const props = propsAt(frame);
  const seat = seatViewOf(studentId, props);
  const rect = seatRect(studentId, props);
  const areaH = seatMetrics(props.width).labelHeight * ZOOM;
  return (
    <div
      style={{
        position: "absolute",
        right: ZOOM_CARD_RIGHT,
        top: centerY - areaH / 2 - ZOOM_CARD_PAD,
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: `${ZOOM_CARD_PAD}px 30px ${ZOOM_CARD_PAD}px ${ZOOM_CARD_PAD + 6}px`,
        background: "#fff",
        borderRadius: 18,
        border: `3px solid ${color}`,
        boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
        fontFamily: FONT,
        opacity: shown,
        translate: `${(shown - 1) * 20}px 0px`,
      }}
    >
      <div
        style={{
          width: rect.w * ZOOM,
          height: areaH,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ transform: `scale(${ZOOM})` }}>
          <SeatCellMock {...seat} width={rect.w} height={rect.h} viewportWidth={props.width} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: textColumnWidth }}>
        <span style={{ fontSize: ZOOM_TITLE_FONT, fontWeight: 800, color, whiteSpace: "nowrap" }}>{title}</span>
        <span style={{ fontSize: ZOOM_SUB_FONT, fontWeight: 500, color: colors.gray600, whiteSpace: "nowrap" }}>{sub}</span>
      </div>
    </div>
  );
};

// ── 불참신청 탭 ──

// 흰 상자 p-3 안에 renderAbsenceRequests 가 바로 들어간다. AbsencePanelMock 은 그 흰 상자(패딩 포함)까지 그리므로
// 출석부 본문 칸에서 패딩만큼 바깥으로 넓혀 겹쳐 놓는다.
export const ABSENCE_BOX_PAD = 12;
export const ABSENCE_PANEL_W = PHONE_BODY.w - ABSENCE_BOX_PAD * 2;

export const approveRequests = (requests: AbsenceRequest[], ids: number[]): AbsenceRequest[] =>
  requests.map((r) => (ids.includes(r.id) ? { ...r, status: "approved", reviewer: ME.name } : r));

export const pendingCountOf = (requests: AbsenceRequest[]) => requests.filter((r) => r.status === "pending").length;

// 일괄승인 후보: 오늘 날짜의 대기 신청(오늘 이 학년 감독은 오후1·오후2·야간 모두 박지훈).
export const bulkCandidatesOf = (requests: AbsenceRequest[]) =>
  requests.filter((r) => r.status === "pending" && r.date === TODAY);

export const absenceBoardProps = (
  requests: AbsenceRequest[],
  panel: Omit<React.ComponentProps<typeof AbsencePanelMock>, "width" | "requests" | "filter" | "bulkCount">,
  overrides: Partial<AttendanceBoardProps> = {},
): AttendanceBoardProps => {
  const visualFor = afternoon1Visual(CARRIED_SEATS);
  return phoneBoardProps({
    tab: "absence",
    groups: buildAfternoonGroups(visualFor),
    counts: afternoon1Counts(visualFor),
    pendingBadge: pendingCountOf(requests),
    body: (
      <div style={{ margin: -ABSENCE_BOX_PAD }}>
        <AbsencePanelMock
          width={ABSENCE_PANEL_W}
          filter="pending"
          requests={requests}
          bulkCount={bulkCandidatesOf(requests).length}
          {...panel}
        />
      </div>
    ),
    ...overrides,
  });
};

const panelOrigin = (props: AttendanceBoardProps): Point => {
  const body = boardRect("body", props);
  return { x: body.x - ABSENCE_BOX_PAD, y: body.y - ABSENCE_BOX_PAD };
};

export const panelRect = (props: AttendanceBoardProps, r: Rect): Rect => {
  const o = panelOrigin(props);
  return { ...r, x: r.x + o.x, y: r.y + o.y };
};

export const panelPoint = (
  props: AttendanceBoardProps,
  key: Parameters<typeof absencePanelPoint>[0],
  requests: AbsenceRequest[],
  filter: AbsenceFilter = "pending",
): Point => {
  const o = panelOrigin(props);
  const p = absencePanelPoint(key, ABSENCE_PANEL_W, requests, filter);
  return { x: p.x + o.x, y: p.y + o.y };
};

export const cardRect = (props: AttendanceBoardProps, requestId: number, requests: AbsenceRequest[]) =>
  panelRect(props, absenceCardRect(requestId, ABSENCE_PANEL_W, requests, "pending"));

// 카드 오른쪽 위 버튼 묶음 [승인][반려] — 중심은 absencePanelPoint(panelPoint), 크기는 목업이 그리는 고정폭(CARD_BTN_W/H)과 같다.
export const cardButtonRect = (
  props: AttendanceBoardProps,
  button: "approve" | "reject",
  requestId: number,
  requests: AbsenceRequest[],
): Rect => {
  const center = panelPoint(props, `${button}_${requestId}` as Parameters<typeof absencePanelPoint>[0], requests);
  return { x: center.x - CARD_BTN_W / 2, y: center.y - CARD_BTN_H / 2, w: CARD_BTN_W, h: CARD_BTN_H };
};

// 뱃지(-top-1 right-0, 18px) — 탭 모양 오른쪽 위.
const BADGE = 18;
export const absenceBadgeRect = (props: AttendanceBoardProps): Rect => {
  const tab = boardTabRect("absence", props);
  return { x: tab.x + tab.w - BADGE, y: tab.y - 4, w: BADGE, h: BADGE };
};
