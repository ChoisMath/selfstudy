import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_X, PHONE_Y, phoneAbs } from "../../components/phone";
import { colors } from "../../theme";
import { GuideScene } from "../../guide/GuideScene";
import {
  AttendanceBoardMock,
  boardRect,
  buildAfternoonGroups,
  seatRect,
  type AttendanceBoardProps,
  type BoardTab,
  type SeatState,
} from "../../app-mocks/AttendanceBoardMock";
import { ABSENCE_REQUESTS, ME, TODAY, type AbsenceRequest } from "../../app-mocks/data";
import { PHONE_BODY, type Point, type Rect } from "../../app-mocks/layout";
import {
  AbsencePanelMock,
  absenceCardRect,
  absencePanelPoint,
  CARD_BTN_H,
  CARD_BTN_W,
  type AbsenceFilter,
} from "../mocks/AbsencePanelMock";
import { NativeDialogMock, nativeDialogPoint } from "../mocks/NativeDialogMock";
import { lineAt, lineEnd, lineStart } from "../timing";
import {
  afternoon1Counts,
  afternoon1Visual,
  between,
  BOARD_URL,
  boardTabRect,
  leftLabeled,
  phoneBoardProps,
  phoneBox,
  PENDING_COUNT,
  phoneCenter,
  PhoneTap,
  rightLabeled,
  SeatZoomCard,
} from "./SeatColorsScene";
import type { DemoProps } from "../../props";

// ── AbsenceTab·BulkApprove 가 함께 쓰는 불참신청 탭 도우미 ──

// 오후1 결과(107 방과후 출석 포함) 위에 LongPress 에서 꾹 눌러 체크한 비참여 111 만 덮어쓴다.
export const CARRIED_SEATS: Record<number, SeatState> = {
  111: { visual: "present" },
};

// 흰 상자 p-3 안에 renderAbsenceRequests 가 바로 들어간다. AbsencePanelMock 은 그 흰 상자(패딩 포함)까지 그리므로
// 출석부 본문 칸에서 패딩만큼 바깥으로 넓혀 겹쳐 놓는다.
const BOX_PAD = 12;
const PANEL_W = PHONE_BODY.w - BOX_PAD * 2;

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
      <div style={{ margin: -BOX_PAD }}>
        <AbsencePanelMock
          width={PANEL_W}
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
  return { x: body.x - BOX_PAD, y: body.y - BOX_PAD };
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
  const p = absencePanelPoint(key, PANEL_W, requests, filter);
  return { x: p.x + o.x, y: p.y + o.y };
};

export const cardRect = (props: AttendanceBoardProps, requestId: number, requests: AbsenceRequest[]) =>
  panelRect(props, absenceCardRect(requestId, PANEL_W, requests, "pending"));

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

// ── AbsenceTab 장면 ──

const ID = "AbsenceTab";

const REQUEST_ID = 1;
// 신청 1 = 1-1 9번 장서아(오늘 오후1, 학원).
const SEAT = 109;
const NEXT_REQUEST_ID = 2;
const REMOVE_FRAMES = 8;
const CONFIRM_MESSAGE = "이 불참신청을 승인하시겠습니까?";

const absenceTap = lineAt(ID, 0, 0.35);
const absenceAt = absenceTap + 3;
const approveTap = lineAt(ID, 3, 0.15);
const confirmOpen = approveTap + 3;
const okTap = lineAt(ID, 3, 0.6);
const confirmClose = okTap + 4;
const approvedAt = confirmClose + REMOVE_FRAMES;
const afternoon1Tap = lineAt(ID, 4, 0.12);
const afternoon1At = afternoon1Tap + 3;
const absenceAgainTap = lineStart(ID, 5) - 4;
const absenceAgainAt = absenceAgainTap + 3;

const APPROVED = approveRequests(ABSENCE_REQUESTS, [REQUEST_ID]);
const requestsAt = (frame: number) => (frame >= approvedAt ? APPROVED : ABSENCE_REQUESTS);

const tabAt = (frame: number): BoardTab => {
  if (frame >= absenceAgainAt) return "absence";
  if (frame >= afternoon1At) return "afternoon1";
  if (frame >= absenceAt) return "absence";
  return "afternoon1";
};

const tabPressAt = (frame: number): AttendanceBoardProps["tabPressAt"] => {
  if (frame >= absenceAgainAt) return { tab: "absence", at: absenceAgainTap };
  if (frame >= afternoon1At) return { tab: "afternoon1", at: afternoon1Tap };
  if (frame >= absenceAt) return { tab: "absence", at: absenceTap };
  return undefined;
};

const afternoon1Props = (frame: number) => {
  const requests = requestsAt(frame);
  const approved = frame >= approvedAt;
  // 승인된 좌석은 불참승인(노랑)으로, 대기 표시 * 는 사라진다.
  const visualFor = afternoon1Visual(approved ? { ...CARRIED_SEATS, [SEAT]: { visual: "approved" } } : CARRIED_SEATS);
  // 승인 API 는 그 교시 출결을 결석으로 저장한다(api/homeroom/absence-requests/[id]) — 카운트에서는 출석 −1, 결석 +1.
  const countedAs = approved ? afternoon1Visual({ ...CARRIED_SEATS, [SEAT]: { visual: "absent" } }) : visualFor;
  return phoneBoardProps({
    tab: "afternoon1",
    tabPressAt: tabPressAt(frame),
    groups: buildAfternoonGroups(visualFor),
    counts: afternoon1Counts(countedAs),
    pendingBadge: pendingCountOf(requests),
  });
};

