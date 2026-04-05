"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const roles = session?.user?.roles;
  const isHomeroom = roles?.includes("homeroom");
  const isTeacher = Array.isArray(roles);
  const subAdminGrades = session?.user?.subAdminGrades ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <span className="font-bold text-gray-900">출석부</span>
        {status !== "loading" && (
          <div className="flex items-center gap-3">
            {subAdminGrades.length > 0 && subAdminGrades.map((g) => (
              <Link
                key={g}
                href={`/grade-admin/${g}`}
                className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
              >
                {g}학년 관리
              </Link>
            ))}
            {isTeacher && (
              <Link
                href={isHomeroom ? "/homeroom" : "/homeroom/schedule"}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
              >
                {isHomeroom ? "담임교사" : "감독일정"}
              </Link>
            )}
            <span className="text-sm text-gray-500">{session?.user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-500 hover:text-gray-700"
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
