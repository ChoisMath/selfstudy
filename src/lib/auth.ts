import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    // 교사 ID/PW 로그인
    Credentials({
      id: "teacher-credentials",
      name: "교사 로그인",
      credentials: {
        loginId: { label: "ID", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const loginId = credentials?.loginId as string;
        const password = credentials?.password as string;
        if (!loginId || !password) return null;

        // 1단계: 비밀번호 검증 (최소 필드만 조회)
        const basic = await prisma.teacher.findUnique({
          where: { loginId },
          select: { id: true, passwordHash: true },
        });
        if (!basic) return null;

        const valid = await bcrypt.compare(password, basic.passwordHash);
        if (!valid) return null;

        // 2단계: 성공 시에만 전체 정보 로드
        const teacher = await prisma.teacher.findUnique({
          where: { id: basic.id },
          include: {
            roles: true,
            homeroomAssignments: true,
            subAdminAssignments: true,
          },
        });
        if (!teacher) return null;

        return {
          id: String(teacher.id),
          name: teacher.name,
          userType: "teacher" as const,
          roles: teacher.roles.map((r) => r.role),
          primaryGrade: teacher.primaryGrade,
          homeroomAssignments: teacher.homeroomAssignments.map((h) => ({
            grade: h.grade,
            classNumber: h.classNumber,
          })),
          subAdminGrades: teacher.subAdminAssignments.map((s) => s.grade),
        };
      },
    }),

    // 학생 이름+학번 로그인
    Credentials({
      id: "student-credentials",
      name: "학생 로그인",
      credentials: {
        name: { label: "이름", type: "text" },
        studentCode: { label: "학번", type: "text" },
      },
      async authorize(credentials) {
        const studentName = credentials?.name as string;
        const studentCode = credentials?.studentCode as string;
        if (!studentName || !studentCode) return null;

        // 학번 파싱: grade(1자리) + classNumber(2자리) + studentNumber(2자리)
        const code = parseInt(studentCode, 10);
        if (isNaN(code) || studentCode.length !== 5) return null;

        const grade = Math.floor(code / 10000);
        const classNumber = Math.floor((code % 10000) / 100);
        const studentNumber = code % 100;

        if (grade < 1 || grade > 3 || classNumber < 1 || studentNumber < 1) return null;

        const student = await prisma.student.findFirst({
          where: {
            name: studentName,
            grade,
            classNumber,
            studentNumber,
            isActive: true,
          },
        });
        if (!student) return null;

        return {
          id: String(student.id),
          name: student.name,
          userType: "student" as const,
          grade: student.grade,
          classNumber: student.classNumber,
          studentNumber: student.studentNumber,
        };
      },
    }),

    // Google (교사 전용)
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 기본 8시간 (교사)
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // 초기 로그인 시 user 정보를 token에 주입
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token.userType = u.userType as string;
        token.userId = parseInt(u.id as string, 10);

        if (u.userType === "teacher") {
          token.roles = u.roles as string[];
          token.primaryGrade = u.primaryGrade as number | null;
          token.homeroomAssignments = u.homeroomAssignments as { grade: number; classNumber: number }[];
          token.subAdminGrades = u.subAdminGrades as number[];
        } else if (u.userType === "student") {
          token.grade = u.grade as number;
          token.classNumber = u.classNumber as number;
          token.studentNumber = u.studentNumber as number;
          // 학생은 2시간 세션
          token.maxAge = 2 * 60 * 60;
        }
      }

      // Google 로그인 시 교사 매칭
      if (account?.provider === "google" && account.providerAccountId) {
        const teacher = await prisma.teacher.findUnique({
          where: { googleId: account.providerAccountId },
          include: {
            roles: true,
            homeroomAssignments: true,
            subAdminAssignments: true,
          },
        });

        if (teacher) {
          token.userType = "teacher";
          token.userId = teacher.id;
          token.roles = teacher.roles.map((r) => r.role);
          token.primaryGrade = teacher.primaryGrade;
          token.homeroomAssignments = teacher.homeroomAssignments.map((h) => ({
            grade: h.grade,
            classNumber: h.classNumber,
          }));
          token.subAdminGrades = teacher.subAdminAssignments.map((s) => s.grade);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.userType = token.userType as string;
        session.user.userId = token.userId as number;

        if (token.userType === "teacher") {
          session.user.roles = token.roles as string[];
          session.user.primaryGrade = token.primaryGrade as number | null;
          session.user.homeroomAssignments = token.homeroomAssignments as {
            grade: number;
            classNumber: number;
          }[];
          session.user.subAdminGrades = token.subAdminGrades as number[];
        } else if (token.userType === "student") {
          session.user.grade = token.grade as number;
          session.user.classNumber = token.classNumber as number;
          session.user.studentNumber = token.studentNumber as number;
        }
      }
      return session;
    },
  },
});
