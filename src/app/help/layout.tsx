import Image from "next/image";

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-gray-50 text-gray-950">
      <header className="border-b border-blue-800 bg-blue-700 text-white">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <Image src="/posan.svg" alt="포산고 로고" width={34} height={34} priority />
          <div>
            <p className="whitespace-nowrap text-xs font-medium text-blue-100">포산고 자율학습</p>
            <h1 className="whitespace-nowrap text-lg font-bold tracking-normal">사용설명서</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-2 py-4 sm:px-6 sm:py-8 lg:py-12">{children}</div>
    </main>
  );
}
