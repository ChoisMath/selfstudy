import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "SeatAssign";

export const SeatAssignScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={11} label="좌석 배정">
    {null}
  </GuideScene>
);
