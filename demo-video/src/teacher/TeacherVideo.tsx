import { createGuideVideo } from "../guide/GuideVideo";
import type { GuideConfig } from "../guide/GuideContext";
import { TEACHER_SCENES } from "./scenes";
import { captionsFor } from "./timing";
import type { TeacherSceneId } from "./narration";

export const TEACHER_GUIDE_CONFIG: GuideConfig = {
  audioDir: "narration/teacher",
  captionsFor: (id) => captionsFor(id as TeacherSceneId),
  stepTotal: 19,
};

export const TeacherVideo = createGuideVideo(TEACHER_SCENES, TEACHER_GUIDE_CONFIG);
