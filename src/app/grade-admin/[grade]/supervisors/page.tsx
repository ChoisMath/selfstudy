"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import SupervisorSummaryModal from "@/components/homeroom/SupervisorSummaryModal";
import { chrome } from "@/components/ui/chrome";

const MonthlyCalendar = dynamic(() => import("@/components/admin-shared/MonthlyCalendar"), {
  ssr: false,
  loading: () => <div className="text-center py-12 text-ink-muted">불러오는 중…</div>,
});

export default function GradeAdminSupervisorsPage() {
  const params = useParams();
  const grade = Number(params.grade);
  const [showSummary, setShowSummary] = useState(false);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-ink">{grade}학년 감독 배정</h1>
        <button type="button" onClick={() => setShowSummary(true)} className={chrome.secondaryButton}>
          누계
        </button>
      </div>
      <MonthlyCalendar
        grade={grade}
        apiBasePath={`/api/grade-admin/${grade}/supervisor-assignments`}
        excelHref={`/api/grade-admin/${grade}/supervisor-assignments/export`}
      />
      {showSummary && (
        <SupervisorSummaryModal onClose={() => setShowSummary(false)} filterGrade={grade} />
      )}
    </div>
  );
}
