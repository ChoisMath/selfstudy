# Supervisor Bulk Absence Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a supervisor-only bulk approval flow that previews all approval targets in a non-wrapping, horizontally scrollable table before approving pending absence requests.

**Architecture:** Put the approval rules in a focused server-side helper so they can be tested without a running Next.js server. Expose the helper through a new App Router route handler, then add a confirmation modal and bulk button to the existing supervisor attendance page. The UI can show one list containing all current-grade requests for the teacher's assigned sessions today, while the server still validates each `date + grade + sessionType` slot independently.

**Tech Stack:** Next.js 16 App Router route handlers, React client component state, SWR mutation refreshes, Prisma 7, TypeScript, `tsx` for targeted tests.

---

## File Map

- Create `src/lib/absence-request-bulk-approval.ts`
  - Owns validation, supervisor assignment checks, target selection, and transactional approval side effects.
  - Exports `approvePendingAbsenceRequestsForSupervisor`.
- Create `src/app/api/attendance/absence-requests/bulk-approve/route.ts`
  - Parses JSON request body.
  - Authenticates through `withAuth(["teacher"])`.
  - Calls the helper and maps helper errors to HTTP responses.
- Modify `src/app/attendance/[grade]/page.tsx`
  - Fetches today's supervisor assignments.
  - Derives bulk approval candidates from the visible absence request data.
  - Adds the `일괄승인` button, preview modal, and submit handler.
- Create `tests/supervisor-bulk-absence-approval.test.ts`
  - Tests the helper with an in-memory fake Prisma-shaped client.
  - Covers authorization, filtering, and side effects.

## Task 1: Server Helper TDD

**Files:**
- Create: `tests/supervisor-bulk-absence-approval.test.ts`
- Create: `src/lib/absence-request-bulk-approval.ts`

- [ ] **Step 1: Write the failing helper test**

Create `tests/supervisor-bulk-absence-approval.test.ts` with a small in-memory fake database. The first test should seed one assigned supervisor slot and five requests: one matching pending request, one rejected request, one already approved request, one other session request, and one other grade request.

```ts
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
  const attendanceRows: Array<{ id: number; studentId: number; sessionType: SessionType; date: Date; status: string; checkedBy: number }> = [];
  const reasonRows: Array<{ attendanceId: number; reasonType: string; detail: string | null; registeredBy: number }> = [];

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
      upsert: async ({ where, update, create }: {
        where: { studentId_sessionType_date: { studentId: number; sessionType: SessionType; date: Date } };
        update: { status: string; checkedBy: number };
        create: { studentId: number; sessionType: SessionType; date: Date; status: string; checkedBy: number };
      }) => {
        const key = where.studentId_sessionType_date;
        let row = attendanceRows.find((attendance) =>
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
      upsert: async ({ where, update, create }: {
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
      findFirst: async ({ where }: { where: { teacherId: number; grade: number; sessionType: SessionType; date: Date } }) =>
        seed.assignments.find((assignment) =>
          assignment.teacherId === where.teacherId &&
          assignment.grade === where.grade &&
          assignment.sessionType === where.sessionType &&
          sameDate(assignment.date, where.date)
        ) ?? null,
    },
    absenceRequest: {
      findMany: async ({ where }: { where: { status: RequestStatus; date: Date; sessionType: SessionType; student: { grade: number; isActive: boolean } } }) =>
        seed.requests.filter((request) =>
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
      { id: 1, studentId: 101, sessionType: "night", date: dateOnly("2026-04-30"), reasonType: "academy", detail: "math", status: "pending", reviewedBy: null, reviewedAt: null, student: { grade: 2, isActive: true } },
      { id: 2, studentId: 102, sessionType: "night", date: dateOnly("2026-04-30"), reasonType: "illness", detail: null, status: "rejected", reviewedBy: null, reviewedAt: null, student: { grade: 2, isActive: true } },
      { id: 3, studentId: 103, sessionType: "night", date: dateOnly("2026-04-30"), reasonType: "custom", detail: null, status: "approved", reviewedBy: 3, reviewedAt: fixedNow, student: { grade: 2, isActive: true } },
      { id: 4, studentId: 104, sessionType: "afternoon", date: dateOnly("2026-04-30"), reasonType: "academy", detail: null, status: "pending", reviewedBy: null, reviewedAt: null, student: { grade: 2, isActive: true } },
      { id: 5, studentId: 105, sessionType: "night", date: dateOnly("2026-04-30"), reasonType: "academy", detail: null, status: "pending", reviewedBy: null, reviewedAt: null, student: { grade: 1, isActive: true } },
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
      { id: 1, studentId: 101, sessionType: "night", date: dateOnly("2026-04-30"), reasonType: "academy", detail: null, status: "pending", reviewedBy: null, reviewedAt: null, student: { grade: 2, isActive: true } },
    ],
  });

  await assert.rejects(
    () => approvePendingAbsenceRequestsForSupervisor({
      prisma,
      teacherId: 7,
      grade: 2,
      date: "2026-04-30",
      sessionType: "night",
    }),
    /not assigned/
  );
}

await testApprovesOnlyAssignedPendingRequests();
await testRejectsUnassignedTeacher();
console.log("supervisor bulk absence approval tests passed");
```

