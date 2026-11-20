"use client";

import { useState, useRef, useCallback, useEffect } from "react";

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
      alert("템플릿 다운로드에 실패했습니다.");
    }
  };

  const validateFile = useCallback((f: File): boolean => {
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      setError("Excel 파일(.xlsx, .xls)만 업로드 가능합니다.");
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
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* 템플릿 다운로드 */}
          <button
            onClick={handleDownloadTemplate}
            className="w-full px-4 py-2.5 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
          >
            템플릿 다운로드
          </button>

          {/* 드래그앤드롭 영역 */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : file
                  ? "border-green-300 bg-green-50"
                  : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-green-700 font-medium">
                  {file.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setResult(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="text-gray-400 hover:text-red-500 text-lg leading-none"
                >
                  &times;
                </button>
              </div>
            ) : (
              <div>
                <div className="text-3xl text-gray-300 mb-2">📄</div>
                <p className="text-sm text-gray-500">
                  파일을 드래그하거나 클릭하여 선택하세요
                </p>
                <p className="text-xs text-gray-400 mt-1">.xlsx, .xls 파일</p>
              </div>
            )}
          </div>

          {/* 업로드 버튼 */}
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full px-4 py-2.5 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? "업로드 중..." : "업로드"}
          </button>

          {/* 에러 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 결과 */}
          {result && (
            <div className="space-y-2">
              <div className="flex gap-3 text-sm">
                <span className="text-green-700 font-medium">
                  성공: {result.success}건
                </span>
                {result.failed.length > 0 && (
                  <span className="text-red-700 font-medium">
                    실패: {result.failed.length}건
                  </span>
                )}
              </div>

              {result.failed.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-red-200 rounded-md">
                  <table className="w-full text-xs">
                    <thead className="bg-red-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium text-red-700 w-16">
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
                          <td className="px-3 py-1.5 text-gray-700">{f.row}</td>
                          <td className="px-3 py-1.5 text-gray-700">
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
    </div>
  );
}
