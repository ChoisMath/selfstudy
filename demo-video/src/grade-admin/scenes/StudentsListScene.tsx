import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "StudentsList";

export const StudentsListScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={3} label="학생 목록">
    {null}
  </GuideScene>
);
