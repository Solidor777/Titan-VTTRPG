# Session Handoff — 2026-06-04 (overnight autonomous run)

Read this, then the referenced docs. Two things happened this session: e2e speedup Phase 2 shipped, and
chat-message subtypes Phase 2 (item cards) was specced + planned (not implemented — see why below).

## ✅ Shipped this session (merged to `main`, pushed to origin)

**E2E speedup Phase 2 — shared-world harness (`docs/TODO.md` #15) — DONE** (`main` @ `99efdfad`).
- Migrated **all 42 eligible e2e specs** to a module-scoped shared `page` (one Foundry world boot per
  spec FILE) via inline `beforeAll(login)` + `afterEach(closeAllApps + errors reset)` + `afterAll`.
- New `tests/e2e/world.js` (`closeAllApps`, `clearChat`, `attachPageErrors`); `renderSheet` gained an
  optional shared-`errors` param; per-test `pageerror` listeners folded into one shared collector.
- **Full suite: 358 passed in 15.1 min** (was ~34 min, ~56% faster) — green at parity.
- **Closed `OPEN_BUGS.md` #1** (socket-sync A1/A2 flake) — per-file `clearChat` keeps the world lean;
  socket-sync A1–A5 green in-run.
- Harness bugfix (`3744bfdc`): `closeAllApps` must skip core UI singletons (`CONFIG.ui` slots).
- Spec `specs/2026-06-04-e2e-phase2-shared-world-harness-design.md`; plan
  `plans/2026-06-04-e2e-speedup-phase2-shared-world.md`; convention in `titan-codebase` conventions.md.

## ⏸ Awaiting you: chat-message subtypes Phase 2 (item cards) — SPECCED + PLANNED, NOT implemented

`main` @ `57899e01` carries the spec + plan only (docs). **The agent deliberately did NOT implement**,
because:
1. **Restart gate:** the new `documentTypes.ChatMessage` item keys register only at Foundry world load.
   The agent cannot restart your launched world, so the self-render path is unverifiable overnight.
2. **A real pre-existing bug + a design decision** were found (below) that warrant your sign-off before
   touching shipping `src/` + the manifest.

### What you need to decide (both RECOMMENDED yes)
- **D1 — typed-flat `system` schema** for the 7 item datamodels (vs. an ObjectField passthrough).
- **D2 — fix the dead reads.** Runtime capture proved the item roll-data payload has **no `system` key**
  (`hasSystemKey: false` for all 7 types), yet `ItemChat{Value,Rarity,Traits,Tradition}` and several
  leaves read `flags.titan.system.X` → **broken today**. D2 repairs them by flattening to `system.X`.
  (`ItemChatTraits` reads a nonexistent `system.traits` — needs a `trait`/`customTrait` mapping confirmed
  by e2e, or drop the component.)

### Resume sequence (after you approve D1/D2)
1. Branch `feat/chat-message-subtypes-phase2-items`. Execute the plan subagent-driven
   (`plans/2026-06-04-chat-message-subtypes-phase2-items.md`) — route `.js`/`.svelte` via
   `titan-svelte-dev`; load `svelte-5`/`foundry-vtt`/`foundry-svelte`/`foundry-data-models`.
2. Agent-side verify: unit (datamodels + producer `buildChatMessageData()`), component-probe e2e (cards
   render with flat `system` — probe rebuilds `src` fresh, no restart), `npm run build` clean.
3. **You restart Foundry** (registers the 7 subtypes), relaunch on `:30000`.
4. Post-restart e2e (`tests/e2e/item-cards.spec.js`) green → full suite green → merge.
- Spec (authoritative, with captured per-leaf `getRollData()` shapes):
  `specs/2026-06-04-chat-message-subtypes-phase2-items-design.md`.
- The render infra (`ChatMessage.js` `renderHTML`/mount; `ChatMessageContent.svelte` →
  `system.component`) is shared Phase-1 code, untouched by Phase 2.

### Later (unspecced)
- Chat Phase 3 (reports ×13), Phase 4 (effect + delete legacy `OnRenderChatMessageHTML` mount +
  `ChatMessageShell.svelte` switch). Backlog #12 (deep schema-from-shape parity) depends on these.

## Rules (CLAUDE.md Strict Rules, non-negotiable)
1. No test/e2e code in shipping builds. 2. Test/e2e → `test/build/`, self-cleaning. 3. No dynamic imports
in shipping, ever. 4. No stub fixes (fix root cause). 5. Todos → `docs/TODO.md`; bugs → `docs/OPEN_BUGS.md`.
7. Project `.claude/CLAUDE.md` supersedes all. Route `.js`/`.svelte` work to `titan-svelte-dev`.

## Pointers
- Todos: `docs/TODO.md` (#15 DONE; chat subtypes section updated). Bugs: `docs/OPEN_BUGS.md` (none open).
- e2e is **world-launch-gated** (world must run on `:30000`). Test source = `tests/` (plural); built
  artifacts = `test/build/` (singular, gitignored). Never `git add packs/` (live-world LevelDB churn).
