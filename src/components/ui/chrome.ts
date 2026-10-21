/**
 * 교사·관리자 화면 공용 셸(상단 네비·페이지 배경·칩·버튼) 클래스.
 * 로그인과 같은 따뜻한 토큰(globals.css `@theme static`)을 쓴다. 레이아웃 3곳(attendance·homeroom·AdminNav)이 공유해
 * 색·포커스 링·터치 영역(44px)을 한곳에서 맞춘다. 높이(h-14 = --header-h 3.5rem)는 바꾸지 않는다.
 */

export const chrome = {
  /** 페이지 루트 */
  page: "min-h-dvh bg-canvas text-ink",
  /** sticky 상단 바 */
  nav: "bg-white/90 backdrop-blur border-b border-line sticky top-0 z-50",
  navStatic: "bg-white border-b border-line",
  /** 로고 + "출석부" */
  brand: "flex items-center gap-1.5 sm:gap-2 shrink-0 min-h-11 font-bold text-ink rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
  brandText: "text-sm sm:text-lg font-bold text-ink whitespace-nowrap",
  /** 데스크톱 네비 링크(알약) */
  navLink: (active: boolean) =>
    `inline-flex min-h-11 items-center px-3 text-sm font-medium rounded-xl whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
      active ? "bg-peach text-primary-deep" : "text-ink-muted hover:text-ink hover:bg-butter"
    }`,
  /** 모바일 가로 스크롤 탭(밑줄) */
  navTab: (active: boolean) =>
    `inline-flex min-h-11 items-center px-3 text-sm font-medium whitespace-nowrap shrink-0 transition-colors border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
      active ? "text-primary border-primary" : "text-ink-muted border-transparent hover:text-ink"
    }`,
  /** 다른 역할 화면으로 건너가는 칩 */
  roleChip: (tone: "admin" | "grade" | "teacher") =>
    `inline-flex min-h-11 items-center px-2 sm:px-3 text-[11px] sm:text-xs font-semibold rounded-full border whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
      tone === "admin"
        ? "text-primary-deep bg-peach border-primary-soft hover:bg-primary-soft/60"
        : tone === "grade"
          ? "text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
          : "text-sky-800 bg-sky/60 border-sky hover:bg-sky"
    }`,
  /** 학급 배정 표시 등 읽기 전용 배지 */
  badge: "text-xs text-ink-muted bg-butter px-2 py-1 rounded-full whitespace-nowrap",
  userName: "text-xs sm:text-sm text-ink-muted whitespace-nowrap",
  /** 로그아웃 등 조용한 버튼 */
  ghostButton:
    "min-h-11 px-2 text-xs sm:text-sm text-ink-muted hover:text-ink rounded-lg cursor-pointer whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
  /** 아이콘 전용 둥근 버튼(도움말·알림) */
  iconButton:
    "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-butter hover:text-ink cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
  /** 본문 안 탭(알약). role="tab" + aria-selected 와 함께 쓴다 */
  tab: (active: boolean) =>
    `inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold rounded-xl whitespace-nowrap cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
      active ? "bg-primary text-white shadow-sm" : "bg-butter text-ink-muted hover:bg-peach hover:text-ink"
    }`,
  /** 필터·세션 토글 칩. aria-pressed 와 함께 쓴다 */
  chip: (active: boolean) =>
    `inline-flex min-h-11 items-center px-3 text-sm font-semibold rounded-full whitespace-nowrap cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
      active ? "bg-primary text-white" : "bg-butter text-ink-muted hover:bg-peach hover:text-ink"
    }`,
  /** 폼 컨트롤 */
  label: "mb-1 block text-sm font-medium text-ink",
  input:
    "block w-full min-h-11 rounded-xl border border-line bg-white px-3 text-base text-ink placeholder:text-ink-muted/60 transition-[box-shadow,border-color] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-butter/60 disabled:text-ink-muted",
  select:
    "block min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink transition-[box-shadow,border-color] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
  /** 상태 메시지(aria-live 와 함께) */
  notice: (tone: "info" | "ok" | "error") =>
    `rounded-xl border px-3 py-2 text-sm ${
      tone === "ok"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-line bg-butter text-ink"
    }`,
  /** 데이터 표 */
  tableHead: "bg-butter text-ink-muted",
  tableRowHover: "hover:bg-canvas",
  /** 본문 카드 */
  card: "bg-white rounded-2xl border border-line shadow-[0_10px_30px_-18px_rgba(194,65,12,0.25)]",
  /** 주 버튼 / 보조 버튼 */
  primaryButton:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white cursor-pointer transition-colors hover:bg-primary-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
  secondaryButton:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink cursor-pointer transition-colors hover:bg-butter focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60",
};
