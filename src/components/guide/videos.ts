export type GuideVideoKey = "teacher" | "student" | "gradeAdmin";

// YouTube 일부 공개 영상 id. 업로드 전에는 빈 문자열이고, 이때 GuideVideo 는 카드를 그리지 않는다.
export const GUIDE_VIDEOS: Record<GuideVideoKey, { id: string; title: string }> = {
  teacher: { id: "", title: "교사 사용 안내" },
  student: { id: "", title: "학생 사용 안내" },
  gradeAdmin: { id: "", title: "학년관리자 사용 안내" },
};
