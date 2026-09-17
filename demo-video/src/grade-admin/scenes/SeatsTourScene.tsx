import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "SeatsTour";

export const SeatsTourScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={9} label="좌석 화면">
    {null}
  </GuideScene>
);
