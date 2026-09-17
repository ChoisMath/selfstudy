import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "AbsenceList";

export const AbsenceListScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={8} label="불참목록">
    {null}
  </GuideScene>
);
