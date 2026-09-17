import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "Outro";

export const OutroScene: React.FC<DemoProps> = () => <GuideScene id={ID}>{null}</GuideScene>;
