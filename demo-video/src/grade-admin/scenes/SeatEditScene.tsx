import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "SeatEdit";

export const SeatEditScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={12} label="교환·해제">
    {null}
  </GuideScene>
);
