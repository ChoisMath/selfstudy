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

  // Auth.js v5: 쿠키 접두사가 authjs로 변경됨 → salt/cookieName 명시 필요
  const isSecure = req.url.startsWith("https://");
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    salt: cookieName,
    cookieName,
  });

  // 미인증 → 로그인 페이지
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const userType = token.userType as string | undefined;
  const roles = token.roles as string[] | undefined;
  const subAdminGrades = token.subAdminGrades as number[] | undefined;

  const isApi = pathname.startsWith("/api/");

  // /admin/*, /api/admin/* → admin 역할만
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!roles?.includes("admin")) {
      if (isApi) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // /grade-admin/[grade]/*, /api/grade-admin/[grade]/* → sub_admin(해당학년) 또는 admin
  const gradeAdminMatch = pathname.match(/^(?:\/api)?\/grade-admin\/(\d+)/);
  if (gradeAdminMatch) {
    const grade = parseInt(gradeAdminMatch[1]);
    const isAdmin = roles?.includes("admin");
    const isSubAdmin = subAdminGrades?.includes(grade);
    if (!isAdmin && !isSubAdmin) {
      if (isApi) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // /student/*, /api/student/* → 학생만
  if (pathname.startsWith("/student") || pathname.startsWith("/api/student")) {
    if (userType !== "student") {
      if (isApi) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // /homeroom/*, /api/homeroom/* → 모든 교사 접근 가능 (감독배정표 등 공유 기능)
  if (pathname.startsWith("/homeroom") || pathname.startsWith("/api/homeroom")) {
    if (userType !== "teacher") {
      if (isApi) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // /attendance/*, /api/attendance/* → 모든 교사 접근 가능
  if (pathname.startsWith("/attendance") || pathname.startsWith("/api/attendance")) {
    if (userType !== "teacher") {
      if (isApi) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
