export function GuideChapter({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`guide-${id}`} className="mt-12 scroll-mt-4 border-t border-gray-200 pt-8">
      <h2 className="overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-bold text-gray-950">{title}</h2>
      <div className="mt-6 flex flex-col gap-10">{children}</div>
    </section>
  );
}
