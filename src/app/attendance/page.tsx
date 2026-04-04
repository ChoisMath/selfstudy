"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [assignedGrade, setAssignedGrade] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/supervisor-assignments/my-today")
      .then((r) => r.json())
      .then((data) => {
        if (data.hasAssignment && data.grade) {
          router.replace(`/attendance/${data.grade}`);
        } else {
          setShowModal(true);
          setLoading(false);
        }
      })
      .catch(() => {
        setShowModal(true);
        setLoading(false);
      });
  }, [router]);

  if (loading && !showModal) {
    return <div className="flex items-center justify-center min-h-[60vh] text-gray-500">감독 배정 확인 중...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full mx-4 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">출석 확인할 학년 선택</h2>
        {assignedGrade && (
          <p className="text-sm text-blue-600 mb-4">* 오늘 감독: {assignedGrade}학년 (배정됨)</p>
        )}
        <div className="flex gap-3 justify-center mt-4">
          {[1, 2, 3].map((g) => (
            <button
              key={g}
              onClick={() => router.push(`/attendance/${g}`)}
              className={`px-6 py-4 rounded-lg text-lg font-bold transition-colors ${
                assignedGrade === g
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {g}학년
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
