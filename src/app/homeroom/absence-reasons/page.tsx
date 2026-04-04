"use client";

import { useState } from "react";
import useSWR from "swr";

type StudentData = {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const REASON_TYPES = [
  { value: "academy", label: "학원" },
  { value: "afterschool", label: "방과후" },
  { value: "illness", label: "질병" },
  { value: "custom", label: "기타" },
] as const;

const SESSION_TYPES = [
  { value: "afternoon", label: "오후자습" },
  { value: "night", label: "야간자습" },
] as const;

export default function AbsenceReasonsPage() {
  const { data } = useSWR<{ students: StudentData[] }>(
    "/api/homeroom/students",
    fetcher
  );

  const students = data?.students ?? [];

  const [selectedStudent, setSelectedStudent] = useState<number | "">("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [sessionType, setSessionType] = useState<"afternoon" | "night">("afternoon");
  const [reasonType, setReasonType] = useState<string>("academy");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setMessage({ type: "error", text: "학생을 선택하세요." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/homeroom/absence-reasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent,
          date,
          sessionType,
          reasonType,
          detail: detail || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "등록에 실패했습니다.");
      }

      setMessage({ type: "success", text: "불참사유가 등록되었습니다." });
      setSelectedStudent("");
      setDetail("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "등록에 실패했습니다.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">불참사유 등록</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 학생 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학생
            </label>
            <select
              value={selectedStudent}
              onChange={(e) =>
                setSelectedStudent(e.target.value ? parseInt(e.target.value, 10) : "")
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">학생을 선택하세요</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.grade}-{s.classNumber} {s.studentNumber}번 {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 날짜 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              날짜
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 세션 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              자습 시간
            </label>
            <div className="flex gap-3">
              {SESSION_TYPES.map((st) => (
                <label
                  key={st.value}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer transition-colors ${
                    sessionType === st.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="sessionType"
                    value={st.value}
                    checked={sessionType === st.value}
                    onChange={(e) =>
                      setSessionType(e.target.value as "afternoon" | "night")
                    }
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{st.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 사유 타입 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사유 유형
            </label>
            <div className="flex flex-wrap gap-2">
              {REASON_TYPES.map((rt) => (
                <label
                  key={rt.value}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
                    reasonType === rt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="reasonType"
                    value={rt.value}
                    checked={reasonType === rt.value}
                    onChange={(e) => setReasonType(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm">{rt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 상세 사유 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상세 사유 (선택)
            </label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="필요 시 상세 사유를 입력하세요"
            />
          </div>

          {/* 메시지 */}
          {message && (
            <div
              className={`text-sm px-3 py-2 rounded-md ${
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 제출 */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "등록 중..." : "불참사유 등록"}
          </button>
        </form>
      </div>
    </div>
  );
}
