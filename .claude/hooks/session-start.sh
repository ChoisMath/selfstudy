#!/bin/bash
# SessionStart hook — prepares Claude Code cloud sessions (claude.ai/code).
# Local sessions are left untouched.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

# stdout of a SessionStart hook is added to Claude's context, so keep install logs on stderr.

# 1. Dependencies — Next.js 16 + Prisma 7 app (npm). `npm install` reuses the cached
#    node_modules of the container image; `npm ci` would wipe it on every start.
#    The Remotion demo-video/ project is separate and is not installed here.
npm install --no-audit --no-fund >&2

#    Prisma client is generated into src/generated/prisma (git-ignored), and tsc/eslint on
#    files that import it fail without it. `prisma generate` needs no database connection.
npx prisma generate >&2

# 2. Playwright: the container ships Chromium in /opt/pw-browsers and must not download
#    browsers (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1). The MCP launcher reads this variable.
if [ -x /opt/pw-browsers/chromium ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PW_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
fi

# 3. Pre-fetch the project MCP servers (.mcp.json) so they start instantly.
#    A registry hiccup here should not block the session.
node .claude/mcp/launch.mjs --prefetch >&2 || echo "[session-start] MCP prefetch failed; servers will fetch on first use" >&2
