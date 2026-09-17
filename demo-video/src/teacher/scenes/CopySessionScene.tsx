import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_X, PHONE_Y } from "../../components/phone";
import { colors } from "../../theme";
import { tween } from "../../anim";
import { GuideScene } from "../../guide/GuideScene";
import { lineAt, lineEnd, lineStart } from "../timing";
import {
  AttendanceBoardMock,
  baseVisual,
  boardPoint,
  boardRect,
  buildAfternoonGroups,
  countsOf,
  seatRect,
  type AttendanceBoardProps,
  type SeatState,
} from "../../app-mocks/AttendanceBoardMock";
import { PHONE_BODY } from "../../app-mocks/layout";
import { NativeDialogMock, nativeDialogPoint } from "../mocks/NativeDialogMock";
import type { DemoProps } from "../../props";
import {
  AFTERNOON2_BASE,
  BOARD_URL,
  COPIED_TO_AFTERNOON2,
  COPY_FIX_SEAT_ID,
  COPY_SKIPPED_COUNT,
  ClipTo,
  PhoneTap,
  SeatZoomCard,
  afternoon1ResultVisual,
  between,
  countsScrollX,
  dateBarBand,
  phoneBoardProps,
  phoneBox,
  phoneCenter,
  withAttendance,
  zoomTextWidth,
} from "./phone-helpers";

const ID = "CopySession";

// 앱 [grade]/page.tsx handleCopyFromSource 의 confirm·alert 문구.
const CONFIRM_MESSAGE = "오후1 출석 결과를 오후2 미체크 학생에게 복사할까요?";
const resultMessage = (copied: number, skipped: number) =>
  `${copied}명 복사, ${skipped}명은 오후1 미체크·사유결석이라 건너뜀`;

const APPROVED_IN_AFTERNOON1_ID = 104;
const REASONED_ABSENCE_ID = 205;
const PENDING_REQUEST_ID = 302;
const NOT_PARTICIPATING_ID = 111;

const FILL_STAGGER = 2;
const COLOR_DELAY = 2;
const DIALOG_OPEN_DELAY = 6;
// 확인을 누른 뒤 창이 닫히는 시점과 닫힘 길이 — 퇴장은 등장(8프레임)보다 빠르게.
const DIALOG_CLOSE_DELAY = 5;
const DIALOG_FADE = 5;

const tabTapAt = lineAt(ID, 0, 0.15);
const copyNoteFrom = lineAt(ID, 0, 0.4);
const copyPressAt = lineAt(ID, 1, 0.06);
const confirmOkAt = lineAt(ID, 1, 0.28);
const fillFrom = lineAt(ID, 1, 0.38);
const alertOkAt = lineAt(ID, 2, 0.3);
const skippedNotesFrom = lineAt(ID, 2, 0.33);
const skippedNotesTo = lineAt(ID, 2, 0.68);
const fixTapAt = lineAt(ID, 2, 0.75);

const copied = COPIED_TO_AFTERNOON2;
const skippedCount = COPY_SKIPPED_COUNT;

const afternoon2At = (visualFor: (id: number) => SeatState, dateBarScrollX = 0) =>
  phoneBoardProps({ tab: "afternoon2", groups: buildAfternoonGroups(visualFor), copyButton: { visible: true }, dateBarScrollX });

// 카운트("방과후 N"까지)가 다 보이도록 날짜 바를 미리 민다 — 폰 장면 공통. 복사 중 숫자 자릿수가 바뀌어도
// 막대가 흔들리지 않게 복사 전 상태에서 한 번만 구한다.
const DATE_BAR_SCROLL = countsScrollX(afternoon2At((id) => baseVisual(id, AFTERNOON2_BASE)));

const afternoon2Props = (visualFor: (id: number) => SeatState) => afternoon2At(visualFor, DATE_BAR_SCROLL);

const AFTERNOON2 = afternoon2Props((id) => baseVisual(id, AFTERNOON2_BASE));

