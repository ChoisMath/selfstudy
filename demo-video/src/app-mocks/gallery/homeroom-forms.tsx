import type { GalleryEntry } from "./types";
import { AbsenceReasonFormMock } from "../../teacher/mocks/AbsenceReasonFormMock";
import { HomeroomRequestsMock } from "../../teacher/mocks/HomeroomRequestsMock";
import { PasswordFormMock } from "../../teacher/mocks/PasswordFormMock";

const WIDTH = 1248;
const HEIGHT = 520;

export const ENTRIES: GalleryEntry[] = [
  {
    id: "AbsenceReasonForm",
    width: WIDTH,
    height: HEIGHT,
    component: () => (
      <AbsenceReasonFormMock
        width={WIDTH}
        step={{ student: 2, date: 2, session: 2, reason: 2, detailTypeFrom: 4, submitPressAt: 16, successFrom: 20 }}
      />
    ),
  },
  {
    id: "HomeroomRequests",
    width: WIDTH,
    height: HEIGHT,
    component: () => <HomeroomRequestsMock width={WIDTH} filter="all" />,
  },
  {
    id: "PasswordForm",
    width: WIDTH,
    height: HEIGHT,
    component: () => (
      <PasswordFormMock
        width={WIDTH}
        current={{ typeFrom: 0 }}
        next={{ typeFrom: 2 }}
        confirm={{ typeFrom: 4 }}
        submitPressAt={22}
        successFrom={26}
      />
    ),
  },
];
