import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "StudyHours";

export const StudyHoursScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={4} label="참여시간">
    {null}
  </GuideScene>
);
