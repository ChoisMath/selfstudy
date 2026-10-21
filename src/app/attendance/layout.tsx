"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { GuideHelpButton } from "@/components/guide/GuideHelpButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { chrome } from "@/components/ui/chrome";

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const roles = session?.user?.roles;
  const isHomeroom = roles?.includes("homeroom");
  const isTeacher = Array.isArray(roles);
  const subAdminGrades = session?.user?.subAdminGrades ?? [];
  const primaryGrade = session?.user?.primaryGrade;

  return (
    <div className={chrome.page}>
      <header className={`${chrome.navStatic} px-2 sm:px-4 py-2 flex items-center justify-between flex-nowrap`}>
        <Link
          href={primaryGrade ? `/attendance/${primaryGrade}` : "/attendance"}
          className={chrome.brand}
        >
          <img src="/posan.svg" alt="포산고등학교" width={32} height={32} className="w-7 h-7 sm:w-8 sm:h-8" />
          <span className={chrome.brandText}>출석부</span>
        </Link>
        {status !== "loading" && (
          <div className="flex items-center gap-2 sm:gap-3 flex-nowrap min-w-0 overflow-x-auto">
            <GuideHelpButton href="/help/attendance" />
            {roles?.includes("admin") && (
              <Link
                href="/admin"
                className={chrome.roleChip("admin")}
              >
                관리자
              </Link>
            )}
            {subAdminGrades.length > 0 && subAdminGrades.map((g) => (
              <Link
                key={g}
                href={`/grade-admin/${g}`}
                className={chrome.roleChip("grade")}
              >
                {g}학년 관리
              </Link>
            ))}
            {isTeacher && (
              <Link
                href={isHomeroom ? "/homeroom" : "/homeroom/schedule"}
                className={chrome.roleChip("teacher")}
              >
                {isHomeroom ? "담임교사" : "감독일정"}
              </Link>
            )}
            <NotificationBell />
            <span className={chrome.userName}>{session?.user?.name}</span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={chrome.ghostButton}
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
