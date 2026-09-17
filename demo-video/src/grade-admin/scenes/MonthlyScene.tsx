import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "Monthly";

export const MonthlyScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={16} label="월간출결">
    {null}
  </GuideScene>
);
