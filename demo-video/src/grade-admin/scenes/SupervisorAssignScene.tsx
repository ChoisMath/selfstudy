import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "SupervisorAssign";

export const SupervisorAssignScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={14} label="감독 배정">
    {null}
  </GuideScene>
);
