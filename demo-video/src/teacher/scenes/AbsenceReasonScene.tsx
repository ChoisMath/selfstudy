import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import { FONT } from "../../fonts";
import { APP_HOST, HOMEROOM_MONTH, TODAY, TODAY_LABEL } from "../../app-mocks/data";
import { PcViewport, pcAbs, pcRectAbs, type Point, type Rect } from "../../app-mocks/layout";
import { baseVisual, type SeatState } from "../../app-mocks/AttendanceBoardMock";
import { MonthlyAttendanceMock, monthlyMaxScrollX, monthlyRect } from "../../app-mocks/MonthlyAttendanceMock";
import { ParticipationTableMock } from "../../app-mocks/ParticipationTableMock";
import { tw } from "../../app-mocks/tw";
import { colors } from "../../theme";
import { lineAt, lineEnd, lineStart } from "../timing";
import { AbsenceReasonFormMock, absenceReasonPoint } from "../mocks/AbsenceReasonFormMock";
import { HOMEROOM_BODY, HomeroomShellMock, homeroomTabPoint } from "../mocks/HomeroomShellMock";
import { PARTICIPATION_END_ROWS, PhoneBoardInset, boardInsetSeat, boardInsetSize } from "./HomeroomParticipationScene";
import type { DemoProps } from "../../props";

const ID = "AbsenceReason";
const W = HOMEROOM_BODY.w;
const EXAMPLE_STUDENT_ID = 205;
const EXAMPLE_STUDENT_NO = 5;

// AbsenceReasonFormMock 내부 배치(앱 absence-reasons/page.tsx 압축판) — 카드·버튼 묶음은 rect 헬퍼가 없어 장면에서 잡는다.
const FORM_CARD: Rect = { x: 16, y: 72, w: 512, h: 434 };
const SESSION_GROUP = { firstW: 100, w: 304, h: 34 };
const REASON_GROUP = { firstW: 56, w: 264, h: 26 };
const FIELD_W = 472;
const MESSAGE_H = 26;
const DROPDOWN_ROW_H = 24;
const DROPDOWN_TOP_GAP = 1;
const SELECT_H = 30;

const tabClick = lineAt(ID, 0, 0.2);
const pageSwap = tabClick + 3;
const studentClick = lineAt(ID, 1, 0.04);
const optionClick = lineAt(ID, 1, 0.2);
const dateClick = lineAt(ID, 1, 0.34);
const sessionClick = lineAt(ID, 1, 0.64);
const reasonClick = lineAt(ID, 2, 0.3);
const detailClick = lineAt(ID, 2, 0.42);
const submitClick = lineAt(ID, 2, 0.7);
const successFrom = submitClick + 8;

const monthlyInsetFrom = lineAt(ID, 3, 0.03);
const boardInsetFrom = lineAt(ID, 3, 0.48);
const insetTo = lineEnd(ID, 3) + 12;

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const onForm = frame >= pageSwap;
  return (
    <BrowserFrame url={`${APP_HOST}/homeroom/${onForm ? "absence-reasons" : "participation"}`} tabTitle="포산고 자율학습">
      <PcViewport>
        <HomeroomShellMock
          tab={onForm ? "absenceReasons" : "participation"}
          role="homeroom"
          tabPressAt={{ tab: "absenceReasons", at: tabClick }}
        >
          {onForm ? (
            <div style={{ position: "absolute", inset: 0, opacity: tween(frame, [pageSwap, pageSwap + 8], [0, 1]) }}>
              <AbsenceReasonFormMock
                width={W}
                step={{
                  student: optionClick + 2,
                  date: dateClick,
                  session: sessionClick,
                  reason: reasonClick,
                  detailTypeFrom: detailClick + 4,
                  submitPressAt: submitClick,
                  successFrom,
                }}
                selectOpen={{ from: studentClick + 2, to: optionClick + 4 }}
              />
            </div>
          ) : (
            <ParticipationTableMock variant="homeroom" width={W} height={HOMEROOM_BODY.h} rows={PARTICIPATION_END_ROWS} />
          )}
        </HomeroomShellMock>
      </PcViewport>
    </BrowserFrame>
  );
};

// ── 월간출결 인셋: 좁은 폭으로 그려 9/15~9/17과 시간 열을 이름 열 옆에 붙인다 ─────────────────

const MONTHLY_NARROW_W = 442;
const MONTHLY_SCALE = 1.35;
const MONTHLY_ROWS = 6;
// MonthlyAttendanceMock 내부 치수 — 이름·번호 고정 열 92, 날짜 칸 30(3칸 묶음 90), 머리 40+테두리 1, 행 20.
const M_STICKY_W = 92;
const M_CELL_W = 30;
const M_GROUP_W = 90;
const M_HEAD_H = 41;
const M_ROW_H = 20;
const CROP_TOP_MARGIN = 4;
const INSET_HEADER_H = 46;
const INSET_PAD = 12;

