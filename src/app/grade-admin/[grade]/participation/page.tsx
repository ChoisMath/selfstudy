"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";
import { chrome } from "@/components/ui/chrome";

type DaySettings = {
  isParticipating: boolean;
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
};

type StudentParticipation = {
  id: number;
  name: string;
  classNumber: number;
  studentNumber: number;
  sessions: Record<SessionType, DaySettings>;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("참여 설정을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.");
  return res.json();
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;
const DAY_LABELS = ["월", "화", "수", "목", "금"] as const;

export default function ParticipationPage() {
  const params = useParams();
  const grade = parseInt(params.grade as string, 10);
  const [classFilter, setClassFilter] = useState<string>("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const apiUrl = `/api/grade-admin/${grade}/participation-days`;
  const { data, error, mutate, isLoading } = useSWR<{
    students: StudentParticipation[];
  }>(apiUrl, fetcher);

  const students = useMemo(() => data?.students ?? [], [data]);

  const filteredStudents = classFilter
    ? students.filter((s) => s.classNumber === parseInt(classFilter, 10))
    : students;

  const classNumbers = Array.from(
    new Set(students.map((s) => s.classNumber))
  ).sort((a, b) => a - b);

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

      // 낙관적 업데이트
      const key = `${studentId}-${sessionType}-${field}`;
      setSavingKey(key);
      setSaveError(null);

      mutate(
        {
          students: students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  sessions: { ...s.sessions, [sessionType]: updated },
                }
              : s
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
        setSaveError(`${student.name} ${SESSION_META[sessionType].shortLabel}: ${message} 다시 시도하세요.`);
        mutate();
      } finally {
        setSavingKey(null);
      }
    },
    [students, apiUrl, mutate]
  );

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return (
      <div className="text-center py-12 text-ink-muted">
        잘못된 학년입니다.
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-ink">
          {grade}학년 참여설정
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="participation-class-filter" className="text-sm font-medium text-ink">
            반
          </label>
          <select
            id="participation-class-filter"
            name="classFilter"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className={chrome.select}
          >
            <option value="">전체 반</option>
            {classNumbers.map((n) => (
              <option key={n} value={n}>
                {n}반
              </option>
            ))}
          </select>
          <span aria-live="polite" className="text-xs text-ink-muted">
            {savingKey ? "저장 중…" : ""}
          </span>
        </div>
      </div>

      <div aria-live="polite" className={saveError || error ? "mb-3" : undefined}>
        {error && <div className={chrome.notice("error")}>{error instanceof Error ? error.message : "참여 설정을 불러오지 못했습니다. 새로고침 후 다시 시도하세요."}</div>}
        {saveError && <div className={chrome.notice("error")}>{saveError}</div>}
      </div>

      {/* 테이블 */}
      <div className={`${chrome.card} overflow-hidden`}>
        <div className="overflow-x-auto table-scroll">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-30 bg-gray-50 px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200"
                >
                  이름
                </th>
                <th
                  rowSpan={2}
                  className="px-3 py-3 text-center font-medium text-gray-600 border-b border-gray-200"
                >
                  반
                </th>
                <th
                  rowSpan={2}
                  className="px-3 py-3 text-center font-medium text-gray-600 border-b border-gray-200"
                >
                  번호
                </th>
                {SESSION_TYPES.map((t) => (
                  <th key={t} colSpan={6} className="px-3 py-2 text-center font-medium text-gray-600 border-l border-gray-200 whitespace-nowrap">
                    {SESSION_META[t].label}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50">
                {SESSION_TYPES.map((t) => (
                  <React.Fragment key={t}>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200 whitespace-nowrap">참가</th>
                    {DAY_LABELS.map((label) => (
                      <th key={`${t}-${label}`} className="px-1 py-2 text-center text-xs font-medium text-gray-500">{label}</th>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={21}
                    className="px-4 py-8 text-center text-ink-muted"
                  >
                    불러오는 중…
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={21}
                    className="px-4 py-8 text-center text-ink-muted"
                  >
                    학생이 없습니다. 학생 관리에서 먼저 명단을 등록하세요.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
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
                      const sessionLabel = SESSION_META[t].shortLabel;
                      return (
                        <React.Fragment key={t}>
                          <td className="px-2 py-1 text-center border-l border-gray-100">
                            <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center">
                              <input
                                type="checkbox"
                                aria-label={`${student.name} ${sessionLabel} 참가`}
                                checked={settings.isParticipating}
                                onChange={(e) => handleUpdate(student.id, t, "isParticipating", e.target.checked)}
                                className="h-4 w-4 rounded border-line accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              />
                            </label>
                          </td>
                          {DAY_KEYS.map((day, dayIdx) => (
                            <td key={`${student.id}-${t}-${day}`} className="px-1 py-1 text-center">
                              <button
                                type="button"
                                aria-label={`${student.name} ${sessionLabel} ${DAY_LABELS[dayIdx]}요일`}
                                aria-pressed={settings[day]}
                                onClick={() => handleUpdate(student.id, t, day, !settings[day])}
                                disabled={!settings.isParticipating}
                                className={`h-11 w-11 rounded-lg text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                  !settings.isParticipating
                                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                    : settings[day]
                                      ? "bg-peach text-primary-deep hover:bg-primary-soft/60 cursor-pointer"
                                      : "bg-butter text-ink-muted hover:bg-peach cursor-pointer"
                                }`}
                              >
                                {DAY_LABELS[dayIdx]}
                              </button>
                            </td>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && filteredStudents.length > 0 && (
          <div className="border-t border-line bg-butter px-4 py-3 text-sm text-ink-muted">
            총 {filteredStudents.length}명
            {classFilter && ` (${classFilter}반)`}
          </div>
        )}
      </div>
    </div>
  );
}
