import { SEAT_SESSION_TYPES, sessionTypesOfSeat, type SeatSessionType } from "@/lib/sessions";

export type SeatParticipationInput = {
  sessionType: string;
  isParticipating: boolean;
};

// 오후 좌석은 오후1·오후2 블록이 공유하므로 한 블록이라도 참여하면 자리가 필요하다.
// 블록별 레코드가 없으면 기본 참여(출석 API·참여설정과 같은 규칙).
export function participatesInSeatSession(
  participationDays: SeatParticipationInput[] | undefined,
  seat: SeatSessionType
): boolean {
  const byType = new Map((participationDays ?? []).map((p) => [p.sessionType, p]));
  return sessionTypesOfSeat(seat).some((block) => byType.get(block)?.isParticipating ?? true);
}

// 오후가 야간 좌석 배치를 함께 쓰면 한 배치에 세 블록 학생이 모두 앉으므로, 어느 블록이든 참여하면 자리가 필요하다.
export function participatesInSharedSeatLayout(participationDays: SeatParticipationInput[] | undefined): boolean {
  return SEAT_SESSION_TYPES.some((seat) => participatesInSeatSession(participationDays, seat));
}
