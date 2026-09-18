import type { Metadata } from "next";
import { GuideArticle } from "@/components/guide/GuideArticle";
import Content from "./content.mdx";

export const metadata: Metadata = {
  title: "학년관리자 사용 가이드 | 포산고 자율학습",
  description: "학년 오늘출결, 학생 명단과 Excel 업로드, 학급 도우미, 참여 설정, 감독 배정, 월간출결",
};

export default function GradeAdminGuidePage() {
  return (
    <GuideArticle>
      <Content />
    </GuideArticle>
  );
}
