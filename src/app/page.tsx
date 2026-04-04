import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const user = session.user;

  // 역할에 따른 리다이렉트
  if (user.userType === "student") {
    redirect("/student");
  }

  if (user.roles?.includes("admin")) {
    redirect("/admin");
  }

  if (user.roles?.includes("supervisor")) {
    redirect("/attendance");
  }

  if (user.roles?.includes("homeroom")) {
    redirect("/homeroom");
  }

  // 서브관리자 (role enum에 없지만 subAdminGrades가 있는 경우)
  if (user.subAdminGrades && user.subAdminGrades.length > 0) {
    redirect(`/grade-admin/${user.subAdminGrades[0]}`);
  }

  redirect("/login");
}
