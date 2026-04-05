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

  // 교사: 담당학년이 있으면 해당 학년으로, 없으면 학년 선택 페이지로
  if (user.userType === "teacher") {
    if (user.primaryGrade) {
      redirect(`/attendance/${user.primaryGrade}`);
    }
    redirect("/attendance");
  }

  redirect("/login");
}
