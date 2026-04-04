"use client";

import { useState } from "react";
import StudentManagement from "@/components/students/StudentManagement";

const GRADES = [1, 2, 3] as const;

export default function AdminStudentsPage() {
  const [selectedGrade, setSelectedGrade] = useState<number>(1);

  return (
    <div>
      {/* 학년 탭 */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {GRADES.map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGrade(g)}
            className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedGrade === g
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {g}학년
          </button>
        ))}
      </div>

      {/* 선택된 학년의 학생 관리 */}
      <StudentManagement key={selectedGrade} grade={selectedGrade} />
    </div>
  );
}
