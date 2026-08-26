export type CopySourceStatus = { status: string; hasReason: boolean };

export type CopyPlanInput = {
  seatedStudentIds: number[];
  fromAttendance: Map<number, CopySourceStatus>;
  toAttendanceStudentIds: Set<number>;
  toParticipatingStudentIds: Set<number>;
  toBlockedStudentIds: Set<number>;
};

export type CopyPlan = {
  toCreate: { studentId: number; status: "present" | "absent" }[];
  skipped: number;
};

// 사유 있는 결석(불참승인·담임 등록)은 원래 블록 한정일 수 있으므로 복사하지 않는다.
// 이미 체크된 대상 블록은 어떤 경우에도 덮어쓰지 않는다.
// skipped 는 대상이었지만 오후1 상태 때문에 옮기지 못한 학생 수.
export function planSessionCopy(input: CopyPlanInput): CopyPlan {
  const toCreate: CopyPlan["toCreate"] = [];
  let skipped = 0;

  for (const studentId of input.seatedStudentIds) {
    const eligible =
      !input.toAttendanceStudentIds.has(studentId) &&
      input.toParticipatingStudentIds.has(studentId) &&
      !input.toBlockedStudentIds.has(studentId);

    if (!eligible) continue;

    const source = input.fromAttendance.get(studentId);
    if (source?.status === "present") {
      toCreate.push({ studentId, status: "present" });
    } else if (source?.status === "absent" && !source.hasReason) {
      toCreate.push({ studentId, status: "absent" });
    } else {
      skipped++;
    }
  }

  return { toCreate, skipped };
}
