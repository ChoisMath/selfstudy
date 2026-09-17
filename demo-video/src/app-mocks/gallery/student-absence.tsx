import React from "react";
import type { GalleryEntry } from "./types";
import { AbsenceFormMock } from "../../student/mocks/AbsenceFormMock";
import { AbsenceListMock } from "../../student/mocks/AbsenceListMock";
import { RecordMock } from "../../student/mocks/RecordMock";
import { ABSENCE_FORM_EXAMPLE, PARTICIPATION } from "../../student/data";

const WIDTH = 390; // PHONE_BODY.w

// 월요일(요일 인덱스 0)에 참여하지 않는 세션은 비활성 버튼으로 보여준다.
const disabledMonday = PARTICIPATION.filter((row) => !row.days[0]).map((row) => row.session);

const AbsenceFormGallery: React.FC = () => (
  <AbsenceFormMock
    width={WIDTH}
    date={ABSENCE_FORM_EXAMPLE.date}
    sessions={ABSENCE_FORM_EXAMPLE.sessions}
    reason={ABSENCE_FORM_EXAMPLE.reason}
    disabledSessions={disabledMonday}
  />
);

const AbsenceListGallery: React.FC = () => <AbsenceListMock width={WIDTH} />;

const RecordWeekGallery: React.FC = () => <RecordMock width={WIDTH} view="week" />;

const RecordMonthGallery: React.FC = () => <RecordMock width={WIDTH} view="month" />;

export const ENTRIES: GalleryEntry[] = [
  { id: "Student-AbsenceForm", component: AbsenceFormGallery, width: WIDTH, height: 430 },
  { id: "Student-AbsenceList", component: AbsenceListGallery, width: WIDTH, height: 320 },
  { id: "Student-Record-Week", component: RecordWeekGallery, width: WIDTH, height: 460 },
  { id: "Student-Record-Month", component: RecordMonthGallery, width: WIDTH, height: 630 },
];
