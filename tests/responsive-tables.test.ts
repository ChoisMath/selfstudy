import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// responsive-ui 규칙: 표 래퍼 내부 스크롤(§3.2/§4), thead z 서열(§3.4), 100vh 금지(§4), 44px 터치 타겟(§6), 모바일 바깥 여백(§1)
// tsconfig target ES2017 — 정규식 s 플래그·lookbehind 사용 금지

const globals = read("../src/app/globals.css");
assert.match(globals, /--header-h:\s*3\.5rem/, "globals.css 에 --header-h 기본값(3.5rem = nav h-14) 없음");
assert.match(
  globals,
  /@utility table-scroll\s*\{[\s\S]*?max-height:\s*calc\(100dvh - var\(--header-h\)\)[\s\S]*?overflow:\s*auto[\s\S]*?\}/,
  "globals.css 에 @utility table-scroll(max-height: calc(100dvh - var(--header-h)); overflow: auto) 없음"
);

// --- 표 7곳: 래퍼가 스크롤포트(table-scroll)이고 헤더가 그 안에서 sticky ---
const TABLE_FILES = [
  "../src/components/admin-shared/MonthlyCalendar.tsx",
  "../src/components/admin-shared/ParticipationManagement.tsx",
  "../src/components/grade-admin/GradeMonthlyAttendance.tsx",
  "../src/components/students/StudentManagement.tsx",
  "../src/app/homeroom/participation/page.tsx",
  "../src/app/grade-admin/[grade]/participation/page.tsx",
  "../src/app/student/attendance/page.tsx",
];
for (const rel of TABLE_FILES) {
  const src = read(rel);
  assert.match(
    src,
    /<div className="[^"]*\boverflow-x-auto\b[^"]*\btable-scroll\b[^"]*">\s*<(table|div className="min-w-\[700px\]")/,
    `${rel}: 표 래퍼에 overflow-x-auto + table-scroll 없음 — sticky 헤더가 붙을 스크롤포트가 없음`
  );
  assert.match(
    src,
    /<(thead|div) className="[^"]*\bsticky top-0 z-20\b/,
    `${rel}: 헤더가 sticky top-0 z-20 이 아님(본문 인덱스 셀 z-10 위에 와야 함)`
  );
  assert.doesNotMatch(src, /\bz-10\b[^"]*"\s*>\s*<tr/, `${rel}: thead 가 z-10 으로 남아 있음`);
}

// --- 참여설정 3곳: 요일 토글·체크박스 44px ---
for (const rel of [
  "../src/components/admin-shared/ParticipationManagement.tsx",
  "../src/app/homeroom/participation/page.tsx",
  "../src/app/grade-admin/[grade]/participation/page.tsx",
]) {
  const src = read(rel);
  assert.doesNotMatch(src, /\bw-7 h-7\b/, `${rel}: 요일 토글이 28px(w-7 h-7)`);
  assert.match(src, /<button[\s\S]*?className=\{`h-11 w-11 /, `${rel}: 요일 토글이 h-11 w-11 이 아님`);
  assert.match(
    src,
    /<label className="[^"]*\bh-11 w-11\b[^"]*"[^>]*>\s*<input\s+type="checkbox"/,
    `${rel}: 체크박스가 44px label 로 감싸이지 않음`
  );
  assert.match(src, /<th[^>]*className="[^"]*\bsticky left-0 z-30\b[^"]*bg-gray-50/, `${rel}: 이름 헤더 셀이 sticky 인덱스(z-30, 배경) 가 아님`);
  assert.match(src, /<td className="[^"]*\bsticky left-0 z-10\b[^"]*bg-white/, `${rel}: 이름 셀이 sticky 인덱스(z-10, 배경) 가 아님`);
  assert.match(src, /<table className="[^"]*\bwhitespace-nowrap\b/, `${rel}: 표에 whitespace-nowrap 없음`);
}

// 방과후 체크박스 label 은 블록(flex)이어야 요일 버튼 아래에 쌓인다 — inline-flex 면 버튼 옆에 나란히 놓여 히트 영역이 겹친다
for (const rel of [
  "../src/components/admin-shared/ParticipationManagement.tsx",
  "../src/app/homeroom/participation/page.tsx",
]) {
  assert.match(read(rel), /<label className="mx-auto mt-2 flex h-11 w-11 /, `${rel}: 방과후 label 이 블록 flex + 중앙 정렬이 아님`);
}

// --- 월 이동/도구 버튼 44px ---
const monthlyCalendar = read("../src/components/admin-shared/MonthlyCalendar.tsx");
const gradeMonthly = read("../src/components/grade-admin/GradeMonthlyAttendance.tsx");
const schedule = read("../src/app/homeroom/schedule/page.tsx");
for (const [name, src] of [["MonthlyCalendar", monthlyCalendar], ["GradeMonthlyAttendance", gradeMonthly], ["homeroom/schedule", schedule]] as const) {
  for (const handler of ["prevMonth", "nextMonth", "goToday"]) {
    const cls = src.match(new RegExp(`<button\\s+onClick=\\{${handler}\\}[^>]*className="([^"]+)"`))?.[1];
    assert.ok(cls, `${name}: onClick={${handler}} 버튼을 찾지 못함`);
    assert.match(cls, /\bmin-h-11\b/, `${name}: ${handler} 버튼 터치 타겟이 44px 미만`);
  }
}
assert.match(monthlyCalendar, /openUpward/, "MonthlyCalendar: 하단 행 드롭다운이 위로 펼쳐지지 않음(래퍼 max-height 안에서 잘림)");

