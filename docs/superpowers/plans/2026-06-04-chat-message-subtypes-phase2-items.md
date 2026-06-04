# Chat Message Subtypes — Phase 2 (Item Cards) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Route all
> `.js`/`.svelte` edits through the `titan-svelte-dev` subagent; load `svelte-5`, `foundry-vtt`,
> `foundry-svelte`, `foundry-data-models`, `titan-codebase`. Steps use checkbox (`- [ ]`) tracking.

**Goal:** Convert the 7 item chat cards (weapon/armor/spell/ability/shield/equipment/commodity) to
first-class `ChatMessage` subtypes carrying a typed `system` payload that self-renders, mirroring the
shipped Phase 1 (checks) pattern — and repair the pre-existing dead `flags.titan.system.X` reads.

**Architecture:** `ItemChatMessageDataModel extends TitanChatMessageDataModel` (family base, typed flat
schema) + 7 thin leaves (`get component()`). Producer `TitanItem.sendToChat()` writes `{ type, system }`
instead of `{ flags: { titan } }`. ~22 item chat `.svelte` components sweep `document.data.flags.titan.X`
→ `document.data.system.X`. Register in `system.json` / `OnceInit.js` / `lang/en.json`. Render infra
(`ChatMessage.js`) is untouched shared Phase-1 code.

**Spec:** `docs/superpowers/specs/2026-06-04-chat-message-subtypes-phase2-items-design.md` (READ IT —
captured `getRollData()` shapes are the authoritative schema source; D1=typed-flat, D2=fix-dead-reads are
the assumed-approved decisions this plan executes).

---

## ⚠ Status & the restart gate (read before starting)

