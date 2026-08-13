"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  computeFitScale,
  pageSizeMm,
  suggestOrientation,
  PAGE_PADDING_MM,
  type Orientation,
} from "@/lib/seats/print-layout";

export default function PrintPageFitter({
  orientation,
  onMeasure,
  children,
}: {
  orientation: Orientation;
  onMeasure?: (suggested: Orientation) => void;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const measureCallbackRef = useRef(onMeasure);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontTick, setFontTick] = useState(0);

  useEffect(() => {
    measureCallbackRef.current = onMeasure;
  }, [onMeasure]);

  // 웹폰트가 늦게 로드되면 첫 측정값이 실제보다 작다. 로드 완료 후 한 번 더 잰다.
  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) setFontTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    if (width === size.width && height === size.height) return;
    setSize({ width, height });
    measureCallbackRef.current?.(suggestOrientation(width, height));
  }, [size.width, size.height, fontTick, children]);

  const scale = computeFitScale(size.width, size.height, orientation);
  const page = pageSizeMm(orientation);

  return (
    <div
      className={`print-page mx-auto mb-6 bg-white shadow-lg ${
        orientation === "landscape" ? "print-page-landscape" : "print-page-portrait"
      }`}
      style={{
        width: `${page.width}mm`,
        height: `${page.height}mm`,
        padding: `${PAGE_PADDING_MM}mm`,
      }}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        <div ref={contentRef} className="shrink-0" style={{ transform: `scale(${scale})` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
