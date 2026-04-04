"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navItems = [
  { label: "학생관리", href: "/homeroom" },
  { label: "참여설정", href: "/homeroom/participation" },
  { label: "불참사유등록", href: "/homeroom/absence-reasons" },
  { label: "불참신청", href: "/homeroom/absence-requests" },
  { label: "감독일정", href: "/homeroom/schedule" },
  { label: "비밀번호", href: "/homeroom/password" },
];

export default function HomeroomLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  const assignmentText = user?.homeroomAssignments
    ?.map((a) => `${a.grade}-${a.classNumber}`)
    .join(", ");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-1 overflow-x-auto">
              <Link
                href="/homeroom"
                className="text-lg font-bold text-gray-900 shrink-0 mr-4"
              >
                담임교사
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
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  {assignmentText}
                </span>
              )}
              <span className="text-sm text-gray-500">{user?.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-sm text-gray-500 hover:text-gray-700"
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
