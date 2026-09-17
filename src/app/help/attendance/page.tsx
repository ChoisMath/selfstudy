import type { Metadata } from "next";
import { GuideArticle } from "@/components/guide/GuideArticle";
import Content from "./content.mdx";

export const metadata: Metadata = {
  title: "출석부 사용 가이드 | 포산고 자율학습",
  description: "감독교사 출석 체크, 불참신청 승인, 감독 교체 방법",
};

export default function AttendanceGuidePage() {
  return (
    <GuideArticle>
      <Content />
    </GuideArticle>
  );
}
