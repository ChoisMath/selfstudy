import type { Metadata } from "next";
import Image from "next/image";
import HelpContent from "./content.mdx";

export const metadata: Metadata = {
  title: "포산고 자율학습 도움말",
  description: "포산고 자율학습 출결 시스템 사용설명서",
};

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-950">
      <header className="border-b border-blue-800 bg-blue-700 text-white">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <Image src="/posan.svg" alt="포산고 로고" width={34} height={34} priority />
          <div>
            <p className="text-xs font-medium text-blue-100">포산고 자율학습</p>
            <h1 className="text-lg font-bold tracking-normal">사용설명서</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <article className="rounded-lg border border-gray-200 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-10">
          <HelpContent />
        </article>
      </div>
    </main>
  );
}