const monthlyTable = monthlyRect("table", "homeroom", MONTHLY_NARROW_W);
const monthlyScrollX = monthlyMaxScrollX(MONTHLY_NARROW_W);
const monthlyCrop: Rect = {
  x: monthlyTable.x - 4,
  y: monthlyTable.y - CROP_TOP_MARGIN,
  w: monthlyTable.w + 8,
  h: CROP_TOP_MARGIN + M_HEAD_H + M_ROW_H * MONTHLY_ROWS + 2,
};
const todayIndex = HOMEROOM_MONTH.dates.indexOf(TODAY);
// 등록한 9/17 오후1 사유결석 칸(표 안쪽 좌표).
const todayCell: Rect = {
  x: monthlyTable.x + 1 + M_STICKY_W + todayIndex * M_GROUP_W - monthlyScrollX,
  y: monthlyTable.y + 1 + M_HEAD_H + (EXAMPLE_STUDENT_NO - 1) * M_ROW_H,
  w: M_CELL_W,
  h: M_ROW_H,
};

const monthlyInsetSize = {
  w: monthlyCrop.w * MONTHLY_SCALE + INSET_PAD * 2,
  h: INSET_HEADER_H + monthlyCrop.h * MONTHLY_SCALE + INSET_PAD,
};

const InsetCard: React.FC<{ x: number; y: number; w: number; h: number; from: number; to: number; title: string; caption: string; children: React.ReactNode }> = ({
  x,
  y,
  w,
  h,
  from,
  to,
  title,
  caption,
  children,
}) => {
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
      <div style={{ position: "absolute", left: INSET_PAD + 4, top: 0, height: INSET_HEADER_H, display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: colors.gray800 }}>{title}</span>
        <span style={{ fontSize: 18, fontWeight: 500, color: colors.gray500 }}>{caption}</span>
      </div>
      {children}
    </div>
  );
};

const MonthlyInset: React.FC<{ x: number; y: number; from: number; to: number }> = ({ x, y, from, to }) => (
  <InsetCard x={x} y={y} w={monthlyInsetSize.w} h={monthlyInsetSize.h} from={from} to={to} title="월간출결" caption={`${HOMEROOM_MONTH.month}월 · ${HOMEROOM_MONTH.classLabel}반`}>
    <div
      style={{
        position: "absolute",
        left: INSET_PAD,
        top: INSET_HEADER_H,
        width: monthlyCrop.w * MONTHLY_SCALE,
        height: monthlyCrop.h * MONTHLY_SCALE,
        overflow: "hidden",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: MONTHLY_NARROW_W,
          height: monthlyCrop.y + monthlyCrop.h,
          transform: `scale(${MONTHLY_SCALE}) translate(${-monthlyCrop.x}px, ${-monthlyCrop.y}px)`,
          transformOrigin: "top left",
        }}
      >
        <MonthlyAttendanceMock variant="homeroom" width={MONTHLY_NARROW_W} height={monthlyCrop.y + monthlyCrop.h} scrollX={monthlyScrollX} />
        {/* data.ts 월간 규칙은 목요일 오후1을 O로 두므로, 이 장면에서 등록한 사유결석을 그 칸에 덮어 그린다(목업 셀 스타일 그대로). */}
        <div
          style={{
            position: "absolute",
            left: todayCell.x + 1,
            top: todayCell.y,
            width: todayCell.w - 1,
            height: todayCell.h - 1,
            background: tw.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, color: tw.orange[500] }}>△</span>
        </div>
      </div>
    </div>
  </InsetCard>
);

// 오늘 오후1 출석부 — 안지호는 등록된 사유결석이라 빨간 결석으로 보인다.
const boardVisual = (studentId: number): SeatState =>
  studentId === EXAMPLE_STUDENT_ID ? { visual: "absent" } : baseVisual(studentId);

const BOARD_SCALE = 1.2;
const INSET_RIGHT = 1716;
const MONTHLY_INSET = { x: INSET_RIGHT - monthlyInsetSize.w, y: 246 };
const boardSize = boardInsetSize(boardVisual, BOARD_SCALE);
const BOARD_INSET = { x: INSET_RIGHT - boardSize.w, y: MONTHLY_INSET.y + monthlyInsetSize.h + 16 };

const bodyRect = (r: Rect) => pcRectAbs({ x: HOMEROOM_BODY.x + r.x, y: HOMEROOM_BODY.y + r.y, w: r.w, h: r.h });
const bodyPoint = (p: Point) => pcAbs({ x: HOMEROOM_BODY.x + p.x, y: HOMEROOM_BODY.y + p.y });

const box = (r: { x: number; y: number; width: number; height: number }, pad = 6) => ({
  x: r.x - pad,
  y: r.y - pad,
  width: r.width + pad * 2,
  height: r.height + pad * 2,
});

