import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "Seat";

export const SeatScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={5} label="좌석 확인">
    {null}
  </GuideScene>
);
