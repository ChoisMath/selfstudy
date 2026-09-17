"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import AbsenceRequestForm from "@/components/student/AbsenceRequestForm";
import ParticipationScheduleCard from "@/components/student/ParticipationScheduleCard";
import SeatCheckCard from "@/components/student/SeatCheckCard";
import { getKstTodayString } from "@/lib/calendar";
import type { ParticipationDaysMap } from "@/lib/participation-days";
import { SESSION_TYPES, type SessionType } from "@/lib/sessions";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Ranking = {
  rank: number;
  totalRanked: number;
  topPercent: number;
};

type ParticipationData = {
  participationDays: ParticipationDaysMap;
  monthlyStudyHours: number;
  yearlyStudyHours: number;
  ranking: Ranking | null;
};

type Draft = { date: string; sessionTypes: SessionType[] };

export default function StudentParticipationPage() {
  const { data, isLoading } = useSWR<ParticipationData>("/api/student/participation-days", fetcher);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState("");
  const today = getKstTodayString();
  const participationDays = data?.participationDays ?? {};

  function openForm(sessionType: SessionType, date: string) {
    setNotice("");
    setDraft({ date, sessionTypes: [sessionType] });
    window.scrollTo({ top: 0 });
  }

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">불러오는 중...</div>;
  }

  if (draft) {
    return (
      <AbsenceRequestForm
        initialDate={draft.date}
        initialSessionTypes={draft.sessionTypes}
        today={today}
        participationDays={participationDays}
        onClose={() => setDraft(null)}
        onSubmitted={() => {
          setDraft(null);
          setNotice("불참 신청이 접수되었습니다.");
        }}
      />
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">내 참여일정</h2>

      {notice && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          <span>{notice}</span>
          <Link
            href="/student/absence-requests"
            className="inline-flex min-h-11 items-center font-medium underline whitespace-nowrap"
          >
            불참목록 보기
          </Link>
        </div>
      )}

      <ParticipationScheduleCard participationDays={participationDays} today={today} onSelectDay={openForm} />

      {data && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">자율학습 참여시간</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-500 mb-1">이번 달</p>
              <p className="text-2xl font-bold text-blue-700">
                {data.monthlyStudyHours.toFixed(1)}
              </p>
              <p className="text-xs text-blue-400 mt-0.5">시간</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <p className="text-xs text-indigo-500 mb-1">학년도 누계</p>
              <p className="text-2xl font-bold text-indigo-700">
                {data.yearlyStudyHours.toFixed(1)}
              </p>
              <p className="text-xs text-indigo-400 mt-0.5">시간</p>
              {data.ranking && (
                <p className="text-[11px] text-amber-600 mt-1 font-semibold">
                  {data.ranking.rank}위 (상위 {data.ranking.topPercent}%)
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <SeatCheckCard participationDays={participationDays} />

      {SESSION_TYPES.every((sessionType) => !participationDays[sessionType]) && (
        <p className="mt-4 text-sm text-gray-400">
          참여일정이 설정되지 않았습니다. 담당 선생님에게 문의하세요.
        </p>
      )}
    </div>
  );
}
