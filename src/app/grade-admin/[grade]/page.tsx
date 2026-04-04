"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import StudentManagement from "@/components/students/StudentManagement";
import ParticipationManagement from "@/components/admin-shared/ParticipationManagement";
import SeatingManagement from "@/components/seats/SeatingManagement";
import SupervisorManagement from "@/components/admin-shared/SupervisorManagement";

const TABS = [
  { key: "students", label: "학생 관리" },
  { key: "participation", label: "참여 설정" },
  { key: "seats", label: "좌석 배치" },
  { key: "supervisors", label: "감독 배정" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function GradeAdminPage() {
  const params = useParams();
  const grade = parseInt(params.grade as string);
  const [activeTab, setActiveTab] = useState<TabKey>("students");

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return <div className="text-center py-12 text-gray-500">잘못된 학년입니다.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{grade}학년 데이터관리</h1>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "students" && <StudentManagement grade={grade} />}
      {activeTab === "participation" && <ParticipationManagement grade={grade} />}
      {activeTab === "seats" && <SeatingManagement grade={grade} />}
      {activeTab === "supervisors" && <SupervisorManagement grade={grade} />}
    </div>
  );
}
