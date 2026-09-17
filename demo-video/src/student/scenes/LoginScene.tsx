import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "Login";

export const LoginScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={1} label="로그인">
    {null}
  </GuideScene>
);
