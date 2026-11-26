<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Rules for this app

Keep this app organized so a beginner can read it.

- Stack: Next.js (App Router), TypeScript, Tailwind CSS. _(Update if using different tools)_
- Route paths and entry points go in `app/`. Valid public paths MUST contain a `page.tsx`.
- Shared visual pieces go in `components/`.
- Always use reusable components if applicable.
- Data fetching, `localStorage`, and external APIs go in `data/`.
- One job per file; no file over 300 lines.
- Before writing anything new, check `components/` and `data/` to see if it already exists.
- UI elements MUST be responsive; mobile-first layouts are mandatory.
- Apply caching on modules if needed.
- Keep edits minimal and scoped only to requested files.

#### Engineering Discipline & Simplicity Rules

- **Prefer simple, direct solutions**: Solve the stated requirement with the smallest, clearest code change possible. Do not introduce speculative abstractions, unused interfaces, wrapper layers, or premature generalization.
- **Keep existing patterns**: Match the repository's established conventions, file layout, naming, and validation patterns rather than inventing new frameworks or helpers.
- **Preserve safety and correctness**: Never skip input validation, authorization/RLS checks, row locks, transaction safety, or error handling for the sake of brevity.
- **Delete dead or redundant code**: When replacing behavior or fixing a bug, remove obsolete code paths rather than leaving unused fallbacks behind.
- **Minimal diff footprint**: Touch only the files required for the task and keep edits focused, readable, and easy to verify.
