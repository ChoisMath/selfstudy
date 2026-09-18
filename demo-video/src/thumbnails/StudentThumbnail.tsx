import React from "react";
import { APP_HOST } from "../app-mocks/data";
import { PHONE_BODY } from "../app-mocks/layout";
import { ParticipationCardMock } from "../student/mocks/ParticipationCardMock";
import { SeatCheckCardMock } from "../student/mocks/SeatCheckCardMock";
import { StudentShellMock, STUDENT_CARD_GAP, STUDENT_CONTENT_W } from "../student/mocks/StudentShellMock";
import { StudyHoursCardMock } from "../student/mocks/StudyHoursCardMock";
import { colors } from "../theme";
import { ThumbnailFrame, ThumbPhone } from "./ThumbnailFrame";

// 학생 편 ScheduleScene 의 화면과 같은 구성 — 참여일정 카드 위에 붙는 제목(h2 text-xl mb-4)만 여기서 다시 그린다.
const PageTitle: React.FC = () => (
  <div style={{ height: 28, marginBottom: 16, fontSize: 20, fontWeight: 700, color: colors.gray900, whiteSpace: "nowrap" }}>
    내 참여일정
  </div>
);

export const StudentThumbnail: React.FC = () => (
  <ThumbnailFrame role="학생 편" accent={colors.green600}>
    <ThumbPhone url={`${APP_HOST}/student`}>
      <StudentShellMock width={PHONE_BODY.w} height={PHONE_BODY.h} tab="schedule" showHelp>
        <PageTitle />
        <ParticipationCardMock width={STUDENT_CONTENT_W} />
        <div style={{ height: STUDENT_CARD_GAP }} />
        <StudyHoursCardMock width={STUDENT_CONTENT_W} />
        <div style={{ height: STUDENT_CARD_GAP }} />
        <SeatCheckCardMock width={STUDENT_CONTENT_W} tab="afternoon" />
      </StudentShellMock>
    </ThumbPhone>
  </ThumbnailFrame>
);
