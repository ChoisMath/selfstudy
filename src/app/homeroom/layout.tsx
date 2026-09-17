"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

// 담임 전용 탭
const homeroomItems = [
  { label: "학생관리", href: "/homeroom" },
  { label: "월간출결", href: "/homeroom/attendance" },
  { label: "참여설정", href: "/homeroom/participation" },
  { label: "불참사유등록", href: "/homeroom/absence-reasons" },
  { label: "불참신청", href: "/homeroom/absence-requests" },
];

// 모든 교사 공통 탭
const commonItems = [
  { label: "감독일정", href: "/homeroom/schedule" },
  { label: "비밀번호", href: "/homeroom/password" },
];

export default function HomeroomLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const user = session?.user;
  const isHomeroom = user?.roles?.includes("homeroom");
  const activeTabRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [pathname]);

  const navItems = [...(isHomeroom ? homeroomItems : []), ...commonItems];

  const assignmentText = user?.homeroomAssignments
    ?.map((a) => `${a.grade}-${a.classNumber}`)
    .join(", ");
  const attendanceGrade = user?.homeroomAssignments?.[0]?.grade ?? user?.primaryGrade;
  const attendanceHref = attendanceGrade ? `/attendance/${attendanceGrade}` : "/attendance";

  if (status === "loading") {
    return (
      <div className="min-h-dvh bg-gray-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-2 md:px-3 lg:px-4">
            <div className="flex items-center gap-1.5 sm:gap-2 h-14">
              <img src="/posan.svg" alt="포산고등학교" className="w-7 h-7 sm:w-8 sm:h-8" />
              <span className="text-sm sm:text-lg font-bold text-gray-900 whitespace-nowrap">출석부</span>
            </div>
            {/* 세션 확정 후 나타나는 모바일 탭 행(44px) 자리 — 헤더 높이가 튀지 않게 */}
            <div className="lg:hidden min-h-11" />
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-2 md:px-3 lg:px-4 py-6">{children}</main>
      </div>
    );
  }

  const isActiveItem = (href: string) =>
    href === "/homeroom" ? pathname === "/homeroom" : pathname.startsWith(href);

  return (
    // lg 미만에서는 탭이 두 번째 줄로 내려가므로 table-scroll 이 쓰는 헤더 높이를 함께 키운다
    <div className="min-h-dvh bg-gray-50 [--header-h:6.25rem] lg:[--header-h:3.5rem]">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 md:px-3 lg:px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-1 overflow-x-auto">
              <Link
                href={attendanceHref}
                className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-h-11 mr-2 lg:mr-4"
              >
                <img src="/posan.svg" alt="포산고등학교" className="w-7 h-7 sm:w-8 sm:h-8" />
                <span className="text-sm sm:text-lg font-bold text-gray-900 whitespace-nowrap">출석부</span>
              </Link>

              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`hidden lg:inline-flex min-h-11 items-center px-3 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                    isActiveItem(item.href)
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-2 lg:ml-4">
              {assignmentText && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                  {assignmentText}
                </span>
              )}
              <NotificationBell />
              <span className="text-sm text-gray-500 whitespace-nowrap">{user?.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="min-h-11 px-2 text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
              >
                로그아웃
              </button>
            </div>
          </div>

          <div className="lg:hidden flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {navItems.map((item) => {
              const isActive = isActiveItem(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={isActive ? activeTabRef : undefined}
                  className={`inline-flex min-h-11 items-center px-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? "text-blue-700 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-2 md:px-3 lg:px-4 py-6">{children}</main>
    </div>
  );
}
