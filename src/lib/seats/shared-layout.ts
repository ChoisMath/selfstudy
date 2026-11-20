import { prisma } from "@/lib/prisma";

// 이 학년의 오후 자율학습이 야간 자율학습 좌석 배치를 함께 쓰는지 (설정은 오후 세션 행에 있다)
export async function isNightLayoutShared(grade: number): Promise<boolean> {
  const afternoon = await prisma.studySession.findUnique({
    where: { type_grade: { type: "afternoon", grade } },
    select: { sharesNightLayout: true },
  });
  return afternoon?.sharesNightLayout ?? false;
}
