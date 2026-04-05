"use client";

import { useState, useTransition } from "react";
import { loginTeacher, loginStudent } from "./actions";

type Tab = "teacher" | "student";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("teacher");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleTeacherSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await loginTeacher(formData);
      if (result?.error) setError(result.error);
      else if (result?.success) window.location.href = "/";
    });
  }

  function handleStudentSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await loginStudent(formData);
      if (result?.error) setError(result.error);
      else if (result?.success) window.location.href = "/";
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/posan.svg" alt="포산고등학교" className="w-16 h-16 mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">
            포산고 자습 출석부
          </h1>
        </div>

        {/* 탭 */}
        <div className="flex mb-6 bg-gray-200 rounded-lg p-1">
          <button
            type="button"
            onClick={() => { setTab("teacher"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "teacher"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            교사 로그인
          </button>
          <button
            type="button"
            onClick={() => { setTab("student"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "student"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            학생 로그인
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* 교사 로그인 폼 */}
        {tab === "teacher" && (
          <form onSubmit={handleTeacherSubmit} className="space-y-4">
            <div>
              <label htmlFor="loginId" className="block text-sm font-medium text-gray-700 mb-1">
                ID
              </label>
              <input
                id="loginId"
                name="loginId"
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="아이디 입력"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="비밀번호 입력"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "로그인 중..." : "로그인"}
            </button>
          </form>
        )}

        {/* 학생 로그인 폼 */}
        {tab === "student" && (
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div>
              <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <input
                id="studentName"
                name="name"
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="이름 입력"
              />
            </div>
            <div>
              <label htmlFor="studentCode" className="block text-sm font-medium text-gray-700 mb-1">
                학번
              </label>
              <input
                id="studentCode"
                name="studentCode"
                type="text"
                inputMode="numeric"
                maxLength={5}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="학번 5자리 (예: 20102)"
              />
              <p className="mt-1 text-xs text-gray-500">
                학년(1자리) + 반(2자리) + 번호(2자리) 예: 2학년 1반 2번 → 20102
              </p>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "로그인 중..." : "로그인"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
