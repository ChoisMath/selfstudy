import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 공개 경로
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // JWT 토큰에서 세션 확인 (Edge Runtime 호환 - Prisma 불필요)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // 미인증 → 로그인 페이지
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const userType = token.userType as string | undefined;
  const roles = token.roles as string[] | undefined;
  const subAdminGrades = token.subAdminGrades as number[] | undefined;

  // /admin/* → admin 역할만
  if (pathname.startsWith("/admin")) {
    if (!roles?.includes("admin")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // /grade-admin/[grade]/* → sub_admin(해당학년) 또는 admin
  if (pathname.startsWith("/grade-admin/")) {
    const gradeMatch = pathname.match(/^\/grade-admin\/(\d+)/);
    if (gradeMatch) {
      const grade = parseInt(gradeMatch[1]);
      const isAdmin = roles?.includes("admin");
      const isSubAdmin = subAdminGrades?.includes(grade);
      if (!isAdmin && !isSubAdmin) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  }

  // /student/* → 학생만
  if (pathname.startsWith("/student")) {
    if (userType !== "student") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // /homeroom/* → homeroom 또는 admin
  if (pathname.startsWith("/homeroom")) {
    if (!roles?.includes("homeroom") && !roles?.includes("admin")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // /attendance/* → supervisor, admin, sub_admin, homeroom(읽기)
  if (pathname.startsWith("/attendance")) {
    const allowed =
      roles?.includes("supervisor") ||
      roles?.includes("admin") ||
      roles?.includes("homeroom") ||
      (subAdminGrades && subAdminGrades.length > 0);
    if (!allowed) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