- **DESIGN UPDATED (2026-06-04, user decision = PATH PARITY).** Supersedes the "typed-flat + flatten"
  assumption below. See the spec's "RESOLVED DESIGN". In short: **`message.system` mirrors `item.system`**
  (the chat subtype schema mirrors the item data model's system schema + `name`/`img` metadata; the
  producer snapshots `item.system` into `message.system`), and **every component read becomes
  `document.data.system.X`** (= the item's `system.X` path) — both the current top-level `flags.titan.X`
  reads and the dead `flags.titan.system.X` reads converge there. This enables item-sheet/chat-card
  component reuse (#12 north-star). Task details below are reframed by this: Task 1 schema = mirror item
  system; Task 2 producer = snapshot `item.system`; Task 3 sweep = ALL item reads → `document.data.system.X`.
- **DECISIONS (resolved):** path parity (above). The original D1/D2 framing in the spec is moot.
- **Land on a branch** `feat/chat-message-subtypes-phase2-items`. **Do NOT merge to main** until the
  user has restarted Foundry and the post-restart e2e (Task 7) passes.
- **Agent-verifiable now (no restart):** unit tests (datamodels + producer builder), component-probe e2e
  (cards render with flat `system` context — the probe rebuilds `src` fresh each run), `npm run build`.
- **Restart-gated (user):** the full "create `type:'weapon'` ChatMessage → `system` is the datamodel →
  self-renders" path. `documentTypes` registers only at world load.
- **Strict Rules:** no test/e2e code in shipping build; no dynamic imports; no stub fixes; build is
  probe-free single-chunk. Stage only touched paths — never `packs/`.

---

## Task 1: `ItemChatMessageDataModel` family base + 7 leaves

**Files:** Create `src/document/types/item/chat-message/ItemChatMessageDataModel.js` and
`src/document/types/item/types/<type>/chat-message/<Type>ChatMessageDataModel.js` (7).

- [ ] Family base — `_defineDocumentSchema()` adds the common snapshot fields (mirroring the captured
  base shape): `id`, `name`, `img`, `type` (string fields), `description` (string), `check` (array of
  object), `customTrait` (array of object). Use the `create*Field` helpers (see
  `CheckChatMessageDataModel.js` for the exact import style).
- [ ] Each leaf `extends ItemChatMessageDataModel`, adds its type-specific fields per the spec appendix
  (weapon: `rulesElement`,`rarity`,`value`,`equipped`,`attack`,`attackNotes`,`trait`; armor:
  `rulesElement`,`rarity`,`value`,`armor`,`trait`; spell:
  `xpCost`,`tradition`,`castingCheck`,`quantity`,`aspect`,`customAspect`,`rarity`; ability:
  `rulesElement`,`xpCost`,`rarity`,`action`,`reaction`,`passive`; shield:
  `rulesElement`,`rarity`,`value`,`defense`,`trait`; equipment:
  `rulesElement`,`rarity`,`value`,`equipped`; commodity: `rarity`,`value`,`quantity`). Use `ObjectField`
  for complex values (`armor`, `castingCheck`, `attack` entries, `trait`/`check`/`customTrait` entries).
  Each leaf overrides `get component()` to return its existing `.svelte`.
- [ ] **Confirm against runtime, not just the appendix:** re-capture `item.system.getRollData()` per type
  (recipe in spec) if any field is uncertain; the schema must accept every key the producer emits.
- [ ] Unit test (`tests/unit/ItemChatMessageDataModel.test.js`): family schema round-trips a weapon
  snapshot; each leaf `get component()` resolves to the expected `.svelte`.
- [ ] `npm test` green. Commit.

## Task 2: Producer — `TitanItem.sendToChat()` → `{ type, system }` (testable builder)

**Files:** `src/document/types/item/TitanItem.js`; test `tests/unit/BuildItemChatMessageData.test.js`.

- [ ] Extract a pure method/helper `buildChatMessageData()` returning `{ type: this.type, system:
  this.getRollData() }` (the snapshot keyed for the subtype). `sendToChat()` calls it and passes the
  result to `ChatMessage.create(ChatMessage.applyRollMode({ user, speaker, style, sound, type, system,
  classes: ['titan'] }, rollMode))` — note: `type`/`system` REPLACE `flags: { titan }`.
- [ ] Unit-test `buildChatMessageData()` returns the right `type` and a `system` object containing the
  expected keys for each item type (mock the item/system minimally).
- [ ] `npm test` green. Commit.

## Task 3: Component sweep — `flags.titan.X` → `system.X` (+ dead-read repair)

**Files:** all item chat `.svelte` under `src/document/types/item/chat-message/` and
`src/document/types/item/types/*/chat-message/` (~22). See the spec's file inventory + dead-read map.

- [ ] Replace every `document.data.flags.titan` (and aliases like `item = …flags.titan`) with
  `document.data.system`. Flatten the dead `…flags.titan.system.X` reads to flat `system.X` per the spec
  appendix map (`value`/`rarity`/`tradition` map 1:1; `ItemChatTraits`'s nonexistent `system.traits` →
  `trait`/`customTrait` — VERIFY which via the post-restart e2e, or drop the component if unused).
- [ ] Grep proof: zero `flags.titan` and zero `flags?.titan` remain in item chat components.
- [ ] Component-probe e2e (`tests/e2e/component-probe-*.spec.js` or a new item-card probe spec): mount
  each leaf card + shared components with a `document` context exposing the flat `system` snapshot; assert
  expected text renders. (Probe rebuilds `src` fresh — no restart needed.) Run green.
- [ ] Commit.

## Task 4: Registration — system.json + OnceInit + lang

**Files:** `system.json`, `src/hooks/OnceInit.js`, `lang/en.json`.

- [ ] `system.json` `documentTypes.ChatMessage`: add `weapon`,`armor`,`spell`,`ability`,`shield`,
  `equipment`,`commodity` (`{}` each), beside the 5 check keys.
- [ ] `OnceInit.js`: import the 7 datamodels; add them to `CONFIG.ChatMessage.dataModels`.
- [ ] `lang/en.json` `TYPES.ChatMessage`: add 7 labels (Weapon, Armor, Spell, Ability, Shield,
  Equipment, Commodity).
- [ ] Commit.

## Task 5: Coexistence cleanup in the legacy hook

**Files:** `src/hooks/OnRenderChatMessageHTML.js`.

- [ ] Remove the 7 item keys from `TITAN_CHAT_MESSAGE_TYPES` (items now self-render; the `instanceof
  TitanChatMessageDataModel` guard already prevents double-mount). Leave report + effect keys. Confirm no
  remaining path routes item messages to `ChatMessageShell.svelte` (leave the switch's item cases until
  Phase 4 cleanup — they become unreachable, harmless).
- [ ] Commit.

## Task 6: Build + unit verification (agent-side gate)

- [ ] `npm test` → all unit green (incl. new Task 1/2 tests).
- [ ] `npm run build` → clean, single chunk, probe-free (`git grep`/bundle grep proof), no dynamic
  imports (Strict Rules 1–4).
- [ ] Commit any fixups.

## Task 7: Post-restart e2e (USER-GATED — do not merge before this passes)

**Files:** `tests/e2e/item-cards.spec.js` (new) or extend an existing item e2e.

- [ ] Write an e2e: for each of the 7 item types, `item.sendToChat()`; assert the newest message
  `type === '<leaf>'`, the card content renders, the repaired D2 fields (value/rarity/tradition/traits)
  show real values, and `ItemChatMessageItemChecks` buttons still roll / spend-resolve.
- [ ] **USER STEP:** restart Foundry (registers the 7 `documentTypes`), relaunch the world on `:30000`.
- [ ] Run `npx playwright test tests/e2e/item-cards.spec.js --reporter=line` → green. If a D2 field is
  wrong (e.g. `ItemChatTraits`), fix the mapping and re-run.
- [ ] Full suite `npm run test:e2e` green at parity.
- [ ] Commit; finish the branch (merge to main) via `superpowers:finishing-a-development-branch`.

## Task 8: Docs + skill update

- [ ] `docs/TODO.md`: record Phase 2 DONE; note Phase 3 (reports) / Phase 4 (effect+cleanup) remain.
- [ ] `titan-codebase` `conventions.md` / `abstractions.md`: document the item chat subtypes + the
  `ItemChatMessageDataModel` family (current state).
- [ ] Commit.

---

## Self-review

- **Spec coverage:** family base + 7 leaves (T1) ✓; producer (T2) ✓; component sweep + dead-read repair
  (T3) ✓; registration (T4) ✓; coexistence (T5) ✓; build/unit gate (T6) ✓; restart-gated e2e (T7) ✓;
  docs (T8) ✓.
- **Open decisions** D1/D2 are assumed-approved; the dead-read repair (esp. `ItemChatTraits`) is the one
  spot needing post-restart e2e confirmation, called out in T3 and T7.
- **No placeholders** except the deliberately runtime-confirmed per-leaf field nuances, which T1 resolves
  via re-capture and T7 verifies.
