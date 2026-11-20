"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { seatLayoutsUrl } from "@/lib/seats/seat-layouts-url";
import { SEAT_SESSION_TYPES, SHARED_SEAT_SESSION_LABEL, type SeatSessionType } from "@/lib/sessions";

const SeatingEditor = dynamic(() => import("./SeatingEditor"), {
  ssr: false,
  loading: () => <div className="text-center py-12 text-gray-400">불러오는 중...</div>,
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TAB_LABELS: Record<SeatSessionType, string> = {
  afternoon: "오후 자율학습",
  night: "야간 자율학습",
};
const TAB_BASE = "px-4 py-2 text-sm font-medium rounded-md transition-colors";
const TAB_ACTIVE = "bg-blue-600 text-white";
const TAB_IDLE = "bg-gray-100 text-gray-600 hover:bg-gray-200";

// 좌석 세션 선택 + 좌석 편집기. 오후가 야간 배치를 함께 쓰는 학년은 선택 버튼 없이 한 페이지로 보여 준다.
export default function SeatSessionPanel({
  grade,
  tabsClassName = "mb-4",
}: {
  grade: number;
  tabsClassName?: string;
}) {
  const [sessionType, setSessionType] = useState<SeatSessionType>("afternoon");
  // 편집기와 같은 SWR 키 — 교실 구조 설정에서 공유를 켜고 끄면 편집기의 재검증으로 여기도 함께 바뀐다
  const { data } = useSWR<{ sharesNightLayout?: boolean }>(seatLayoutsUrl(grade, sessionType), fetcher);
  const shared = data?.sharesNightLayout ?? false;

  return (
    <div>
      <div className={`${tabsClassName} flex gap-2`}>
        {shared ? (
          <span className={`${TAB_BASE} ${TAB_ACTIVE}`}>{SHARED_SEAT_SESSION_LABEL}</span>
        ) : (
          SEAT_SESSION_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setSessionType(t)}
              className={`${TAB_BASE} ${sessionType === t ? TAB_ACTIVE : TAB_IDLE}`}
            >
              {TAB_LABELS[t]}
            </button>
          ))
        )}
      </div>

      {/* sessionType 은 공유 중에도 그대로 둔다 — 키가 바뀌면 열려 있는 교실 구조 설정 창이 닫힌다 */}
      <SeatingEditor key={`${grade}-${sessionType}`} grade={grade} sessionType={sessionType} />
    </div>
  );
}
