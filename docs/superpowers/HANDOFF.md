# Session Handoff — 2026-06-04 (prepare-for-clear)

Resume point after a context `/clear`. Read this, then the referenced docs + the auto-loaded memory.

## ✅ Shipped this session (merged to `main`, pushed; `main` @ `bd631730`)

1. **E2E speedup Phase 2 — shared-world harness (`docs/TODO.md` #15) — DONE** (`99efdfad`). All 42 eligible
   e2e specs migrated to a module-scoped shared `page` (one world boot per FILE). Full suite **358 → 365**
   later; ~34 min → ~15 min; socket-sync flake (`OPEN_BUGS.md` #1) closed. `tests/e2e/world.js` helpers
   (`closeAllApps`/`clearChat`/`attachPageErrors`); `closeAllApps` MUST skip `CONFIG.ui` singletons.
2. **Chat-message subtypes Phase 2 — item cards — DONE** (merged through `bd631730`). Item chat cards are
   first-class `ChatMessage` subtypes; `message.system` snapshots `item.system` so cards read
   `document.data.system.X` exactly as item sheets (path parity → component reuse). Built on a new
   **`buildSchemaFromShape`** helper + shared per-type item-system templates. Hierarchy:
   `TitanChatMessageDataModel` → `ItemChatMessageDataModel` → 7 leaves; checks reparented
   (attack/casting/item `extends AttributeCheckChatMessageDataModel`; resistance separate). Verified: unit
   115, e2e **365** (new `tests/e2e/item-cards.spec.js` ×7), build clean, live probe.
   **INVARIANT learned (review-caught bug, fixed):** any system field a chat card reads must be returned by
   `getRollData()` (the snapshot source) or it falls back to the schema initial and the card hides it.

## ⏳ IN FLIGHT — follow-up B (branch `feat/chat-message-subtypes-phase2-item-dm-templates`, 2 commits off `main`)

**Goal:** make the 7 *item* DataModels build their schema from the SAME shared templates the chat DMs use
(single source of truth — item schema + chat template can't drift). **Component reuse is ALREADY shipped
via path parity; B is the maintainability/drift-removal layer. DATA-INTEGRITY SENSITIVE — it changes the
schemas of real actor/item data.**

- **Step 1 DONE** (`cc826168` + skill note `f8f5561f`): `buildSchemaFromShape` now maps a whole-number
  value → `createIntegerField` (via `Number.isInteger`), else `createNumberField`. Unit + build + item-cards
  e2e green; merged chat side unaffected (item snapshot numbers are integers).
- **Why B is now clean (key finding):** a grep proved the item DM schemas use ONLY
  `createStringField` (zero `choices`), `createIntegerField` (every item number is an integer — no
  `createNumberField`), `createBooleanField`, `createArrayField`, `createObjectField`, `createSchemaField`
  — NO `choices`/`min`/`max`/`nullable`/`required:false`. `buildSchemaFromShape` composes those same
  helpers, so with the Step-1 integer fix it produces item-schema-equivalent fields **by construction**.
- **Step 2 — REMAINING: adjust the shared templates.** Dynamic/heterogeneous arrays — `rulesElement`
  (genuinely varies by operation), and likely `check`/`customTrait`/`trait`/`attack`/`aspect`/`customAspect`
  — must be **empty `[]`** in the templates so the empty-array fallback yields untyped
  `ArrayField(ObjectField)` (matching the current item DMs). Fixed-shape nested objects (`armor {max,value}`,
  `castingCheck`) keep representative values → typed `SchemaField`. Templates live at
  `src/document/types/item/ItemSystemTemplate.js`, `src/document/types/item/rules-element/RulesElementTemplate.js`,
  and `src/document/types/item/types/<type>/<Type>SystemTemplate.js`. This ALSO changes the chat DM schemas
  (same templates) — harmless (`ObjectField` accepts the snapshot; cards read `system.X`) but **re-verify
  chat** (`item-cards.spec.js`).
- **Step 3 — REMAINING: refactor the item DM hierarchy** (`TitanItemDataModel` base,
  `RulesElementItemDataModel`, the 7 `<Type>DataModel`) so each `_defineDocumentSchema()` returns
  `{ ...super._defineDocumentSchema(), ...buildSchemaFromShape(<its template fragment>) }` (mirror the chat
  DM composition). **Keep all derived-data methods/logic untouched — only schema definition changes.**
- **GATE before merge (non-negotiable, real data):** per-type **schema-equivalence unit tests** (capture
  each current schema's field set + field types + key configs FIRST, then assert the refactored schema
  matches EXACTLY — esp. `integer:true` on every numeric, untyped `ObjectField` on dynamic arrays); plus
  item-sheet e2e (`render-smoke`, `reactive-ability`/`-armor-shield`/`-weapon`/`-spell`/`-inventory-basic`,
  `traits`, `trait-add-custom`, `rules-element-crud`) + chat re-verify (`item-cards`) + the full suite.
- **World note:** changing item DOC schemas likely needs a **world RELAUNCH** (not just `npm run build`) for
  the server to use the new schema — coordinate with the user (e2e is launch-gated; `/join` "Critical
  Failure!" = world not launched).

## ⏳ PENDING — follow-up D, then Phases 3–4

- **(D) Build the check chat schemas from the check template objects** via `buildSchemaFromShape` (the
  reparenting is already merged at `a12efb50`). Investigate whether explicit check parameter/result template
  objects exist or shapes need a runtime capture; **preserve check component read paths**
  (`system.parameters.X`/`system.results.X`); the point is that resistance's shape genuinely diverges from
  the attribute-shaped checks. Verify unit + check e2e (`interaction-rolls`, `checks-*`). Lower risk than B
  (chat-message schemas are ephemeral, not real document data).
- **Phase 3 (reports ×13)** and **Phase 4 (effect + delete the legacy `OnRenderChatMessageHTML` mount +
  `ChatMessageShell.svelte` switch)** — not yet specced. Reuse the proven item pattern.

## How to resume
1. `git checkout feat/chat-message-subtypes-phase2-item-dm-templates` (it's 2 commits off `main`).
2. Load skills: `foundry-vtt`, `titan-codebase`, `svelte-5`, `foundry-svelte`, `foundry-data-models`.
   Route `.js`/`.svelte` edits through the `titan-svelte-dev` subagent (project rule).
3. Do B Step 2 → Step 3 → gate (schema-equivalence + item-sheet e2e + full suite, with a world relaunch) →
   merge to `main`. Then D. Then spec Phase 3/4.
- Spec/plan: `specs/2026-06-04-chat-message-subtypes-phase2-items-design.md` (RESOLVED DESIGN v2),
  `plans/2026-06-04-chat-message-subtypes-phase2-items.md`. Backlog: `docs/TODO.md` (chat subtypes section).

## Rules (CLAUDE.md, non-negotiable)
No test/e2e code in shipping builds; test/e2e → `test/build/` self-cleaning; no dynamic imports in shipping;
no stub fixes (fix root cause); todos → `docs/TODO.md`, bugs → `docs/OPEN_BUGS.md`; project `.claude/CLAUDE.md`
supersedes all; route `.js`/`.svelte` to `titan-svelte-dev`. **NEVER `git add packs/`** (live-world LevelDB
churn — stage explicit paths only). e2e is **world-launch-gated** (`:30000`); test source = `tests/` (plural),
built artifacts = `test/build/` (singular, gitignored).