- [ ] **Step 2: Run the helper test and verify RED**

Run:

```powershell
npx.cmd tsx tests/supervisor-bulk-absence-approval.test.ts
```

Expected: FAIL because `../src/lib/absence-request-bulk-approval` does not exist.

- [ ] **Step 3: Implement the minimal helper**

Create `src/lib/absence-request-bulk-approval.ts`:

```ts
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
      where: { studentId_sessionType_date: { studentId: number; sessionType: SessionType; date: Date } };
      update: { status: "absent"; checkedBy: number };
      create: { studentId: number; sessionType: SessionType; date: Date; status: "absent"; checkedBy: number };
    }): Promise<{ id: number }>;
  };
  absenceReason: {
    upsert(args: {
      where: { attendanceId: number };
      update: { reasonType: ReasonType; detail: string | null; registeredBy: number };
      create: { attendanceId: number; reasonType: ReasonType; detail: string | null; registeredBy: number };
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

type Params = {
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
}: Params) {
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
```

- [ ] **Step 4: Run the helper test and verify GREEN**

Run:

```powershell
npx.cmd tsx tests/supervisor-bulk-absence-approval.test.ts
```

Expected: PASS and prints `supervisor bulk absence approval tests passed`.

## Task 2: API Route

**Files:**
- Create: `src/app/api/attendance/absence-requests/bulk-approve/route.ts`

- [ ] **Step 1: Add the route handler**

Create `src/app/api/attendance/absence-requests/bulk-approve/route.ts`:

```ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  approvePendingAbsenceRequestsForSupervisor,
  BulkAbsenceApprovalError,
} from "@/lib/absence-request-bulk-approval";
import type { SessionType } from "@/generated/prisma/client";

export const POST = withAuth(["teacher"], async (req: Request, user) => {
  try {
    const body = await req.json();
    const grade = Number(body.grade);
    const date = String(body.date ?? "");
    const sessionType = body.sessionType as SessionType;

    const result = await approvePendingAbsenceRequestsForSupervisor({
      prisma,
      teacherId: user.userId,
      grade,
      date,
      sessionType,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BulkAbsenceApprovalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "일괄승인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
});
```

- [ ] **Step 2: Run type/build verification**

Run:

```powershell
npm.cmd run build
```

Expected: build succeeds or fails only on unrelated pre-existing issues. If it fails due to this route, fix the route before continuing.

## Task 3: Supervisor UI

**Files:**
- Modify: `src/app/attendance/[grade]/page.tsx`

- [ ] **Step 1: Add state and assignment fetch**

In `src/app/attendance/[grade]/page.tsx`, add:

```ts
const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
const [isBulkApproving, setIsBulkApproving] = useState(false);

const { data: todayAssignmentsData } = useSWR(
  "/api/supervisor-assignments/my-today",
  fetcher,
  { revalidateOnFocus: false }
);
```

- [ ] **Step 2: Derive candidates**

Inside `renderAbsenceRequests`, derive assigned sessions and candidates:

```ts
const assignedSessionTypes = new Set<string>(
  (todayAssignmentsData?.assignments || [])
    .filter((assignment: { grade: number; sessionType: string }) => assignment.grade === grade)
    .map((assignment: { sessionType: string }) => assignment.sessionType)
);

const bulkCandidates = requests.filter((request: {
  status: string;
  date: string;
  sessionType: string;
}) =>
  request.status === "pending" &&
  request.date === today &&
  assignedSessionTypes.has(request.sessionType)
);
```

- [ ] **Step 3: Add the button**

In the filter button row, keep the existing filter buttons and add a right-aligned `일괄승인` button:

```tsx
<button
  type="button"
  onClick={() => setShowBulkApproveModal(true)}
  disabled={bulkCandidates.length === 0 || isBulkApproving}
  className="ml-auto bg-[#2563eb] text-white px-3 py-1.5 rounded-md text-[clamp(11px,2.8vw,13px)] font-semibold hover:bg-[#1d4ed8] disabled:bg-[#cbd5e1] disabled:text-[#64748b] disabled:cursor-not-allowed transition-colors whitespace-nowrap"
>
  일괄승인{bulkCandidates.length > 0 ? ` (${bulkCandidates.length})` : ""}
</button>
```

- [ ] **Step 4: Add submit handler**

Add:

```ts
async function handleBulkApprove(candidates: Array<{ sessionType: string }>) {
  const sessionTypes = Array.from(new Set(candidates.map((candidate) => candidate.sessionType)));
  setIsBulkApproving(true);

  try {
    let totalApproved = 0;
    for (const sessionType of sessionTypes) {
      const res = await fetch("/api/attendance/absence-requests/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, date: today, sessionType }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "일괄승인에 실패했습니다.");
      }
      totalApproved += result.approvedCount || 0;
    }

    setShowBulkApproveModal(false);
    mutateAbsence();
    mutatePendingCount();
    mutate();
    alert(`${totalApproved}건을 승인했습니다.`);
  } catch (error) {
    alert(error instanceof Error ? error.message : "일괄승인에 실패했습니다.");
  } finally {
    setIsBulkApproving(false);
  }
}
```

- [ ] **Step 5: Add the preview modal**

Add a modal near the bottom of the component, before the existing selected-seat modal:

```tsx
{showBulkApproveModal && (
  <div
    className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    onClick={() => {
      if (!isBulkApproving) setShowBulkApproveModal(false);
    }}
  >
    <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
    <div
      role="dialog"
      aria-modal="true"
      className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#0f172a]">불참신청 일괄승인</h2>
          <p className="text-xs text-[#64748b] mt-0.5">{bulkCandidates.length}건을 승인합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowBulkApproveModal(false)}
          disabled={isBulkApproving}
          className="w-8 h-8 flex items-center justify-center rounded-md text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-50"
          aria-label="닫기"
        >
          ×
        </button>
      </div>
      <div className="p-4 overflow-y-auto max-h-[60vh]">
        <div className="overflow-x-auto border border-[#e2e8f0] rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-[#475569] whitespace-nowrap">학생</th>
                <th className="px-3 py-2 text-center font-semibold text-[#475569] whitespace-nowrap">날짜</th>
                <th className="px-3 py-2 text-center font-semibold text-[#475569] whitespace-nowrap">시간</th>
                <th className="px-3 py-2 text-center font-semibold text-[#475569] whitespace-nowrap">사유</th>
                <th className="px-3 py-2 text-left font-semibold text-[#475569] whitespace-nowrap">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {bulkCandidates.map((request: {
                id: number;
                student: { name: string; grade: number; classNumber: number; studentNumber: number };
                date: string;
                sessionType: string;
                reasonType: string;
                detail: string | null;
              }) => (
                <tr key={request.id}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="font-semibold text-[#0f172a]">{request.student.name}</span>
                    <span className="text-xs text-[#94a3b8] ml-1">
                      {request.student.grade}학년 {request.student.classNumber}반 {request.student.studentNumber}번
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-[#475569] whitespace-nowrap">{request.date}</td>
                  <td className="px-3 py-2 text-center text-[#475569] whitespace-nowrap">
                    {request.sessionType === "afternoon" ? "오후자습" : "야간자습"}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span className={reasonColors[request.reasonType] || "text-[#6b7280]"}>
                      {reasonLabels[request.reasonType] || request.reasonType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[#64748b] whitespace-nowrap max-w-[260px] truncate">
                    {request.detail || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-[#e2e8f0] flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setShowBulkApproveModal(false)}
          disabled={isBulkApproving}
          className="px-4 py-2 rounded-md text-sm font-semibold bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => handleBulkApprove(bulkCandidates)}
          disabled={isBulkApproving || bulkCandidates.length === 0}
          className="px-4 py-2 rounded-md text-sm font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:bg-[#cbd5e1] disabled:text-[#64748b] disabled:cursor-not-allowed"
        >
          {isBulkApproving ? "승인 중..." : "일괄승인"}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 6: Run build verification**

Run:

```powershell
npm.cmd run build
```

Expected: build succeeds.

## Task 4: Final Verification

**Files:**
- Verify: `tests/supervisor-bulk-absence-approval.test.ts`
- Verify: `src/app/api/attendance/absence-requests/bulk-approve/route.ts`
- Verify: `src/app/attendance/[grade]/page.tsx`

- [ ] **Step 1: Run targeted test**

Run:

```powershell
npx.cmd tsx tests/supervisor-bulk-absence-approval.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 3: Review git diff**

Run:

```powershell
git diff --stat
git diff -- src/lib/absence-request-bulk-approval.ts src/app/api/attendance/absence-requests/bulk-approve/route.ts src/app/attendance/[grade]/page.tsx tests/supervisor-bulk-absence-approval.test.ts
```

Expected: Only the planned files changed.

- [ ] **Step 4: Commit implementation**

Run:

```powershell
git add -- src/lib/absence-request-bulk-approval.ts src/app/api/attendance/absence-requests/bulk-approve/route.ts src/app/attendance/[grade]/page.tsx tests/supervisor-bulk-absence-approval.test.ts
git commit -m "Add supervisor bulk absence approval"
```
