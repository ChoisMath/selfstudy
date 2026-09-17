import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// --- 좌석 API: 학생 전용, 내 userId 기준, 그룹 규칙은 lib, 출결/불참 정보 노출 없음 ---
const seatsApi = read("../src/app/api/student/seats/route.ts");
assert.match(seatsApi, /withAuth\(\["student"\]/, "seats API 가 학생 전용이 아님");
assert.match(seatsApi, /where: \{ studentId: user\.userId \}/, "내 좌석을 세션 userId 로 조회하지 않음");
assert.match(seatsApi, /selectSeatGroupRooms\(/, "그룹 규칙을 lib 헬퍼로 계산하지 않음");
assert.match(seatsApi, /SEAT_SESSION_TYPES\.map/, "오후/야간을 SEAT_SESSION_TYPES 로 돌지 않음");
assert.doesNotMatch(seatsApi, /prisma\.attendance|prisma\.absenceRequest/, "좌석 API 가 출결/불참 정보를 조회함");

// --- 읽기 전용 좌석 격자: dnd 없음, 최소 셀 폭으로 가로 스크롤, 내 자리 aria-current ---
const seatGrid = read("../src/components/seats/StudentSeatGrid.tsx");
assert.doesNotMatch(seatGrid, /@dnd-kit/, "StudentSeatGrid 가 dnd-kit 에 의존함");
assert.match(seatGrid, /minmax\(\$\{MIN_SEAT_WIDTH\}px, 1fr\)/, "셀 최소 폭이 없음 — 좁은 화면에서 이름이 쪼개짐");
assert.match(seatGrid, /aria-current=\{isMine \? "true" : undefined\}/, "내 자리에 aria-current 가 없음");
assert.match(seatGrid, /min-h-11/, "좌석 셀 높이가 44px 미만");
assert.match(seatGrid, /whitespace-nowrap/, "이름 줄바꿈 방지가 없음");

// --- 좌석 확인 카드: 오후/야간 탭, 기본 탭은 렌더 파생, ClassroomFrame 재사용, 가로 스크롤 래퍼 ---
const seatCard = read("../src/components/student/SeatCheckCard.tsx");
assert.match(seatCard, /useSWR<StudentSeatsResponse>\("\/api\/student\/seats"/, "좌석 API 를 SWR 로 조회하지 않음");
assert.match(seatCard, /SEAT_SESSION_TYPES\.map/, "탭을 SEAT_SESSION_TYPES 로 그리지 않음");
assert.match(seatCard, /useState<SeatSessionType \| null>\(null\)/, "탭 선택 상태가 없음");
assert.match(seatCard, /picked \?\? firstWithGroup \?\? "afternoon"/, "기본 탭을 렌더에서 파생하지 않음");
assert.doesNotMatch(seatCard, /useEffect/, "effect 안 setState 금지 — 파생값으로 계산");
assert.match(seatCard, /import ClassroomFrame from/, "학급 그룹을 ClassroomFrame 으로 그리지 않음");
assert.match(seatCard, /variant="screen"/, "ClassroomFrame 화면 variant 가 아님");
assert.match(seatCard, /<div className="overflow-x-auto">/, "격자 래퍼에 가로 스크롤이 없음");
assert.match(seatCard, /GAP_CONFIG\[room\.name\]/, "야간 미래혜윰실 블록 간격을 재사용하지 않음");
assert.match(seatCard, /내 자리: /, "내 자리 위치 문구가 없음");
assert.match(seatCard, /배정된 좌석이 없습니다\./, "좌석 없음 문구가 없음");
assert.match(seatCard, /sessionTypesOfSeat\(tab\)\.some/, "미참가 판정을 좌석 세션의 블록으로 하지 않음");

// --- 참여일정 카드: 인덱스 + 5요일 격자, 오늘 강조, 다음 돌아오는 요일로 신청 진입 ---
const scheduleCard = read("../src/components/student/ParticipationScheduleCard.tsx");
assert.match(scheduleCard, /grid-cols-\[auto_repeat\(5,1fr\)\] gap-2/, "3행 격자(인덱스+5요일, 8px 간격)가 아님");
assert.match(scheduleCard, /SESSION_TYPES\.map\(\(sessionType\) =>/, "행을 SESSION_TYPES 로 그리지 않음");
assert.match(scheduleCard, /WEEKDAY_KEYS\.map\(\(key, index\) =>/, "요일 셀을 WEEKDAY_KEYS 로 그리지 않음");
assert.match(scheduleCard, /nextDateForWeekday\(today, index \+ 1\)/, "셀 날짜가 다음 돌아오는 요일이 아님");
assert.match(scheduleCard, /onSelectDay\(sessionType, date\)/, "셀 클릭이 세션+날짜를 넘기지 않음");
assert.match(scheduleCard, /border-blue-700/, "오늘 열 진한 테두리가 없음");
assert.match(scheduleCard, /다음주/, "다음 주로 넘어간 셀 표시가 없음");
assert.match(scheduleCard, /미참가/, "미참가 세션 캡션이 없음");
assert.match(scheduleCard, /"오늘"/, "오늘 캡션이 없음");
assert.match(scheduleCard, /min-h-11/, "요일 셀 높이가 44px 미만");
assert.doesNotMatch(scheduleCard, /participationDays\?\.afternoon/, "옛 afternoon 키 접근이 남아 있음");

console.log("student-schedule-wiring checks passed");
