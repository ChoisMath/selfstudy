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

  // 모든 교사는 /attendance로 (감독 배정 시 자동 학년 이동)
  if (user.userType === "teacher") {
    redirect("/attendance");
  }

  redirect("/login");
}
