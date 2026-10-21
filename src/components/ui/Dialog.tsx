"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { chrome } from "./chrome";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** 패널 너비 등. 기본 max-w-md */
  panelClassName?: string;
  /** 처리 중에는 닫기를 막는다 */
  closeDisabled?: boolean;
  /** z-index. 출석 화면처럼 sticky 상단 바(z-[100]) 위여야 하면 올린다 */
  zClassName?: string;
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * 접근 가능한 모달: role=dialog·aria-modal·제목 연결, Escape 닫기, Tab 순환, 열릴 때 첫 컨트롤 포커스·닫힐 때 복귀,
 * 배경 스크롤 잠금, 패널 overscroll-contain. 배경 클릭으로 닫힌다.
 */
export function Dialog({ open, onClose, title, description, children, panelClassName = "max-w-md", closeDisabled = false, zClassName = "z-[200]" }: Props) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // 최신 onClose·closeDisabled 를 키 핸들러에서 쓰되, 바뀔 때마다 포커스 효과가 다시 돌지 않게 ref 로 든다
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);
  useEffect(() => {
    onCloseRef.current = onClose;
    closeDisabledRef.current = closeDisabled;
  }, [onClose, closeDisabled]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    (focusables().find((el) => el.getAttribute("aria-label") !== "닫기") ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!closeDisabledRef.current) {
          e.preventDefault();
          onCloseRef.current();
        }
        return;
      }
      if (e.key === "Tab") {
        const f = focusables();
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const requestClose = () => {
    if (!closeDisabled) onClose();
  };

  return (
    <div className={`fixed inset-0 ${zClassName} flex items-center justify-center p-4`} onClick={requestClose}>
      <div className="absolute inset-0 bg-ink/50" aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`relative w-full max-h-[90dvh] overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-xl focus:outline-none ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-white px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-ink text-balance">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-xs text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <button type="button" onClick={requestClose} disabled={closeDisabled} aria-label="닫기" className={`${chrome.iconButton} disabled:opacity-50`}>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
