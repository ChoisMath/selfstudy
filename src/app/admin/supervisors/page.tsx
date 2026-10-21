"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SupervisorSummaryModal from "@/components/homeroom/SupervisorSummaryModal";
import { chrome } from "@/components/ui/chrome";

const MonthlyCalendar = dynamic(() => import("@/components/admin-shared/MonthlyCalendar"), {
  ssr: false,
  loading: () => <div className="text-center py-12 text-ink-muted">불러오는 중…</div>,
});

export default function AdminSupervisorsPage() {
  const [showSummary, setShowSummary] = useState(false);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button type="button" onClick={() => setShowSummary(true)} className={chrome.secondaryButton}>
          누계
        </button>
      </div>
      <MonthlyCalendar
        showAllGrades
        apiBasePath=""
        excelHref="/api/admin/supervisors/export"
      />
      {showSummary && (
        <SupervisorSummaryModal onClose={() => setShowSummary(false)} />
      )}
    </div>
  );
}
