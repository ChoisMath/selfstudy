import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "AbsenceApply";

export const AbsenceApplyScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={6} label="불참 신청">
    {null}
  </GuideScene>
);
