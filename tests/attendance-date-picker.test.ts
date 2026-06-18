import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const componentPath = "src/components/attendance/AttendanceDatePicker.tsx";
assert.ok(existsSync(join(root, componentPath)), "AttendanceDatePicker 컴포넌트가 존재해야 함");

const src = read(componentPath);
assert.ok(src.startsWith('"use client"'), "클라이언트 컴포넌트여야 함");
assert.match(src, /from\s+"@\/lib\/calendar"/, "calendar 유틸을 import 해야 함");
assert.ok(!src.includes("toISOString"), "toISOString 사용 금지 (KST 안전)");
assert.match(src, /오늘로/, "'오늘로' 버튼이 있어야 함");
assert.match(src, /onChange/, "onChange prop을 사용해야 함");

const page = read("src/app/attendance/[grade]/page.tsx");
assert.match(page, /useSession/, "페이지가 useSession으로 권한 판별");
assert.match(page, /AttendanceDatePicker/, "달력 컴포넌트를 렌더해야 함");
assert.match(page, /selectedDate/, "selectedDate state를 써야 함");
assert.match(page, /date=\$\{selectedDate\}/, "조회 SWR 키가 selectedDate 사용");
assert.match(page, /date:\s*selectedDate/, "출석 토글이 selectedDate 사용");
assert.match(page, /date:\s*today/, "일괄승인은 today 유지");
assert.ok(!page.includes("toISOString"), "페이지에 toISOString 사용 금지");

console.log("AttendanceDatePicker contract checks passed");
