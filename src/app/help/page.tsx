import type { Metadata } from "next";
import HelpContent from "./content.mdx";

export const metadata: Metadata = {
  title: "포산고 자율학습 도움말",
  description: "포산고 자율학습 출결 시스템 사용설명서",
};

export default function HelpPage() {
  return (
    <article className="rounded-lg border border-gray-200 bg-white px-3 py-5 shadow-sm md:px-6 md:py-8 lg:px-8 lg:py-10">
      <HelpContent />
    </article>
  );
}
