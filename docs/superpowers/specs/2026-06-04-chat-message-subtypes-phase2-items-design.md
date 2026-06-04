# Chat Message Subtypes — Phase 2 (Item Cards)

- **Date:** 2026-06-04
- **Status:** **DRAFT — awaiting user approval.** Two open decisions (D1, D2) need a yes/no; the
  implementation + final verification are **Foundry-restart-gated** (see "Verification & the restart
  gate"). Authored autonomously overnight after e2e Phase 2 shipped; not yet implemented.
- **Parent:** `docs/superpowers/specs/2026-06-03-chat-message-subtypes-phase1-design.md` (Phase 1 =
  checks, SHIPPED). This is Phase 2 of that roadmap ("Item cards — `ItemChatMessageDataModel` + 7
  leaves; migrate the item-to-chat producer; sweep item chat components").
- **TODO:** `docs/TODO.md` #12 area (chat-message subtypes). Deep schema-from-shape path parity is the
  separate backlog item that depends on this conversion finishing.

## Context — the proven Phase 1 pattern (verified against shipped code)

Phase 1 introduced first-class `ChatMessage` subtypes for the 5 checks. The shipped shape:

- **`src/document/types/chat-message/ChatMessage.js`** (`TitanChatMessage`, the document class) owns the
  render seam: `async renderHTML(options)` calls `super.renderHTML(options)` for the standard card
  chrome, then `mount(ChatMessageContent, { target: …, props: { documentStore: bridge } })` where
  `bridge` is a `ReactiveDocument`, storing `this._svelteComponent = { handle, bridge }` and tearing the
  prior mount down first. **This is shared infra — Phase 2 does NOT touch it.**
- **`src/document/types/chat-message/ChatMessageContent.svelte`** reads
  `document.data.system.component` (and falls back to a private-roll component when blind) and renders it.
- **`src/document/types/chat-message/ChatMessageDataModel.js`** (`TitanChatMessageDataModel extends
  TitanDataModel`) is tiny: just a `get component()` getter that throws unless a leaf overrides it.
- **`src/check/chat-message/CheckChatMessageDataModel.js`** (family base) overrides
  `static _defineDocumentSchema()` to add fields via the `create*Field` helpers
  (`createObjectField`/`createBooleanField`/`createArrayField`/`createStringField` from
  `~/helpers/utility-functions/`).
- **Leaves** (e.g. `AttributeCheckChatMessageDataModel`) are thin: just `get component()` returning the
  `.svelte`.
- **Registration:** `system.json` `documentTypes.ChatMessage` lists the 5 check keys; `OnceInit.js` sets
  `CONFIG.ChatMessage.dataModels = { attributeCheck: …, … }`; `lang/en.json` `TYPES.ChatMessage` carries
  the 5 labels.
- **Coexistence:** `src/hooks/OnRenderChatMessageHTML.js` keeps a `TITAN_CHAT_MESSAGE_TYPES` set + an
  `instanceof TitanChatMessageDataModel` guard so unmigrated families (items, reports, effect) still
  render via the old hook+`ChatMessageShell.svelte` switch, while subtyped messages self-render. No
  double-mount.

**Phase 2 mirrors this exactly for items.** No new infrastructure; only an `ItemChatMessageDataModel`
family + 7 leaves + the producer change + the component sweep + registration.

## The 7 item leaf types and their components

| key | leaf component | type-specific stats component |
|---|---|---|
| `weapon` | `WeaponChatMessage.svelte` | `WeaponChatStats.svelte` (+ `WeaponChatAttacks`, `WeaponChatAttackDescription`) |
| `armor` | `ArmorChatMessage.svelte` | `ArmorChatStats.svelte` |
| `spell` | `SpellChatMessage.svelte` | `SpellChatStats.svelte` (+ `SpellChatAspects`) |
| `ability` | `AbilityChatMesssage.svelte` (note: existing filename typo, 3 s's) | `AbilityChatStats.svelte` |
| `shield` | `ShieldChatMessage.svelte` | `ShieldChatStats.svelte` |
| `equipment` | `EquipmentChatMessage.svelte` | `EquipmentChatStats.svelte` |
| `commodity` | `CommodityChatMessage.svelte` | `CommodityChatStats.svelte` |

Shared item-chat components (under `src/document/types/item/chat-message/`):
`ItemChatMessageShell.svelte`, `ItemChatLabel.svelte`, `ItemChatMessageItemChecks.svelte`,
`ItemChatRarity.svelte`, `ItemChatValue.svelte`, `ItemChatTraits.svelte`, `ItemChatTradition.svelte`.

## Producer (today)

`src/document/types/item/TitanItem.js` `sendToChat()`:

```js
const messageData = this.getRollData();          // → this.system.getRollData()
return ChatMessage.create(ChatMessage.applyRollMode({
   user, speaker, style: CONST.CHAT_MESSAGE_STYLES.OTHER, sound,
   flags: { titan: messageData },                // ← the payload lives in flags.titan
   classes: ['titan'],
}, game.settings.get('core', 'rollMode')));
```

`getRollData()` is layered: `TitanDataModel.getRollData()` → `{ id, name, img, type }`;
`TitanItemDataModel.getRollData()` adds `check`, `customTrait`; each leaf adds its fields (weapon:
`rarity`, `value`, `equipped`, `attack`, `attackNotes`, `trait`; armor: `rarity`, `value`, `armor`,
`trait`; etc.). **There is NO `system` key in this payload.**

## ⚠ Critical finding — the current item cards have inconsistent / dead reads (runtime-confirmed)

**Confirmed by a runtime capture of `item.system.getRollData()` for all 7 types (`hasSystemKey: false`
for every type — see appendix).** The component sweep is NOT a clean 1:1 rename, because the current
reads are inconsistent:

- Some components read the payload's **top-level** keys (these work): e.g. `WeaponChatStats` reads
  `item.rarity` / `item.value` where `item = document.data.flags.titan`; `WeaponChatMessage` reads
  `item.attackNotes` / `item.description` / `item.check`.
- But `ItemChatValue.svelte` reads `document.data.flags.titan.system.value`, `ItemChatRarity` reads
  `…flags.titan.system.rarity`, `ItemChatTraits` reads `…flags.titan.system.traits`, `ItemChatTradition`
  reads `…flags.titan.system.tradition`. **`flags.titan` has no `system` key**, so these resolve to
  `undefined` (and `…system.value` would throw if the component is mounted). They are **dead or
  latent-broken** today.
- Several leaf messages also mix `item.X` (top-level snapshot) with `item.system.X` (e.g.
  `ArmorChatMessage` reads `item.system.description` / `item.system.check`) — same dead-`system` issue.

**This must be resolved by the two open decisions below, and confirmed by running the cards in a live
world (e2e) — which needs a Foundry restart.**

## Open decisions (need user approval before implementation)

### D1 — Typing policy for the item `system` payload

- **Option A (RECOMMENDED): typed flat schema.** Define `ItemChatMessageDataModel` + per-leaf schemas
  with real fields (`description`, `check` array, `customTrait` array, plus per-type `rarity`, `value`,
  `equipped`, `attack`, `attackNotes`, `trait`, `armor`, `aspect`, `tradition`, …) typed via the
  `create*Field` helpers. The producer writes `system: <flat snapshot>`. Components read flat
  `document.data.system.X`. This is the **Phase 1 spec's stated direction for item snapshots** ("type the
  flat, component-read fields") and it lets us fix the dead reads (D2) cleanly.
- **Option B: ObjectField passthrough (faithful, lower-effort).** Store the whole `getRollData()` blob in
  one or two `ObjectField`s (mirroring how checks used `parameters`/`results`), components read
  `document.data.system.<blob>.X`. Faster but preserves the messy/dead-read shape and defers all cleanup.
- **Recommendation: Option A.** Deep *schema-from-shape* path parity (backlog #12) stays out of scope; A
  is the pragmatic middle — typed flat fields the components actually read, fixing the dead reads, without
  the full helper-driven shape unification.

### D2 — The dead `flags.titan.system.X` reads (ItemChatValue/Rarity/Traits/Tradition + mixed leaves)

- **Option A (RECOMMENDED): fix them.** Sweep these to flat `document.data.system.X` (e.g.
  `system.value`, `system.rarity`, `system.traits`, `system.tradition`) and ensure the producer's payload
  includes those fields. This repairs cards that are currently broken/blank for those fields. **Verify in
  a live world (e2e) that these fields now render.**
- **Option B: preserve the brokenness** (rename to the equally-undefined `system.system.X`) and log it as
  a separate bug. Not recommended — we are already touching every one of these files.
- **Recommendation: Option A**, gated on confirming via e2e (post-restart) that the repaired fields
  render with real data. If a field turns out to be intentionally unused, drop the component instead.

## Architecture (assuming D1=A, D2=A)

### DataModel hierarchy (target)

```
TitanChatMessageDataModel                     (existing base: get component() contract)
└─ ItemChatMessageDataModel                   (NEW family base: flat item snapshot schema)
   ├─ WeaponChatMessageDataModel              (get component(); + weapon fields: attack, attackNotes, …)
   ├─ ArmorChatMessageDataModel               (+ armor fields)
   ├─ SpellChatMessageDataModel               (+ aspect/tradition/casting fields)
   ├─ AbilityChatMessageDataModel
   ├─ ShieldChatMessageDataModel
   ├─ EquipmentChatMessageDataModel
   └─ CommodityChatMessageDataModel
```

`ItemChatMessageDataModel._defineDocumentSchema()` adds the common item-snapshot fields (`id`, `name`,
`img`, `type` — note these mirror `TitanDataModel.getRollData()`; `description`, `check`, `customTrait`).
Each leaf adds its type-specific fields. Exact per-leaf field lists are derived from each
`<Type>DataModel.getRollData()` + every read path in that type's chat components — **the implementation
plan enumerates them per type after a runtime capture of `getRollData()` output (recipe below).**

### File inventory

**New (8 datamodels):**
- `src/document/types/item/chat-message/ItemChatMessageDataModel.js` (family base)
- `src/document/types/item/types/{weapon,armor,spell,ability,shield,equipment,commodity}/chat-message/<Type>ChatMessageDataModel.js`

**Modified — producer:**
- `src/document/types/item/TitanItem.js` — `sendToChat()` writes `{ type: this.type, system: <snapshot> }`
  instead of `{ flags: { titan: getRollData() } }`. **Refactor:** extract a pure
  `buildChatMessageData()` (returns `{ type, system }`) so it is unit-testable without `ChatMessage.create`.

**Modified — component sweep (~22 files):** every item chat `.svelte` under
`src/document/types/item/chat-message/` and `src/document/types/item/types/*/chat-message/` changes
`document.data.flags.titan.X` (and the dead `…flags.titan.system.X`) → `document.data.system.X` (flat),
per D1/D2. The plan lists each file + its exact path changes.

**Modified — registration/config:**
- `system.json` — add the 7 item keys to `documentTypes.ChatMessage`.
- `src/hooks/OnceInit.js` — import the 7 datamodels, add them to `CONFIG.ChatMessage.dataModels`.
- `lang/en.json` — add 7 labels to `TYPES.ChatMessage`.
- `src/hooks/OnRenderChatMessageHTML.js` — **remove the 7 item keys** from `TITAN_CHAT_MESSAGE_TYPES`
  (so the old hook no longer claims them) — the `instanceof` guard already prevents double-mount, but the
  item keys should stop being in the legacy set now that they self-render. Leave the report/effect keys.
- `ChatMessageShell.svelte` — leave the item cases in the legacy switch until Phase 4 cleanup (harmless;
  the hook no longer routes items to it). (Confirm during implementation that no path still hits them.)

### Coexistence

Identical to Phase 1: new item messages carry `type` + `system` and self-render; they have no
`flags.titan`, so the old hook skips them (and the `instanceof` guard is belt-and-suspenders). Reports
and effect remain on the old hook until their phases. No interim blank cards for actively-created
messages **once the world is restarted** (see gate).

## Verification & the restart gate (READ THIS)

- **Foundry-restart-gated:** `documentTypes` manifest changes register only at world load. The live world
  the e2e suite drives has the OLD manifest until **you restart Foundry**. So the full
  "create a `type:'weapon'` ChatMessage → `system` is a `WeaponChatMessageDataModel` → self-renders"
  path **cannot be verified by the agent overnight.** It must be verified after a restart.
- **What CAN be verified without a restart (agent-side, next implementation session):**
  - **Unit (Vitest):** the extracted `buildChatMessageData()` returns `{ type, system }` with the right
    shape per item type; each leaf datamodel's `get component()` resolves; the family schema round-trips a
    representative snapshot.
  - **Component-probe e2e:** the item chat components mount with a provided `document` context exposing
    the new flat `system.X` and render the expected text — the probe rebuilds `src` into a fresh IIFE each
    run, so it tests the NEW components without a world restart.
  - **Build:** `npm run build` clean (single chunk, probe-free, no dynamic imports — Strict Rules 1–4).
- **Runtime capture recipe (resolve the per-leaf schema precisely):** in the live world console (or a
  throwaway probe snippet), for one item of each type run `item.system.getRollData()` and record the exact
  keys. The plan's per-leaf field lists are finalized from this capture, eliminating the payload-shape
  ambiguity this spec flagged.
- **Post-restart e2e (user-run, gates the merge):** roll each of the 7 item types to chat; assert
  `message.type === '<leaf>'`, the card renders, the repaired D2 fields show real values, and item-check
  buttons (`ItemChatMessageItemChecks`) still roll/spend-resolve. A new
  `tests/e2e/item-cards.spec.js` (or an extension of an existing item e2e) provides this.

## Test plan

- **Unit:** `buildChatMessageData()` per type; leaf `component` getters; family schema round-trip.
- **Component-probe e2e:** each of the 7 leaf cards + the shared components render with the flat `system`
  context (no restart needed).
- **Post-restart e2e (user):** the 7-type roll-to-chat self-render path + button interactions.
- Full unit + e2e green before merge.

## Risks & mitigations

- **Restart gate** (above) — merge only after the user's post-restart e2e passes. Land on a branch.
- **Dead-read repair (D2)** could surface that some fields were never wired — confirm with e2e; drop truly
  unused components rather than inventing data.
- **Per-leaf fidelity** — finalize field lists from the runtime `getRollData()` capture, not from reading
  alone (this spec proved reading-alone is ambiguous).
- **Re-render/notification double-mount** — pre-existing (TODO #10), shared with Phase 1; not regressed.

## Appendix — captured `getRollData()` shapes (authoritative schema source)

Captured at runtime against the live world (2026-06-04). These are the **top-level keys the producer
actually emits** today (the new `system` payload mirrors them; the dead `…system.X` reads map onto these
flat keys). `hasSystemKey: false` for **all 7 types** — confirming the dead-read finding. Common base
(every type): `id`(string), `name`(string), `img`(string), `type`(string), `check`(array),
`customTrait`(array). Per-type additions:

- **weapon:** `rulesElement`(array), `rarity`(string), `value`(number), `equipped`(bool),
  `attack`(array), `attackNotes`(string), `trait`(array)
- **armor:** `rulesElement`(array), `rarity`(string), `value`(number), `armor`(object), `trait`(array)
- **spell:** `xpCost`(number), `tradition`(string), `castingCheck`(object), `quantity`(number),
  `aspect`(array), `customAspect`(array), `rarity`(string)  — *no `rulesElement`*
- **ability:** `rulesElement`(array), `xpCost`(number), `rarity`(string), `action`(bool),
  `reaction`(bool), `passive`(bool)
- **shield:** `rulesElement`(array), `rarity`(string), `value`(number), `defense`(number), `trait`(array)
- **equipment:** `rulesElement`(array), `rarity`(string), `value`(number), `equipped`(bool)
- **commodity:** `rarity`(string), `value`(number), `quantity`(number)  — *no `rulesElement`*

Dead-read repair map (D2=A): `ItemChatValue` `system.value`→`system.value`✓; `ItemChatRarity`
`system.rarity`→`system.rarity`✓; `ItemChatTradition` `system.tradition`→`system.tradition`✓ (spell only);
`ItemChatTraits` reads `system.traits` which **does not exist** — map to `trait`/`customTrait` (verify
intended source via e2e, or drop the component if unused). Mixed leaves (armor/shield/equipment/commodity
reading `item.system.description`/`item.system.check`) → flat `system.description`/`system.check`.

## Out of scope

- Phase 3 (reports ×13) and Phase 4 (effect + delete the old hook/`ChatMessageShell.svelte`).
- Deep schema-from-shape path parity (backlog #12) — depends on this conversion finishing.
- Any change to `ChatMessage.js` render infra.
