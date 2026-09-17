import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_X, PHONE_Y } from "../../components/phone";
import { colors } from "../../theme";
import { GuideScene } from "../../guide/GuideScene";
import {
  AttendanceBoardMock,
  boardPoint,
  buildAfternoonGroups,
  countsOf,
  seatRect,
  type SeatState,
} from "../../app-mocks/AttendanceBoardMock";
import { lineAt, lineEnd, lineStart } from "../timing";
import {
  afternoon1Counts,
  afternoon1Visual,
  afternoon2SettledVisual,
  between,
  BOARD_URL,
  phoneBoardProps,
  phoneBox,
  phoneCenter,
  PhoneTap,
  rectCenter,
  SeatZoomCard,
  zoomTextWidth,
} from "./phone-helpers";
import type { DemoProps } from "../../props";

const ID = "LongPress";

const SEAT = 111;
// 앱 길게 누르기 타이머 500ms.
const LONG_PRESS_FRAMES = 15;
// 진행 링(좌석 밖 3px)이 주석 테두리에 가리지 않게 상자를 넉넉히 띄운다.
const BOX_PAD = 10;

const firstTap = lineAt(ID, 0, 0.5);
// "0.5초쯤 누르고 있으면 파란색으로 활성화되고" — 문장 2 가 그 말을 하는 동안 링이 차오른다.
const longPressFrom = lineAt(ID, 2, 0.2);
const longPressTo = longPressFrom + LONG_PRESS_FRAMES;
const checkTap = lineAt(ID, 2, 0.55);
const checkedAt = checkTap + 3;
const afternoon2Tap = lineAt(ID, 3, 0.1);
const afternoon2At = afternoon2Tap + 3;
const afternoon1Tap = lineAt(ID, 3, 0.55);
const afternoon1At = afternoon1Tap + 3;

const seatAt = (frame: number): SeatState => {
  const press = { pressAt: checkTap, longPressFrom, longPressTo };
  if (frame >= checkedAt) return { visual: "present", ...press };
  if (frame >= longPressTo) return { visual: "activated", ...press };
  return { visual: "inactive", ...press };
};

const afternoon1PropsAt = (frame: number) => {
  // 탭을 옮겨 돌아오면 활성화는 풀리지만 출석 기록이 있어 초록으로 보인다.
  const seat: SeatState = frame >= afternoon1At ? { visual: "present" } : seatAt(frame);
  const visualFor = afternoon1Visual({ [SEAT]: seat });
  return phoneBoardProps({
    tab: "afternoon1",
    tabPressAt: frame >= afternoon1At ? { tab: "afternoon1", at: afternoon1Tap } : undefined,
    groups: buildAfternoonGroups(visualFor),
    counts: afternoon1Counts(visualFor),
  });
};

// CopySession 에서 복사를 마친 오후2(106 결석 수정 포함). 비참여 111은 복사 대상이 아니라 회색이다.
const afternoon2Groups = buildAfternoonGroups(afternoon2SettledVisual);
const afternoon2Props = phoneBoardProps({
  tab: "afternoon2",
  tabPressAt: { tab: "afternoon2", at: afternoon2Tap },
  groups: afternoon2Groups,
  counts: countsOf(afternoon2Groups),
  copyButton: { visible: true },
});

const propsAt = (frame: number) =>
  frame >= afternoon2At && frame < afternoon1At ? afternoon2Props : afternoon1PropsAt(frame);

const afternoon1Settled = afternoon1PropsAt(afternoon1At);
const seatOn1 = seatRect(SEAT, afternoon1Settled);
const seatOn2 = seatRect(SEAT, afternoon2Props);
const seatPoint = rectCenter(seatOn1);
const seatCenterY = phoneCenter(seatOn1).y;
const tab2Point = boardPoint("tab_afternoon2", afternoon1Settled);
const tab1Point = boardPoint("tab_afternoon1", afternoon2Props);

const PRESS_LABELS = [
  { at: 0, title: "회색 좌석", sub: "한 번 눌러서는 반응하지 않습니다", color: colors.gray700 },
  { at: lineStart(ID, 1), title: "좌석을 꾹 누르기", sub: "참여하지 않는 날 자습에 나온 학생", color: colors.blue600 },
  { at: longPressTo, title: "0.5초 누르면 활성화", sub: "파란색이 되면 눌러서 체크할 수 있습니다", color: colors.blue600 },
  { at: checkedAt, title: "눌러서 출석 체크", sub: "초록 = 출석", color: colors.green600 },
];
const AFTERNOON2_LABELS = [
  { at: 0, title: "다른 탭에서는 회색", sub: "탭을 옮기면 활성화가 풀립니다", color: colors.gray700 },
];
const BACK_LABELS = [{ at: 0, title: "체크한 기록은 그대로", sub: "오후1로 돌아오면 초록 출석", color: colors.green600 }];

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={BOARD_URL}>
      <AttendanceBoardMock {...propsAt(frame)} />
    </PhoneFrame>
  );
};

export const LongPressScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={6} label="꾹 눌러 활성화">
    <Stage />

    <Annotation {...between(lineAt(ID, 0, 0.1), lineEnd(ID, 0))} {...phoneBox(seatOn1, BOX_PAD)} color={colors.gray700} />
    <Annotation {...between(lineStart(ID, 1), checkTap)} {...phoneBox(seatOn1, BOX_PAD)} color={colors.blue600} />
    <Annotation {...between(checkTap, lineEnd(ID, 2))} {...phoneBox(seatOn1, BOX_PAD)} color={colors.green600} />
    <Annotation {...between(afternoon2At + 4, afternoon1Tap)} {...phoneBox(seatOn2, BOX_PAD)} color={colors.gray700} />
    <Annotation {...between(afternoon1At + 4, lineEnd(ID, 3) + 10)} {...phoneBox(seatOn1, BOX_PAD)} color={colors.green600} />

    <SeatZoomCard
      from={lineAt(ID, 0, 0.1)}
      to={lineEnd(ID, 2)}
      studentId={SEAT}
      propsAt={afternoon1PropsAt}
      centerY={seatCenterY}
      labels={PRESS_LABELS}
      textWidth={zoomTextWidth(PRESS_LABELS)}
    />
    <SeatZoomCard
      from={afternoon2At}
      to={afternoon1At}
      studentId={SEAT}
      propsAt={() => afternoon2Props}
      centerY={phoneCenter(seatOn2).y}
      labels={AFTERNOON2_LABELS}
      textWidth={zoomTextWidth(AFTERNOON2_LABELS)}
    />
    <SeatZoomCard
      from={afternoon1At}
      to={lineEnd(ID, 3) + 10}
      studentId={SEAT}
      propsAt={afternoon1PropsAt}
      centerY={seatCenterY}
      labels={BACK_LABELS}
      textWidth={zoomTextWidth(BACK_LABELS)}
    />

    <PhoneTap at={firstTap} target={seatPoint} />
    <PhoneTap at={longPressFrom} target={seatPoint} holdTo={longPressTo} />
    <PhoneTap at={checkTap} target={seatPoint} />
    <PhoneTap at={afternoon2Tap} target={tab2Point} />
    <PhoneTap at={afternoon1Tap} target={tab1Point} />
  </GuideScene>
);
