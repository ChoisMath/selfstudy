import type { GalleryEntry } from "./types";
import { ENTRIES as login } from "./login";
import { ENTRIES as attendance } from "./attendance";
import { ENTRIES as attendancePanels } from "./attendance-panels";
import { ENTRIES as schedule } from "./schedule";
import { ENTRIES as homeroomTables } from "./homeroom-tables";
import { ENTRIES as homeroomForms } from "./homeroom-forms";

export const MOCK_GALLERY: GalleryEntry[] = [
  ...login,
  ...attendance,
  ...attendancePanels,
  ...schedule,
  ...homeroomTables,
  ...homeroomForms,
];
