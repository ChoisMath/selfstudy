"use client";

import MonthlyCalendar from "@/components/admin-shared/MonthlyCalendar";

export default function AdminSupervisorsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">감독 배정</h1>
      <MonthlyCalendar showAllGrades apiBasePath="" />
    </div>
  );
}
