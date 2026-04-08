"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const roles = session?.user?.roles;
  const isHomeroom = roles?.includes("homeroom");
  const isTeacher = Array.isArray(roles);
  const subAdminGrades = session?.user?.subAdminGrades ?? [];
  const primaryGrade = session?.user?.primaryGrade;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-2 sm:px-4 py-2 flex items-center justify-between flex-nowrap">
        <Link
          href={primaryGrade ? `/attendance/${primaryGrade}` : "/attendance"}
          className="flex items-center gap-1.5 sm:gap-2 font-bold text-gray-900 shrink-0 whitespace-nowrap"
        >
          <img src="/posan.svg" alt="포산고등학교" className="w-7 h-7 sm:w-8 sm:h-8" />
          <span className="text-sm sm:text-base">출석부</span>
        </Link>
        {status !== "loading" && (
          <div className="flex items-center gap-1.5 sm:gap-3 flex-nowrap">
            {roles?.includes("admin") && (
              <Link
                href="/admin"
                className="px-1.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors whitespace-nowrap"
              >
                관리자
              </Link>
            )}
            {subAdminGrades.length > 0 && subAdminGrades.map((g) => (
              <Link
                key={g}
                href={`/grade-admin/${g}`}
                className="px-1.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
              >
                {g}학년 관리
              </Link>
            ))}
            {isTeacher && (
              <Link
                href={isHomeroom ? "/homeroom" : "/homeroom/schedule"}
                className="px-1.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
              >
                {isHomeroom ? "담임교사" : "감독일정"}
              </Link>
            )}
            <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">{session?.user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs sm:text-sm text-gray-600 hover:text-gray-700 whitespace-nowrap"
            >
              로그아웃
            </button>
          </div>
        )}
      </header>
      {children}
    </div>
  );
}
