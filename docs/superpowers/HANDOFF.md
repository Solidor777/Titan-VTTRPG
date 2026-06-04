# Session Handoff — 2026-06-04 (prepare-for-clear)

Resume point after a context `/clear`. Read this, then the referenced docs.

## Resume sequence (what to do next)

**Brainstorm finishing the e2e *speedup* refactor**, then spec → plan → implement (subagent-driven).
This is the e2e suite-speed/quality work — distinct from the now-complete build/probe redesign (#13).
Two open items remain, each its own brainstorm→plan→implement cycle. The design spec already exists:
`docs/superpowers/specs/2026-06-03-e2e-suite-speedup-design.md` (Workstream A).

1. **`docs/TODO.md` #14 — Phase 1b (bespoke sleep removal).** Convert the remaining per-site
   `setTimeout` settles to conditions using the `titanWait` helper (`tests/e2e/poll.js`):
   `effect-tray.spec.js` (~18), `logic/rules-elements.spec.js` (~10), `logic/conditions.spec.js` (2),
   `localization.spec.js` (2 tray sites), `permissions-auto-open.spec.js` (1 — an assert-absence that
   needs a positive signal or a bounded wait; can't poll a negative). Mechanical; good first pick.
2. **`docs/TODO.md` #15 — Phase 2 (shared-world harness + hygiene).** Per-file login (boot the world
   once per spec file, opt-out per the spec → collapse ~100+ per-test world boots to ~40); per-test
   hygiene (close apps, reset error listeners); per-file/per-run world reset (chat clear + trim
   accumulated state). **The world-reset also fixes the socket-sync flake (`docs/OPEN_BUGS.md` #1).**
   This is the substantial speedup (the full suite currently takes ~34 min at one world-boot per test).

Per CLAUDE.md planning: load `foundry-vtt` + `titan-codebase` (and `svelte-5`/`foundry-svelte` if
Svelte files are touched). Route `.js`/`.svelte` edits through the `titan-svelte-dev` subagent.

Other open (not e2e): #10/#11/#12 (chat-message follow-ups) and the chat-message later phases
(items / reports / effect) per `specs/2026-06-03-chat-message-subtypes-phase1-design.md`.

## Shipped last session (all merged to `main` at `730adfd9`, pushed to origin)

- **Build-architecture redesign (`docs/TODO.md` #13) — DONE.** Enacts CLAUDE.md Strict Rules 1–4.
  Externalized the e2e component-probe out of the system bundle: it is now a standalone IIFE built by
  `vite.probe.config.mjs` (`emitCss:false`) → `test/build/probe.iife.js` (+ `probe.css`), Playwright-
  injected (`tests/e2e/componentProbe.js` `mountProbe` → `ensureProbe` self-injects when
  `game.titan._probe` is absent); entry `src/test-probe/probeBundleEntry.js`. `global-setup.js` builds
  probe (Vite, first) then fast-check (esbuild) into the self-cleaning `test/build/`. Shared Vite
  blocks in `vite.shared.mjs`. Effect-tray menu/dialog **decoupled** (injected `openMoveToFolder`),
  removing the last shipping dynamic import. Production `npm run build` → single-chunk
  `dist/index.js` + `dist/style.css`, **probe-free** (grep-proven: 0 `registerProbe`/`_probe`/
  `__TITAN_PROBE__`/`import(`). Spec/plan: `specs/2026-06-03-build-architecture-design.md`,
  `plans/2026-06-03-build-architecture-redesign.md`. Verified: unit **92** / e2e **358 passed**.
  Gotcha: test **source** is `tests/` (plural); built test **artifacts** are `test/build/` (singular,
  gitignored, self-cleaning) — don't conflate.

## Rules (CLAUDE.md Strict Rules, non-negotiable)

1. No test/e2e code in shipping builds. 2. Test/e2e code → `test/build/`, self-cleaning. 3. No
dynamic imports in shipping builds, ever. 4. No stub fixes (fix root cause). 5. No unlogged todos
(→ `docs/TODO.md`); bugs → `docs/OPEN_BUGS.md`. 7. Project `.claude/CLAUDE.md` supersedes all others.

## Pointers
- Rules: `.claude/CLAUDE.md`. Todos: `docs/TODO.md` (**#14/#15 NEXT**). Bugs: `docs/OPEN_BUGS.md`
  (#1 socket-sync flake — fixed by #15's world-reset).
- E2E speedup design (covers #14 + #15): `docs/superpowers/specs/2026-06-03-e2e-suite-speedup-design.md`.
- Build model (current state): `titan-codebase` skill `references/architecture.md` / `conventions.md`.
