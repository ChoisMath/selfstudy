"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { loginTeacher, loginStudent } from "./actions";
import { LoginScene } from "./LoginScene";

type Tab = "teacher" | "student";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "teacher", label: "교사", hint: "아이디와 비밀번호로 로그인합니다." },
  { id: "student", label: "학생", hint: "이름과 학번 5자리로 로그인합니다." },
];

/** 마지막으로 쓴 탭을 이 기기에만 기억한다 (학생 폰에서 매번 탭을 바꾸지 않도록) */
const TAB_STORAGE_KEY = "selfstudy.login.tab";

function readStoredTab(): Tab | null {
  try {
    const v = window.localStorage.getItem(TAB_STORAGE_KEY);
    return v === "teacher" || v === "student" ? v : null;
  } catch {
    return null;
  }
}

// 서버 렌더에서는 값이 없고 클라이언트에서만 읽는 외부 상태 → useSyncExternalStore 로 hydration 불일치 없이 구독
const subscribeStorage = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};
const noSubscribe = () => () => {};
const formatToday = () =>
  new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date());

function storeTab(tab: Tab) {
  try {
    window.localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {
    /* 사생활 보호 모드 등에서는 기억하지 않아도 된다 */
  }
}

const inputClass =
  "block w-full min-h-12 rounded-xl border border-line bg-white px-4 text-base text-ink placeholder:text-slate-400 " +
  "transition-[box-shadow,border-color] duration-150 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/25 " +
  "aria-[invalid=true]:border-red-500";

export default function LoginPage() {
  const storedTab = useSyncExternalStore(subscribeStorage, readStoredTab, () => null);
  const today = useSyncExternalStore(noSubscribe, formatToday, () => "");
  const [chosenTab, setChosenTab] = useState<Tab | null>(null);
  const tab: Tab = chosenTab ?? storedTab ?? "teacher";
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isPending, startTransition] = useTransition();

  const baseId = useId();
  const errorId = `${baseId}-error`;
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ teacher: null, student: null });
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  // 로그인 실패 시 첫 입력칸으로 포커스를 돌려 바로 고칠 수 있게 한다
  useEffect(() => {
    if (error) firstFieldRef.current?.focus();
  }, [error]);

  function selectTab(next: Tab, focus = false) {
    setChosenTab(next);
    setError("");
    setShowPassword(false);
    storeTab(next);
    if (focus) tabRefs.current[next]?.focus();
  }

  function handleTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const idx = TABS.findIndex((t) => t.id === tab);
    const nextIdx =
      e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (idx + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    selectTab(TABS[nextIdx].id, true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const action = tab === "teacher" ? loginTeacher : loginStudent;
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) setError(result.error);
      else if (result?.success) window.location.href = "/";
    });
  }

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <main className="min-h-dvh bg-canvas text-ink lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* ───── 왼쪽: 학교·학습 분위기 패널 + 모션그래픽 ───── */}
      <section
        aria-labelledby="login-title"
        className="relative flex flex-col gap-5 bg-navy px-4 pb-6 pt-5 text-white sm:gap-7 sm:px-8 sm:pt-8 lg:min-h-dvh lg:justify-between lg:px-14 lg:py-12"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_0%,rgba(255,255,255,0.10),transparent_70%)]"
        />

        <header className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm sm:h-14 sm:w-14">
            <Image src="/posan.svg" alt="포산고등학교" width={44} height={44} priority className="h-10 w-10 sm:h-11 sm:w-11" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-200">포산고등학교</p>
            <h1 id="login-title" className="text-xl font-bold leading-tight sm:text-2xl">
              자율학습 출석부
            </h1>
          </div>
          {today && (
            <p className="ml-auto hidden text-right text-sm text-blue-100 sm:block" aria-label={`오늘은 ${today}`}>
              {today}
            </p>
          )}
        </header>

        <div className="relative hidden lg:block">
          <p className="text-3xl font-bold leading-snug [text-wrap:balance]">
            집중하는 시간,
            <br />
            정확한 기록.
          </p>
          <p className="mt-3 max-w-md text-base leading-relaxed text-blue-100">
            학생은 자리에서 학습에 집중하고, 선생님은 좌석표를 한 번 눌러 출석을 확인합니다. 오후·야간 자습의 출결이 한곳에
            모입니다.
          </p>
        </div>

        <figure className="relative mx-auto w-full max-w-xl">
          <div className="rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10 sm:p-5">
            <LoginScene paused={paused} className="h-auto w-full" />
          </div>
          <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-blue-100">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-lamp" />
              학생은 자리에서 학습 중
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-seat-present" />
              교사는 좌석표로 출석 확인
            </span>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {paused ? (
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                  <path d="M6.3 3.6A1 1 0 0 0 4.8 4.5v11a1 1 0 0 0 1.5.9l9-5.5a1 1 0 0 0 0-1.8l-9-5.5Z" />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                  <path d="M5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4Zm6 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V4Z" />
                </svg>
              )}
              {paused ? "움직임 재생" : "움직임 멈춤"}
            </button>
          </figcaption>
        </figure>

        <p className="relative hidden text-xs text-blue-200/80 lg:block">자율학습 출석 관리 시스템 · 포산고등학교</p>
      </section>

      {/* ───── 오른쪽: 로그인 카드 ───── */}
      <section aria-label="로그인" className="flex items-start justify-center px-4 py-8 sm:px-8 lg:min-h-dvh lg:items-center lg:px-14">
        <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">로그인</h2>
          <p className="mt-1 text-sm text-ink-muted">역할을 고르고 정보를 입력하세요.</p>

          {/* 역할 탭 */}
          <div role="tablist" aria-label="로그인 유형" className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {TABS.map((t) => {
              const selected = tab === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel-${t.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(t.id)}
                  onKeyDown={handleTabKeyDown}
                  className={`min-h-11 cursor-pointer rounded-lg text-sm font-semibold transition-[background-color,color,box-shadow] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 ${
                    selected ? "bg-white text-navy shadow-sm" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {t.label} 로그인
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-muted">{current.hint}</p>

          {error && (
            <div
              id={errorId}
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-8-4a1 1 0 0 0-1 1v3.5a1 1 0 1 0 2 0V7a1 1 0 0 0-1-1Zm0 8.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form
            key={tab}
            id={`${baseId}-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${tab}`}
            onSubmit={handleSubmit}
            aria-busy={isPending}
            className="mt-5 space-y-4"
          >
            {tab === "teacher" ? (
              <>
                <div>
                  <label htmlFor="loginId" className="mb-1.5 block text-sm font-medium text-ink">
                    아이디
                  </label>
                  <input
                    ref={firstFieldRef}
                    id="loginId"
                    name="loginId"
                    type="text"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={inputClass}
                    placeholder="예: teacher1-1"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                    비밀번호
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : undefined}
                      className={`${inputClass} pr-12`}
                      placeholder="비밀번호"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                      className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-r-xl text-ink-muted transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-navy"
                    >
                      {showPassword ? (
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.8 2.8M9.9 5.1A10.4 10.4 0 0 1 12 4.9c5 0 8.6 4.1 9.7 6.5a1.3 1.3 0 0 1 0 1.2 13 13 0 0 1-2.6 3.4M6.4 6.5C4.4 7.9 3 9.8 2.3 11.4a1.3 1.3 0 0 0 0 1.2C3.4 15 7 19.1 12 19.1c1.6 0 3-.4 4.3-1" />
                        </svg>
                      ) : (
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.3 11.4C3.4 9 7 4.9 12 4.9s8.6 4.1 9.7 6.5a1.3 1.3 0 0 1 0 1.2C20.6 15 17 19.1 12 19.1S3.4 15 2.3 12.6a1.3 1.3 0 0 1 0-1.2Z" />
                          <circle cx={12} cy={12} r={3} />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="studentName" className="mb-1.5 block text-sm font-medium text-ink">
                    이름
                  </label>
                  <input
                    ref={firstFieldRef}
                    id="studentName"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={inputClass}
                    placeholder="예: 김서현"
                  />
                </div>
                <div>
                  <label htmlFor="studentCode" className="mb-1.5 block text-sm font-medium text-ink">
                    학번 <span className="font-normal text-ink-muted">(5자리)</span>
                  </label>
                  <input
                    id="studentCode"
                    name="studentCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{5}"
                    maxLength={5}
                    required
                    autoComplete="off"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${baseId}-code-help ${errorId}` : `${baseId}-code-help`}
                    className={`${inputClass} tracking-[0.2em] tabular-nums`}
                    placeholder="20102"
                  />
                  <p id={`${baseId}-code-help`} className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                    학년 1자리 + 반 2자리 + 번호 2자리. 예) 2학년 1반 2번 → <span className="font-medium text-ink">20102</span>
                  </p>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-navy text-base font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 hover:bg-navy-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && (
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 motion-safe:animate-spin" fill="none">
                  <circle cx={12} cy={12} r={9} stroke="currentColor" strokeOpacity={0.3} strokeWidth={3} />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
                </svg>
              )}
              {isPending ? "로그인 중…" : `${current.label} 로그인`}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm">
            <a
              href="/help"
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-ink-muted transition-colors hover:text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy"
            >
              사용 안내 보기
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M7.2 14.8a.75.75 0 0 1 0-1.06L10.94 10 7.2 6.26a.75.75 0 1 1 1.06-1.06l4.27 4.27a.75.75 0 0 1 0 1.06L8.26 14.8a.75.75 0 0 1-1.06 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
            <p className="text-xs text-ink-muted">문의: 담임·학년 담당 선생님</p>
          </div>
        </div>
      </section>
    </main>
  );
}
