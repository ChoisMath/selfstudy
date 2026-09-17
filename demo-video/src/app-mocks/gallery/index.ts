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
];
