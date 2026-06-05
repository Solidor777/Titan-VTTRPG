# Session Handoff — 2026-06-05 (Phase 3 reports merged; resume at Phase 4)

Resume point after a context `/clear`. Read this, then the referenced docs + the auto-loaded memory
(`MEMORY.md` → `chat-subtypes-phase3-reports.md`).

## ✅ Last session — Chat-message subtypes Phase 3 (reports ×13) — DONE + MERGED

`main` is at **`8a19c5c0`** (Phase 3 fast-forward-merged and **pushed to origin**; feature branch
deleted). Built subagent-driven (6 tasks, fresh `titan-svelte-dev` implementer + two-stage review
each + a final holistic review). **Verified: unit 154 / full e2e 380 green, build clean.**

All 13 report chat messages are now first-class self-rendering `ChatMessage` subtypes (typed
`system` payloads). Producer `CharacterDataModel._whisperOwners` emits `{type, system}`; the legacy
hook `OnRenderChatMessageHTML` `TITAN_CHAT_MESSAGE_TYPES` is trimmed to **only `'effect'`**. Spec/plan:
`specs/2026-06-04-chat-message-subtypes-phase3-reports-design.md`,
`plans/2026-06-04-chat-message-subtypes-phase3-reports.md`. Full detail + gotchas live in the
`chat-subtypes-phase3-reports` memory.

## ▶ NEXT — Phase 4 (effect subtype + delete the legacy render path) — THE FINAL chat-subtypes phase

After Phase 4 the **entire** chat system is subtype-self-rendering and the legacy `flags.titan`
hook/shell are gone. Phase 4 is small — only the `effect` type remains on the legacy path. It is
**not specced yet**: run the normal **brainstorm → spec → plan → subagent execution** flow (the user
expects this rhythm and approves the spec before planning). Reuse the proven Phase 2/3 pattern.

**Scope (from the Phase 1 roadmap + Phase 3's deferred-cleanup list):**
1. Add the single **`effect`** subtype: `EffectChatMessageDataModel` (extend `TitanChatMessageDataModel`;
   colocate with the existing `src/document/types/active-effect/chat-message/EffectChatMessage.svelte`).
   Type its `system` from a shape via `buildSchemaFromShape` + a golden-master entry; apply the Phase-3
   typing convention (nullable `ObjectField` for presence-guarded objects; explicit `ArrayField`+`?.length`
   for arrays). Register the `effect` key in `OnceInit.js` `CONFIG.ChatMessage.dataModels` + `system.json`
   `documentTypes.ChatMessage` + `lang/en.json` `TYPES.ChatMessage`.
2. **Migrate the effect producer** to emit `{type:'effect', system}` instead of `flags.titan`
   (RESEARCH FIRST: grep how effect cards are created — likely a `sendToChat` on `TitanActiveEffect`,
   triggered by the effect sheet's "Send to Chat" header button, `ActiveEffectSheetHeaderButtons.svelte`).
   Sweep `EffectChatMessage.svelte` (+ any effect-card subcomponents) `flags.titan.X → system.X`.
3. **DELETE the legacy path entirely:** remove `src/hooks/OnRenderChatMessageHTML.js` AND its
   `Hooks.on('renderChatMessageHTML', …)` registration (grep for where it's wired — a hooks index/register
   file), AND `src/document/types/chat-message/ChatMessageShell.svelte`. ChatMessageShell currently still
   maps checks/items/reports — all now-unreachable dead entries that vanish with the file. Confirm via grep
   that nothing else imports either. The `OnPreDeleteChatMessage` teardown already keys on
   `svelteComponent?.handle`, so it stays correct after the hook is gone.
4. Tests: golden-master entry for `effect`; an e2e that sends an effect to chat and asserts
   `message.type === 'effect'` + the card renders (+ any rollable embedded check still works).
5. Docs/skill: mark Phase 4 / the whole chat-subtypes effort DONE in `docs/TODO.md`; clear the now-resolved
   cleanup notes (ChatMessageShell dead entries); update the `titan-codebase` skill so the chat section
   states ALL chat messages self-render (no legacy hook remains).

## Gotchas (confirmed in Phase 3 — apply to Phase 4)
- e2e RUN is world-launch-gated AND needs a **server RESTART** after any `documentTypes` manifest change
  (browser refresh insufficient — `game.documentTypes.ChatMessage` is baked at world load; a stale world
  rejects `ChatMessage.create({type:'effect'})` as an invalid type). The USER must relaunch; ask for it.
- Unit runner is **`npm test`** (there is NO `test:unit` script); filter positionally, e.g.
  `npm test -- <pattern>`. e2e: `npm run test:e2e` (full ~12 min — run in background;
  `npm run test:e2e -- <pattern>` for a subset). Always `npm run build` before e2e (needs current `dist/`).
- Golden-master harness: Mock fields installed in `beforeAll` + dynamic import + static
  `_defineDocumentSchema()` (match `tests/unit/ItemDataModelSchemaEquivalence.test.js` /
  `ReportChatMessageSchemaEquivalence.test.js`; golden literals hand-authored, not derived).
- **Grep-clean is the sweep-completeness gate** — for Phase 4, `git grep -n "flags\.titan" -- src` should
  end at ZERO (the `effect` path is the last `flags.titan` user; in Phase 3 grep caught 7 report-only
  components a hand-list missed). Note `EffectChatMessage` may share subcomponents with the effect HUD /
  effect sheet — verify each swept component is chat-card-only before sweeping (Phase 3 lesson).
- Resume a finished subagent with its context via `SendMessage` to its `agentId` (used for review-fix loops).

## Rules (CLAUDE.md, non-negotiable)
No test/e2e code in shipping builds; test/e2e → `test/build/` (self-cleaning); no dynamic imports in
shipping; no stub fixes (fix the root cause); todos → `docs/TODO.md`, bugs → `docs/OPEN_BUGS.md`; project
`.claude/CLAUDE.md` supersedes all; route `.js`/`.svelte` to `titan-svelte-dev` (load `svelte-5`,
`foundry-vtt`, `foundry-svelte`); update the `titan-codebase` skill after each spec. **`git add` explicit
paths only — NEVER stage `packs/`, `.claude/settings.local.json`, or `.claude/scheduled_tasks.lock`** (the
last is harness scaffolding; `packs/` is runtime LevelDB churn from the live world). e2e world is `:30000`;
test source = `tests/` (plural), built artifacts = `test/build/` (singular, gitignored); `dist/` is the
shipping bundle (gitignored).

## Repo state at handoff
- Branch `main` @ `8a19c5c0`, clean of pending source/doc work. Working tree shows only the three
  non-yours runtime/harness files above.
- Open follow-ups in `docs/TODO.md`: Phase 4 (above); #13 (`effectsExpiredReport` e2e trigger deferred —
  its schema IS golden-mastered, only the intricate `onInitiativeAdvanced` combat e2e setup is deferred);
  NPC `overkillDamage` written-but-never-read dead data (`NPCDataModel.js:47`); the ChatMessageShell
  dead-entries note (resolved by Phase 4 deleting the file).
