"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

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

  const navItems = [...(isHomeroom ? homeroomItems : []), ...commonItems];

  const assignmentText = user?.homeroomAssignments
    ?.map((a) => `${a.grade}-${a.classNumber}`)
    .join(", ");

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center h-14">
              <span className="text-lg font-bold text-gray-900">출석부</span>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-1 overflow-x-auto">
              <Link
                href="/attendance"
                className="text-lg font-bold text-gray-900 shrink-0 mr-4"
              >
                출석부
              </Link>

              {navItems.map((item) => {
                const isActive =
                  item.href === "/homeroom"
                    ? pathname === "/homeroom"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-4">
              {assignmentText && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                  {assignmentText}
                </span>
              )}
              <span className="text-sm text-gray-500 whitespace-nowrap">{user?.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
