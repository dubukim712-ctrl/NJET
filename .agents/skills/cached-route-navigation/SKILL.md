---
name: cached-route-navigation
description: Make authenticated Next.js module navigation feel immediate with safe client-side query caching.
---

# Cached Route Navigation

Use this skill when authenticated dashboards or admin modules show a loading skeleton on every visit or block navigation on server data fetching.

## Required design

- Keep authorization on the server. Authenticate protected route groups in their server layout; each server action must still reauthorize before fetching or mutating data.
- Keep cacheable route pages synchronous. Read URL filters in the client and load module data through the existing TanStack Query client.
- Scope each query key to the authenticated identity and every input that changes the result, including role/permissions, branch, filters, search, and pagination.
- Keep sensitive data in the in-memory QueryClient. Use long `gcTime` only when the app clears the cache on logout and identity/access changes. Do not enable global dynamic route caching for user-specific data.
- Use `gcTime: Infinity` for a small, bounded set of module queries; use a finite retention window for unbounded search, filter, and pagination keys.
- Show a skeleton only when there is no cached result. Keep stale data visible during background refetches; show an actionable error and retry when no result exists.
- Prefetch routes on user intent (hover or keyboard focus) when eager viewport prefetch adds unnecessary work.
- Invalidate the affected query after mutations or realtime events. Use `router.refresh()` only when server-rendered context itself must change.
- Preserve explicit empty states, input validation, responsive layouts, and current mutation behavior.

## Workflow

1. Inventory route pages, data queries, cache providers, auth guards, mutation invalidation, and realtime subscriptions before editing.
2. Reuse existing query/action patterns. Validate URL and action inputs at the server boundary; never trust a client profile or branch selection for authorization.
3. Convert only data-driven routes that benefit from repeat-visit caching. Keep forms, checkout, and one-time workflows unchanged unless their data-loading behavior is the actual bottleneck.
4. Verify cache isolation on identity/access changes, query keys for every filter, first-load/error/empty states, and targeted lint/build/tests.
