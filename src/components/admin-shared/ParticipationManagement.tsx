"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { SESSION_TYPES, SESSION_META, emptySessionRecord, type SessionType } from "@/lib/sessions";
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
const AFTER_SCHOOL_KEYS = ["afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri"] as const;

export default function ParticipationManagement({ grade }: { grade: number }) {
  const [classFilter, setClassFilter] = useState<string>("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const apiUrl = `/api/grade-admin/${grade}/participation-days`;
  const { data, error, mutate, isLoading } = useSWR<{ students: StudentParticipation[] }>(apiUrl, fetcher);

  const students = useMemo(() => data?.students ?? [], [data]);
  const filteredStudents = classFilter
    ? students.filter((s) => s.classNumber === parseInt(classFilter, 10))
    : students;
  const classNumbers = Array.from(new Set(students.map((s) => s.classNumber))).sort((a, b) => a - b);

  // 전체 참가 상태 계산 (헤더 체크박스용)
  const allChecked = useMemo(
    () =>
      emptySessionRecord(
        (t) => filteredStudents.length > 0 && filteredStudents.every((s) => s.sessions[t].isParticipating)
      ),
    [filteredStudents]
  );

  const handleUpdate = useCallback(
    async (studentId: number, sessionType: SessionType, field: string, value: boolean) => {
      const student = students.find((s) => s.id === studentId);
      if (!student) return;
      const current = student.sessions[sessionType];
      const updated = { ...current, [field]: value };
      const key = `${studentId}-${sessionType}-${field}`;
      setSavingKey(key);
      setSaveError(null);
      mutate({ students: students.map((s) => s.id === studentId ? { ...s, sessions: { ...s.sessions, [sessionType]: updated } } : s) }, false);
      try {
        const res = await fetch(apiUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, sessionType, ...updated }),
        });
        if (!res.ok) { const data = await res.json(); throw new Error(data.error || "저장 실패"); }
      } catch (err: unknown) {
        setSaveError(`${student.name} ${SESSION_META[sessionType].shortLabel}: ${err instanceof Error ? err.message : "저장 실패"}. 다시 시도하세요.`);
        mutate();
      } finally {
        setSavingKey(null);
      }
    },
    [students, apiUrl, mutate]
  );

  const handleBulkToggle = useCallback(
    async (sessionType: SessionType, value: boolean) => {
      const targets = filteredStudents;
      if (targets.length === 0) return;
      const label = SESSION_META[sessionType].label;
      if (!confirm(`${classFilter ? classFilter + "반" : "전체"} 학생 ${targets.length}명의 ${label} 참가를 ${value ? "설정" : "해제"}하시겠습니까?`)) return;

      setBulkSaving(sessionType);
      setSaveError(null);
      const targetIds = new Set(targets.map((s) => s.id));
      mutate({
        students: students.map((s) =>
          targetIds.has(s.id) ? { ...s, sessions: { ...s.sessions, [sessionType]: { ...s.sessions[sessionType], isParticipating: value } } } : s
        ),
      }, false);
      try {
        const res = await fetch(apiUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentIds: targets.map((s) => s.id), sessionType, isParticipating: value }),
        });
        if (!res.ok) throw new Error("일괄 저장 실패");
      } catch (err: unknown) {
        setSaveError(`${label} ${err instanceof Error ? err.message : "일괄 저장 실패"}. 다시 시도하세요.`);
        mutate();
      } finally {
        setBulkSaving(null);
      }
    },
    [filteredStudents, students, classFilter, apiUrl, mutate]
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="participation-class-filter" className="text-sm font-medium text-ink">반</label>
        <select
          id="participation-class-filter"
          name="classFilter"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className={chrome.select}
        >
          <option value="">전체 반</option>
          {classNumbers.map((n) => (<option key={n} value={n}>{n}반</option>))}
        </select>
        <span aria-live="polite" className="text-xs text-ink-muted">{savingKey || bulkSaving ? "저장 중…" : ""}</span>
      </div>

      <div aria-live="polite" className={saveError || error ? "mb-3" : undefined}>
        {error && <div className={chrome.notice("error")}>{error instanceof Error ? error.message : "참여 설정을 불러오지 못했습니다. 새로고침 후 다시 시도하세요."}</div>}
        {saveError && <div className={chrome.notice("error")}>{saveError}</div>}
      </div>

      <div className={`${chrome.card} overflow-hidden`}>
        <div className="overflow-x-auto table-scroll">
          <table className="w-full text-sm whitespace-nowrap" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "80px" }} />
              <col style={{ width: "44px" }} />
              <col style={{ width: "44px" }} />
              {SESSION_TYPES.flatMap((t) =>
                [...Array(6)].map((_, i) => <col key={`${t}-${i}`} style={{ width: "52px" }} />)
              )}
            </colgroup>
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
              <tr>
                <th rowSpan={3} className="sticky left-0 z-30 bg-gray-50 px-2 py-3 text-left font-medium text-gray-600 border-b border-gray-200">이름</th>
                <th rowSpan={3} className="py-3 text-center font-medium text-gray-600 border-b border-gray-200">반</th>
                <th rowSpan={3} className="py-3 text-center font-medium text-gray-600 border-b border-gray-200">번호</th>
                {SESSION_TYPES.map((t) => (
                  <th key={t} colSpan={6} className="py-2 text-center font-medium text-gray-600 border-l border-gray-200 whitespace-nowrap">
                    {SESSION_META[t].label}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50">
                {SESSION_TYPES.map((session) => [
                  <th key={`${session}-chk`} className="py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200">
                    <label
                      className="inline-flex h-11 w-11 cursor-pointer items-center justify-center"
                      title={`${SESSION_META[session].shortLabel} 전체 참가 토글`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`${SESSION_META[session].shortLabel} 전체 참가`}
                        checked={allChecked[session]}
                        onChange={(e) => handleBulkToggle(session, e.target.checked)}
                        disabled={!!bulkSaving || filteredStudents.length === 0}
                        className="h-4 w-4 rounded border-line accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                      />
                    </label>
                  </th>,
                  ...DAY_LABELS.map((l) => (
                    <th key={`${session}-${l}`} className="py-2 text-center text-xs font-medium text-gray-500">{l}</th>
                  )),
                ])}
              </tr>
              <tr className="bg-orange-50">
                {SESSION_TYPES.map((session) => [
                  <th key={`${session}-as-empty`} className="py-1 border-l border-gray-200" />,
                  ...DAY_LABELS.map((l) => (
                    <th key={`${session}-as-${l}`} className="py-1 text-center text-[10px] font-medium text-orange-600">
                      방과후
                    </th>
                  )),
                ])}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={21} className="px-4 py-8 text-center text-ink-muted">불러오는 중…</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={21} className="px-4 py-8 text-center text-ink-muted">학생이 없습니다. 학생 관리에서 먼저 명단을 등록하세요.</td></tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="group hover:bg-canvas">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-canvas px-2 py-1 text-ink font-medium whitespace-nowrap truncate">{student.name}</td>
                    <td className="py-1 text-center text-ink-muted tabular-nums">{student.classNumber}</td>
                    <td className="py-1 text-center text-ink-muted tabular-nums">{student.studentNumber}</td>
                    {SESSION_TYPES.map((session) => {
                      const settings = student.sessions[session];
                      const sessionLabel = SESSION_META[session].shortLabel;
                      return [
                        <td key={`${session}-chk`} className="py-1 text-center border-l border-gray-100">
                          <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center">
                            <input
                              type="checkbox"
                              aria-label={`${student.name} ${sessionLabel} 참가`}
                              checked={settings.isParticipating}
                              onChange={(e) => handleUpdate(student.id, session, "isParticipating", e.target.checked)}
                              className="h-4 w-4 rounded border-line accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            />
                          </label>
                        </td>,
                        ...DAY_KEYS.map((day, dayIdx) => (
                          <td key={`${session}-${day}`} className="py-1 text-center">
                            <button
                              type="button"
                              aria-label={`${student.name} ${sessionLabel} ${DAY_LABELS[dayIdx]}요일`}
                              aria-pressed={settings[day]}
                              onClick={() => handleUpdate(student.id, session, day, !settings[day])}
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
                            <label className="mx-auto mt-2 flex h-11 w-11 cursor-pointer items-center justify-center">
                              <input
                                type="checkbox"
                                aria-label={`${student.name} ${sessionLabel} ${DAY_LABELS[dayIdx]}요일 방과후`}
                                checked={settings[AFTER_SCHOOL_KEYS[dayIdx]]}
                                onChange={(e) => handleUpdate(student.id, session, AFTER_SCHOOL_KEYS[dayIdx], e.target.checked)}
                                disabled={!settings.isParticipating || !settings[day]}
                                className="h-3.5 w-3.5 rounded border-line focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-30"
                                style={{ accentColor: '#ea580c' }}
                              />
                            </label>
                          </td>
                        )),
                      ];
                    })}
                  </tr>
                ))
              )}
            </tbody>
            {!isLoading && filteredStudents.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={3} className="px-2 py-2.5 text-right font-semibold text-gray-600 text-xs">합계</td>
                  {SESSION_TYPES.map((session) => {
                    const participating = filteredStudents.filter((s) => s.sessions[session].isParticipating).length;
                    return [
                      <td key={`${session}-total`} className="py-2.5 text-center font-bold text-primary text-xs border-l border-gray-200 tabular-nums">
                        {participating}
                      </td>,
                      ...DAY_KEYS.map((day) => {
                        const count = filteredStudents.filter((s) => s.sessions[session].isParticipating && s.sessions[session][day]).length;
                        return (
                          <td key={`${session}-${day}-total`} className="py-2.5 text-center font-medium text-gray-600 text-xs tabular-nums">
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
        {!isLoading && filteredStudents.length > 0 && (
          <div className="border-t border-line bg-butter px-4 py-3 text-sm text-ink-muted">
            총 {filteredStudents.length}명{classFilter && ` (${classFilter}반)`}
          </div>
        )}
      </div>
    </div>
  );
}
