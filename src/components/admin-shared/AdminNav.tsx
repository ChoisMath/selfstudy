"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { chrome } from "@/components/ui/chrome";

interface NavItem {
  label: string;
  href: string;
}

export function AdminNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const user = session?.user;
  const isAdmin = user?.roles?.includes("admin");
  const subAdminGrades = user?.subAdminGrades || [];

  const adminItems: NavItem[] = isAdmin
    ? [
        { label: "오늘 출결", href: "/admin" },
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

  const isActiveAdminItem = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const mobileItems: { item: NavItem; active: boolean }[] = [
    ...adminItems.map((item) => ({ item, active: isActiveAdminItem(item.href) })),
    ...allGradeItems.map((item) => ({ item, active: pathname.startsWith(item.href) })),
  ];

  if (status === "loading") {
    return (
      <nav className={chrome.navStatic}>
        <div className="max-w-7xl mx-auto px-2 md:px-3 lg:px-4">
          <div className="flex items-center h-14">
            <img src="/posan.svg" alt="포산고등학교" width={32} height={32} className="w-7 h-7 sm:w-8 sm:h-8 mr-2" />
            <span className={chrome.brandText}>출석부</span>
          </div>
          {/* 세션 확정 후 나타나는 모바일 탭 행(44px) 자리 — 헤더 높이가 튀지 않게 */}
          <div className="lg:hidden min-h-11" />
        </div>
      </nav>
    );
  }

  return (
    <nav className={chrome.nav}>
      <div className="max-w-7xl mx-auto px-2 md:px-3 lg:px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1 overflow-x-auto">
            <Link
              href="/"
              className={`${chrome.brand} mr-2 lg:mr-4`}
            >
              <img src="/posan.svg" alt="포산고등학교" width={32} height={32} className="w-7 h-7 sm:w-8 sm:h-8" />
              <span className={chrome.brandText}>출석부</span>
            </Link>

            {adminItems.map((item) => {
              const isActive = isActiveAdminItem(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`hidden lg:inline-flex ${chrome.navLink(isActive)}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}

            {allGradeItems.length > 0 && adminItems.length > 0 && (
              <div className="hidden lg:block w-px h-6 bg-line mx-1" aria-hidden="true" />
            )}

            {allGradeItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`hidden lg:inline-flex ${chrome.navLink(pathname.startsWith(item.href))}`}
                aria-current={pathname.startsWith(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2 lg:ml-4">
            {!isAdmin && (
              <Link
                href={user?.roles?.includes("homeroom") ? "/homeroom" : "/homeroom/schedule"}
                className={chrome.roleChip("teacher")}
              >
                {user?.roles?.includes("homeroom") ? "담임교사" : "감독일정"}
              </Link>
            )}
            <NotificationBell />
            <span className={chrome.userName}>{user?.name}</span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={chrome.ghostButton}
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 모바일·태블릿: 두 번째 줄 가로 스크롤 탭 (담임 레이아웃과 같은 패턴) */}
        {mobileItems.length > 0 && (
          <div className="lg:hidden flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }} aria-label="관리 메뉴">
            {mobileItems.map(({ item, active }) => (
              <Link
                key={item.href}
                href={item.href}
                className={chrome.navTab(active)}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
