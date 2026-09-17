import React from "react";
import { PHONE_BODY } from "../layout";
import {
  StudentShellMock,
  STUDENT_CARD_GAP,
  STUDENT_CONTENT_W,
} from "../../student/mocks/StudentShellMock";
import { ParticipationCardMock } from "../../student/mocks/ParticipationCardMock";
import { StudyHoursCardMock } from "../../student/mocks/StudyHoursCardMock";
import { SeatCheckCardMock } from "../../student/mocks/SeatCheckCardMock";
import { tw } from "../tw";
import type { GalleryEntry } from "./types";

const CardGap: React.FC = () => <div style={{ height: STUDENT_CARD_GAP }} />;

const PageTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ marginBottom: 16, fontSize: 20, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap" }}>
    {children}
  </div>
);

// student/page.tsx 전체(제목 + 참여일정·참여시간·좌석 3카드).
const ScheduleStill: React.FC = () => (
  <StudentShellMock width={PHONE_BODY.w} height={PHONE_BODY.h} tab="schedule" showHelp>
    <PageTitle>내 참여일정</PageTitle>
    <ParticipationCardMock width={STUDENT_CONTENT_W} />
    <CardGap />
    <StudyHoursCardMock width={STUDENT_CONTENT_W} />
    <CardGap />
    <SeatCheckCardMock width={STUDENT_CONTENT_W} tab="afternoon" />
  </StudentShellMock>
);

// 학급 도우미 로그인 시 탭 줄에 "일괄신청"이 추가로 보이는 상태(student/layout.tsx 31행 user.isHelper).
const ShellHelperStill: React.FC = () => (
  <StudentShellMock width={PHONE_BODY.w} height={PHONE_BODY.h} tab="batch" showBatchTab showHelp>
    {null}
  </StudentShellMock>
);

// 좌석 확인 카드의 야간 탭 — 분단 없는 단일 방(NIGHT_ROOMS[0])이라 복도/창문/교탁이 없다.
const SeatNightStill: React.FC = () => (
  <StudentShellMock width={PHONE_BODY.w} height={PHONE_BODY.h} tab="schedule" showHelp>
    <PageTitle>내 참여일정</PageTitle>
    <SeatCheckCardMock width={STUDENT_CONTENT_W} tab="night" />
  </StudentShellMock>
);

export const ENTRIES: GalleryEntry[] = [
  { id: "Student-Schedule", component: ScheduleStill, width: PHONE_BODY.w, height: PHONE_BODY.h },
  { id: "Student-Shell-Helper", component: ShellHelperStill, width: PHONE_BODY.w, height: PHONE_BODY.h },
  { id: "Student-Seat-Night", component: SeatNightStill, width: PHONE_BODY.w, height: PHONE_BODY.h },
];