// 좌석이 위에서 아래로, 왼쪽에서 오른쪽으로 차례차례 채워진다.
const fillAtById = new Map(
  copied
    .map((c) => ({ ...c, rect: seatRect(c.studentId, AFTERNOON2) }))
    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)
    .map((c, i) => [c.studentId, { status: c.status, at: fillFrom + i * FILL_STAGGER }] as const),
);
const fillEnd = fillFrom + copied.length * FILL_STAGGER;
const resultNoteFrom = fillEnd + 6;
const alertOpenAt = lineStart(ID, 2) - 2;

const afternoon2VisualAt = (frame: number) => (id: number): SeatState => {
  const base = baseVisual(id, AFTERNOON2_BASE);
  const fill = fillAtById.get(id);
  const filled = fill && frame >= fill.at + COLOR_DELAY ? withAttendance(base, fill.status) : base;
  if (id === COPY_FIX_SEAT_ID && frame >= fixTapAt) {
    return { ...(frame >= fixTapAt + COLOR_DELAY ? withAttendance(filled, "absent") : filled), pressAt: fixTapAt };
  }
  return fill && frame >= fill.at ? { ...filled, pressAt: fill.at } : filled;
};

const FILLED = afternoon2Props(afternoon2VisualAt(fillEnd));
const finalCounts = countsOf(FILLED.groups);

const Dialog: React.FC<{ kind: "confirm" | "alert"; message: string; openAt: number; okAt: number }> = ({
  kind,
  message,
  openAt,
  okAt,
}) => {
  const frame = useCurrentFrame();
  const closeAt = okAt + DIALOG_CLOSE_DELAY;
  if (frame < openAt || frame >= closeAt + DIALOG_FADE) {
    return null;
  }
  return (
    <div style={{ position: "absolute", inset: 0, opacity: tween(frame, [closeAt, closeAt + DIALOG_FADE], [1, 0]) }}>
      <NativeDialogMock width={PHONE_BODY.w} height={PHONE_BODY.h} kind={kind} message={message} openAt={openAt} okPressAt={okAt} />
    </div>
  );
};

const confirmOpenAt = copyPressAt + DIALOG_OPEN_DELAY;
const busyFrom = confirmOkAt + DIALOG_CLOSE_DELAY;

const boardPropsAt = (frame: number): AttendanceBoardProps =>
  frame < tabTapAt + COLOR_DELAY
    ? phoneBoardProps({
        tab: "afternoon1",
        groups: buildAfternoonGroups(afternoon1ResultVisual),
        dateBarScrollX: DATE_BAR_SCROLL,
      })
    : {
        ...afternoon2Props(afternoon2VisualAt(frame)),
        copyButton: { visible: true, pressAt: copyPressAt, busy: frame >= busyFrom && frame < fillFrom },
      };

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const overlay = (
    <>
      <Dialog kind="confirm" message={CONFIRM_MESSAGE} openAt={confirmOpenAt} okAt={confirmOkAt} />
      <Dialog kind="alert" message={resultMessage(copied.length, skippedCount)} openAt={alertOpenAt} okAt={alertOkAt} />
    </>
  );
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={BOARD_URL}>
      <AttendanceBoardMock {...boardPropsAt(frame)} tabPressAt={{ tab: "afternoon2", at: tabTapAt }} overlay={overlay} />
    </PhoneFrame>
  );
};

const seatBox = (id: number) => seatRect(id, FILLED);
// 좌석 사이 간격은 2.3px 뿐이라 상자를 1px 만 띄운다 — 더 띄우면 옆 좌석과 그 "i" 버튼을 덮는다.
const SEAT_BOX_PAD = 1;
const countsRect = boardRect("counts", FILLED);
const fixSeat = seatBox(COPY_FIX_SEAT_ID);

const SKIPPED_NOTES: { id: number; label: string; side: "left" | "right" }[] = [
  { id: APPROVED_IN_AFTERNOON1_ID, label: "오후1 불참승인", side: "left" },
  { id: NOT_PARTICIPATING_ID, label: "비참여", side: "right" },
  { id: REASONED_ABSENCE_ID, label: "오후1 사유결석", side: "left" },
  { id: PENDING_REQUEST_ID, label: "오후2 불참신청", side: "left" },
];
const SKIPPED_STAGGER = 5;

