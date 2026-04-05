"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import StudentManagement from "@/components/students/StudentManagement";
import ParticipationManagement from "@/components/admin-shared/ParticipationManagement";
import SeatingEditor from "@/components/seats/SeatingEditor";
import MonthlyCalendar from "@/components/admin-shared/MonthlyCalendar";

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
  const [sessionType, setSessionType] = useState<"afternoon" | "night">("afternoon");

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return <div className="text-center py-12 text-gray-500">잘못된 학년입니다.</div>;
  }

  return (
    <div>
      {/* 탭 */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
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
      {activeTab === "seats" && (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSessionType("afternoon")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                sessionType === "afternoon"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              오후 자율학습
            </button>
            <button
              onClick={() => setSessionType("night")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                sessionType === "night"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              야간 자율학습
            </button>
          </div>
          <SeatingEditor grade={grade} sessionType={sessionType} />
        </div>
      )}
      {activeTab === "supervisors" && (
        <MonthlyCalendar
          grade={grade}
          apiBasePath={`/api/grade-admin/${grade}/supervisor-assignments`}
        />
      )}
    </div>
  );
}
