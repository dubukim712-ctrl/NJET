---
name: defensive-engineering
description: Eliminate unhandled service exceptions, race conditions, and infinite interface spinners.
---

# Skill 02: Defensive Engineering & System Resilience

## Core Directives

- _Bulletproof Async Scope:_ Wrap all asynchronous procedures, remote server handshakes, backend mutations, and third-party API invocations inside explicit try/catch blocks or strong pipeline catch loops.
- _State-Driven UI Fallbacks:_ For every data fetch operation, the engine must account for and return discrete UI layouts reflecting the four fundamental pipeline states:
  - .loading (Clear, layout-stable placeholder skeleton)
  - .success (Populated layout with complete data bindings)
  - .error (Friendly, actionable message with an immediate, non-breaking fallback option)
  - .empty (A clear user state when arrays or query lookups return zero records)
- _Atomic Operations & Rollbacks:_ Complex mutative tasks involving multi-table or multi-service pipelines must leverage database transactions or manual rollback triggers to guarantee data state integrity in the event of partial network dropouts.
