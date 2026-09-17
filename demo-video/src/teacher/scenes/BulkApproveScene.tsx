import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_X, PHONE_Y } from "../../components/phone";
import { colors } from "../../theme";
import { GuideScene } from "../../guide/GuideScene";
import { AttendanceBoardMock, boardPoint, type AttendanceBoardProps } from "../../app-mocks/AttendanceBoardMock";
import { textWidth } from "../../app-mocks/AttendanceHeaderMock";
import { vwClamp } from "../../app-mocks/SeatCellMock";
import { ABSENCE_REASON_META, ABSENCE_REQUESTS, studentById, SUPERVISOR_SEPT, TODAY, GRADE } from "../../app-mocks/data";
import { PHONE_BODY, type Rect } from "../../app-mocks/layout";
import { SESSION_LABEL } from "../mocks/AbsencePanelMock";
import { BulkApproveModalMock, bulkModalPoint, type BulkApproveRow } from "../mocks/BulkApproveModalMock";
import { NativeDialogMock, nativeDialogPoint } from "../mocks/NativeDialogMock";
import { lineAt, lineEnd, lineStart } from "../timing";
import {
  ABSENCE_BOX_PAD,
  ABSENCE_PANEL_W,
  absenceBadgeRect,
  absenceBoardProps,
  approveRequests,
  between,
  BOARD_URL,
  bulkCandidatesOf,
  leftLabeled,
  panelRect,
  PhoneTap,
  rectCenter,
  rightLabeled,
} from "./phone-helpers";
import type { DemoProps } from "../../props";

const ID = "BulkApprove";

// AbsenceTab 에서 신청 1을 승인한 뒤 — 오늘 대기 신청은 2·3번 두 건이 남는다.
const BEFORE = approveRequests(ABSENCE_REQUESTS, [1]);
const CANDIDATES = bulkCandidatesOf(BEFORE);
const AFTER = approveRequests(
  BEFORE,
  CANDIDATES.map((r) => r.id),
);

const ROWS: BulkApproveRow[] = CANDIDATES.map((r) => {
  const s = studentById(r.studentId);
  return {
    student: `${s.name} ${s.grade}학년 ${s.classNumber}반 ${s.number}번`,
    date: r.date,
    session: SESSION_LABEL[r.session],
    reason: ABSENCE_REASON_META[r.reason].label,
    detail: r.detail ?? "",
  };
});

const bulkTap = lineAt(ID, 1, 0.1);
const modalOpen = bulkTap + 3;
const confirmTap = lineAt(ID, 2, 0.35);
const busyFrom = confirmTap + 3;
const alertOpen = confirmTap + 12;
const okTap = lineAt(ID, 2, 0.72);
const doneAt = okTap + 4;
const ALERT_MESSAGE = `${ROWS.length}건을 승인했습니다.`;

const propsAt = (frame: number): AttendanceBoardProps => {
  const done = frame >= doneAt;
  return absenceBoardProps(
    done ? AFTER : BEFORE,
    { bulkPressAt: bulkTap },
    {
      overlay:
        frame >= modalOpen && !done ? (
          <>
            <BulkApproveModalMock
              width={PHONE_BODY.w}
              height={PHONE_BODY.h}
              rows={ROWS}
              openAt={modalOpen}
              confirmPressAt={confirmTap}
              busy={frame >= busyFrom}
            />
            {frame >= alertOpen ? (
              <NativeDialogMock
                width={PHONE_BODY.w}
                height={PHONE_BODY.h}
                kind="alert"
                message={ALERT_MESSAGE}
                openAt={alertOpen}
                okPressAt={okTap}
              />
            ) : null}
          </>
        ) : undefined,
    },
  );
};

const listProps = propsAt(0);

// 날짜 바의 감독 이름 칩(px-1.5 py-0.5, 폰 폭 11px 굵게).
const SUPERVISOR_FONT = vwClamp(11, 2.6, 13, PHONE_BODY.w);
const CHIP_PAD_X = 6;
const CHIP_H = 20;
const supervisorChip: Rect = (() => {
  const center = boardPoint("supervisor", listProps);
  const w = textWidth(SUPERVISOR_SEPT[TODAY][GRADE], SUPERVISOR_FONT, 600) + CHIP_PAD_X * 2;
  return { x: center.x - w / 2, y: center.y - CHIP_H / 2, w, h: CHIP_H };
})();

// 일괄승인 버튼 — 목업 pillWidth(글자 수×8+24)와 같은 폭, 필터 줄 높이 30.
const FILTER_ROW_H = 30;
const bulkButton: Rect = (() => {
  const label = `일괄승인 (${CANDIDATES.length})`;
  const w = label.length * 8 + 24;
  return panelRect(listProps, { x: ABSENCE_PANEL_W - ABSENCE_BOX_PAD - w, y: ABSENCE_BOX_PAD, w, h: FILTER_ROW_H });
})();

const TABLE_HEAD_H = 26;
const TABLE_ROW_H = 24;
const MODAL_SIDE = 32;
const modalTable: Rect = (() => {
  const center = bulkModalPoint("table", PHONE_BODY.w, PHONE_BODY.h, ROWS.length);
  const w = PHONE_BODY.w - MODAL_SIDE * 2;
  const h = TABLE_HEAD_H + TABLE_ROW_H * ROWS.length;
  return { x: center.x - w / 2, y: center.y - h / 2, w, h };
})();
const modalRows: Rect = { ...modalTable, y: modalTable.y + TABLE_HEAD_H, h: modalTable.h - TABLE_HEAD_H };

const confirmPoint = bulkModalPoint("confirm", PHONE_BODY.w, PHONE_BODY.h, ROWS.length);
const okPoint = nativeDialogPoint("ok", PHONE_BODY.w, PHONE_BODY.h, "alert", ALERT_MESSAGE);
const badge = absenceBadgeRect(listProps);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={BOARD_URL}>
      <AttendanceBoardMock {...propsAt(frame)} />
    </PhoneFrame>
  );
};

export const BulkApproveScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={9} label="일괄승인">
    <Stage />

    <Annotation
      {...between(lineAt(ID, 0, 0.08), lineAt(ID, 0, 0.5))}
      {...leftLabeled(supervisorChip, 4)}
      label="오늘 이 학년 감독교사"
      color={colors.purple600}
    />
    <Annotation
      {...between(lineAt(ID, 0, 0.5), bulkTap)}
      {...rightLabeled(bulkButton, 4)}
      label="감독교사의 일괄승인"
      color={colors.blue600}
    />

    <Annotation
      {...between(lineAt(ID, 1, 0.4), lineStart(ID, 2))}
      {...leftLabeled(modalTable, 5)}
      label="오늘 들어온 대기 신청"
      color={colors.indigo600}
    />
    <Annotation
      {...between(lineStart(ID, 2), confirmTap)}
      {...leftLabeled(modalRows, 4)}
      label="학생 · 시간 · 사유 확인"
      color={colors.indigo600}
    />

    <Annotation
      {...between(doneAt + 4, lineEnd(ID, 2) + 10)}
      {...rightLabeled(badge, 4)}
      label={`${ROWS.length}건 한 번에 승인`}
      color={colors.green600}
    />

    <PhoneTap at={bulkTap} target={rectCenter(bulkButton)} />
    <PhoneTap at={confirmTap} target={confirmPoint} />
    <PhoneTap at={okTap} target={okPoint} />
  </GuideScene>
);
