import assert from "node:assert/strict";
import { approvePendingAbsenceRequestsForSupervisor } from "../src/lib/absence-request-bulk-approval";

type RequestStatus = "pending" | "approved" | "rejected";
type SessionType = "afternoon" | "night";

type RequestRow = {
  id: number;
  studentId: number;
  sessionType: SessionType;
  date: Date;
  reasonType: "academy" | "afterschool" | "illness" | "custom";
  detail: string | null;
  status: RequestStatus;
  reviewedBy: number | null;
  reviewedAt: Date | null;
  student: { grade: number; isActive: boolean };
};

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function sameDate(a: Date, b: Date) {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function createFakePrisma(seed: {
  assignments: Array<{ teacherId: number; grade: number; sessionType: SessionType; date: Date }>;
  requests: RequestRow[];
}) {
  const attendanceRows: Array<{
    id: number;
    studentId: number;
    sessionType: SessionType;
    date: Date;
    status: string;
    checkedBy: number;
  }> = [];
  const reasonRows: Array<{
    attendanceId: number;
    reasonType: string;
    detail: string | null;
    registeredBy: number;
  }> = [];

  const tx = {
    absenceRequest: {
      update: async ({ where, data }: { where: { id: number }; data: Partial<RequestRow> }) => {
        const row = seed.requests.find((request) => request.id === where.id);
        assert.ok(row, `request ${where.id} should exist`);
        Object.assign(row, data);
        return row;
      },
    },
    attendance: {
      upsert: async ({
        where,
        update,
        create,
      }: {
        where: { studentId_sessionType_date: { studentId: number; sessionType: SessionType; date: Date } };
        update: { status: string; checkedBy: number };
        create: { studentId: number; sessionType: SessionType; date: Date; status: string; checkedBy: number };
      }) => {
        const key = where.studentId_sessionType_date;
        let row = attendanceRows.find(
          (attendance) =>
            attendance.studentId === key.studentId &&
            attendance.sessionType === key.sessionType &&
            sameDate(attendance.date, key.date)
        );
        if (row) {
          Object.assign(row, update);
        } else {
          row = { id: attendanceRows.length + 1, ...create };
          attendanceRows.push(row);
        }
        return row;
      },
    },
    absenceReason: {
      upsert: async ({
        where,
        update,
        create,
      }: {
        where: { attendanceId: number };
        update: { reasonType: string; detail: string | null; registeredBy: number };
        create: { attendanceId: number; reasonType: string; detail: string | null; registeredBy: number };
      }) => {
        let row = reasonRows.find((reason) => reason.attendanceId === where.attendanceId);
        if (row) {
          Object.assign(row, update);
        } else {
          row = { ...create };
          reasonRows.push(row);
        }
        return row;
      },
    },
  };

  return {
    attendanceRows,
    reasonRows,
    supervisorAssignment: {
      findFirst: async ({
        where,
      }: {
        where: { teacherId: number; grade: number; sessionType: SessionType; date: Date };
      }) =>
        seed.assignments.find(
          (assignment) =>
            assignment.teacherId === where.teacherId &&
            assignment.grade === where.grade &&
            assignment.sessionType === where.sessionType &&
            sameDate(assignment.date, where.date)
        ) ?? null,
    },
    absenceRequest: {
      findMany: async ({
        where,
      }: {
        where: {
          status: RequestStatus;
          date: Date;
          sessionType: SessionType;
          student: { grade: number; isActive: boolean };
        };
      }) =>
        seed.requests.filter(
          (request) =>
            request.status === where.status &&
            request.sessionType === where.sessionType &&
            sameDate(request.date, where.date) &&
            request.student.grade === where.student.grade &&
            request.student.isActive === where.student.isActive
        ),
    },
    $transaction: async <T>(callback: (client: typeof tx) => Promise<T>) => callback(tx),
  };
}

async function testApprovesOnlyAssignedPendingRequests() {
  const fixedNow = new Date("2026-04-30T01:23:45.000Z");
  const prisma = createFakePrisma({
    assignments: [{ teacherId: 7, grade: 2, sessionType: "night", date: dateOnly("2026-04-30") }],
    requests: [
      {
        id: 1,
        studentId: 101,
        sessionType: "night",
        date: dateOnly("2026-04-30"),
        reasonType: "academy",
        detail: "math",
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        student: { grade: 2, isActive: true },
      },
      {
        id: 2,
        studentId: 102,
        sessionType: "night",
        date: dateOnly("2026-04-30"),
        reasonType: "illness",
        detail: null,
        status: "rejected",
        reviewedBy: null,
        reviewedAt: null,
        student: { grade: 2, isActive: true },
      },
      {
        id: 3,
        studentId: 103,
        sessionType: "night",
        date: dateOnly("2026-04-30"),
        reasonType: "custom",
        detail: null,
        status: "approved",
        reviewedBy: 3,
        reviewedAt: fixedNow,
        student: { grade: 2, isActive: true },
      },
      {
        id: 4,
        studentId: 104,
        sessionType: "afternoon",
        date: dateOnly("2026-04-30"),
        reasonType: "academy",
        detail: null,
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        student: { grade: 2, isActive: true },
      },
      {
        id: 5,
        studentId: 105,
        sessionType: "night",
        date: dateOnly("2026-04-30"),
        reasonType: "academy",
        detail: null,
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        student: { grade: 1, isActive: true },
      },
    ],
  });

  const result = await approvePendingAbsenceRequestsForSupervisor({
    prisma,
    teacherId: 7,
    grade: 2,
    date: "2026-04-30",
    sessionType: "night",
    now: () => fixedNow,
  });

  assert.deepEqual(result, { success: true, approvedCount: 1, approvedIds: [1] });
  assert.equal(prisma.attendanceRows.length, 1);
  assert.equal(prisma.attendanceRows[0].studentId, 101);
  assert.equal(prisma.attendanceRows[0].status, "absent");
  assert.equal(prisma.reasonRows.length, 1);
  assert.equal(prisma.reasonRows[0].reasonType, "academy");
  assert.equal(prisma.reasonRows[0].registeredBy, 7);
  assert.equal(prisma.reasonRows[0].detail, "math");
}

async function testRejectsUnassignedTeacher() {
  const prisma = createFakePrisma({
    assignments: [],
    requests: [
      {
        id: 1,
        studentId: 101,
        sessionType: "night",
        date: dateOnly("2026-04-30"),
        reasonType: "academy",
        detail: null,
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        student: { grade: 2, isActive: true },
      },
    ],
  });

  await assert.rejects(
    () =>
      approvePendingAbsenceRequestsForSupervisor({
        prisma,
        teacherId: 7,
        grade: 2,
        date: "2026-04-30",
        sessionType: "night",
      }),
    /not assigned/
  );
}

async function main() {
  await testApprovesOnlyAssignedPendingRequests();
  await testRejectsUnassignedTeacher();
  console.log("supervisor bulk absence approval tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