const propsAt = (frame: number): AttendanceBoardProps => {
  if (tabAt(frame) === "afternoon1") return afternoon1Props(frame);
  const requests = requestsAt(frame);
  const confirming = frame >= confirmOpen && frame < confirmClose;
  return absenceBoardProps(
    requests,
    {
      approvePressAt: { requestId: REQUEST_ID, at: approveTap },
      removingId: frame < approvedAt ? { requestId: REQUEST_ID, from: confirmClose } : undefined,
    },
    {
      tabPressAt: tabPressAt(frame),
      overlay: confirming ? (
        <NativeDialogMock
          width={PHONE_BODY.w}
          height={PHONE_BODY.h}
          kind="confirm"
          message={CONFIRM_MESSAGE}
          openAt={confirmOpen}
          okPressAt={okTap}
        />
      ) : undefined,
    },
  );
};

const listProps = propsAt(absenceAt);
const afterProps = propsAt(absenceAgainAt);
const approvedBoard = afternoon1Props(afternoon1At);

const absenceTab = boardTabRect("absence", listProps);
const badge = absenceBadgeRect(listProps);
const filterRow: Rect = (() => {
  const pending = panelPoint(listProps, "filter_pending", ABSENCE_REQUESTS);
  const rejected = panelPoint(listProps, "filter_rejected", ABSENCE_REQUESTS);
  // 필터 알약 높이 30, 반려 알약 폭 40(목업 pillWidth).
  return { x: pending.x - 40, y: pending.y - 15, w: rejected.x + 20 - (pending.x - 40), h: 30 };
})();
const firstCard = cardRect(listProps, REQUEST_ID, ABSENCE_REQUESTS);
const approveButton = cardButtonRect(listProps, "approve", REQUEST_ID, ABSENCE_REQUESTS);
const rejectButton = cardButtonRect(afterProps, "reject", NEXT_REQUEST_ID, APPROVED);
const approvedSeat = seatRect(SEAT, approvedBoard);
const okPoint = phoneAbs(nativeDialogPoint("ok", PHONE_BODY.w, PHONE_BODY.h, "confirm", CONFIRM_MESSAGE));

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={BOARD_URL}>
      <AttendanceBoardMock {...propsAt(frame)} />
    </PhoneFrame>
  );
};

export const AbsenceTabScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={8} label="불참신청 승인">
    <Stage />

    <Annotation
      {...between(absenceAt + 6, lineEnd(ID, 0))}
      {...leftLabeled(absenceTab, 3)}
      label="학생들이 낸 불참신청"
      color={colors.blue600}
    />
    <Annotation
      {...between(lineAt(ID, 1, 0.05), lineEnd(ID, 1))}
      {...rightLabeled(badge, 4)}
      label={`승인 대기 ${PENDING_COUNT}건`}
      color={colors.red600}
    />

    <Annotation
      {...between(lineAt(ID, 2, 0.05), lineEnd(ID, 2))}
      {...leftLabeled(filterRow, 4)}
      label="대기중 · 승인 · 반려"
      color={colors.blue600}
    />
    <Annotation
      {...between(lineAt(ID, 2, 0.4), lineEnd(ID, 2))}
      {...leftLabeled(firstCard, 4)}
      label="학생 · 날짜 · 시간 · 사유"
      color={colors.indigo600}
    />

    <Annotation {...between(lineStart(ID, 3), approveTap)} {...phoneBox(approveButton, 4)} color={colors.green600} />

    <Annotation {...between(lineAt(ID, 4, 0.25), lineEnd(ID, 4))} {...phoneBox(approvedSeat, 6)} color={colors.indigo600} />
    <SeatZoomCard
      from={lineAt(ID, 4, 0.25)}
      to={lineEnd(ID, 4)}
      studentId={SEAT}
      propsAt={afternoon1Props}
      centerY={phoneCenter(approvedSeat).y}
      labels={[{ at: 0, title: "노란색 불참승인", sub: "승인된 학생의 좌석", color: colors.indigo600 }]}
    />

    <Annotation
      {...between(absenceAgainAt + 8, lineEnd(ID, 5) + 10)}
      {...rightLabeled(rejectButton, 4)}
      label="사유가 맞지 않으면 반려"
      color={colors.red600}
    />

    <PhoneTap at={absenceTap} target={phoneCenter(absenceTab)} />
    <PhoneTap at={approveTap} target={phoneCenter(approveButton)} />
    <PhoneTap at={okTap} target={okPoint} />
    <PhoneTap at={afternoon1Tap} target={phoneCenter(boardTabRect("afternoon1", approvedBoard))} />
    <PhoneTap at={absenceAgainTap} target={phoneCenter(boardTabRect("absence", approvedBoard))} />
  </GuideScene>
);
