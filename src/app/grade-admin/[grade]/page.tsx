"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import SupervisorSummaryModal from "@/components/homeroom/SupervisorSummaryModal";
import { GuideHelpButton } from "@/components/guide/GuideHelpButton";
import dynamic from "next/dynamic";
import { SEAT_SESSION_TYPES, SEAT_SESSION_META, type SeatSessionType } from "@/lib/sessions";
import { chrome } from "@/components/ui/chrome";

const loadingBox = () => <div className="text-center py-12 text-ink-muted">불러오는 중…</div>;

const StudentManagement = dynamic(() => import("@/components/students/StudentManagement"), {
  ssr: false,
  loading: loadingBox,
});
const ParticipationManagement = dynamic(() => import("@/components/admin-shared/ParticipationManagement"), {
  ssr: false,
  loading: loadingBox,
});
const SeatingEditor = dynamic(() => import("@/components/seats/SeatingEditor"), {
  ssr: false,
  loading: loadingBox,
});
const MonthlyCalendar = dynamic(() => import("@/components/admin-shared/MonthlyCalendar"), {
  ssr: false,
  loading: loadingBox,
});
const TodayAttendanceDashboard = dynamic(
  () => import("@/components/grade-admin/TodayAttendanceDashboard"),
  { ssr: false, loading: loadingBox }
);
const GradeMonthlyAttendance = dynamic(
  () => import("@/components/grade-admin/GradeMonthlyAttendance"),
  { ssr: false, loading: loadingBox }
);

const TABS = [
  { key: "today", label: "오늘출결" },
  { key: "students", label: "학생 관리" },
  { key: "participation", label: "참여 설정" },
  { key: "seats", label: "좌석 배치" },
  { key: "supervisors", label: "감독 배정" },
  { key: "monthly", label: "월간출결" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function GradeAdminPage() {
  const params = useParams();
  const grade = parseInt(params.grade as string);
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [sessionType, setSessionType] = useState<SeatSessionType>("afternoon");
  const [showSummary, setShowSummary] = useState(false);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return <div className="text-center py-12 text-ink-muted">잘못된 학년입니다.</div>;
  }

  return (
    <div>
      {/* 탭 — 탭 줄만 스크롤하고 ? 버튼은 밖에 둬야 좁은 화면에서도 화면 안에 남는다 */}
      <div className="flex border-b border-gray-200 mb-3">
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          <div role="tablist" aria-label={`${grade}학년 관리 메뉴`} className="flex gap-1 pb-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-controls={`grade-admin-panel-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={chrome.tab(activeTab === tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <GuideHelpButton href="/help/grade-admin" />
      </div>

      {/* 탭 콘텐츠 */}
      <div id={`grade-admin-panel-${activeTab}`} role="tabpanel">
        {activeTab === "today" && <TodayAttendanceDashboard grade={grade} />}
        {activeTab === "students" && <StudentManagement grade={grade} />}
        {activeTab === "participation" && <ParticipationManagement grade={grade} />}
        {activeTab === "seats" && (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
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
            <SeatingEditor grade={grade} sessionType={sessionType} />
          </div>
        )}
        {activeTab === "supervisors" && (
          <div>
            <div className="mb-3 flex justify-end">
              <button type="button" onClick={() => setShowSummary(true)} className={chrome.secondaryButton}>
                누계
              </button>
            </div>
            <MonthlyCalendar
              grade={grade}
              apiBasePath={`/api/grade-admin/${grade}/supervisor-assignments`}
              excelHref={`/api/grade-admin/${grade}/supervisor-assignments/export`}
            />
            {showSummary && (
              <SupervisorSummaryModal onClose={() => setShowSummary(false)} filterGrade={grade} />
            )}
          </div>
        )}
        {activeTab === "monthly" && <GradeMonthlyAttendance grade={grade} />}
      </div>
    </div>
  );
}