// 폰 안 좌석 글자는 7~9px 이라 영상에서 읽히지 않는다 — 복사로 바뀌는 좌석 두 개를 키운 카드로 보여 준다.
// 1-1반 1번 김도현: 오후1 출석이 그대로 복사된다.
const COPY_SAMPLE_SEAT_ID = 101;
const sampleFillAt = fillAtById.get(COPY_SAMPLE_SEAT_ID)?.at ?? fillFrom;
const SAMPLE_LABELS = [
  { at: 0, title: "복사 전 오후2", sub: "아직 미체크라 파란 좌석", color: colors.blue600 },
  { at: sampleFillAt + COLOR_DELAY, title: "오후1 결과가 복사됨", sub: "오후1 출석 → 오후2 출석", color: colors.green600 },
];
const SAMPLE_TEXT_W = zoomTextWidth(SAMPLE_LABELS);

const FIX_LABELS = [
  { at: 0, title: "복사된 출석", sub: "오후2에는 나오지 않은 학생", color: colors.green600 },
  { at: fixTapAt + COLOR_DELAY, title: "달라진 학생만 고치기", sub: "한 번 눌러 결석으로", color: colors.red600 },
];
const FIX_TEXT_W = zoomTextWidth(FIX_LABELS);

export const CopySessionScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={4} label="오후1 복사">
    <Stage />

    <Annotation {...between(copyNoteFrom, copyPressAt)} {...phoneBox(boardRect("copy", AFTERNOON2), 4, "right")} label="오후1 결과 복사" color={colors.blue600} />
    <ClipTo rect={dateBarBand(FILLED)}>
      <Annotation
        {...between(resultNoteFrom, alertOpenAt)}
        {...phoneBox(countsRect, 2, "right")}
        label={`출석 ${finalCounts.present} · 결석 ${finalCounts.absent} 채워짐`}
        color={colors.green600}
      />
    </ClipTo>
    {SKIPPED_NOTES.map((note, i) => (
      <Annotation
        key={note.id}
        {...between(skippedNotesFrom + i * SKIPPED_STAGGER, skippedNotesTo)}
        {...phoneBox(seatBox(note.id), SEAT_BOX_PAD, note.side)}
        label={note.label}
        color={colors.gray700}
      />
    ))}
    <Annotation {...between(fixTapAt + 6, lineEnd(ID, 2) + 10)} {...phoneBox(fixSeat, SEAT_BOX_PAD)} color={colors.red600} />
    <SeatZoomCard
      from={fillFrom - 12}
      to={alertOpenAt - 4}
      studentId={COPY_SAMPLE_SEAT_ID}
      propsAt={boardPropsAt}
      centerY={phoneCenter(seatBox(COPY_SAMPLE_SEAT_ID)).y}
      labels={SAMPLE_LABELS}
      textWidth={SAMPLE_TEXT_W}
    />
    <SeatZoomCard
      from={skippedNotesTo}
      to={lineEnd(ID, 2) + 10}
      studentId={COPY_FIX_SEAT_ID}
      propsAt={boardPropsAt}
      centerY={phoneCenter(fixSeat).y}
      labels={FIX_LABELS}
      textWidth={FIX_TEXT_W}
    />

    <PhoneTap at={tabTapAt} target={boardPoint("tab_afternoon2", AFTERNOON2)} />
    <PhoneTap at={copyPressAt} target={boardPoint("copy", AFTERNOON2)} />
    <PhoneTap at={confirmOkAt} target={nativeDialogPoint("ok", PHONE_BODY.w, PHONE_BODY.h, "confirm")} />
    <PhoneTap at={alertOkAt} target={nativeDialogPoint("ok", PHONE_BODY.w, PHONE_BODY.h, "alert")} />
    <PhoneTap at={fixTapAt} target={{ x: fixSeat.x + fixSeat.w / 2, y: fixSeat.y + fixSeat.h / 2 }} />
  </GuideScene>
);
