"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

const StudentManagement = dynamic(() => import("@/components/students/StudentManagement"), {
  ssr: false,
  loading: () => <div className="text-center py-12 text-gray-400">불러오는 중...</div>,
});

export default function GradeStudentsPage() {
  const params = useParams();
  const grade = parseInt(params.grade as string, 10);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return (
      <div className="text-center py-12 text-gray-500">
        잘못된 학년입니다.
      </div>
    );
  }

  return <StudentManagement grade={grade} />;
}
