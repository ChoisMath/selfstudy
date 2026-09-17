import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Remotion 안내 영상은 자체 package.json·eslint 설정을 가진 별도 프로젝트다.
    "demo-video/**",
    // .claude/skills 의 .ts/.tsx 는 서드파티 스킬 예제라 앱 코드가 아니다(flat config 는 dot 폴더를 기본으로 무시하지 않는다).
    ".claude/**",
  ]),
]);

export default eslintConfig;
