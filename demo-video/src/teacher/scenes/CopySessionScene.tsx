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
import {
  ABSENCE_REQUESTS,
  AFTERNOON1_BASE,
  AFTERNOON1_RESULT,
  STUDENTS,
  TODAY,
  type AttendanceStatus,
  type SeatBase,
} from "../../app-mocks/data";
import { PHONE_BODY, type Rect } from "../../app-mocks/layout";
import { NativeDialogMock, nativeDialogPoint } from "../mocks/NativeDialogMock";
import type { DemoProps } from "../../props";
import { BOARD_URL, TapCursor, between, boardProps, phoneBox } from "./AttendanceTourScene";

const ID = "CopySession";

// 앱 [grade]/page.tsx handleCopyFromSource 의 confirm·alert 문구.
const CONFIRM_MESSAGE = "오후1 출석 결과를 오후2 미체크 학생에게 복사할까요?";
const resultMessage = (copied: number, skipped: number) =>
  `${copied}명 복사, ${skipped}명은 오후1 미체크·사유결석이라 건너뜀`;

// 1-1반 6번 강민재 — 복사 뒤 오후2에만 빠진 학생을 한 번 눌러 결석으로 고친다.
const FIX_SEAT_ID = 106;
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
const fixTapAt = lineAt(ID, 2, 0.72);

// 불참승인·불참신청 표시는 교시별이다 — 오후2 좌석은 오후2 신청으로 다시 고른다(Board-Afternoon2 갤러리와 같은 방식).
const afternoon2RequestIds = (status: "approved" | "pending") =>
  ABSENCE_REQUESTS.filter((r) => r.date === TODAY && r.session === "afternoon2" && r.status === status).map(
    (r) => r.studentId,
  );

const AFTERNOON2_BASE: Record<number, SeatBase> = Object.fromEntries(
  Object.entries(AFTERNOON1_BASE).map(([id, base]) => [
    id,
    {
      ...base,
      approvedAbsence: afternoon2RequestIds("approved").includes(Number(id)),
      pendingRequest: afternoon2RequestIds("pending").includes(Number(id)),
    },
  ]),
);

const withStatus = (state: SeatState, status: AttendanceStatus): SeatState =>
  state.visual === "afterschool" ? { ...state, afterSchoolStatus: status } : { ...state, visual: status };

const afternoon1Visual = (id: number): SeatState => {
  const result = AFTERNOON1_RESULT[id];
  return result ? withStatus(baseVisual(id), result.status) : baseVisual(id);
};

// 앱 lib/attendance/copy-session.ts planSessionCopy: 오후2 에 참여하고 불참신청이 없는 미체크 학생에게 오후1 출석과 사유 없는 결석만 옮긴다.
const copyTargets = STUDENTS.filter((s) => {
  const target = AFTERNOON2_BASE[s.id];
  return target.participating && !target.approvedAbsence && !target.pendingRequest;
});
const copied = copyTargets.flatMap((s) => {
  const source = AFTERNOON1_RESULT[s.id];
  if (source?.status === "present" || (source?.status === "absent" && !source.reasonLabel)) {
    return [{ studentId: s.id, status: source.status }];
  }
  return [];
});
const skippedCount = copyTargets.length - copied.length;

const afternoon2Props = (visualFor: (id: number) => SeatState) =>
  boardProps({ tab: "afternoon2", groups: buildAfternoonGroups(visualFor), copyButton: { visible: true } });

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
  const filled = fill && frame >= fill.at + COLOR_DELAY ? withStatus(base, fill.status) : base;
  if (id === FIX_SEAT_ID && frame >= fixTapAt) {
    return { ...(frame >= fixTapAt + COLOR_DELAY ? withStatus(filled, "absent") : filled), pressAt: fixTapAt };
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

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const overlay = (
    <>
      <Dialog kind="confirm" message={CONFIRM_MESSAGE} openAt={confirmOpenAt} okAt={confirmOkAt} />
      <Dialog kind="alert" message={resultMessage(copied.length, skippedCount)} openAt={alertOpenAt} okAt={alertOkAt} />
    </>
  );
  const props: AttendanceBoardProps =
    frame < tabTapAt + COLOR_DELAY
      ? boardProps({ tab: "afternoon1", groups: buildAfternoonGroups(afternoon1Visual) })
      : {
          ...afternoon2Props(afternoon2VisualAt(frame)),
          copyButton: { visible: true, pressAt: copyPressAt, busy: frame >= busyFrom && frame < fillFrom },
        };
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={BOARD_URL}>
      <AttendanceBoardMock {...props} tabPressAt={{ tab: "afternoon2", at: tabTapAt }} overlay={overlay} />
    </PhoneFrame>
  );
};

const seatBox = (id: number) => seatRect(id, FILLED);
// 날짜 바가 폰 폭에서 잘리므로 카운트 상자는 막대 안쪽에서 끝낸다.
const countsRect: Rect = (() => {
  const counts = boardRect("counts", FILLED);
  const bar = boardRect("dateBar", FILLED);
  return { ...counts, w: bar.x + bar.w - 2 - counts.x };
})();
const fixSeat = seatBox(FIX_SEAT_ID);

const SKIPPED_NOTES: { id: number; label: string; side: "left" | "right" }[] = [
  { id: APPROVED_IN_AFTERNOON1_ID, label: "오후1 불참승인", side: "left" },
  { id: NOT_PARTICIPATING_ID, label: "비참여", side: "right" },
  { id: REASONED_ABSENCE_ID, label: "오후1 사유결석", side: "left" },
  { id: PENDING_REQUEST_ID, label: "오후2 불참신청", side: "left" },
];
const SKIPPED_STAGGER = 5;

export const CopySessionScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={4} label="오후1 복사">
    <Stage />

    <Annotation {...between(copyNoteFrom, copyPressAt)} {...phoneBox(boardRect("copy", AFTERNOON2), 4, "right")} label="오후1 결과 복사" color={colors.blue600} />
    <Annotation
      {...between(resultNoteFrom, alertOpenAt)}
      {...phoneBox(countsRect, 2, "right")}
      label={`출석 ${finalCounts.present} · 결석 ${finalCounts.absent} 채워짐`}
      color={colors.green600}
    />
    {SKIPPED_NOTES.map((note, i) => (
      <Annotation
        key={note.id}
        {...between(skippedNotesFrom + i * SKIPPED_STAGGER, skippedNotesTo)}
        {...phoneBox(seatBox(note.id), 4, note.side)}
        label={note.label}
        color={colors.gray700}
      />
    ))}
    <Annotation {...between(fixTapAt + 6, lineEnd(ID, 2) + 10)} {...phoneBox(fixSeat, 4, "right")} label="달라진 학생만 고치기" color={colors.red600} />

    <TapCursor at={tabTapAt} target={boardPoint("tab_afternoon2", AFTERNOON2)} />
    <TapCursor at={copyPressAt} target={boardPoint("copy", AFTERNOON2)} />
    <TapCursor at={confirmOkAt} target={nativeDialogPoint("ok", PHONE_BODY.w, PHONE_BODY.h, "confirm")} />
    <TapCursor at={alertOkAt} target={nativeDialogPoint("ok", PHONE_BODY.w, PHONE_BODY.h, "alert")} />
    <TapCursor at={fixTapAt} target={{ x: fixSeat.x + fixSeat.w / 2, y: fixSeat.y + fixSeat.h / 2 }} />
  </GuideScene>
);
