const TONES = {
  blue: "border-blue-200 bg-blue-50 text-blue-950",
  yellow: "border-yellow-200 bg-yellow-50 text-yellow-950",
  green: "border-green-200 bg-green-50 text-green-950",
} as const;

export function GuideNotice({
  tone = "blue",
  title,
  items,
}: {
  tone?: keyof typeof TONES;
  title: string;
  items: [string, string][];
}) {
  return (
    <aside className={`mt-12 rounded-lg border px-4 py-4 sm:px-6 ${TONES[tone]}`}>
      <h2 className="overflow-hidden text-ellipsis whitespace-nowrap text-lg font-bold">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map(([emphasis, body]) => (
          <li key={emphasis} className="break-keep leading-7">
            <strong className="whitespace-nowrap font-semibold">{emphasis}</strong> {body}
          </li>
        ))}
      </ul>
    </aside>
  );
}
