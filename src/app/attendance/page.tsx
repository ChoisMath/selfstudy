"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { chrome } from "@/components/ui/chrome";

export default function AttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [assignedGrade] = useState<number | null>(null);

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
    return <div className="flex items-center justify-center min-h-[60dvh] text-ink-muted" role="status" aria-live="polite">감독 배정 확인 중…</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-[60dvh]">
      <div className={`${chrome.card} p-4 sm:p-8 max-w-sm w-full mx-2 text-center`}>
        <h2 className="text-lg font-semibold text-ink mb-2 text-balance">출석 확인할 학년을 고르세요</h2>
        {assignedGrade && (
          <p className="text-sm text-primary mb-4">오늘 감독: {assignedGrade}학년 (배정됨)</p>
        )}
        <div className="flex gap-2 sm:gap-3 justify-center mt-4">
          {[1, 2, 3].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => router.push(`/attendance/${g}`)}
              className={`min-h-14 px-4 sm:px-6 rounded-2xl text-base sm:text-lg font-bold whitespace-nowrap cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                assignedGrade === g
                  ? "bg-primary text-white hover:bg-primary-deep"
                  : "bg-butter text-ink hover:bg-peach"
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
