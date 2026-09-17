import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "Helper";

export const HelperScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={6} label="도우미">
    {null}
  </GuideScene>
);
