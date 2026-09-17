import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const NEW_ROUTE = "src/app/api/grade-admin/[grade]/students/template/route.ts";
const OLD_ROUTE = "src/app/api/admin/students/template/route.ts";

// middleware 가 /api/admin/* 을 admin 전용으로 막아 학년관리자가 템플릿을 받지 못했다.
assert.ok(existsSync(join(root, NEW_ROUTE)), "학년관리 경로에 템플릿 라우트가 있어야 함");
assert.ok(!existsSync(join(root, OLD_ROUTE)), "admin 전용 경로의 템플릿 라우트는 제거");

const route = read(NEW_ROUTE);
assert.match(route, /withGradeAuth\(grade,/, "템플릿 라우트는 withGradeAuth 로 학년 권한 확인");
assert.match(route, /addWorksheet\("학생 목록"\)/);
assert.match(route, /addRow\(\{ grade, classNumber: 1, studentNumber: 1, name: "홍길동" \}\)/, "예시 행 학년은 경로 학년");

const management = read("src/components/students/StudentManagement.tsx");
assert.match(management, /templateUrl=\{`\/api\/grade-admin\/\$\{grade\}\/students\/template`\}/);

const walk = (dir: string): string[] =>
  readdirSync(join(root, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(join(root, rel)).isDirectory() ? walk(rel) : [rel];
  });
const stale = walk("src").filter((file) => read(file).includes("/api/admin/students/template"));
assert.deepEqual(stale, [], "옛 템플릿 URL 참조가 남아 있음");

console.log("student-template-route checks passed");
