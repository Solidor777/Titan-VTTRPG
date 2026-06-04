# Session Handoff — 2026-06-03 (prepare-for-clear)

Resume point after a context `/clear`. Read this, then the referenced docs.

## Resume sequence (what to do next)

1. **Brainstorm → spec → plan → implement the build-architecture redesign** that enacts the new
   CLAUDE.md **Strict Rules** (1–4). This is **`docs/TODO.md` #13** — start there. Load `foundry-vtt`,
   `titan-codebase` (and `svelte-5`/`foundry-svelte` if Svelte files are touched) per CLAUDE.md.
   Key design decision to resolve in the brainstorm: how the e2e component-probe loads when it is no
   longer compiled into the system bundle (standalone probe bundle injected by Playwright vs separate
   manifest vs other). Remember **Rule 4 — no stub fixes**: the `MoveEffectToFolderDialog` /
   `Dialog.js` static-import fix must be root-cause (restructure so `Dialog.js` doesn't read
   `foundry.applications.api` at module load, or decouple the unit test), NOT an `ApplicationV2` mock.
2. **Then return to the open plans**: `docs/TODO.md` #14 (e2e speedup Phase 1b — bespoke sleeps) and
   #15 (e2e speedup Phase 2 — shared-world harness + hygiene; also fixes the socket-sync flake).
   Other open: #10, #11, #12 (chat-message follow-ups), and the chat-message subtype later phases
   (items / reports / effect) per `specs/2026-06-03-chat-message-subtypes-phase1-design.md`.

## Shipped this session (all merged to `main`, pushed to origin)

- **Chat-message subtypes Phase 1** — 5 check subtypes (`attributeCheck`…`itemCheck`), document
  self-render via `TitanChatMessage#renderHTML`, typed `message.system`. 358 e2e / 90 unit green.
- **Build-output hygiene** — Vite build → `dist/` (`emptyOutDir`), `system.json` esmodules/styles →
  `dist/`, release zip / eslint / skill docs updated, ~152 stale root artifacts cleared.
- **E2E speedup Phase 1a** — `titanWait` in-page poll helper (`tests/e2e/poll.js`, installed by
  `login`); ~38 uniform render-/roll-settle `setTimeout`s converted; `renderSheet` settle dropped.
  Branch `chore/e2e-sleep-removal` — verified (356 pass; the only 2 failures are the confirmed
  socket-sync flake, `OPEN_BUGS.md` #1). **If not yet merged at resume, merge it to `main` first.**

## Rules now in CLAUDE.md (Strict Rules, non-negotiable)

1. No test/e2e code in shipping builds. 2. Test/e2e code → `test/build/`, self-cleaning. 3. No
dynamic imports in shipping builds, ever. 4. No stub fixes (fix root cause). 5. No unlogged todos
(→ `docs/TODO.md`); bugs → `docs/OPEN_BUGS.md`. 7. Project `.claude/CLAUDE.md` supersedes all others.

## Pointers
- Rules: `.claude/CLAUDE.md` (Strict Rules / Collaboration Rules).
- Todos: `docs/TODO.md` (#13 is NEXT). Bugs: `docs/OPEN_BUGS.md`.
- Build-redesign spec target: write to `docs/superpowers/specs/2026-06-03-build-architecture-design.md`.
