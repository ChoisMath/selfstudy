"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import SupervisorSummaryModal from "@/components/homeroom/SupervisorSummaryModal";

const MonthlyCalendar = dynamic(() => import("@/components/admin-shared/MonthlyCalendar"), {
  ssr: false,
  loading: () => <div className="text-center py-12 text-gray-400">불러오는 중...</div>,
});

export default function GradeAdminSupervisorsPage() {
  const params = useParams();
  const grade = Number(params.grade);
  const [showSummary, setShowSummary] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{grade}학년 감독 배정</h1>
        <button
          onClick={() => setShowSummary(true)}
          className="px-2.5 py-1 text-xs rounded-md border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors whitespace-nowrap"
        >
          누계
        </button>
      </div>
      <MonthlyCalendar
        grade={grade}
        apiBasePath={`/api/grade-admin/${grade}/supervisor-assignments`}
      />
      {showSummary && (
        <SupervisorSummaryModal onClose={() => setShowSummary(false)} filterGrade={grade} />
      )}
    </div>
  );
}
