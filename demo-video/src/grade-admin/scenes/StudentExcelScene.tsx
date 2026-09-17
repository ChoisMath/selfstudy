import React from "react";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";

const ID = "StudentExcel";

export const StudentExcelScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={5} label="Excel 업로드">
    {null}
  </GuideScene>
);
