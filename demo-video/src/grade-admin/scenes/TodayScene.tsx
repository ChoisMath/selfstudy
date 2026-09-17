import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "Today";

export const TodayScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={2} label="오늘출결">
    {null}
  </GuideScene>
);
