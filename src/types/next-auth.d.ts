import "next-auth";

declare module "next-auth" {
  interface User {
    userType: string;
    roles?: string[];
    primaryGrade?: number | null;
    homeroomAssignments?: { grade: number; classNumber: number }[];
    subAdminGrades?: number[];
    grade?: number;
    classNumber?: number;
    studentNumber?: number;
  }

  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      userType: string;
      userId: number;
      roles?: string[];
      primaryGrade?: number | null;
      homeroomAssignments?: { grade: number; classNumber: number }[];
      subAdminGrades?: number[];
      grade?: number;
      classNumber?: number;
      studentNumber?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userType?: string;
    userId?: number;
    roles?: string[];
    primaryGrade?: number | null;
    homeroomAssignments?: { grade: number; classNumber: number }[];
    subAdminGrades?: number[];
    grade?: number;
    classNumber?: number;
    studentNumber?: number;
    maxAge?: number;
  }
}
