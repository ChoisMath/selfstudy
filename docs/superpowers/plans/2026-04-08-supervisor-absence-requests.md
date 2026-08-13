# 감독교사 불참신청 승인 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 감독교사 출석부 페이지에 불참신청 탭을 추가하여 학년별 불참신청 승인/반려 + 출석 그리드에 승인 대기 "*" 표시

**Architecture:** 새 API 1개(`GET /api/attendance/absence-requests`) + 기존 API 2개 수정(출석 조회에 pending 플래그 추가, 승인 API 인가 확장) + 프론트엔드 탭 확장

**Tech Stack:** Next.js 16 (App Router), Prisma 7, SWR, Tailwind CSS 4

---

### Task 1: 새 API — `GET /api/attendance/absence-requests`

**Files:**
- Create: `src/app/api/attendance/absence-requests/route.ts`

- [ ] **Step 1: API 라우트 파일 생성**

```typescript
// src/app/api/attendance/absence-requests/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/attendance/absence-requests?grade=1&status=pending
export const GET = withAuth(["teacher"], async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const grade = searchParams.get("grade");
  const statusFilter = searchParams.get("status");

  if (!grade) {
    return NextResponse.json({ error: "grade 파라미터가 필요합니다." }, { status: 400 });
  }

  const gradeNum = parseInt(grade);
  if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 3) {
    return NextResponse.json({ error: "유효하지 않은 학년입니다." }, { status: 400 });
  }

  const whereCondition: Record<string, unknown> = {
    student: {
      isActive: true,
      grade: gradeNum,
    },
  };

  if (statusFilter && ["pending", "approved", "rejected"].includes(statusFilter)) {
    whereCondition.status = statusFilter;
  }

  const requests = await prisma.absenceRequest.findMany({
    where: whereCondition,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          grade: true,
          classNumber: true,
          studentNumber: true,
        },
      },
      reviewer: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = requests.map((r) => ({
    id: r.id,
    student: r.student,
    sessionType: r.sessionType,
    date: r.date.toISOString().split("T")[0],
    reasonType: r.reasonType,
    detail: r.detail,
    status: r.status,
    reviewer: r.reviewer,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ requests: result });
});
```

- [ ] **Step 2: 수동 테스트**

