"use client";

import React, { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";
import { chrome } from "@/components/ui/chrome";

type DaySettings = {
  isParticipating: boolean;
  mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean;
  afterSchoolMon: boolean; afterSchoolTue: boolean; afterSchoolWed: boolean;
  afterSchoolThu: boolean; afterSchoolFri: boolean;
};

type StudentParticipation = {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  sessions: Record<SessionType, DaySettings>;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `${res.status} 오류가 발생했습니다.`);
  }
  return res.json();
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;
const DAY_LABELS = ["월", "화", "수", "목", "금"] as const;
const AFTER_SCHOOL_KEYS = ["afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri"] as const;

export default function HomeroomParticipationPage() {
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const apiUrl = "/api/homeroom/participation-days";
  const { data, error, mutate, isLoading } = useSWR<{
    students: StudentParticipation[];
  }>(apiUrl, fetcher);

  const students = useMemo(() => data?.students ?? [], [data]);

  const handleUpdate = useCallback(
    async (
      studentId: number,
      sessionType: SessionType,
      field: string,
      value: boolean
    ) => {
      const student = students.find((s) => s.id === studentId);
      if (!student) return;

      const current = student.sessions[sessionType];
      const updated = { ...current, [field]: value };

      const key = `${studentId}-${sessionType}-${field}`;
      setSavingKey(key);
      setSaveError(null);

      mutate(
        {
          students: students.map((s) =>
            s.id === studentId ? { ...s, sessions: { ...s.sessions, [sessionType]: updated } } : s
          ),
        },
        false
      );

      try {
        const res = await fetch(apiUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            sessionType,
            ...updated,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "저장에 실패했습니다.");
        }

        mutate();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "저장에 실패했습니다.";
        setSaveError(`${student.name} ${SESSION_META[sessionType].label}: ${message} 다시 시도하세요.`);
        mutate();
      } finally {
        setSavingKey(null);
      }
    },
    [students, apiUrl, mutate]
  );

  return (
    <div>
      {/* 저장 상태·오류 — 항상 렌더되는 라이브 영역 */}
      <div aria-live="polite" role="status" className="mb-3 min-h-5 text-xs text-ink-muted">
        {savingKey ? <span>저장 중…</span> : saveError ? <div className={chrome.notice("error")}>{saveError}</div> : null}
      </div>

      <div className={`${chrome.card} overflow-hidden`}>
        <div className="overflow-x-auto table-scroll">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
              <tr>
                <th rowSpan={3} className="sticky left-0 z-30 bg-gray-50 px-4 py-3 text-left font-medium text-ink-muted border-b border-gray-200 whitespace-nowrap">
                  이름
                </th>
                <th rowSpan={3} className="px-3 py-3 text-center font-medium text-ink-muted border-b border-gray-200 whitespace-nowrap">
                  반
                </th>
                <th rowSpan={3} className="px-3 py-3 text-center font-medium text-ink-muted border-b border-gray-200 whitespace-nowrap">
                  번호
                </th>
                {SESSION_TYPES.map((t) => (
                  <th key={t} colSpan={6} className="px-3 py-2 text-center font-medium text-ink-muted border-l border-gray-200 whitespace-nowrap">
                    {SESSION_META[t].label}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50">
                {SESSION_TYPES.map((t) => (
                  <React.Fragment key={t}>
                    <th className="px-2 py-2 text-center text-xs font-medium text-ink-muted border-l border-gray-200 whitespace-nowrap">참가</th>
                    {DAY_LABELS.map((label) => (
                      <th key={`${t}-${label}`} className="px-1 py-2 text-center text-xs font-medium text-ink-muted whitespace-nowrap">{label}</th>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
              <tr className="bg-orange-50">
                {SESSION_TYPES.map((session) => [
                  <th key={`${session}-as-empty`} className="py-1 border-l border-gray-200 whitespace-nowrap" />,
                  ...DAY_LABELS.map((l) => (
                    <th key={`${session}-as-${l}`} className="py-1 text-center text-[10px] font-medium text-orange-600 whitespace-nowrap">
                      방과후
                    </th>
                  )),
                ])}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={21} className="px-4 py-8 text-center text-ink-muted">
                    불러오는 중…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={21} className="px-4 py-6">
                    <div role="alert" className={chrome.notice("error")}>{error.message}</div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={21} className="px-4 py-8 text-center text-ink-muted">
                    학생이 없습니다.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="group hover:bg-canvas">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-canvas px-4 py-1 text-ink font-medium whitespace-nowrap">
                      {student.name}
                    </td>
                    <td className="px-3 py-1 text-center text-ink-muted tabular-nums">
                      {student.classNumber}
                    </td>
                    <td className="px-3 py-1 text-center text-ink-muted tabular-nums">
                      {student.studentNumber}
                    </td>

                    {SESSION_TYPES.map((t) => {
                      const settings = student.sessions[t];
                      const sessionLabel = SESSION_META[t].label;
                      return (
                        <React.Fragment key={t}>
                          <td className="px-2 py-1 text-center border-l border-gray-100">
                            <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg focus-within:ring-2 focus-within:ring-primary">
                              <input
                                type="checkbox"
                                checked={settings.isParticipating}
                                onChange={(e) => handleUpdate(student.id, t, "isParticipating", e.target.checked)}
                                aria-label={`${student.name} ${sessionLabel} 참가`}
                                className="w-4 h-4 rounded border-line accent-primary focus:outline-none"
                              />
                            </label>
                          </td>
                          {DAY_KEYS.map((day, dayIdx) => (
                            <td key={`${student.id}-${t}-${day}`} className="px-1 py-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleUpdate(student.id, t, day, !settings[day])}
                                disabled={!settings.isParticipating}
                                aria-pressed={settings[day]}
                                aria-label={`${student.name} ${sessionLabel} ${DAY_LABELS[dayIdx]}요일`}
                                className={`h-11 w-11 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                  !settings.isParticipating
                                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                    : settings[day]
                                      ? "bg-primary text-white hover:bg-primary-deep cursor-pointer"
                                      : "bg-butter text-ink-muted hover:bg-peach cursor-pointer"
                                }`}
                              >
                                {DAY_LABELS[dayIdx]}
                              </button>
                              <label className="mx-auto mt-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg focus-within:ring-2 focus-within:ring-primary">
                                <input
                                  type="checkbox"
                                  checked={settings[AFTER_SCHOOL_KEYS[dayIdx]]}
                                  onChange={(e) => handleUpdate(student.id, t, AFTER_SCHOOL_KEYS[dayIdx], e.target.checked)}
                                  disabled={!settings.isParticipating || !settings[day]}
                                  aria-label={`${student.name} ${sessionLabel} ${DAY_LABELS[dayIdx]}요일 방과후`}
                                  className="w-3.5 h-3.5 rounded border-line disabled:opacity-30 focus:outline-none"
                                  style={{ accentColor: '#ea580c' }}
                                />
                              </label>
                            </td>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
            {!isLoading && students.length > 0 && (
              <tfoot className="bg-butter border-t-2 border-line">
                <tr>
                  <td colSpan={3} className="px-2 py-2.5 text-right font-semibold text-ink-muted text-xs">합계</td>
                  {SESSION_TYPES.map((session) => {
                    const participating = students.filter((s) => s.sessions[session].isParticipating).length;
                    return [
                      <td key={`${session}-total`} className="py-2.5 text-center font-bold text-primary-deep text-xs border-l border-gray-200 tabular-nums">
                        {participating}
                      </td>,
                      ...DAY_KEYS.map((day) => {
                        const count = students.filter((s) => s.sessions[session].isParticipating && s.sessions[session][day]).length;
                        return (
                          <td key={`${session}-${day}-total`} className="py-2.5 text-center font-medium text-ink-muted text-xs tabular-nums">
                            {count}
                          </td>
                        );
                      }),
                    ];
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!isLoading && students.length > 0 && (
          <div className="px-4 py-3 bg-canvas border-t border-line text-sm text-ink-muted">
            총 {students.length}명
          </div>
        )}
      </div>
    </div>
  );
}
