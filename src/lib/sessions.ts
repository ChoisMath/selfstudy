export const SESSION_TYPES = ["afternoon1", "afternoon2", "night"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const SEAT_SESSION_TYPES = ["afternoon", "night"] as const;
export type SeatSessionType = (typeof SEAT_SESSION_TYPES)[number];

export type SessionMeta = {
  label: string;
  shortLabel: string;
  icon: string;
  seatSession: SeatSessionType;
  defaultMinutes: number;
};

export const SESSION_META: Record<SessionType, SessionMeta> = {
  afternoon1: { label: "오후1 자습", shortLabel: "오후1", icon: "☀️", seatSession: "afternoon", defaultMinutes: 50 },
  afternoon2: { label: "오후2 자습", shortLabel: "오후2", icon: "🌤️", seatSession: "afternoon", defaultMinutes: 50 },
  night: { label: "야간자습", shortLabel: "야간", icon: "🌙", seatSession: "night", defaultMinutes: 100 },
};

export const SEAT_SESSION_META: Record<SeatSessionType, { label: string }> = {
  afternoon: { label: "오후자습" },
  night: { label: "야간자습" },
};

export const REPRESENTATIVE_SESSION_TYPE: SessionType = "afternoon1";

export function isSessionType(value: unknown): value is SessionType {
  return typeof value === "string" && (SESSION_TYPES as readonly string[]).includes(value);
}

export function isSeatSessionType(value: unknown): value is SeatSessionType {
  return typeof value === "string" && (SEAT_SESSION_TYPES as readonly string[]).includes(value);
}

export function seatSessionOf(sessionType: SessionType): SeatSessionType {
  return SESSION_META[sessionType].seatSession;
}

export function sessionTypesOfSeat(seat: SeatSessionType): SessionType[] {
  return SESSION_TYPES.filter((t) => SESSION_META[t].seatSession === seat);
}

export function attendanceMinutes(a: { sessionType: SessionType; durationMinutes: number | null }): number {
  return a.durationMinutes ?? SESSION_META[a.sessionType].defaultMinutes;
}

export function emptySessionRecord<T>(make: (sessionType: SessionType) => T): Record<SessionType, T> {
  return {
    afternoon1: make("afternoon1"),
    afternoon2: make("afternoon2"),
    night: make("night"),
  };
}
