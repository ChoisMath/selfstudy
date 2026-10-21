"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { GuideHelpButton } from "@/components/guide/GuideHelpButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { chrome } from "@/components/ui/chrome";

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
      <div className={chrome.page}>
        <nav className={chrome.navStatic}>
          <div className="max-w-7xl mx-auto px-2 md:px-3 lg:px-4">
            <div className="flex items-center gap-1.5 sm:gap-2 h-14">
              <img src="/posan.svg" alt="포산고등학교" width={32} height={32} className="w-7 h-7 sm:w-8 sm:h-8" />
              <span className={chrome.brandText}>출석부</span>
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
    <div className={`${chrome.page} [--header-h:6.25rem] lg:[--header-h:3.5rem]`}>
      <nav className={chrome.nav}>
        <div className="max-w-7xl mx-auto px-2 md:px-3 lg:px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-1 overflow-x-auto">
              <Link
                href={attendanceHref}
                className={`${chrome.brand} mr-2 lg:mr-4`}
              >
                <img src="/posan.svg" alt="포산고등학교" width={32} height={32} className="w-7 h-7 sm:w-8 sm:h-8" />
                <span className={chrome.brandText}>출석부</span>
              </Link>

              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`hidden lg:inline-flex ${chrome.navLink(isActiveItem(item.href))}`}
                  aria-current={isActiveItem(item.href) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2 lg:ml-4">
              {assignmentText && (
                <span className={chrome.badge} title="담당 학급">
                  {assignmentText}
                </span>
              )}
              <NotificationBell />
              <span className={chrome.userName}>{user?.name}</span>
              <GuideHelpButton href="/help/homeroom" />
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className={chrome.ghostButton}
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
                  className={chrome.navTab(isActive)}
                  aria-current={isActive ? "page" : undefined}
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
