"use client";

import { useParams } from "next/navigation";
import MonthlyCalendar from "@/components/admin-shared/MonthlyCalendar";

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
