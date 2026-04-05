"use client";

import dynamic from "next/dynamic";

const MonthlyCalendar = dynamic(() => import("@/components/admin-shared/MonthlyCalendar"), {
  ssr: false,
  loading: () => <div className="text-center py-12 text-gray-400">불러오는 중...</div>,
});

export default function AdminSupervisorsPage() {
  return (
    <div>
      <MonthlyCalendar showAllGrades apiBasePath="" />
    </div>
  );
}
