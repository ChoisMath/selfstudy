import type { Metadata } from "next";
import { GuideArticle } from "@/components/guide/GuideArticle";
import Content from "./content.mdx";

export const metadata: Metadata = {
  title: "학생 사용 가이드 | 포산고 자율학습",
  description: "학생 로그인, 참여일정·참여시간·좌석 확인, 불참 신청, 출결기록, 학급 도우미 일괄신청",
};

export default function StudentGuidePage() {
  return (
    <GuideArticle>
      <Content />
    </GuideArticle>
  );
}
