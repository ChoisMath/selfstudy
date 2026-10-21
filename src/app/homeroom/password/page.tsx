"use client";

import { useId, useRef, useState } from "react";
import { chrome } from "@/components/ui/chrome";

export default function PasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const ids = useId();
  const currentId = `${ids}-current`;
  const newId = `${ids}-new`;
  const confirmId = `${ids}-confirm`;
  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const fail = (text: string, field: React.RefObject<HTMLInputElement | null>) => {
    setMessage({ type: "error", text });
    field.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!currentPassword) return fail("현재 비밀번호를 입력하세요.", currentRef);
    if (!newPassword) return fail("새 비밀번호를 입력하세요.", newRef);
    if (newPassword.length < 4) return fail("새 비밀번호는 4자 이상이어야 합니다.", newRef);
    if (newPassword !== confirmPassword) return fail("새 비밀번호가 일치하지 않습니다. 같은 값을 다시 입력하세요.", confirmRef);

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "비밀번호 변경에 실패했습니다.");
      }

      setMessage({ type: "success", text: "비밀번호가 변경되었습니다." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다.";
      setMessage({ type: "error", text: msg });
      currentRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink text-balance">비밀번호 변경</h1>

      <div className={`${chrome.card} max-w-md p-4 sm:p-6`}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor={currentId} className={chrome.label}>
              현재 비밀번호
            </label>
            <input
              id={currentId}
              ref={currentRef}
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={chrome.input}
              required
            />
          </div>

          <div>
            <label htmlFor={newId} className={chrome.label}>
              새 비밀번호
            </label>
            <input
              id={newId}
              ref={newRef}
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={chrome.input}
              aria-describedby={`${newId}-hint`}
              required
              minLength={4}
            />
            <p id={`${newId}-hint`} className="mt-1 text-xs text-ink-muted">4자 이상</p>
          </div>

          <div>
            <label htmlFor={confirmId} className={chrome.label}>
              새 비밀번호 확인
            </label>
            <input
              id={confirmId}
              ref={confirmRef}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={chrome.input}
              required
              minLength={4}
            />
          </div>

          <div role="status" aria-live="polite">
            {message && (
              <div className={chrome.notice(message.type === "success" ? "ok" : "error")}>
                {message.text}
              </div>
            )}
          </div>

          <button type="submit" disabled={submitting} aria-busy={submitting} className={`${chrome.primaryButton} w-full`}>
            {submitting ? "변경 중…" : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </div>
  );
}
