"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;
const DAY_LABELS = ["월", "화", "수", "목", "금"] as const;

type DaySettings = {
  isParticipating: boolean;
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
};

type ParticipationData = {
  participationDays: Record<string, DaySettings>;
};

export default function StudentParticipationPage() {
  const { data, isLoading } = useSWR<ParticipationData>(
    "/api/student/participation-days",
    fetcher
  );

  const afternoon = data?.participationDays?.afternoon;
  const night = data?.participationDays?.night;

  function renderSession(
    label: string,
    settings: DaySettings | undefined
  ) {
    if (!settings || !settings.isParticipating) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">{label}</h3>
          <p className="text-sm text-gray-400">미참가</p>
        </div>
      );
    }

    const activeDays = DAY_KEYS.filter((key) => settings[key]);

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">{label}</h3>
        <div className="flex gap-2">
          {DAY_KEYS.map((key, i) => {
            const active = settings[key];
            return (
              <div
                key={key}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium ${
                  active
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-300"
                }`}
              >
                {DAY_LABELS[i]}
              </div>
            );
          })}
        </div>
        {activeDays.length > 0 && (
          <p className="mt-2 text-xs text-gray-400">
            주 {activeDays.length}일 참가
          </p>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-400">불러오는 중...</div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">내 참여일정</h2>
      <div className="space-y-4">
        {renderSession("오후자습", afternoon)}
        {renderSession("야간자습", night)}
      </div>

      {!afternoon && !night && (
        <p className="mt-4 text-sm text-gray-400">
          참여일정이 설정되지 않았습니다. 담당 선생님에게 문의하세요.
        </p>
      )}
    </div>
  );
}
