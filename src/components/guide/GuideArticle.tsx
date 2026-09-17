import Link from "next/link";

export function GuideArticle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Link
        href="/help"
        className="inline-flex min-h-11 items-center self-start whitespace-nowrap px-1 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        ← 도움말
      </Link>
      <article className="rounded-lg border border-gray-200 bg-white px-3 py-5 shadow-sm md:px-6 md:py-8 lg:px-8 lg:py-10">
        {children}
      </article>
    </div>
  );
}
