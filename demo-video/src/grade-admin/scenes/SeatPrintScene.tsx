import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "SeatPrint";

export const SeatPrintScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={13} label="출력">
    {null}
  </GuideScene>
);