export const AbsenceReasonScene: React.FC<DemoProps> = () => {
  const tab = pcAbs(homeroomTabPoint("absenceReasons", "homeroom"));
  const point = (key: Parameters<typeof absenceReasonPoint>[0]) => bodyPoint(absenceReasonPoint(key, W));
  const student = point("student");
  const option = bodyPoint({
    x: absenceReasonPoint("student", W).x,
    y: absenceReasonPoint("student", W).y + SELECT_H / 2 + DROPDOWN_TOP_GAP + (EXAMPLE_STUDENT_NO - 0.5) * DROPDOWN_ROW_H,
  });
  const date = point("date");
  const session = point("session_afternoon1");
  const reason = point("reason_academy");
  const detail = point("detail");
  const submit = point("submit");

  const sessionCenter = absenceReasonPoint("session_afternoon1", W);
  const sessionGroup = bodyRect({
    x: sessionCenter.x - SESSION_GROUP.firstW / 2,
    y: sessionCenter.y - SESSION_GROUP.h / 2,
    w: SESSION_GROUP.w,
    h: SESSION_GROUP.h,
  });
  const reasonCenter = absenceReasonPoint("reason_academy", W);
  const reasonGroup = bodyRect({
    x: reasonCenter.x - REASON_GROUP.firstW / 2,
    y: reasonCenter.y - REASON_GROUP.h / 2,
    w: REASON_GROUP.w,
    h: REASON_GROUP.h,
  });
  const successCenter = absenceReasonPoint("success", W);
  const success = bodyRect({ x: successCenter.x - FIELD_W / 2, y: successCenter.y - MESSAGE_H / 2, w: FIELD_W, h: MESSAGE_H });

  const monthlyCell = {
    x: MONTHLY_INSET.x + INSET_PAD + (todayCell.x - monthlyCrop.x) * MONTHLY_SCALE,
    y: MONTHLY_INSET.y + INSET_HEADER_H + (todayCell.y - monthlyCrop.y) * MONTHLY_SCALE,
    width: todayCell.w * MONTHLY_SCALE,
    height: todayCell.h * MONTHLY_SCALE,
  };
  const absentSeat = boardInsetSeat(boardVisual, BOARD_SCALE, BOARD_INSET.x, BOARD_INSET.y, EXAMPLE_STUDENT_ID);

  return (
    <GuideScene id={ID} step={17} label="불참사유등록">
      <Stage />

      <Annotation
        from={pageSwap + 20}
        durationInFrames={lineEnd(ID, 0) - pageSwap - 20}
        {...box(bodyRect(FORM_CARD))}
        label="담임이 직접 결석 사유 등록"
        labelPosition="right"
        color={colors.blue600}
      />

      <Annotation
        from={lineAt(ID, 1, 0.42)}
        durationInFrames={lineEnd(ID, 1) - lineAt(ID, 1, 0.42)}
        {...box(sessionGroup, 5)}
        label="오후1 · 오후2 · 야간"
        labelPosition="right"
      />

      <Annotation
        from={lineAt(ID, 2, 0.02)}
        durationInFrames={detailClick - 6 - lineAt(ID, 2, 0.02)}
        {...box(reasonGroup, 5)}
        label="학원 · 방과후 · 질병 · 기타"
        labelPosition="right"
      />
      <Annotation
        from={successFrom + 6}
        durationInFrames={lineEnd(ID, 2) - successFrom - 6}
        {...box(success, 4)}
        label="등록 완료"
        labelPosition="right"
        color={colors.green600}
      />

      <MonthlyInset x={MONTHLY_INSET.x} y={MONTHLY_INSET.y} from={monthlyInsetFrom} to={insetTo} />
      <Annotation
        from={monthlyInsetFrom + 14}
        durationInFrames={insetTo - monthlyInsetFrom - 14}
        {...box(monthlyCell, 4)}
        label="△ 사유결석"
        labelPosition="left"
      />
      <PhoneBoardInset
        x={BOARD_INSET.x}
        y={BOARD_INSET.y}
        scale={BOARD_SCALE}
        from={boardInsetFrom}
        to={insetTo}
        visualFor={boardVisual}
        caption={`${TODAY_LABEL.slice(5)} 오후1`}
      />
      <Annotation
        from={boardInsetFrom + 14}
        durationInFrames={insetTo - boardInsetFrom - 14}
        {...box(absentSeat, 4)}
        label="결석"
        labelPosition="top"
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 0), x: 1100, y: 640 },
          { frame: tabClick - 6, x: tab.x, y: tab.y },
          { frame: tabClick + 10, x: tab.x, y: tab.y },
          { frame: studentClick - 8, x: student.x, y: student.y },
          { frame: optionClick - 6, x: option.x, y: option.y },
          { frame: dateClick - 6, x: date.x, y: date.y },
          { frame: sessionClick - 8, x: session.x, y: session.y },
          { frame: reasonClick - 8, x: reason.x, y: reason.y },
          { frame: detailClick - 6, x: detail.x, y: detail.y },
          { frame: submitClick - 8, x: submit.x, y: submit.y },
        ]}
        clicks={[tabClick, studentClick, optionClick, dateClick, sessionClick, reasonClick, detailClick, submitClick]}
        hideAfter={successFrom + 12}
      />
    </GuideScene>
  );
};
