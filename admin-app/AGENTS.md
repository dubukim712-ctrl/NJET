<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

# Rules for this app

Keep this app organized so a beginner can read it.

- Route paths and entry points go in app/.
- Valid public paths MUST contain a page.tsx.
- Shared visual pieces go in components/.
- Data fetching, localStorage, and external APIs go in data/.
- One job per file.
- No file over 300 lines.
- Before writing anything new, check if it already exists.
- UI elements MUST be responsive, mobile-first layouts are mandatory.
- Apply caching on modules if needed

<!-- END:nextjs-agent-rules -->
