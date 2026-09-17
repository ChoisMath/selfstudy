import React from "react";
import { Annotation } from "../../components/Annotation";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_X, PHONE_Y } from "../../components/phone";
import { colors } from "../../theme";
import { GuideScene } from "../../guide/GuideScene";
import { lineAt, lineEnd } from "../timing";
import { textWidth } from "../../app-mocks/AttendanceHeaderMock";
import { APP_HOST } from "../../app-mocks/data";
import { PHONE_BODY, type Point, type Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { ParticipationCardMock } from "../mocks/ParticipationCardMock";
import { SeatCheckCardMock } from "../mocks/SeatCheckCardMock";
import {
  StudentShellMock,
  STUDENT_CARD_GAP,
  STUDENT_CONTENT_W,
  studentShellPoint,
  type StudentTab,
} from "../mocks/StudentShellMock";
import { StudyHoursCardMock } from "../mocks/StudyHoursCardMock";
import { ME_STUDENT, ME_STUDENT_HEADER } from "../data";
import type { DemoProps } from "../../props";
import { between, phoneBox } from "../../teacher/scenes/phone-helpers";

const ID = "Tour";

const STUDENT_URL = `${APP_HOST}/student`;
const W = PHONE_BODY.w;

// student/page.tsx h2(text-xl mb-4) — 목업은 제목을 그리지 않아 장면이 같은 크기로 그린다.
const PageTitle: React.FC = () => (
  <div style={{ height: 28, marginBottom: 16, fontSize: 20, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap" }}>
    내 참여일정
  </div>
);

const centered = (p: Point, w: number, h: number): Rect => ({ x: p.x - w / 2, y: p.y - h / 2, w, h });

// 셸은 헤더 이름·탭의 중심점만 내보낸다 — 상자는 같은 글자 폭 계산(layout.tsx text-lg/text-sm, 탭 px-4 text-sm)으로 되살린다.
const NAME_H = 28;
const nameRect = centered(
  studentShellPoint("name"),
  textWidth(`${ME_STUDENT.name} `, 18, 700) + textWidth(`(${ME_STUDENT_HEADER})`, 14, 400),
  NAME_H,
);

const TAB_PAD_X = 16;
const TAB_H = 44;
const tabRect = (tab: StudentTab, label: string) =>
  centered(studentShellPoint(`tab_${tab}`), TAB_PAD_X * 2 + textWidth(label, 14, 500), TAB_H);

const TABS: { tab: StudentTab; label: string; at: number }[] = [
  { tab: "schedule", label: "참여일정", at: 0.13 },
  { tab: "record", label: "출결기록", at: 0.36 },
  { tab: "absences", label: "불참목록", at: 0.58 },
];

const tabWindows = TABS.map((t, i) => {
  const from = lineAt(ID, 1, t.at);
  const to = i === TABS.length - 1 ? lineEnd(ID, 1) + 10 : lineAt(ID, 1, TABS[i + 1].at) + 4;
  return { ...t, from, to };
});

const Stage: React.FC = () => (
  <PhoneFrame x={PHONE_X} y={PHONE_Y} url={STUDENT_URL}>
    <StudentShellMock width={W} height={PHONE_BODY.h} tab="schedule" showHelp>
      <PageTitle />
      <ParticipationCardMock width={STUDENT_CONTENT_W} />
      <div style={{ height: STUDENT_CARD_GAP }} />
      <StudyHoursCardMock width={STUDENT_CONTENT_W} />
      <div style={{ height: STUDENT_CARD_GAP }} />
      <SeatCheckCardMock width={STUDENT_CONTENT_W} tab="afternoon" />
    </StudentShellMock>
  </PhoneFrame>
);

export const TourScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={2} label="화면 구성">
    <Stage />

    <Annotation
      {...between(lineAt(ID, 0, 0.15), lineEnd(ID, 0) + 6)}
      {...phoneBox(nameRect, 6, "left")}
      label="내 이름 · 학년-반-번호"
      color={colors.blue600}
    />

    {tabWindows.map((t) => (
      <Annotation
        key={t.tab}
        {...between(t.from, t.to)}
        {...phoneBox(tabRect(t.tab, t.label), 3, "left")}
        label={t.label}
        color={colors.red600}
      />
    ))}
  </GuideScene>
);
