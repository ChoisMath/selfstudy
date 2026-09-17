import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "ClassroomConfig";

export const ClassroomConfigScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={10} label="교실 구조">
    {null}
  </GuideScene>
);
