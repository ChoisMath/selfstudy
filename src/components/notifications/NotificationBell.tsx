"use client";

import { useEffect, useState, useCallback } from "react";
import {
  subscribeToPush,
  unsubscribeFromPush,
  isIosNonStandalone,
} from "@/lib/push/client";

type BellState =
  | "unsupported"
  | "ios-install"
  | "default"
  | "subscribed"
  | "denied";

export function NotificationBell() {
  const [state, setState] = useState<BellState>("default");
  const [showGuide, setShowGuide] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState(isIosNonStandalone() ? "ios-install" : "unsupported");
      return;
    }
    if (isIosNonStandalone()) {
      setState("ios-install");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setState(sub ? "subscribed" : "default");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleClick = async () => {
    if (state === "ios-install" || state === "unsupported" || state === "denied") {
      setShowGuide((v) => !v);
      return;
    }
    setBusy(true);
    try {
      if (state === "subscribed") {
        await unsubscribeFromPush();
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "default");
          return;
        }
        await subscribeToPush();
      }
      await refresh();
    } catch (err) {
      console.error("notification toggle failed:", err);
    } finally {
      setBusy(false);
    }
  };

  const label =
    state === "subscribed"
      ? "알림 켜짐"
      : state === "denied"
        ? "알림 차단됨"
        : state === "ios-install"
          ? "알림 설치 안내"
          : state === "unsupported"
            ? "알림 미지원"
            : "알림 켜기";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-label={label}
        title={label}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-sm whitespace-nowrap disabled:opacity-50"
      >
        <span aria-hidden>{state === "subscribed" ? "🔔" : "🔕"}</span>
        <span className="hidden sm:inline whitespace-nowrap">{label}</span>
      </button>

      {showGuide && (
        <div className="absolute right-0 z-[120] mt-1 w-64 max-w-[calc(100vw-1rem)] rounded-md border border-gray-200 bg-white p-3 text-sm shadow-lg">
          {state === "ios-install" ? (
            <p className="leading-relaxed">
              iPhone에서는 Safari 하단 <b>공유</b> 버튼 → <b>홈 화면에 추가</b>로
              앱을 설치한 뒤 다시 열어 알림을 켜 주세요.
            </p>
          ) : state === "denied" ? (
            <p className="leading-relaxed">
              브라우저 설정에서 이 사이트의 알림 권한을 <b>허용</b>으로 변경해
              주세요.
            </p>
          ) : (
            <p className="leading-relaxed">
              이 브라우저는 웹 푸시 알림을 지원하지 않습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
