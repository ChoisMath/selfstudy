import type { ReasonType, SessionType } from "@/generated/prisma/client";

type RequestStatus = "pending" | "approved" | "rejected";

export class BulkAbsenceApprovalError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

type BulkRequest = {
  id: number;
  studentId: number;
  sessionType: SessionType;
  date: Date;
  reasonType: ReasonType;
  detail: string | null;
};

type ApprovalTx = {
  absenceRequest: {
    update(args: {
      where: { id: number };
      data: { status: "approved"; reviewedBy: number; reviewedAt: Date };
    }): Promise<unknown>;
  };
  attendance: {
    upsert(args: {
      where: {
        studentId_sessionType_date: {
          studentId: number;
          sessionType: SessionType;
          date: Date;
        };
      };
      update: { status: "absent"; checkedBy: number };
      create: {
        studentId: number;
        sessionType: SessionType;
        date: Date;
        status: "absent";
        checkedBy: number;
      };
    }): Promise<{ id: number }>;
  };
  absenceReason: {
    upsert(args: {
      where: { attendanceId: number };
      update: { reasonType: ReasonType; detail: string | null; registeredBy: number };
      create: {
        attendanceId: number;
        reasonType: ReasonType;
        detail: string | null;
        registeredBy: number;
      };
    }): Promise<unknown>;
  };
};

type ApprovalPrisma = {
  supervisorAssignment: {
    findFirst(args: {
      where: { teacherId: number; grade: number; date: Date; sessionType: SessionType };
      select: { id: true };
    }): Promise<{ id: number } | null>;
  };
  absenceRequest: {
    findMany(args: {
      where: {
        status: RequestStatus;
        date: Date;
        sessionType: SessionType;
        student: { grade: number; isActive: true };
      };
      select: {
        id: true;
        studentId: true;
        sessionType: true;
        date: true;
        reasonType: true;
        detail: true;
      };
      orderBy: { createdAt: "asc" };
    }): Promise<BulkRequest[]>;
  };
  $transaction<T>(callback: (tx: ApprovalTx) => Promise<T>): Promise<T>;
};

type ApprovePendingAbsenceRequestsParams = {
  prisma: ApprovalPrisma;
  teacherId: number;
  grade: number;
  date: string;
  sessionType: SessionType;
  now?: () => Date;
};

export function parseDateOnly(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BulkAbsenceApprovalError("date must be YYYY-MM-DD", 400);
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BulkAbsenceApprovalError("invalid date", 400);
  }

  return parsed;
}

export async function approvePendingAbsenceRequestsForSupervisor({
  prisma,
  teacherId,
  grade,
  date,
  sessionType,
  now = () => new Date(),
}: ApprovePendingAbsenceRequestsParams) {
  if (!Number.isInteger(grade) || grade < 1 || grade > 3) {
    throw new BulkAbsenceApprovalError("invalid grade", 400);
  }

  if (sessionType !== "afternoon" && sessionType !== "night") {
    throw new BulkAbsenceApprovalError("invalid sessionType", 400);
  }

  const dateObj = parseDateOnly(date);

  const assignment = await prisma.supervisorAssignment.findFirst({
    where: { teacherId, grade, date: dateObj, sessionType },
    select: { id: true },
  });

  if (!assignment) {
    throw new BulkAbsenceApprovalError("not assigned for this supervisor slot", 403);
  }

  const requests = await prisma.absenceRequest.findMany({
    where: {
      status: "pending",
      date: dateObj,
      sessionType,
      student: { grade, isActive: true },
    },
    select: {
      id: true,
      studentId: true,
      sessionType: true,
      date: true,
      reasonType: true,
      detail: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const reviewedAt = now();
  const approvedIds = await prisma.$transaction(async (tx) => {
    const ids: number[] = [];

    for (const request of requests) {
      await tx.absenceRequest.update({
        where: { id: request.id },
        data: {
          status: "approved",
          reviewedBy: teacherId,
          reviewedAt,
        },
      });

      const attendance = await tx.attendance.upsert({
        where: {
          studentId_sessionType_date: {
            studentId: request.studentId,
            sessionType: request.sessionType,
            date: request.date,
          },
        },
        update: {
          status: "absent",
          checkedBy: teacherId,
        },
        create: {
          studentId: request.studentId,
          sessionType: request.sessionType,
          date: request.date,
          status: "absent",
          checkedBy: teacherId,
        },
      });

      await tx.absenceReason.upsert({
        where: { attendanceId: attendance.id },
        update: {
          reasonType: request.reasonType,
          detail: request.detail,
          registeredBy: teacherId,
        },
        create: {
          attendanceId: attendance.id,
          reasonType: request.reasonType,
          detail: request.detail,
          registeredBy: teacherId,
        },
      });

      ids.push(request.id);
    }

    return ids;
  });

  return {
    success: true,
    approvedCount: approvedIds.length,
    approvedIds,
  };
}
