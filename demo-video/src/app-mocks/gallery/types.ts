import type React from "react";

export type GalleryEntry = {
  id: string;
  component: React.FC;
  width: number;
  height: number;
  durationInFrames?: number;
};
