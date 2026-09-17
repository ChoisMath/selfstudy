import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "Batch";

export const BatchScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={9} label="일괄신청">
    {null}
  </GuideScene>
);
