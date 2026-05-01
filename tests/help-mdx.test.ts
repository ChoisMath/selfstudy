import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

assert.ok(existsSync(join(root, "src/app/help/content.mdx")), "help content should be MDX");
assert.ok(existsSync(join(root, "src/components/help/HelpDemos.tsx")), "help demos should be isolated");
assert.ok(existsSync(join(root, "mdx-components.tsx")), "MDX components file should exist");

const page = read("src/app/help/page.tsx");
assert.ok(!page.startsWith('"use client"'), "help page should remain a server component");
assert.match(page, /import\s+HelpContent\s+from\s+"\.[/\\]content\.mdx"/);
assert.match(page, /<HelpContent\s*\/>/);

const content = read("src/app/help/content.mdx");
assert.match(content, /import\s+\{[^}]*SeatLayoutDemo[^}]*\}\s+from\s+["']@\/components\/help\/HelpDemos["']/s);
assert.match(content, /<SeatLayoutDemo\s*\/>/);
assert.match(content, /<UnassignedStudentsDemo\s*\/>/);
assert.match(content, /<ExcelUploadDemo\s*\/>/);
assert.match(content, /<TodayAttendanceDemo\s*\/>/);

const demos = read("src/components/help/HelpDemos.tsx");
assert.ok(!demos.includes("/api/"), "help demos must not reference API routes");
assert.ok(!demos.includes("useSession"), "help demos must not require auth session");
assert.ok(!demos.includes("useRouter"), "help demos must not route users");

const nextConfig = read("next.config.ts");
assert.match(nextConfig, /@next\/mdx/);
assert.match(nextConfig, /pageExtensions:\s*\[[^\]]*"md"[^\]]*"mdx"[^\]]*\]/s);

console.log("help MDX contract checks passed");
