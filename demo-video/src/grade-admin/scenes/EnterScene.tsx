import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "Enter";

export const EnterScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={1} label="학년관리 열기">
    {null}
  </GuideScene>
);
