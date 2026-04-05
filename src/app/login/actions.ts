"use server";

import { signIn } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function loginTeacher(formData: FormData) {
  const loginId = formData.get("loginId") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("teacher-credentials", {
      loginId,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    // signIn 성공 시 redirect error가 throw됨
    // 소프트 네비게이션(re-throw) 대신 성공 반환 → 클라이언트에서 full reload
    if (isRedirectError(error)) {
      return { success: true };
    }
    return { error: "ID 또는 비밀번호가 올바르지 않습니다." };
  }
}

export async function loginStudent(formData: FormData) {
  const name = formData.get("name") as string;
  const studentCode = formData.get("studentCode") as string;

  if (!studentCode || studentCode.length !== 5 || !/^\d{5}$/.test(studentCode)) {
    return { error: "학번은 5자리 숫자입니다. (예: 20102)" };
  }

  try {
    await signIn("student-credentials", {
      name,
      studentCode,
      redirectTo: "/",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      return { success: true };
    }
    return { error: "이름 또는 학번이 올바르지 않습니다." };
  }
}
