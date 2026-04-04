"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import SeatingPeriodList from "./SeatingPeriodList";
import SeatingEditor from "./SeatingEditor";

type SeatingPeriod = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  grade: number;
  isActive: boolean;
  createdAt: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SeatingManagement({ grade }: { grade: number }) {
  const [selectedPeriod, setSelectedPeriod] = useState<SeatingPeriod | null>(null);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<{ periods: SeatingPeriod[] }>(
    `/api/grade-admin/${grade}/seating-periods`,
    fetcher
  );

  const periods = data?.periods ?? [];

  if (selectedPeriod) {
    return (
      <div>
        <button
          onClick={() => setSelectedPeriod(null)}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          기간 목록으로 돌아가기
        </button>
        <SeatingEditor grade={grade} period={selectedPeriod} />
      </div>
    );
  }

  return (
    <SeatingPeriodList
      grade={grade}
      periods={periods}
      isLoading={isLoading}
      error={error}
      onSelect={setSelectedPeriod}
      onMutate={mutate}
    />
  );
}