// 감독일정 슬롯 행: 9px '교체' 텍스트 버튼 대신 행 전체가 44px 버튼
assert.doesNotMatch(schedule, /<button[^>]*className="shrink-0 text-\[9px\]/, "homeroom/schedule: 9px 교체 버튼이 남아 있음");
assert.match(schedule, /const rowClass = `flex min-h-11 /, "homeroom/schedule: 슬롯 행 공통 클래스에 min-h-11 없음");
assert.match(schedule, /<button[\s\S]*?aria-label=\{`\$\{slot\.grade\}학년[\s\S]*?className=\{`\$\{rowClass\} /, "homeroom/schedule: 슬롯 행이 rowClass(44px) 를 쓰는 버튼이 아님");

// --- 학생관리 행 액션 ---
const studentMgmt = read("../src/components/students/StudentManagement.tsx");
for (const handler of ["handleEdit\\(student\\)", "handleDelete\\(student\\)", "handleRestore\\(student\\)", "handleToggleHelper\\(student\\)"]) {
  const cls = studentMgmt.match(new RegExp(`onClick=\\{\\(\\) => ${handler}\\}[\\s\\S]*?className=(?:\\{\`|")([^\`"]+)`))?.[1];
  assert.ok(cls, `StudentManagement: ${handler} 버튼을 찾지 못함`);
  assert.match(cls, /\bmin-h-11\b/, `StudentManagement: ${handler} 버튼 터치 타겟이 44px 미만`);
}

// --- 모달/카드 모바일 여백 ---
for (const [rel, src] of [
  ["StudentManagement", studentMgmt],
  ["homeroom/schedule", schedule],
] as const) {
  assert.doesNotMatch(src, /(^|[^\w:-])p-6\b/m, `${rel}: 모달 카드가 모바일에서도 p-6`);
  assert.match(src, /\bmx-2 p-3 sm:mx-4 sm:p-6\b/, `${rel}: 모달 카드 여백이 mx-2 p-3 sm:mx-4 sm:p-6 이 아님`);
}
const attendanceIndex = read("../src/app/attendance/page.tsx");
assert.doesNotMatch(attendanceIndex, /(^|[^\w:-])p-8\b/m, "attendance/page: 학년 선택 카드가 모바일에서도 p-8");
const attendanceGrade = read("../src/app/attendance/[grade]/page.tsx");
assert.doesNotMatch(attendanceGrade, /\bw-8 h-8\b/, "attendance/[grade]: 32px 닫기 버튼이 남아 있음");

// 상단 파란 바 버튼 (§6 44px, §2 라벨 줄바꿈 금지)
const gradeSwitchClass = attendanceGrade.match(/setShowGradeModal\(true\)\}\s*\n\s*className=\{`([^`]+)`\}/)?.[1];
assert.ok(gradeSwitchClass, "attendance/[grade]: '다른학년' 버튼 className 을 찾지 못함");
assert.match(gradeSwitchClass, /\bmin-h-11\b/, "attendance/[grade]: '다른학년' 버튼이 44px 미만");
assert.match(gradeSwitchClass, /\bwhitespace-nowrap\b/, "attendance/[grade]: '다른학년' 라벨에 whitespace-nowrap 없음");
// ml-auto 가 조건부 렌더되는 카운트 블록에 있으면 불참신청 탭에서 우측 정렬이 사라진다
assert.match(gradeSwitchClass, /tab === "absence" \? "ml-auto" : "ml-2"/, "불참신청 탭에서 '다른학년' 버튼이 우측 정렬되지 않음");

const dateToggleClass = attendanceGrade.match(/setShowDatePicker\(\(v\) => !v\)\}\s*\n\s*className="([^"]+)"/)?.[1];
assert.ok(dateToggleClass, "attendance/[grade]: 날짜 토글 버튼 className 을 찾지 못함");
assert.match(dateToggleClass, /\bmin-h-11\b/, "attendance/[grade]: 날짜 토글 버튼이 44px 미만");

// 날짜 팝오버 offset 은 상단 바 높이에 수기로 맞춘 값 — 바 안 버튼이 44px 이 되면 함께 내려야 한다
assert.match(attendanceGrade, /absolute z-\[120\] left-3 top-\[4\.75rem\]/, "날짜 팝오버가 높아진 상단 바를 가리거나 겹침");

// --- 날짜 팝오버 ---
const datePicker = read("../src/components/attendance/AttendanceDatePicker.tsx");
assert.doesNotMatch(datePicker, /\bmin-h-9\b/, "AttendanceDatePicker: 날짜 셀 36px");
assert.match(datePicker, /\baspect-square min-h-11\b/, "AttendanceDatePicker: 날짜 셀이 44px 이 아님");
assert.match(datePicker, /w-\[min\(100vw-1\.5rem,344px\)\]/, "AttendanceDatePicker: 폭이 7×44 를 담지 못함");

// --- 학생 출결 표 이동/탭 버튼 ---
const studentAttendance = read("../src/app/student/attendance/page.tsx");
for (const handler of ["onPrev", "onNext"]) {
  const matches = [...studentAttendance.matchAll(new RegExp(`<button\\s+onClick=\\{${handler}\\}\\s+className="([^"]+)"`, "g"))];
  assert.equal(matches.length, 2, `student/attendance: onClick={${handler}} 버튼 2개(주간/월간)를 찾지 못함`);
  for (const m of matches) assert.match(m[1], /\bmin-h-11 min-w-11\b/, `student/attendance: ${handler} 버튼이 44px 미만`);
}

