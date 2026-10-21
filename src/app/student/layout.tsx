"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { GuideHelpButton } from "@/components/guide/GuideHelpButton";
import { chrome } from "@/components/ui/chrome";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className={`${chrome.page} flex items-center justify-center`}>
        <p className="text-ink-muted" role="status" aria-live="polite">로딩 중…</p>
      </div>
    );
  }

  const user = session?.user;
  if (!user) return null;
  const displayCode = `${user.grade}-${user.classNumber}-${String(user.studentNumber).padStart(2, "0")}`;

  const tabs = [
    { href: "/student", label: "참여일정" },
    { href: "/student/attendance", label: "출결기록" },
    { href: "/student/absence-requests", label: "불참목록" },
    ...(user.isHelper ? [{ href: "/student/batch-absence", label: "일괄신청" }] : []),
  ];

  return (
    <div className={`${chrome.page} [--header-h:7.625rem]`}>
      {/* 헤더 */}
      <header className={chrome.nav}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/posan.svg" alt="포산고등학교" width={32} height={32} className="w-8 h-8" />
            <h1 className="text-lg font-bold text-ink">
              {user.name}{" "}
              <span className="text-sm font-normal text-ink-muted tabular-nums">
                ({displayCode})
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <GuideHelpButton href="/help/student" />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={`${chrome.ghostButton} px-3 hover:bg-butter`}
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="max-w-2xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {tabs.map((tab) => {
              const isActive =
                tab.href === "/student"
                  ? pathname === "/student"
                  : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`${chrome.navTab(isActive)} px-4`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-2xl mx-auto px-2 md:px-3 lg:px-4 py-6">{children}</main>
    </div>
  );
}
