import { createGuideVideo } from "../guide/GuideVideo";
import type { GuideConfig } from "../guide/GuideContext";
import { STUDENT_SCENES } from "./scenes";
import { captionsFor } from "./timing";
import type { StudentSceneId } from "./narration";

export const STUDENT_GUIDE_CONFIG: GuideConfig = {
  audioDir: "narration/student",
  captionsFor: (id) => captionsFor(id as StudentSceneId),
  stepTotal: 9,
};

export const StudentVideo = createGuideVideo(STUDENT_SCENES, STUDENT_GUIDE_CONFIG);
