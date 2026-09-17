import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { FlashNotice } from "../../components/FlashNotice";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_CROP, PHONE_X, PHONE_Y } from "../../components/phone";
import { GuideScene } from "../../guide/GuideScene";
import { textWidth } from "../../app-mocks/AttendanceHeaderMock";
import { APP_HOST } from "../../app-mocks/data";
import { PHONE_BODY, type Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { colors, WIDTH } from "../../theme";
import { AbsenceListMock, absenceListRect } from "../mocks/AbsenceListMock";
import { RecordMock } from "../mocks/RecordMock";
import { StudentShellMock, studentShellPoint, STUDENT_BODY } from "../mocks/StudentShellMock";
import { MY_REQUESTS } from "../data";
import { lineAt, lineEnd, lineStart } from "../timing";
import { between, leftLabeled, PhoneTap, rectCenter, rightLabeled } from "../../teacher/scenes/phone-helpers";
import type { DemoProps } from "../../props";

const ID = "AbsenceList";

const LIST_URL = `${APP_HOST}/student/absence-requests`;
const RECORD_URL = `${APP_HOST}/student/attendance`;

// 탭 줄(min-h-11) — studentShellPoint 는 중심만 내보내므로 보이는 상자는 여기서 만든다.
const TAB_H = 44;
const TAB_PAD_X = 16;

// FlashNotice 는 화면 맨 위(top 16)에 가운데 정렬로 그려져 폰 상태 표시줄을 가린다 — 교사 편 LoginScene 처럼
// 폰 오른쪽 빈 칸 안에서 가운데 오도록 감싼다. 배지 라벨(y 370~520) 아래에 둔다.
const NOTICE_GAP = 24;
const NOTICE_COLUMN = { x: PHONE_CROP.x + PHONE_CROP.w + NOTICE_GAP, y: 640 };
const NOTICE_COLUMN_W = WIDTH - NOTICE_COLUMN.x - NOTICE_GAP;

// ── 프레임 ──

const tabTap = lineAt(ID, 0, 0.35);
const listAt = tabTap + 4;

// ── 좌표(폰 본문 기준) ──

const bodyRect = (r: Rect): Rect => ({ ...r, y: r.y + STUDENT_BODY.y });

const absencesTab = ((center) => {
  const w = TAB_PAD_X * 2 + textWidth("불참목록", 14, 500);
  return { x: center.x - w / 2, y: center.y - TAB_H / 2, w, h: TAB_H };
})(studentShellPoint("tab_absences"));

// MY_REQUESTS 순서 = 최신순(대기중 · 승인 · 반려).
const [PENDING, APPROVED, REJECTED] = MY_REQUESTS;

const firstCard = bodyRect(absenceListRect(`card_${PENDING.id}`, PHONE_BODY.w));
const pendingBadge = bodyRect(absenceListRect(`badge_${PENDING.id}`, PHONE_BODY.w));
const approvedBadge = bodyRect(absenceListRect(`badge_${APPROVED.id}`, PHONE_BODY.w));
const rejectedBadge = bodyRect(absenceListRect(`badge_${REJECTED.id}`, PHONE_BODY.w));

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const onList = frame >= listAt;
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={onList ? LIST_URL : RECORD_URL}>
      <StudentShellMock
        width={PHONE_BODY.w}
        height={PHONE_BODY.h}
        tab={onList ? "absences" : "record"}
        showHelp
        tabPressAt={{ tab: "absences", at: tabTap }}
      >
        {onList ? (
          <AbsenceListMock width={PHONE_BODY.w} highlight={{ id: PENDING.id, from: listAt }} />
        ) : (
          <RecordMock width={PHONE_BODY.w} view="month" />
        )}
      </StudentShellMock>
    </PhoneFrame>
  );
};

export const AbsenceListScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={8} label="불참목록">
    <Stage />

    <Annotation
      {...between(lineAt(ID, 0, 0.04), tabTap)}
      {...rightLabeled(absencesTab, 3)}
      label="불참목록 탭"
      color={colors.blue600}
    />
    <Annotation
      {...between(listAt + 6, lineEnd(ID, 0))}
      {...leftLabeled(firstCard, 4)}
      label={`방금 낸 ${PENDING.dateLabel} 신청`}
      color={colors.blue600}
    />

    <Annotation
      {...between(lineAt(ID, 1, 0.05), lineEnd(ID, 1))}
      {...rightLabeled(pendingBadge, 4)}
      label="아직 확인 전"
      color={tw.yellow[600]}
    />
    <Annotation
      {...between(lineAt(ID, 1, 0.35), lineEnd(ID, 1))}
      {...rightLabeled(approvedBadge, 4)}
      label="승인된 신청"
      color={colors.green600}
    />
    <Annotation
      {...between(lineAt(ID, 1, 0.62), lineEnd(ID, 1))}
      {...rightLabeled(rejectedBadge, 4)}
      label="받아들여지지 않은 신청"
      color={colors.red600}
    />

    <div style={{ position: "absolute", left: NOTICE_COLUMN.x, top: NOTICE_COLUMN.y, width: NOTICE_COLUMN_W }}>
      <FlashNotice
        {...between(lineAt(ID, 2, 0.12), lineEnd(ID, 2) + 8)}
        text="낸 신청은 학생이 취소할 수 없습니다"
        hint="담임 선생님께 말씀드리세요"
      />
    </div>
    <Annotation {...between(lineStart(ID, 2), lineEnd(ID, 2))} {...leftLabeled(firstCard, 4)} color={colors.red600} />

    <PhoneTap at={tabTap} target={rectCenter(absencesTab)} endAt={listAt} />
  </GuideScene>
);
