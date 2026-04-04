"use client";

import { useState, useRef } from "react";

type FailedRow = { row: number; reason: string };

type UploadResult = {
  success: number;
  failed: FailedRow[];
};

export default function BulkUpload({
  grade,
  onUploaded,
}: {
  grade: number;
  onUploaded?: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch("/api/admin/students/template");
      if (!res.ok) throw new Error("템플릿 다운로드에 실패했습니다.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "student_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("템플릿 다운로드에 실패했습니다.");
    }
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("파일을 선택해주세요.");
      return;
    }

    if (
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls")
    ) {
      setError("Excel 파일(.xlsx, .xls)만 업로드 가능합니다.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/grade-admin/${grade}/students/bulk-upload`,
        {
          method: "POST",
          body: formData,
        }
      );

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
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Excel 일괄 업로드
        </h3>
        <button
          onClick={handleDownloadTemplate}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          템플릿 다운로드
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="flex-1 text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="px-4 py-1.5 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {isUploading ? "업로드 중..." : "업로드"}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

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
                      <td className="px-3 py-1.5 text-gray-700">{f.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
