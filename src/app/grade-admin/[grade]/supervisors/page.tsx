"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

const MonthlyCalendar = dynamic(() => import("@/components/admin-shared/MonthlyCalendar"), {
  ssr: false,
  loading: () => <div className="text-center py-12 text-gray-400">불러오는 중...</div>,
});

export default function GradeAdminSupervisorsPage() {
  const params = useParams();
  const grade = Number(params.grade);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{grade}학년 감독 배정</h1>
      <MonthlyCalendar
        grade={grade}
        apiBasePath={`/api/grade-admin/${grade}/supervisor-assignments`}
      />
    </div>
  );
}
