"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { SEAT_SESSION_TYPES, SEAT_SESSION_META, type SeatSessionType } from "@/lib/sessions";
import { chrome } from "@/components/ui/chrome";

const SeatingEditor = dynamic(() => import("@/components/seats/SeatingEditor"), {
  ssr: false,
  loading: () => <div className="text-center py-12 text-ink-muted">불러오는 중…</div>,
});

export default function GradeAdminSeatsPage() {
  const params = useParams();
  const grade = Number(params.grade);
  const [sessionType, setSessionType] = useState<SeatSessionType>("afternoon");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">좌석 배치</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {SEAT_SESSION_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={sessionType === t}
            onClick={() => setSessionType(t)}
            className={chrome.chip(sessionType === t)}
          >
            {SEAT_SESSION_META[t].label}
          </button>
        ))}
      </div>

      <SeatingEditor
        key={`${grade}-${sessionType}`}
        grade={grade}
        sessionType={sessionType}
      />
    </div>
  );
}
