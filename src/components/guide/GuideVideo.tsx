import { GUIDE_VIDEOS, type GuideVideoKey } from "./videos";

export function GuideVideo({ videoKey, start, caption }: { videoKey: GuideVideoKey; start?: number; caption: string }) {
  const video = GUIDE_VIDEOS[videoKey];
  if (!video.id) return null;
  const query = start ? `?start=${start}` : "";
  return (
    <figure className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-gray-950">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${video.id}${query}`}
        title={video.title}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="aspect-video w-full"
      />
      <figcaption className="break-keep bg-white px-4 py-3 text-sm text-gray-600">{caption}</figcaption>
    </figure>
  );
}
