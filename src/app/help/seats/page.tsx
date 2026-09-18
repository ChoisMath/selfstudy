import type { Metadata } from "next";
import { GuideArticle } from "@/components/guide/GuideArticle";
import Content from "./content.mdx";

export const metadata: Metadata = {
  title: "좌석 배치 사용 가이드 | 포산고 자율학습",
  description: "교실 구조 설정, 미배정 학생 배정과 교환, 배정 해제, 저장, 좌석배치도 인쇄",
};

export default function SeatsGuidePage() {
  return (
    <GuideArticle>
      <Content />
    </GuideArticle>
  );
}
