"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Tab = "teacher" | "student";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("teacher");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 교사 폼
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  // 학생 폼
  const [studentName, setStudentName] = useState("");
  const [studentCode, setStudentCode] = useState("");

  async function handleTeacherLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("teacher-credentials", {
      loginId,
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("ID 또는 비밀번호가 올바르지 않습니다.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function handleStudentLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (studentCode.length !== 5 || !/^\d{5}$/.test(studentCode)) {
      setError("학번은 5자리 숫자입니다. (예: 20102)");
      return;
    }

    setLoading(true);
    const result = await signIn("student-credentials", {
      name: studentName,
      studentCode,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("이름 또는 학번이 올바르지 않습니다.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function handleGoogleLogin() {
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8 text-gray-900">
          자율학습 출석부
        </h1>

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
          <form onSubmit={handleTeacherLogin} className="space-y-4">
            <div>
              <label htmlFor="loginId" className="block text-sm font-medium text-gray-700 mb-1">
                ID
              </label>
              <input
                id="loginId"
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="비밀번호 입력"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">또는</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google로 로그인
            </button>
          </form>
        )}

        {/* 학생 로그인 폼 */}
        {tab === "student" && (
          <form onSubmit={handleStudentLogin} className="space-y-4">
            <div>
              <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <input
                id="studentName"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
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
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value.replace(/\D/g, ""))}
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
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
