import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "Participation";

export const ParticipationScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={7} label="참여 설정">
    {null}
  </GuideScene>
);
