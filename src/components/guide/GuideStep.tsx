import Image from "next/image";

export type GuideImage = { src: string; alt: string; width: number; height: number; tall?: boolean };

export function GuideStep({
  number,
  title,
  images,
  tip,
  children,
}: {
  number: number;
  title: string;
  images: GuideImage[];
  tip?: string;
  children: React.ReactNode;
}) {
  // 폰 스틸(tall)은 세로로 길어 본문 폭으로 늘리면 한 화면을 넘으므로 나란히 두고 가로 스크롤한다.
  const hasTall = images.some((image) => image.tall);
  return (
    <div className="flex flex-col gap-4">
      <h3 className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {number}
        </span>
        <span title={title} className="overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold text-gray-900">{title}</span>
      </h3>
      <div className={hasTall ? "flex gap-3 overflow-x-auto pb-1" : "flex flex-col gap-3"}>
        {images.map((image) => (
          <Image
            key={image.src}
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            unoptimized
            className={
              image.tall
                ? "h-auto w-[min(320px,80vw)] shrink-0 rounded-2xl border border-gray-200 lg:w-[290px]"
                : "h-auto w-full rounded-lg border border-gray-200"
            }
          />
        ))}
      </div>
      <div className="break-keep text-gray-700">{children}</div>
      {tip ? (
        <p className="break-keep rounded-lg bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
          <span className="whitespace-nowrap font-semibold">팁</span> {tip}
        </p>
      ) : null}
    </div>
  );
}
