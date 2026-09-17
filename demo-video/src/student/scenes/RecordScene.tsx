import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "Record";

export const RecordScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={7} label="출결기록">
    {null}
  </GuideScene>
);
