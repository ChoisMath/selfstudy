import { createGuideVideo } from "../guide/GuideVideo";
import type { GuideConfig } from "../guide/GuideContext";
import { GRADE_ADMIN_SCENES } from "./scenes";
import { captionsFor } from "./timing";
import type { GradeAdminSceneId } from "./narration";

export const GRADE_ADMIN_GUIDE_CONFIG: GuideConfig = {
  audioDir: "narration/grade-admin",
  captionsFor: (id) => captionsFor(id as GradeAdminSceneId),
  stepTotal: 16,
};

export const GradeAdminVideo = createGuideVideo(GRADE_ADMIN_SCENES, GRADE_ADMIN_GUIDE_CONFIG);
