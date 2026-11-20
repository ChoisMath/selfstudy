import Link from "next/link";

export function GuideHelpButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener"
      aria-label="사용 가이드"
      title="사용 가이드"
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-current text-sm font-bold leading-none">
        ?
      </span>
    </Link>
  );
}