Run: 브라우저 또는 curl로 `/api/attendance/absence-requests?grade=1` 호출 (교사 로그인 상태)
Expected: `{ "requests": [...] }` 응답, 1학년 학생의 불참신청만 포함

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/attendance/absence-requests/route.ts
git commit -m "feat: 감독교사용 학년별 불참신청 조회 API 추가"
```

---

### Task 2: 기존 API 수정 — 승인 API 인가 확장

**Files:**
- Modify: `src/app/api/homeroom/absence-requests/[id]/route.ts`

- [ ] **Step 1: 인가를 `"teacher"`로 변경 + 학생 소유권 체크 제거**

현재 코드 (line 17):
```typescript
  return withAuth(["homeroom", "admin"], async (req: Request, user) => {
    const isAdmin = user.roles?.includes("admin");
    const assignments = user.homeroomAssignments;
    if (!isAdmin && (!assignments || assignments.length === 0)) {
      return NextResponse.json({ error: "담임 배정이 없습니다." }, { status: 403 });
    }
```

변경할 코드:
```typescript
  return withAuth(["teacher"], async (req: Request, user) => {
```

그리고 "자기 반 학생인지 확인" 블록 (line 48-59)을 제거:
```typescript
    // 삭제: 자기 반 학생인지 확인 블록
    // 감독교사도 승인할 수 있으므로 학생 소유권 체크 불필요
    // 대신 pending 상태 체크(line 62)로 중복 처리 방지
```

변경 후 전체 PUT 핸들러의 인가 및 검증 부분:
```typescript
  return withAuth(["teacher"], async (req: Request, user) => {
    const body = await req.json();
    const { action } = body; // "approved" | "rejected"

    if (action !== "approved" && action !== "rejected") {
      return NextResponse.json(
        { error: "action은 approved 또는 rejected이어야 합니다." },
        { status: 400 }
      );
    }

    // 신청 조회
    const request = await prisma.absenceRequest.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, grade: true, classNumber: true },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 신청입니다." },
        { status: 400 }
      );
    }

    // ... 기존 승인/반려 트랜잭션 로직 그대로 유지
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/homeroom/absence-requests/[id]/route.ts
git commit -m "feat: 불참신청 승인 API를 모든 교사에게 개방"
```

---

### Task 3: 기존 API 수정 — 출석 조회에 `hasPendingAbsenceRequest` 추가

**Files:**
- Modify: `src/app/api/attendance/route.ts`

- [ ] **Step 1: pending 불참신청 쿼리 추가**

`Promise.all` 배열 (현재 line 57)에 4번째 쿼리를 추가:

```typescript
    const [attendances, supervisorAssignment, approvedAbsences, pendingAbsences] = await Promise.all([
      // ... 기존 3개 쿼리 그대로 ...
      prisma.absenceRequest.findMany({
        where: {
          date: dateObj,
          sessionType: session,
          status: "pending",
          student: { grade: gradeNum },
        },
        select: { studentId: true },
      }),
    ]);
```

- [ ] **Step 2: pendingStudentIds Set 생성 + 응답에 필드 추가**

기존 `approvedStudentIds` 다음 줄 (line 94 부근)에 추가:
```typescript
    const pendingStudentIds = new Set(pendingAbsences.map((a) => a.studentId));
```

그리고 student 객체 매핑 부분 (line 111-140)에서 `isAfterSchool` 뒤에 추가:
```typescript
                isAfterSchool: (() => {
                  // ... 기존 코드 ...
                })(),
                hasPendingAbsenceRequest: pendingStudentIds.has(seat.student.id),
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/attendance/route.ts
git commit -m "feat: 출석 API에 hasPendingAbsenceRequest 필드 추가"
```

---

### Task 4: 프론트엔드 — 타입 + 탭 확장 + "*" 표시

**Files:**
- Modify: `src/app/attendance/[grade]/page.tsx`

- [ ] **Step 1: Seat 인터페이스에 `hasPendingAbsenceRequest` 추가**

`src/app/attendance/[grade]/page.tsx`의 `Seat` 인터페이스 (line 13-22)를 수정:

```typescript
interface Seat {
  rowIndex: number;
  colIndex: number;
  student: {
    id: number;
    name: string;
    classNumber: number;
    studentNumber: number;
    isParticipating: boolean;
    isApprovedAbsence: boolean;
    isAfterSchool: boolean;
    hasPendingAbsenceRequest: boolean;
  } | null;
}
```

- [ ] **Step 2: Tab 타입 확장**

Line 52의 Tab 타입:
```typescript
type Tab = "afternoon" | "night" | "absence";
```

- [ ] **Step 3: SeatCell에서 이름 앞 "*" 표시**

`SeatCellProps`에 `hasPendingAbsenceRequest` 추가 — 하지만 이미 student prop에 포함되어 있으므로, SeatCell 내부의 이름 렌더링 부분 (line 111)을 수정:

```typescript
      <div className="font-bold text-[clamp(9px,2.2vw,12px)] whitespace-nowrap overflow-hidden text-ellipsis">
        {student.hasPendingAbsenceRequest && (
          <span className="text-[#ef4444] font-black">*</span>
        )}
        {student.name}
      </div>
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/attendance/[grade]/page.tsx
git commit -m "feat: 출석 그리드에 불참신청 대기 학생 '*' 표시"
```

---

### Task 5: 프론트엔드 — 불참신청 탭 UI + SWR 연동

**Files:**
- Modify: `src/app/attendance/[grade]/page.tsx`

- [ ] **Step 1: 불참신청 데이터 SWR + 상태 추가**

`AttendanceGradePage` 컴포넌트 내, 기존 `const { data, mutate }` 다음에 추가:

```typescript
  const [absenceFilter, setAbsenceFilter] = useState<string>("pending");

  const { data: absenceData, mutate: mutateAbsence } = useSWR(
    tab === "absence" ? `/api/attendance/absence-requests?grade=${grade}&status=${absenceFilter === "all" ? "" : absenceFilter}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  // 불참신청 pending 건수 (탭 배지용) — 탭과 무관하게 항상 조회
  const { data: pendingCountData } = useSWR(
    `/api/attendance/absence-requests?grade=${grade}&status=pending`,
    fetcher,
    { revalidateOnFocus: true }
  );
  const pendingCount = pendingCountData?.requests?.length ?? 0;
```

- [ ] **Step 2: 탭 버튼에 "불참신청" 추가 + 배지**

기존 오후/야간 탭 버튼 (line 522-543) 뒤에 불참신청 탭 버튼 추가:

```typescript
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => { setTab("afternoon"); setSelectedSeat(null); setActivatedStudents(new Set()); }}
            className={`flex-1 text-center py-2.5 rounded-t-[10px] text-[clamp(12px,3vw,14px)] font-semibold transition-all ${
              tab === "afternoon"
                ? "bg-white text-[#2563eb] shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
                : "bg-[#e2e8f0] text-[#94a3b8]"
            }`}
          >
            오후자습
          </button>
          <button
            onClick={() => { setTab("night"); setSelectedSeat(null); setActivatedStudents(new Set()); }}
            className={`flex-1 text-center py-2.5 rounded-t-[10px] text-[clamp(12px,3vw,14px)] font-semibold transition-all ${
              tab === "night"
                ? "bg-white text-[#2563eb] shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
                : "bg-[#e2e8f0] text-[#94a3b8]"
            }`}
          >
            야간자습
          </button>
          <button
            onClick={() => { setTab("absence"); setSelectedSeat(null); }}
            className={`flex-1 text-center py-2.5 rounded-t-[10px] text-[clamp(12px,3vw,14px)] font-semibold transition-all relative ${
              tab === "absence"
                ? "bg-white text-[#2563eb] shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
                : "bg-[#e2e8f0] text-[#94a3b8]"
            }`}
          >
            불참신청
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#ef4444] text-white rounded-full w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
```

- [ ] **Step 3: SWR 키에서 tab이 "absence"일 때 출석 데이터 페치 방지**

기존 SWR 호출 (line 153-157)을 수정:

```typescript
  const { data, mutate } = useSWR(
    tab !== "absence" ? `/api/attendance?date=${today}&session=${tab}&grade=${grade}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );
```

- [ ] **Step 4: 불참신청 탭 콘텐츠 렌더링 함수 추가**

`renderWeeklyPopup` 함수 뒤에 추가:

```typescript
  const reasonLabels: Record<string, string> = {
    academy: "학원",
    afterschool: "방과후",
    illness: "질병",
    custom: "기타",
  };

  const reasonColors: Record<string, string> = {
    academy: "text-[#f59e0b]",
    afterschool: "text-[#8b5cf6]",
    illness: "text-[#ef4444]",
    custom: "text-[#6b7280]",
  };

  const statusLabels: Record<string, string> = {
    pending: "대기중",
    approved: "승인",
    rejected: "반려",
  };

  async function handleAbsenceAction(requestId: number, action: "approved" | "rejected") {
    const label = action === "approved" ? "승인" : "반려";
    if (!confirm(`이 불참신청을 ${label}하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/homeroom/absence-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "처리에 실패했습니다.");
        return;
      }

      mutateAbsence();
      // pending 건수도 갱신
      mutate();
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    }
  }

  function renderAbsenceRequests() {
    const requests = absenceData?.requests || [];

    return (
      <div>
        {/* 필터 버튼 */}
        <div className="flex gap-2 mb-4">
          {[
            { key: "pending", label: `대기중${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
            { key: "approved", label: "승인" },
            { key: "rejected", label: "반려" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setAbsenceFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-[clamp(11px,2.8vw,13px)] font-semibold transition-all ${
                absenceFilter === f.key
                  ? "bg-[#3b82f6] text-white"
                  : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 요청 목록 */}
        {requests.length === 0 ? (
          <div className="text-center text-[#94a3b8] py-12 text-sm">
            {absenceFilter === "pending" ? "대기 중인 불참신청이 없습니다." : "불참신청이 없습니다."}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {requests.map((r: {
              id: number;
              student: { id: number; name: string; grade: number; classNumber: number; studentNumber: number };
              sessionType: string;
              date: string;
              reasonType: string;
              detail: string | null;
              status: string;
              reviewer: { id: number; name: string } | null;
              reviewedAt: string | null;
              createdAt: string;
            }) => {
              const dateObj = new Date(r.date + "T12:00:00+09:00");
              const days = ["일", "월", "화", "수", "목", "금", "토"];
              const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}(${days[dateObj.getDay()]})`;

              return (
                <div key={r.id} className="bg-white border border-[#e2e8f0] rounded-lg p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sm">
                        {r.student.name}{" "}
                        <span className="text-[#94a3b8] font-normal text-xs">
                          {r.student.grade}학년 {r.student.classNumber}반 {r.student.studentNumber}번
                        </span>
                      </div>
                      <div className="text-xs text-[#64748b] mt-1">
                        {dateLabel} · {r.sessionType === "afternoon" ? "오후자습" : "야간자습"} ·{" "}
                        <span className={reasonColors[r.reasonType] || "text-[#6b7280]"}>
                          {reasonLabels[r.reasonType] || r.reasonType}
                        </span>
                      </div>
                      {r.detail && (
                        <div className="text-[11px] text-[#94a3b8] mt-0.5">{r.detail}</div>
                      )}
                      {r.reviewer && (
                        <div className="text-[11px] text-[#94a3b8] mt-1">
                          처리: {r.reviewer.name} ({statusLabels[r.status]})
                        </div>
                      )}
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAbsenceAction(r.id, "approved")}
                          className="bg-[#3b82f6] text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-[#2563eb] transition-colors"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleAbsenceAction(r.id, "rejected")}
                          className="bg-[#f1f5f9] text-[#64748b] px-3 py-1.5 rounded-md text-xs hover:bg-[#e2e8f0] transition-colors"
                        >
                          반려
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
```

- [ ] **Step 5: 메인 콘텐츠 영역에 탭 분기 추가**

기존 교실 콘텐츠 영역 (line 547-631)을 탭 분기로 감싸기. `{/* 교실 콘텐츠 */}` 부분 전체를 수정:

```typescript
      {/* 콘텐츠 */}
      <div className="max-w-[960px] mx-auto px-3 pb-3">
        <div className="bg-white rounded-b-xl p-3 flex flex-col gap-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          {tab === "absence" ? (
            renderAbsenceRequests()
          ) : (
            <>
              {/* 기존 교실 콘텐츠 그대로 */}
              {grade === 2 && tab === "night" ? (
                <MiraeHallLayout ... />
              ) : tab === "afternoon" ? (
                // ... 기존 오후자습 코드 ...
              ) : (
                // ... 기존 기본 코드 ...
              )}
              {rooms.length === 0 && ( ... )}
              {rooms.length > 0 && ( ... 범례 ... )}
            </>
          )}
        </div>
      </div>
```

- [ ] **Step 6: 상단 바 — 출석 카운트를 absence 탭에서는 숨기기**

상단 바의 출석 카운트 영역 (line 498-511)을 조건부로 표시:

```typescript
          {tab !== "absence" && (
            <div className="flex gap-2 ml-auto shrink-0 whitespace-nowrap text-[clamp(10px,2.4vw,12px)]">
              {/* 기존 출석/결석/미체크/방과후 카운트 */}
            </div>
          )}
```

- [ ] **Step 7: 커밋**

```bash
git add src/app/attendance/[grade]/page.tsx
git commit -m "feat: 감독교사 출석부에 불참신청 탭 추가 — 조회/승인/반려"
```

---

### Task 6: 최종 통합 테스트 + 커밋

- [ ] **Step 1: 빌드 확인**

Run: `npx next build`
Expected: 빌드 성공, 타입 에러 없음

- [ ] **Step 2: 수동 통합 테스트**

1. 학생 계정으로 로그인 → 불참신청 제출
2. 감독교사 계정으로 로그인 → `/attendance/1` 접근
3. 출석 그리드에서 해당 학생 이름 앞 빨간 "*" 확인
4. 불참신청 탭 클릭 → pending 배지 + 목록 확인
5. 승인 버튼 클릭 → 처리 완료 확인
6. 오후자습 탭 복귀 → "*" 사라짐 확인
7. 담임교사 계정으로 `/homeroom/absence-requests` → 기존 기능 정상 작동 확인

- [ ] **Step 3: 빌드 성공 시 최종 커밋**

```bash
git add -A
git commit -m "feat: 감독교사 불참신청 승인 기능 완성 — 탭 추가 + 출석부 '*' 표시"
```
