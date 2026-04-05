"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

interface NavItem {
  label: string;
  href: string;
}

export function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = user?.roles?.includes("admin");
  const subAdminGrades = user?.subAdminGrades || [];

  const adminItems: NavItem[] = isAdmin
    ? [
        { label: "사용자 관리", href: "/admin/users" },
        { label: "좌석 배치", href: "/admin/seats" },
        { label: "감독 배정", href: "/admin/supervisors" },
        { label: "교체 이력", href: "/admin/swap-history" },
        { label: "출결 통계", href: "/admin/statistics" },
      ]
    : [];

  const gradeAdminItems: NavItem[] = subAdminGrades.map((g) => ({
    label: `${g}학년 데이터관리`,
    href: `/grade-admin/${g}`,
  }));

  // admin도 grade-admin에 접근 가능
  const allGradeItems: NavItem[] = isAdmin
    ? [1, 2, 3].map((g) => ({
        label: `${g}학년 관리`,
        href: `/grade-admin/${g}`,
      }))
    : gradeAdminItems;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1 overflow-x-auto">
            <Link
              href="/"
              className="text-lg font-bold text-gray-900 shrink-0 mr-4"
            >
              출석부
            </Link>

            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  pathname.startsWith(item.href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            ))}

            {allGradeItems.length > 0 && adminItems.length > 0 && (
              <div className="w-px h-6 bg-gray-300 mx-1" />
            )}

            {allGradeItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  pathname.startsWith(item.href)
                    ? "bg-green-50 text-green-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-4">
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
  );
}
