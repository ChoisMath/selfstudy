import type { SeatSessionType } from "@/lib/sessions";

// 좌석 편집기·좌석 탭·인쇄가 같은 SWR 키를 쓰도록 한곳에서 만든다 (한쪽이 재검증하면 나머지도 갱신된다)
export function seatLayoutsUrl(grade: number, seat: SeatSessionType): string {
  return `/api/grade-admin/${grade}/seat-layouts?sessionType=${seat}`;
}
