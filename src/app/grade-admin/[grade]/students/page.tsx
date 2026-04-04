"use client";

import { useParams } from "next/navigation";
import StudentManagement from "@/components/students/StudentManagement";

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
