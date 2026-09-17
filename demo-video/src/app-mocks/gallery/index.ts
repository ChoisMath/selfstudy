import type { GalleryEntry } from "./types";
import { ENTRIES as login } from "./login";
import { ENTRIES as attendance } from "./attendance";
import { ENTRIES as attendancePanels } from "./attendance-panels";
import { ENTRIES as schedule } from "./schedule";
import { ENTRIES as homeroomTables } from "./homeroom-tables";
import { ENTRIES as homeroomForms } from "./homeroom-forms";
import { ENTRIES as studentSchedule } from "./student-schedule";
import { ENTRIES as studentAbsence } from "./student-absence";
import { ENTRIES as studentBatch } from "./student-batch";
import { ENTRIES as gradeStudents } from "./grade-students";
import { ENTRIES as gradeParticipation } from "./grade-participation";
import { ENTRIES as gradeSeats } from "./grade-seats";
import { ENTRIES as gradeSupervisor } from "./grade-supervisor";

export const MOCK_GALLERY: GalleryEntry[] = [
  ...login,
  ...attendance,
  ...attendancePanels,
  ...schedule,
  ...homeroomTables,
  ...homeroomForms,
  ...studentSchedule,
  ...studentAbsence,
  ...studentBatch,
  ...gradeStudents,
  ...gradeParticipation,
  ...gradeSeats,
  ...gradeSupervisor,
];
