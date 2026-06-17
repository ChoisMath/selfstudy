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

console.log("AttendanceDatePicker contract checks passed");
