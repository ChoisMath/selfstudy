"use client";

import React, { useState } from "react";
import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";
import { chrome } from "@/components/ui/chrome";
import { formatMonthDay } from "@/lib/format-date";

interface StudentStat {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  dates: Record<string, Partial<Record<SessionType, { status: string; reason?: string }>>>;
}

const STATUS_SYMBOL: Record<string, string> = { present: "O", absent: "X", unchecked: "-" };
const STATUS_COLOR: Record<string, string> = { present: "text-green-600", absent: "text-red-600", unchecked: "text-gray-400" };

/** <input type="date"> 값용 "YYYY-MM-DD" (로컬 날짜) */
function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function StatisticsPage() {
  const [grade, setGrade] = useState("1");
  const [cls, setCls] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
    return toInputDate(d);
  });
  const [toDate, setToDate] = useState(() => toInputDate(new Date()));
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate, grade });
      if (cls) params.set("class", cls);
      const res = await fetch(`/api/admin/statistics?${params}`);
      if (!res.ok) throw new Error("출결 통계를 불러오지 못했습니다. 조건을 확인하고 다시 조회하세요.");
      const data = await res.json();
      setStudents(data.students || []);
      setDates(data.dates || []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "출결 통계를 불러오지 못했습니다. 다시 조회하세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate, grade });
      const res = await fetch(`/api/admin/export-excel?${params}`);
      if (!res.ok) throw new Error("Excel 파일을 만들지 못했습니다. 잠시 후 다시 시도하세요.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${grade}학년_출결_${fromDate}_${toDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Excel 파일을 내려받지 못했습니다. 다시 시도하세요.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      {/* 필터 */}
      <form
        className={`${chrome.card} mb-6 p-4`}
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="stat-grade" className={chrome.label}>학년</label>
            <select id="stat-grade" name="grade" value={grade} onChange={(e) => setGrade(e.target.value)} className={chrome.select}>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
          </div>
          <div>
            <label htmlFor="stat-class" className={chrome.label}>반</label>
            <select id="stat-class" name="class" value={cls} onChange={(e) => setCls(e.target.value)} className={chrome.select}>
              <option value="">전체</option>
              {[1, 2, 3, 4, 5].map((c) => <option key={c} value={c}>{c}반</option>)}
            </select>
          </div>
          <div className="w-40">
            <label htmlFor="stat-from" className={chrome.label}>시작일</label>
            <input id="stat-from" name="from" type="date" value={fromDate} max={toDate} onChange={(e) => setFromDate(e.target.value)} className={chrome.input} />
          </div>
          <div className="w-40">
            <label htmlFor="stat-to" className={chrome.label}>종료일</label>
            <input id="stat-to" name="to" type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} className={chrome.input} />
          </div>
          <button type="submit" disabled={loading} className={chrome.primaryButton}>
            {loading ? "조회 중…" : "조회"}
          </button>
          <button type="button" onClick={handleExport} disabled={exporting || students.length === 0} className={chrome.secondaryButton}>
            {exporting ? "내려받는 중…" : "Excel 다운로드"}
          </button>
        </div>
      </form>

      <div aria-live="polite" className={error ? "mb-4" : undefined}>
        {error && <div className={chrome.notice("error")}>{error}</div>}
      </div>

      {/* 테이블 / 빈 상태 */}
      {students.length > 0 ? (
        <div className={`${chrome.card} overflow-x-auto table-scroll`}>
          <table className="text-xs tabular-nums">
            <thead className="sticky top-0 z-20">
              <tr className={`${chrome.tableHead} border-b border-line`}>
                <th className="sticky left-0 z-30 bg-butter px-3 py-2 text-left font-medium">이름</th>
                <th className="px-2 py-2 text-center font-medium">반</th>
                <th className="px-2 py-2 text-center font-medium">번호</th>
                {dates.map((date) => (
                  <th key={date} colSpan={3} className="whitespace-nowrap border-l border-line px-2 py-2 text-center font-medium">
                    {formatMonthDay(date)}
                  </th>
                ))}
              </tr>
              <tr className={`${chrome.tableHead} border-b border-line`}>
                <th className="sticky left-0 z-30 bg-butter"></th>
                <th></th>
                <th></th>
                {dates.map((date) => (
                  <React.Fragment key={date}>
                    {SESSION_TYPES.map((t, i) => (
                      <th key={t} className={`whitespace-nowrap px-1 py-1 text-center font-normal text-ink-muted ${i === 0 ? "border-l border-line" : ""}`}>
                        {SESSION_META[t].shortLabel}
                      </th>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.map((s) => (
                <tr key={s.id} className={chrome.tableRowHover}>
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-ink">{s.name}</td>
                  <td className="px-2 py-2 text-center">{s.classNumber}</td>
                  <td className="px-2 py-2 text-center">{s.studentNumber}</td>
                  {dates.map((date) => {
                    const data = s.dates[date] || {};
                    return (
                      <React.Fragment key={date}>
                        {SESSION_TYPES.map((t, i) => {
                          const status = data[t]?.status || "unchecked";
                          return (
                            <td key={t} className={`px-1 py-2 text-center font-bold ${i === 0 ? "border-l border-line" : ""} ${STATUS_COLOR[status]}`}>
                              {STATUS_SYMBOL[status]}
                            </td>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`${chrome.card} px-4 py-12 text-center`}>
          {loading ? (
            <p className="text-ink-muted">조회 중…</p>
          ) : searched ? (
            <>
              <p className="font-semibold text-ink text-balance">결과가 없습니다</p>
              <p className="mt-1 text-sm text-ink-muted text-pretty">기간이나 학년·반을 바꿔 다시 조회하세요.</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-ink text-balance">조회 조건을 고르고 조회를 누르세요</p>
              <p className="mt-1 text-sm text-ink-muted text-pretty">학년·반·기간을 정하면 날짜별 세션 출결이 표로 나옵니다.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
