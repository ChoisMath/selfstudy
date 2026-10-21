"use client";

import { useState, useRef, useCallback, useEffect, useId } from "react";
import { chrome } from "@/components/ui/chrome";
import { Dialog } from "@/components/ui/Dialog";

type FailedRow = { row: number; reason: string };
type UploadResult = { success: number; failed: FailedRow[] };

export default function ExcelUploadModal({
  isOpen,
  onClose,
  templateUrl,
  templateFilename,
  uploadUrl,
  onUploaded,
  title = "Excel 일괄 업로드",
}: {
  isOpen: boolean;
  onClose: () => void;
  templateUrl: string;
  templateFilename: string;
  uploadUrl: string;
  onUploaded?: () => void;
  title?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // 모달 닫을 때 state 리셋
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setIsDragging(false);
      setIsUploading(false);
      setResult(null);
      setError(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [isOpen]);

  const handleDownloadTemplate = async () => {
    setError(null);
    try {
      const res = await fetch(templateUrl);
      if (!res.ok) throw new Error("템플릿 다운로드에 실패했습니다.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = templateFilename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("템플릿을 내려받지 못했습니다. 잠시 후 다시 시도하세요.");
    }
  };

  const validateFile = useCallback((f: File): boolean => {
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      setError("Excel 파일(.xlsx, .xls)만 업로드할 수 있습니다. 템플릿을 내려받아 작성한 뒤 다시 선택하세요.");
      return false;
    }
    setError(null);
    return true;
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && validateFile(f)) {
      setFile(f);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && validateFile(f)) {
      setFile(f);
      setResult(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "업로드에 실패했습니다.");
      }

      const data: UploadResult = await res.json();
      setResult(data);

      if (data.success > 0) {
        onUploaded?.();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "업로드에 실패했습니다.";
      setError(`${message} 파일을 확인하고 다시 시도하세요.`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={title}
      description="템플릿을 내려받아 작성한 뒤 올리세요."
      panelClassName="max-w-lg"
      closeDisabled={isUploading}
    >
      <div className="space-y-4">
        {/* 템플릿 다운로드 */}
        <button type="button" onClick={handleDownloadTemplate} className={`${chrome.secondaryButton} w-full`}>
          템플릿 다운로드
        </button>

        {/* 드래그앤드롭 영역 — 숨긴 file input 은 label 로 연다(키보드: Tab 으로 input 에 포커스 후 Enter/Space) */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed transition-colors ${
            isDragging
              ? "border-primary bg-peach"
              : file
                ? "border-emerald-300 bg-emerald-50"
                : "border-line hover:border-primary-soft hover:bg-canvas"
          }`}
        >
          <input
            ref={fileRef}
            id={inputId}
            name="file"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="peer sr-only"
          />
          <label
            htmlFor={inputId}
            className="block cursor-pointer rounded-2xl p-6 text-center peer-focus-visible:ring-2 peer-focus-visible:ring-primary sm:p-8"
          >
            {file ? (
              <span className="block pr-10 text-sm font-medium text-emerald-700 break-words">{file.name}</span>
            ) : (
              <span className="block">
                <span className="mb-2 block text-3xl" aria-hidden="true">📄</span>
                <span className="block text-sm text-ink">파일을 끌어다 놓거나 눌러서 선택하세요</span>
                <span className="mt-1 block text-xs text-ink-muted">.xlsx, .xls 파일</span>
              </span>
            )}
          </label>
          {file && (
            <button
              type="button"
              onClick={clearFile}
              disabled={isUploading}
              aria-label="선택한 파일 지우기"
              className={`${chrome.iconButton} absolute right-2 top-1/2 -translate-y-1/2 hover:text-red-600 disabled:opacity-50`}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          )}
        </div>

        {/* 업로드 버튼 */}
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || isUploading}
          className={`${chrome.primaryButton} w-full`}
        >
          {isUploading ? "업로드 중…" : "업로드"}
        </button>

        {/* 에러 */}
        <div aria-live="polite">
          {error && <div className={chrome.notice("error")}>{error}</div>}
        </div>

        {/* 결과 */}
        <div aria-live="polite">
          {result && (
            <div className="space-y-2">
              <div className="flex gap-3 text-sm tabular-nums">
                <span className="font-medium text-emerald-700">
                  성공: {result.success}건
                </span>
                {result.failed.length > 0 && (
                  <span className="font-medium text-red-700">
                    실패: {result.failed.length}건
                  </span>
                )}
              </div>

              {result.failed.length > 0 && (
                <div className="max-h-48 overflow-y-auto overscroll-contain rounded-xl border border-red-200">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-red-50">
                      <tr>
                        <th className="w-16 px-3 py-1.5 text-left font-medium text-red-700">
                          행
                        </th>
                        <th className="px-3 py-1.5 text-left font-medium text-red-700">
                          사유
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {result.failed.map((f, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-ink tabular-nums">{f.row}</td>
                          <td className="break-words px-3 py-1.5 text-ink">
                            {f.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
