import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "StudentAdd";

export const StudentAddScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={4} label="학생 추가">
    {null}
  </GuideScene>
);
