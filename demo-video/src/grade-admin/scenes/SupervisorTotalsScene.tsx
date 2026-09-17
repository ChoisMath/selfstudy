import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "SupervisorTotals";

export const SupervisorTotalsScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={15} label="감독 누계">
    {null}
  </GuideScene>
);
