"use client";

import { useState } from "react";
import SeatingManagement from "@/components/seats/SeatingManagement";

export default function AdminSeatsPage() {
  const [grade, setGrade] = useState(1);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">좌석 배치 관리</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[1, 2, 3].map((g) => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                grade === g
                  ? "bg-white text-blue-700 shadow-sm font-medium"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {g}학년
            </button>
          ))}
        </div>
      </div>
      <SeatingManagement key={grade} grade={grade} />
    </div>
  );
}
