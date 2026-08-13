export type Orientation = "landscape" | "portrait";

export const MM_TO_PX = 96 / 25.4;

export const A4_SHORT_MM = 210;
export const A4_LONG_MM = 297;
export const PAGE_PADDING_MM = 8;

export const SEAT_CELL_WIDTH = 96;
export const SEAT_CELL_HEIGHT = 60;
export const SEAT_CELL_GAP = 4;

export function pageSizeMm(orientation: Orientation): { width: number; height: number } {
  return orientation === "landscape"
    ? { width: A4_LONG_MM, height: A4_SHORT_MM }
    : { width: A4_SHORT_MM, height: A4_LONG_MM };
}

export function contentBoxPx(orientation: Orientation): { width: number; height: number } {
  const { width, height } = pageSizeMm(orientation);
  return {
    width: (width - PAGE_PADDING_MM * 2) * MM_TO_PX,
    height: (height - PAGE_PADDING_MM * 2) * MM_TO_PX,
  };
}

// A4에서 축소 배율을 최대화하는 분기점은 정확히 폭/높이 = 1 이다.
export function suggestOrientation(contentWidth: number, contentHeight: number): Orientation {
  if (contentWidth <= 0 || contentHeight <= 0) return "portrait";
  return contentWidth / contentHeight >= 1 ? "landscape" : "portrait";
}

export function computeFitScale(
  contentWidth: number,
  contentHeight: number,
  orientation: Orientation
): number {
  if (contentWidth <= 0 || contentHeight <= 0) return 1;
  const box = contentBoxPx(orientation);
  return Math.min(box.width / contentWidth, box.height / contentHeight);
}
