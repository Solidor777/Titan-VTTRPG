# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

## 1. socket-sync A1/A2 intermittently time out late in a full e2e run

- **Symptom:** In a full `npm run test:e2e` run, `tests/e2e/socket-sync.spec.js` A1 (persistent
  damage GM→player replication) and A2 (fast healing) intermittently fail with
  `Test timeout of 60000ms exceeded`, followed by a secondary
  `browserContext.close: Protocol error … Failed to find context` in `multiClient.js:33` (a
  consequence of the timeout, not the cause). Observed: 356 passed / 2 failed in a 30.5-minute run.
- **Not reproducible in isolation:** `npx playwright test tests/e2e/socket-sync.spec.js` passes
  **5/5** (~1.7 min). So it is timing/environmental, not a logic defect.
- **Suspected cause:** late in a long run against a **heavily-bloated world** (no per-run reset →
  hundreds of accumulated documents/messages), GM→player socket replication exceeds the 60s test
  timeout. The sleep-removal work did **not** touch these multi-client specs (only `login()`'s new
  `installPoll` addInitScript is on their path, and it is side-effect-free).
- **Fix direction:** addressed by the deferred **e2e Phase 2** world-reset/hygiene work (keep the
  world lean across the run) — see `docs/TODO.md`. Cheaper mitigations if needed: raise the
  socket-sync test timeout, or harden the `multiClient.js` teardown to tolerate an already-disposed
  context.
- **Found:** full-suite regression after e2e Phase-1a sleep removal (2026-06-03).
