# Session Handoff — 2026-06-05 (Phase 4 merged; chat-subtypes effort CLOSED)

Resume point after a context `/clear`. Read this, then the referenced docs + the auto-loaded memory
(`MEMORY.md` → `chat-subtypes-phase4-effect.md`).

## ✅ Last session — Chat-message subtypes Phase 4 (effect + legacy-path deletion) — DONE + MERGED

`main` is at **`1336e312`** (Phase 4 fast-forward-merged and **pushed to origin**; feature branch
deleted). Built subagent-driven (6 tasks, fresh `titan-svelte-dev` implementer + two-stage review
each + a final holistic review). **Verified: unit 158 / full e2e 382 green, build probe-free.**

The **entire chat-subtypes roadmap (Phases 1-4 + follow-ups B/D) is closed**: all 26 chat messages
(5 checks, 7 item cards, 13 reports, effect) are first-class self-rendering `ChatMessage` subtypes;
the legacy hook (`OnRenderChatMessageHTML.js`) and dispatcher (`ChatMessageShell.svelte`) are
DELETED; no chat payload travels in `flags.titan` (remaining `flags.titan` users are document flags:
macros, item uuid, condition descriptions). `TitanActiveEffectDataModel` and
`EffectChatMessageDataModel` share `createEffectSystemTemplate()` (single source, golden-master
gated by `tests/unit/EffectSchemaEquivalence.test.js`). Dark-mode-`'all'` for non-TITAN messages
lives in `TitanChatMessage.renderHTML`. Spec/plan:
`specs/2026-06-05-chat-message-subtypes-phase4-effect-design.md`,
`plans/2026-06-05-chat-message-subtypes-phase4-effect.md`.

Bonus fixes shipped on the branch: the since-2024 unlabeled zero-resolve-cost check-button bug
(`ItemChatMessageItemChecks.svelte`); two e2e teardown traps in `closeAllApps` (nested
`options.directory` sub-apps; `canvas.hud`); **`npm run test:e2e` is now THROTTLED by default**
(BelowNormal priority, half the cores, `tests/e2e/run-e2e-throttled.ps1`; `test:e2e:fast` =
unthrottled; filter args pass through via `@($args)` — PS 5.1 drops the automatic `$args` in
native-command position); vitest `hookTimeout` 60s.

## ▶ NEXT — no designated big-ticket item; pick from the backlog

The chat-subtypes effort was the active workstream and is now closed. Next session: brainstorm with
the user which backlog item to take. Open inventory:

- `docs/TODO.md`: #10 (per-element chat mount keying — notification-pane leak), #11 (check chat
  components mutate live DataModel before update), #13 (`effectsExpiredReport` e2e trigger),
  **NEW #16** (consolidate the 4-copy golden-master fingerprint harness), **NEW #17** (lang TYPES
  housekeeping: stale `TYPES.Item.effect`, missing `TYPES.ActiveEffect`), **NEW #18** (orphaned
  fixture tokens in the 3 token-control specs), **NEW #19** (canvas-poll silent exhaustion → throw),
  NPC `overkillDamage` dead-data note.
- `docs/OPEN_BUGS.md`: **NEW #4** (fast-healing apply-confirm e2e flake — one occurrence 2026-06-05,
  green on re-runs; watch for recurrence).
- Deferred sub-project B (seeded standard-effects pack + pipeline) from the effect-tray session.
- `docs/superpowers/e2e-suite-status.md` is STALE (claims 315 e2e / 35 unit; reality 382/158) —
  retire it or banner-mark it historical on the next docs touch.

## Gotchas (carried forward)
- e2e RUN is world-launch-gated; a `documentTypes` manifest change needs a world server RESTART
  (none pending — Phase 4's restart already happened).
- Unit runner is **`npm test`** (NO `test:unit` script); filter positionally. e2e:
  `npm run test:e2e -- <pattern>` (throttled default; full run ~15 min, run in background). Always
  `npm run build` before e2e.
- **`git add` explicit paths only — NEVER stage `packs/`** (now includes `packs/effects/lost/`
  LevelDB recovery artifacts), **`.claude/settings.local.json`, or `.claude/scheduled_tasks.lock`**.
- Golden-master harness recipe: mock fields in `beforeAll` + dynamic import + hand-authored golden
  literals; ArrayField element initial is inert (gates omit it).
- Resume a finished subagent with its context via `SendMessage` to its `agentId` (used for the
  Task 5 fix loops this session).

## Rules (CLAUDE.md, non-negotiable)
No test/e2e code in shipping builds; test/e2e → `test/build/` (self-cleaning); no dynamic imports in
shipping; no stub fixes (fix the root cause); todos → `docs/TODO.md`, bugs → `docs/OPEN_BUGS.md`;
project `.claude/CLAUDE.md` supersedes all; route `.js`/`.svelte` to `titan-svelte-dev` (load
`svelte-5`, `foundry-vtt`, `foundry-svelte`); update the `titan-codebase` skill after each spec.
e2e world is `:30000`; test source = `tests/` (plural), built artifacts = `test/build/` (singular,
gitignored); `dist/` is the shipping bundle (gitignored).

## Repo state at handoff
- Branch `main` @ `1336e312`, pushed; working tree dirty only with the sanctioned never-stage noise
  (`packs/effects/*` incl. `lost/`, `.claude/settings.local.json`, `.claude/scheduled_tasks.lock`).
