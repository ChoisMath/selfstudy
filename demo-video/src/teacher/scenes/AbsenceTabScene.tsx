import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_X, PHONE_Y } from "../../components/phone";
import { colors } from "../../theme";
import { GuideScene } from "../../guide/GuideScene";
import {
  AttendanceBoardMock,
  buildAfternoonGroups,
  seatRect,
  type AttendanceBoardProps,
  type BoardTab,
} from "../../app-mocks/AttendanceBoardMock";
import { ABSENCE_REQUESTS } from "../../app-mocks/data";
import { PHONE_BODY, type Rect } from "../../app-mocks/layout";
import { NativeDialogMock, nativeDialogPoint } from "../mocks/NativeDialogMock";
import { lineAt, lineEnd, lineStart } from "../timing";
import {
  absenceBadgeRect,
  absenceBoardProps,
  afternoon1Counts,
  afternoon1Visual,
  approveRequests,
  between,
  BOARD_URL,
  boardTabRect,
  CARRIED_SEATS,
  cardButtonRect,
  countsScrollX,
  cardRect,
  leftLabeled,
  panelPoint,
  pendingCountOf,
  phoneBoardProps,
  phoneBox,
  PENDING_COUNT,
  rectCenter,
  zoomTextWidth,
  phoneCenter,
  PhoneTap,
  rightLabeled,
  SeatZoomCard,
} from "./phone-helpers";
import type { DemoProps } from "../../props";

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

// 카운트("방과후 N"까지)가 다 보이도록 날짜 바를 미리 민다 — 폰 장면 공통(불참신청 탭은 카운트가 없어 0으로 걸린다).
const DATE_BAR_SCROLL = countsScrollX(
  phoneBoardProps({
    tab: "afternoon1",
    groups: buildAfternoonGroups(afternoon1Visual(CARRIED_SEATS)),
    counts: afternoon1Counts(afternoon1Visual(CARRIED_SEATS)),
  }),
);

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
  // 승인된 좌석은 불참승인(노랑)으로, 대기 표시 * 는 사라진다. 카운트는 countsOf 가 불참승인을 결석으로 센다.
  const visualFor = afternoon1Visual(approved ? { ...CARRIED_SEATS, [SEAT]: { visual: "approved" } } : CARRIED_SEATS);
  return phoneBoardProps({
    tab: "afternoon1",
    tabPressAt: tabPressAt(frame),
    groups: buildAfternoonGroups(visualFor),
    counts: afternoon1Counts(visualFor),
    pendingBadge: pendingCountOf(requests),
    dateBarScrollX: DATE_BAR_SCROLL,
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
const okPoint = nativeDialogPoint("ok", PHONE_BODY.w, PHONE_BODY.h, "confirm", CONFIRM_MESSAGE);

// 좌석 사이 간격은 2.3px 뿐이라 상자를 2px 만 띄운다 — 더 띄우면 상자와 글로우가 옆 좌석 이름을 덮는다.
const SEAT_BOX_PAD = 2;

const APPROVED_SEAT_LABELS = [
  { at: 0, title: "노란색 불참승인", sub: "승인된 학생의 좌석", color: colors.indigo600 },
];

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
      {...rightLabeled(absenceTab, 3)}
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

    <Annotation {...between(lineAt(ID, 4, 0.25), lineEnd(ID, 4))} {...phoneBox(approvedSeat, SEAT_BOX_PAD)} color={colors.indigo600} />
    <SeatZoomCard
      from={lineAt(ID, 4, 0.25)}
      to={lineEnd(ID, 4)}
      studentId={SEAT}
      propsAt={afternoon1Props}
      centerY={phoneCenter(approvedSeat).y}
      labels={APPROVED_SEAT_LABELS}
      textWidth={zoomTextWidth(APPROVED_SEAT_LABELS)}
    />

    <Annotation
      {...between(absenceAgainAt + 8, lineEnd(ID, 5) + 10)}
      {...rightLabeled(rejectButton, 4)}
      label="사유가 맞지 않으면 반려"
      color={colors.red600}
    />

    <PhoneTap at={absenceTap} target={rectCenter(absenceTab)} />
    <PhoneTap at={approveTap} target={rectCenter(approveButton)} />
    <PhoneTap at={okTap} target={okPoint} endAt={confirmClose} />
    <PhoneTap at={afternoon1Tap} target={rectCenter(boardTabRect("afternoon1", approvedBoard))} />
    <PhoneTap at={absenceAgainTap} target={rectCenter(boardTabRect("absence", approvedBoard))} />
  </GuideScene>
);
