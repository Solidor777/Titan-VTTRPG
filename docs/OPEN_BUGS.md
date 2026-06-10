# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

### 6. E2E `ensureProbe` strands the first probe test if injected during a page boot window

- **What:** The probe IIFE entry (`src/test-probe/probeBundleEntry.js`) registers immediately when
  `game.titan` exists and otherwise arms a one-shot `Hooks.once('ready', registerProbe)` fallback. If
  `ensureProbe` (`tests/e2e/componentProbe.js`) injects while the page is mid-boot (`game` exists but the
  system's `init` hook has not yet set `game.titan`), the immediate path is skipped, and `mountProbe`'s
  next `page.evaluate` reads `game.titan._probe` → `TypeError: Cannot read properties of undefined
  (reading '_probe')`. The NEXT test's `ensureProbe` re-injects post-boot and succeeds, so exactly one
  test fails. Observed once on 2026-06-06 in `component-probe-context.spec.js:40` during a full run that
  overlapped a concurrent `npm run build` (the build's `emptyOutDir`/rewrite of `dist/` while an e2e page
  was logging in is the suspected boot disturbance); the file passed 13/13 twice in isolation afterward.
- **Severity:** Flake under operator error only — normal runs never overlap a build with the e2e suite
  (global-setup builds the probe before any test, and `npm run test:e2e` performs no `dist/` build mid-run).
- **To do:** harden `ensureProbe`: wait for `globalThis.game?.titan` before injecting (in-page
  `titanWait`/`waitForFunction`), and after injecting, `waitForFunction(() => !!game?.titan?._probe)` so a
  mid-boot injection blocks until the fallback registers instead of stranding the current test. Also: never
  run `npm run build` concurrently with an e2e run.
- **Found by:** embedded-document-stores final verification, 2026-06-06.
