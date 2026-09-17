import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "Schedule";

export const ScheduleScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={3} label="참여일정">
    {null}
  </GuideScene>
);
