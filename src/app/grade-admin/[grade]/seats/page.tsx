"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

const SeatingEditor = dynamic(() => import("@/components/seats/SeatingEditor"), {
  ssr: false,
  loading: () => <div className="text-center py-12 text-gray-400">불러오는 중...</div>,
});

export default function GradeAdminSeatsPage() {
  const params = useParams();
  const grade = Number(params.grade);
  const [sessionType, setSessionType] = useState<"afternoon" | "night">("afternoon");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">좌석 배치</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setSessionType("afternoon")}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            sessionType === "afternoon"
              ? "bg-white text-blue-700 shadow-sm font-medium"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          오후자습
        </button>
        <button
          onClick={() => setSessionType("night")}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            sessionType === "night"
              ? "bg-white text-blue-700 shadow-sm font-medium"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          야간자습
        </button>
      </div>

      <SeatingEditor
        key={`${grade}-${sessionType}`}
        grade={grade}
        sessionType={sessionType}
      />
    </div>
  );
}
