"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { type SeatSessionType } from "@/lib/sessions";
import { chrome } from "@/components/ui/chrome";

const SeatingEditor = dynamic(() => import("@/components/seats/SeatingEditor"), {
  ssr: false,
  loading: () => <div className="text-center py-12 text-ink-muted">불러오는 중…</div>,
});

type TabConfig = {
  label: string;
  grade: number;
  sessionType: SeatSessionType;
};

const TABS: TabConfig[] = [
  { label: "1학년 오자", grade: 1, sessionType: "afternoon" },
  { label: "1학년 야자", grade: 1, sessionType: "night" },
  { label: "2학년 오자", grade: 2, sessionType: "afternoon" },
  { label: "2학년 야자", grade: 2, sessionType: "night" },
  { label: "3학년 오자", grade: 3, sessionType: "afternoon" },
  { label: "3학년 야자", grade: 3, sessionType: "night" },
];

export default function AdminSeatsPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = TABS[activeIdx];

  return (
    <div>
      <div role="tablist" aria-label="학년·세션" className="mb-6 flex flex-wrap gap-1">
        {TABS.map((tab, idx) => (
          <button
            key={idx}
            type="button"
            role="tab"
            aria-selected={activeIdx === idx}
            onClick={() => setActiveIdx(idx)}
            className={chrome.tab(activeIdx === idx)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SeatingEditor
        key={`${active.grade}-${active.sessionType}`}
        grade={active.grade}
        sessionType={active.sessionType}
      />
    </div>
  );
}
