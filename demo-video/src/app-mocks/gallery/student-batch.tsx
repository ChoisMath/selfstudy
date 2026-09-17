import type { GalleryEntry } from "./types";
import { PHONE_BODY } from "../layout";
import { BatchAbsenceMock } from "../../student/mocks/BatchAbsenceMock";

export const ENTRIES: GalleryEntry[] = [
  {
    id: "Student-Batch",
    width: PHONE_BODY.w,
    height: PHONE_BODY.h,
    component: () => (
      <BatchAbsenceMock
        width={PHONE_BODY.w}
        height={PHONE_BODY.h}
        checked={[1, 4]}
        sessionPicks={{ 1: ["afternoon1"], 4: ["night"] }}
        reason="academy"
        detail={{ text: "수학 학원", typeFrom: -1000 }}
      />
    ),
  },
];
