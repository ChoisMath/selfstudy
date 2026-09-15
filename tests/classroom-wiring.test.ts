import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// --- API: 목록/생성 ---
const listRoute = read("../src/app/api/grade-admin/[grade]/classrooms/route.ts");
assert.match(listRoute, /withGradeAuth\(grade/, "classrooms GET/POST 가 withGradeAuth 를 쓰지 않음");
assert.match(listRoute, /export async function GET/);
assert.match(listRoute, /export async function POST/);
assert.match(listRoute, /parseClassroomConfig\(/, "POST 가 parseClassroomConfig 로 검증하지 않음");
assert.match(listRoute, /planClassroomRooms\(/, "POST 가 planClassroomRooms 로 Room 을 만들지 않음");
assert.match(listRoute, /\$transaction/, "POST 가 트랜잭션을 쓰지 않음");
assert.match(listRoute, /status: 409/, "중복 반 번호 409 없음");
assert.match(listRoute, /assignedCount/, "GET 응답에 assignedCount 없음");

// --- API: 수정/삭제 ---
const itemRoute = read("../src/app/api/grade-admin/[grade]/classrooms/[id]/route.ts");
assert.match(itemRoute, /withGradeAuth\(grade/);
assert.match(itemRoute, /export async function PUT/);
assert.match(itemRoute, /export async function DELETE/);
assert.match(itemRoute, /parseClassroomConfig\(/);
assert.match(itemRoute, /isGeometryChanged\(/, "PUT 이 isGeometryChanged 로 초기화 여부를 판정하지 않음");
assert.match(itemRoute, /planClassroomRooms\(/);
assert.match(itemRoute, /\$transaction/);
// 삭제 순서: SeatLayout → Room → Classroom (cascade 없음)
const deleteOrder = /seatLayout\.deleteMany[\s\S]*?room\.deleteMany[\s\S]*?classroom\.delete\(/;
assert.match(itemRoute, deleteOrder, "DELETE 의 삭제 순서가 SeatLayout → Room → Classroom 이 아님");
assert.match(itemRoute, /session\.grade !== grade/, "다른 학년의 classroom id 접근을 막지 않음");
assert.match(itemRoute, /reset/, "PUT 응답에 reset 없음");

// --- ClassroomFrame: 인쇄에서도 쓰므로 dnd-kit 비의존, 라벨은 corridorLabels 에서만 ---
const frame = read("../src/components/seats/ClassroomFrame.tsx");
assert.doesNotMatch(frame, /@dnd-kit/, "ClassroomFrame 이 dnd-kit 에 의존함");
assert.match(frame, /corridorLabels\(/, "ClassroomFrame 이 corridorLabels 를 쓰지 않음");
assert.match(frame, /writingMode: "vertical-rl"/, "복도/창문 라벨이 세로 텍스트가 아님");
assert.match(frame, /whitespace-nowrap/, "라벨에 줄바꿈 금지 클래스 없음");
assert.match(frame, /PRINT_SIDE_LABEL_WIDTH/, "인쇄 라벨 폭 상수 없음");
assert.match(frame, /교탁/, "ClassroomFrame 에 교탁 없음");
assert.doesNotMatch(frame, /gridTemplateColumns:[^\n]*1fr[^\n]*isPrint \?/, "인쇄 variant 에 1fr 사용 의심");

// --- 렌더러 3곳이 학급 그룹을 ClassroomFrame 으로 그린다 ---
for (const [label, rel] of [
  ["SeatingEditor", "../src/components/seats/SeatingEditor.tsx"],
  ["attendance page", "../src/app/attendance/[grade]/page.tsx"],
  ["SeatPrintGroup", "../src/components/seats/SeatPrintGroup.tsx"],
] as const) {
  const src = read(rel);
  assert.match(src, /import ClassroomFrame from/, `${label} 가 ClassroomFrame 을 import 하지 않음`);
  assert.match(src, /group\.classroom/, `${label} 가 group.classroom 으로 분기하지 않음`);
}
assert.match(read("../src/components/seats/SeatingEditor.tsx"), /variant="screen"/);
assert.match(read("../src/app/attendance/[grade]/page.tsx"), /variant="screen"/);
assert.match(read("../src/components/seats/SeatPrintGroup.tsx"), /variant="print"/);
// 편집기의 학급 그룹은 RoomGrid 자체 교탁을 끄고 프레임 교탁 하나만 남긴다
assert.match(
  read("../src/components/seats/SeatingEditor.tsx"),
  /<ClassroomFrame[\s\S]*?<RoomGrid[\s\S]*?hideTeacherDesk[\s\S]*?<\/ClassroomFrame>/,
  "편집기 학급 그룹의 RoomGrid 가 hideTeacherDesk 가 아님"
);

// 출석 카드는 overflow-hidden 이라 학급 프레임 래퍼가 직접 가로 스크롤을 제공해야 한다
assert.match(
  read("../src/app/attendance/[grade]/page.tsx"),
  /<div className="overflow-x-auto p-\[clamp\(6px,1\.5vw,12px\)\]">\s*<ClassroomFrame/,
  "출석 페이지 학급 프레임 래퍼에 overflow-x-auto 없음"
);

// --- ClassroomConfigModal ---
const modal = read("../src/components/seats/ClassroomConfigModal.tsx");
assert.match(modal, /\/api\/grade-admin\/\$\{grade\}\/classrooms/, "모달이 classrooms API 를 호출하지 않음");
assert.match(modal, /isGeometryChanged\(/, "모달이 초기화 여부를 클라이언트에서 판정하지 않음");
assert.match(modal, /parseClassroomConfig\(/, "모달이 저장 전 검증하지 않음");
assert.match(modal, /좌석이 초기화됩니다/, "초기화 확인 문구 없음");
assert.match(modal, /overflow-x-auto/, "학급 목록 표 래퍼에 가로 스크롤 없음");
assert.match(modal, /max-h-\[90dvh\]/, "모달 높이가 dvh 가 아님");
assert.doesNotMatch(modal, /100vh|\[90vh\]/, "vh 사용");
assert.match(modal, /min-h-11/, "버튼 44px 터치 타겟 없음");
assert.match(modal, /role="dialog"/, "dialog 역할 없음");

// --- SeatingEditor 가 오후 탭에서만 설정 모달을 연다 ---
const editor = read("../src/components/seats/SeatingEditor.tsx");
assert.match(editor, /import ClassroomConfigModal from/, "편집기가 모달을 import 하지 않음");
assert.match(editor, /교실 구조 설정/, "설정 버튼 없음");
assert.match(editor, /sessionType === "afternoon" && \(/, "설정 버튼이 오후 탭으로 한정되지 않음");
assert.match(editor, /onChanged=\{[^}]*layoutMutate/, "구조 변경 후 좌석 SWR 을 갱신하지 않음");

console.log("classroom-wiring checks passed");
