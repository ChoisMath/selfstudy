export type GuideTocItem = { id: string; label: string };

export function GuideToc({ items }: { items: GuideTocItem[] }) {
  return (
    <nav aria-label="목차" className="mt-6 flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#guide-${item.id}`}
          className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
