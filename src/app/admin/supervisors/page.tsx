"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SupervisorSummaryModal from "@/components/homeroom/SupervisorSummaryModal";

const MonthlyCalendar = dynamic(() => import("@/components/admin-shared/MonthlyCalendar"), {
  ssr: false,
  loading: () => <div className="text-center py-12 text-gray-400">불러오는 중...</div>,
});

export default function AdminSupervisorsPage() {
  const [showSummary, setShowSummary] = useState(false);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowSummary(true)}
          className="px-2.5 py-1 text-xs rounded-md border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors whitespace-nowrap"
        >
          누계
        </button>
      </div>
      <MonthlyCalendar showAllGrades apiBasePath="" />
      {showSummary && (
        <SupervisorSummaryModal onClose={() => setShowSummary(false)} />
      )}
    </div>
  );
}
