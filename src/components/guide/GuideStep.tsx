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
  const isLandscapeOnly = images.every((image) => !image.tall);
  return (
    <div className="flex flex-col gap-4">
      <h3 className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {number}
        </span>
        <span title={title} className="overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold text-gray-900">{title}</span>
      </h3>
      {/* 가로 스틸은 1280×657이라 폰 폭으로 줄이면 화면 속 글자를 읽을 수 없어, 최소 폭을 주고 가로 스크롤로 원래 크기를 유지한다.
          데스크톱은 카드 폭이 넉넉하므로 가로 스틸만 세로로 쌓는다 — 폰 스틸(tall)은 이미 lg:w-[290px]라 나란히 들어간다. */}
      <div
        className={
          isLandscapeOnly
            ? "flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible"
            : "flex gap-3 overflow-x-auto pb-1"
        }
      >
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
                : "h-auto w-full min-w-[640px] shrink-0 rounded-lg border border-gray-200 lg:min-w-0"
            }
          />
        ))}
      </div>
      <div className="break-keep text-gray-700">{children}</div>
      {tip ? (
        <p className="break-keep rounded-lg bg-blue-50 px-2 py-2 sm:px-4 sm:py-3 text-sm leading-6 text-blue-900">
          <span className="whitespace-nowrap font-semibold">팁</span> {tip}
        </p>
      ) : null}
    </div>
  );
}
