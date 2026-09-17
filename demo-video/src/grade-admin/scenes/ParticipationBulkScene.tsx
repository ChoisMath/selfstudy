import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "ParticipationBulk";

export const ParticipationBulkScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={8} label="일괄 설정">
    {null}
  </GuideScene>
);
