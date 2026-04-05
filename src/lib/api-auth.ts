import { auth } from "./auth";
import { NextResponse } from "next/server";

type SessionUser = {
  userType: string;
  userId: number;
  roles?: string[];
  homeroomAssignments?: { grade: number; classNumber: number }[];
  subAdminGrades?: number[];
  grade?: number;
  classNumber?: number;
  studentNumber?: number;
};

/**
 * API 라우트에서 인증 + 역할 검사를 수행하는 래퍼.
 * 교사 역할 기반 RBAC.
 */
export function withAuth(
  roles: string[],
  handler: (req: Request, user: SessionUser) => Promise<Response>
) {
  return async (req: Request) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const user = session.user as SessionUser;

    // 학생 접근인 경우
    if (user.userType === "student") {
      if (!roles.includes("student")) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
      return handler(req, user);
    }

    // 교사 접근: admin은 모든 교사 라우트에 접근 가능
    if (user.roles?.includes("admin")) {
      return handler(req, user);
    }

    // "teacher" 의사 역할: 모든 교사 허용
    if (roles.includes("teacher") && user.userType === "teacher") {
      return handler(req, user);
    }

    // 역할 검사
    const hasRole = roles.some((r) => user.roles?.includes(r));
    // sub_admin 역할 체크: subAdminGrades가 있으면 sub_admin으로 간주
    const isSubAdmin =
      roles.includes("sub_admin") &&
      user.subAdminGrades &&
      user.subAdminGrades.length > 0;

    if (!hasRole && !isSubAdmin) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    return handler(req, user);
  };
}

/**
 * 서브관리자 학년 검증 미들웨어.
 * 서브관리자가 자기 학년만 접근 가능하도록 검증.
 * admin은 모든 학년 접근 가능.
 */
export function withGradeAuth(
  grade: number,
  handler: (req: Request, user: SessionUser) => Promise<Response>
) {
  return withAuth(["admin", "sub_admin"], async (req: Request, user: SessionUser) => {
    // admin은 모든 학년 접근 가능
    if (user.roles?.includes("admin")) {
      return handler(req, user);
    }

    // 서브관리자: 해당 학년만 접근 가능
    if (!user.subAdminGrades?.includes(grade)) {
      return NextResponse.json(
        { error: "해당 학년에 대한 권한이 없습니다." },
        { status: 403 }
      );
    }

    return handler(req, user);
  });
}

/**
 * 담임교사의 반 접근 권한 검증.
 * 담임교사가 자기 반 학생만 접근 가능하도록 검증.
 */
export function withHomeroomAuth(
  grade: number,
  classNumber: number,
  handler: (req: Request, user: SessionUser) => Promise<Response>
) {
  return withAuth(["admin", "homeroom"], async (req: Request, user: SessionUser) => {
    if (user.roles?.includes("admin")) {
      return handler(req, user);
    }

    const hasClass = user.homeroomAssignments?.some(
      (h) => h.grade === grade && h.classNumber === classNumber
    );

    if (!hasClass) {
      return NextResponse.json(
        { error: "해당 반에 대한 권한이 없습니다." },
        { status: 403 }
      );
    }

    return handler(req, user);
  });
}
