"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const SeatingEditor = dynamic(() => import("@/components/seats/SeatingEditor"), {
  ssr: false,
  loading: () => <div className="text-center py-12 text-gray-400">불러오는 중...</div>,
});

type TabConfig = {
  label: string;
  grade: number;
  sessionType: "afternoon" | "night";
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
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIdx(idx)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeIdx === idx
                ? "bg-white text-blue-700 shadow-sm font-medium"
                : "text-gray-600 hover:text-gray-900"
            }`}
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
