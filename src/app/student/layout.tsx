"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

const TABS = [
  { href: "/student", label: "참여일정" },
  { href: "/student/attendance", label: "출결기록" },
  { href: "/student/absence-requests", label: "불참신청" },
] as const;

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
    if (status === "authenticated" && session?.user?.userType !== "student") {
      router.replace("/login");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    );
  }

  if (!session?.user || session.user.userType !== "student") {
    return null;
  }

  const user = session.user;
  const displayCode = `${user.grade}-${user.classNumber}-${String(user.studentNumber).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {user.name}{" "}
              <span className="text-sm font-normal text-gray-500">
                ({displayCode})
              </span>
            </h1>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            로그아웃
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="max-w-2xl mx-auto px-4">
          <nav className="flex gap-1">
            {TABS.map((tab) => {
              const isActive =
                tab.href === "/student"
                  ? pathname === "/student"
                  : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                    isActive
                      ? "bg-gray-50 text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
