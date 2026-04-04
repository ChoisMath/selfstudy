"use client";

import React, { useState } from "react";

interface StudentStat {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  dates: Record<string, { afternoon?: string; night?: string; afternoonReason?: string; nightReason?: string }>;
}

const STATUS_SYMBOL: Record<string, string> = { present: "O", absent: "X", unchecked: "-" };
const STATUS_COLOR: Record<string, string> = { present: "text-green-600", absent: "text-red-600", unchecked: "text-gray-400" };

export default function StatisticsPage() {
  const [grade, setGrade] = useState("1");
  const [cls, setCls] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    setLoading(true);
    const params = new URLSearchParams({ from: fromDate, to: toDate, grade });
    if (cls) params.set("class", cls);
    const res = await fetch(`/api/admin/statistics?${params}`);
    const data = await res.json();
    setStudents(data.students || []);
    setDates(data.dates || []);
    setLoading(false);
  }

  async function handleExport() {
    const params = new URLSearchParams({ from: fromDate, to: toDate, grade });
    const res = await fetch(`/api/admin/export-excel?${params}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${grade}학년_출결_${fromDate}_${toDate}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">출결 통계</h1>

      {/* 필터 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">학년</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">반</label>
            <select value={cls} onChange={(e) => setCls(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">전체</option>
              {[1, 2, 3, 4, 5].map((c) => <option key={c} value={c}>{c}반</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">시작일</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">종료일</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <button onClick={handleSearch} disabled={loading} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? "조회 중..." : "조회"}
          </button>
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
            Excel 다운로드
          </button>
        </div>
      </div>

      {/* 테이블 */}
      {students.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left font-medium text-gray-600 sticky left-0 bg-gray-50">이름</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600">반</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600">번호</th>
                {dates.map((date) => {
                  const d = new Date(date);
                  const dayName = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
                  return (
                    <th key={date} colSpan={2} className="px-2 py-2 text-center font-medium text-gray-600 border-l border-gray-200">
                      {date.slice(5)} ({dayName})
                    </th>
                  );
                })}
              </tr>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 bg-gray-50"></th>
                <th></th>
                <th></th>
                {dates.map((date) => (
                  <React.Fragment key={date}>
                    <th className="px-1 py-1 text-center text-gray-400 border-l border-gray-200">오후</th>
                    <th className="px-1 py-1 text-center text-gray-400">야간</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium sticky left-0 bg-white">{s.name}</td>
                  <td className="px-2 py-2 text-center">{s.classNumber}</td>
                  <td className="px-2 py-2 text-center">{s.studentNumber}</td>
                  {dates.map((date) => {
                    const data = s.dates[date] || {};
                    return (
                      <React.Fragment key={date}>
                        <td className={`px-1 py-2 text-center font-bold border-l border-gray-200 ${STATUS_COLOR[data.afternoon || "unchecked"]}`}>
                          {STATUS_SYMBOL[data.afternoon || "unchecked"]}
                        </td>
                        <td className={`px-1 py-2 text-center font-bold ${STATUS_COLOR[data.night || "unchecked"]}`}>
                          {STATUS_SYMBOL[data.night || "unchecked"]}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// React.Fragment with key is used inline via <Fragment key={...}>