// --- 레이아웃: 100vh 금지, 모바일 바깥 여백 ---
for (const rel of [
  "../src/app/admin/layout.tsx",
  "../src/app/grade-admin/[grade]/layout.tsx",
  "../src/app/homeroom/layout.tsx",
  "../src/app/student/layout.tsx",
  "../src/app/attendance/layout.tsx",
  "../src/app/login/page.tsx",
  "../src/app/help/page.tsx",
]) {
  assert.doesNotMatch(read(rel), /min-h-screen/, `${rel}: min-h-screen(100vh) 사용 — min-h-dvh 로`);
}
for (const rel of [
  "../src/app/admin/layout.tsx",
  "../src/app/grade-admin/[grade]/layout.tsx",
  "../src/app/homeroom/layout.tsx",
  "../src/app/student/layout.tsx",
]) {
  assert.match(read(rel), /<main className="[^"]*\bpx-2 md:px-3 lg:px-4\b/, `${rel}: main 바깥 여백이 모바일 p-2 이하가 아님`);
  assert.doesNotMatch(read(rel), /<main className="[^"]*(^|\s)px-4 /, `${rel}: main 에 무조건 px-4`);
}
assert.match(read("../src/app/student/layout.tsx"), /\[--header-h:7\.625rem\]/, "student/layout: 헤더(제목+탭)가 3.5rem 보다 높으므로 --header-h 재정의 필요");

console.log("responsive-tables checks passed");
