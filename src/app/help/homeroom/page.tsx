import type { Metadata } from "next";
import { GuideArticle } from "@/components/guide/GuideArticle";
import Content from "./content.mdx";

export const metadata: Metadata = {
  title: "담임교사 메뉴 사용 가이드 | 포산고 자율학습",
  description: "담임교사 주간·월간 출결, 참여설정, 불참사유 등록, 불참신청, 비밀번호",
};

export default function HomeroomGuidePage() {
  return (
    <GuideArticle>
      <Content />
    </GuideArticle>
  );
}
