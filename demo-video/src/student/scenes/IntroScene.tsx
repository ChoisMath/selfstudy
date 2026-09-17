import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "Intro";

export const IntroScene: React.FC<DemoProps> = () => <GuideScene id={ID}>{null}</GuideScene>;
