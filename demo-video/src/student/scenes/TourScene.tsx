import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "Tour";

export const TourScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={2} label="화면 구성">
    {null}
  </GuideScene>
);
