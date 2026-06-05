# Chat Message Subtypes — Phase 4 (Effect + Legacy Path Deletion)

- **Date:** 2026-06-05
- **Status:** Approved (design); ready for implementation plan
- **Scope:** Phase 4 — the FINAL phase — of the phased chat-message-subtypes refactor
  (`specs/2026-06-03-chat-message-subtypes-phase1-design.md`). Phases 1 (infrastructure + 5 checks),
  2 (7 item cards, + follow-ups B/D), and 3 (13 reports) are shipped. This phase converts the single
  remaining legacy type — **`effect`** — into a first-class Foundry v14 `ChatMessage` subtype and
  **deletes the legacy render path** (`OnRenderChatMessageHTML.js` + `ChatMessageShell.svelte`).
  After this phase, every TITAN chat message self-renders via `TitanChatMessage#renderHTML` and no
  chat payload travels in `flags.titan`.

## Context

Effect chat cards (the "Send to Chat" output of a Titan Active Effect) are today plain
`ChatMessage`s carrying their payload in `flags.titan`, discriminated by `flags.titan.type ===
'effect'`. The producer is `TitanActiveEffect.sendToChat()`
(`src/document/types/active-effect/TitanActiveEffect.js:195`), reachable from the effect sheet
header button, the effect HUD row, the character sheet effect row, and the effect tray. The card
renders through the legacy global hook `src/hooks/OnRenderChatMessageHTML.js` (registered at
`src/index.js:23`), which mounts `ChatMessageShell.svelte` — whose dispatch map now contains 26
dead entries (checks/items/reports, all subtyped in Phases 1–3) plus the one live `effect` entry.

The effect payload is the data model's roll data: `{id, name, img, type, rulesElement, description,
duration, check, customTrait}` (`TitanActiveEffectDataModel.getRollData()`, which appends the native
`description` plus deep clones of `duration`/`check`/`customTrait` to the base + rules-element
fields). The card component `EffectChatMessage.svelte` reads it once
(`const item = document.data.flags.titan`) and feeds it to prop-driven subcomponents
(`ItemChatMessageShell`, `ItemChatMessageItemChecks`, `EffectChatStats`, `RichText`) that already
serve the migrated Phase 2 item cards unchanged.

## Goals

- One `effect` chat-message subtype: `EffectChatMessageDataModel`, colocated with the existing card
  component under `src/document/types/active-effect/chat-message/`.
- **Single source of truth for the effect system shape**: a new `createEffectSystemTemplate()` feeds
  BOTH the live `TitanActiveEffectDataModel` schema (refactored, follow-up-B style) and the chat
  subtype's snapshot schema — completing the codebase-wide shape-template pattern (items B, checks D,
  reports Phase 3).
- Producer emits `{type: 'effect', system}` via a `buildChatMessageData()` mirroring
  `TitanItem.buildChatMessageData()` (`TitanItem.js:46`) — pure, unit-testable, byte-parallel.
- **Delete the legacy render path entirely**: `OnRenderChatMessageHTML.js`, its hook registration in
  `src/index.js`, and `ChatMessageShell.svelte` — with **zero behavior loss** (see Dark-mode
  relocation).
- Regression-free: the effect card renders the same content; its embedded check buttons still roll
  item checks via `requestItemCheck({itemRollData})`.

## Non-goals

- **No backward compatibility for pre-existing effect messages.** Old `flags.titan` effect messages
  render blank after this phase (consistent with Phases 1–3; chat is semi-ephemeral). No world
  migration.
- **No new condition-to-chat feature.** `sendToChat()` is shared by both ActiveEffect subtypes, but
  `ConditionDataModel` has no `duration`/`check`/`customTrait` and no UI surface exposes
  send-to-chat for conditions; today a condition send would crash the card. Under the typed schema
  it would render with field defaults instead (a strictly-better incidental), but no UI is added and
  no condition path is tested beyond unit-level producer tolerance.
- **No re-typing of `changes`.** The v14 ActiveEffect verifier (`Game##verifyActiveEffectModels`)
  requires `changes` to be an `ArrayField` of a typed `SchemaField`; `buildSchemaFromShape` cannot
  express that (object array elements map to untyped `ObjectField`). `changes` stays hand-built in
  both AE data models.
- **No `flags.titan` removal outside the chat path.** Document-flag users survive legitimately:
  `TitanItem._preCreate` (uuid), `Macros.js` (macroType/macroVersion/uuid),
  `CharacterDataModel.js:5160` + `Conditions.js` (condition description flags), and the
  `ConvertEffectItemsToActiveEffects.js` migration comment. The completeness gate is scoped to chat
  produce/render code (see Test plan).

## Key decisions

1. **Full single-source shape (user-approved).** Extract `createEffectSystemTemplate()` →
   `{duration: {type: 'turnStart', remaining: 1, initiative: 1, custom: ''}, check: [],
   customTrait: []}`. Refactor `TitanActiveEffectDataModel._defineDocumentSchema()` to build those
   three fields from the template via `buildSchemaFromShape` (follow-up-B recipe), gated by a
   byte-exact golden master. Known-inert delta: the hand-built `check`/`customTrait` array element
   fields carry an `initial` factory (`createObjectField(() => createItemCheckTemplate())`) that the
   shape-built element (`createObjectField()`) lacks — **ArrayField element initial is inert** (the
   array-level initial governs defaults), confirmed in follow-up B; the golden master omits element
   initial by design, exactly as `ItemDataModelSchemaEquivalence` does.
2. **Chat DM extends `TitanChatMessageDataModel`, NOT `ItemChatMessageDataModel`.** The effect
   snapshot is not an item system; pulling the item base template would add unrelated fields. The
   chat schema is `buildSchemaFromShape({...createEffectSystemTemplate(),
   ...createRulesElementTemplate(), description: '', name: '', img: ''})` — the same
   roll-data-minus-id/type surface the legacy flags payload carried, so the embedded item-check roll
   path (`requestItemCheck({itemRollData: system})`) sees the same fields it sees from item cards.
3. **Producer: hardcoded `type: 'effect'`, not `this.type`.** The legacy producer already forces
   `'effect'` (a condition's `this.type` would be `'condition'` — not a registered chat subtype).
   `buildChatMessageData()` destructures `{id, type, name, img, ...systemData}` off `getRollData()`
   and returns `{type: 'effect', system: {...systemData, name, img}}`. The redundant
   `description: this.description` in today's `sendToChat` drops — the data model's `getRollData()`
   already includes it.
4. **Dark-mode relocation, then hook deletion.** The legacy hook's `else` branch applies
   `titan-dark-mode` to NON-TITAN messages (core rolls, OOC) when the `darkModeChatMessages` setting
   is `'all'` (`OnRenderChatMessageHTML.js:64-68`) — a live feature `TitanChatMessage.renderHTML`
   does not cover. Since `CONFIG.ChatMessage.documentClass = TitanChatMessage`, every message
   already flows through `renderHTML`; the `'all'` branch moves there, before the non-TITAN early
   return. Then the hook file deletes with zero behavior loss.
5. **Teardown unchanged.** `OnPreDeleteChatMessage` calls `message?._teardownComponent?.()`, which
   reads `this._svelteComponent` — the same slot both render paths populate. Correct before and
   after; untouched.

## DataModel & shape inventory

```
TitanDataModel
 ├─ (RulesElementMixin) TitanActiveEffectDataModel     (REFACTORED: duration/check/customTrait from
 │                                                      createEffectSystemTemplate(); changes hand-built)
 └─ TitanChatMessageDataModel
     └─ EffectChatMessageDataModel                     (NEW: shape-built snapshot schema; get component())
```

- `src/document/types/active-effect/EffectSystemTemplate.js` (NEW) — `createEffectSystemTemplate()`,
  plain data only, doc-style mirroring `RulesElementTemplate.js`.
- `src/document/types/active-effect/chat-message/EffectChatMessageDataModel.js` (NEW) —
  schema per Key decision 2; `get component()` → `EffectChatMessage.svelte`.

Typing notes (Phase 3 conventions): `duration` is an always-present object → plain `SchemaField`;
`check`/`customTrait`/`rulesElement` are always-present arrays defaulting empty → `ArrayField` with
untyped `ObjectField` element (the `buildSchemaFromShape([])` mapping); `description`/`name`/`img`
are plain `StringField`s (the card already guards empty description).

## Producer migration

`TitanActiveEffect` gains `buildChatMessageData()` (byte-parallel to `TitanItem.js:46`) and
`sendToChat()` shrinks to the `TitanItem.sendToChat()` shape: spread `buildChatMessageData()` into
the `ChatMessage.create` payload alongside the existing speaker/style/sound/rollMode/classes
handling (speaker logic unchanged: owning actor's speaker when parented, else default).

## Component sweep

`EffectChatMessage.svelte:12`: `const item = document.data.flags.titan` →
`const item = document.data.system`. That is the entire sweep — `ItemChatMessageShell`,
`ItemChatMessageItemChecks`, and `EffectChatStats` are prop-fed and shared with already-migrated
item cards (verified chat-card-shared, not chat-card-only; no internal reads of `flags.titan`).

## Legacy path deletion

- `src/document/types/chat-message/ChatMessage.js` — add the dark-mode-`'all'` branch for non-TITAN
  messages before the early return in `renderHTML` (Key decision 4).
- DELETE `src/hooks/OnRenderChatMessageHTML.js`; remove its import (`src/index.js:10`) and
  registration (`src/index.js:23`).
- DELETE `src/document/types/chat-message/ChatMessageShell.svelte` (26 dead entries + the `effect`
  entry that this phase subsumes).
- Grep gates: zero importers of either deleted file; zero `flags.titan` in chat-message
  produce/render code.

## Registration & manifest

- **`src/hooks/OnceInit.js`** — import `EffectChatMessageDataModel`; add `effect:` to
  `CONFIG.ChatMessage.dataModels` (line 118 map).
- **`system.json`** — add `"effect": {}` to `documentTypes.ChatMessage` (line 41 map).
- **`lang/en.json`** — add `"effect": "Effect"` to `TYPES.ChatMessage` (line 925 map).

**Restart required:** the `documentTypes` manifest change registers only after a Foundry world
server RESTART (browser refresh insufficient; a stale world rejects
`ChatMessage.create({type: 'effect'})`). The plan's e2e step asks the user to relaunch, with a
rebuilt `dist/`.

## File inventory

### New

- `src/document/types/active-effect/EffectSystemTemplate.js` — single-source shape.
- `src/document/types/active-effect/chat-message/EffectChatMessageDataModel.js` — the subtype.
- `tests/unit/EffectSchemaEquivalence.test.js` — byte-exact golden masters for BOTH the refactored
  `TitanActiveEffectDataModel` schema and the new `EffectChatMessageDataModel` schema (hand-authored
  literals; mock-field harness per `ItemDataModelSchemaEquivalence.test.js`).
- `tests/e2e/effect-chat-card.spec.js` — see Test plan.

### Modified

- `src/document/types/active-effect/TitanActiveEffectDataModel.js` — shape-built
  `duration`/`check`/`customTrait`; `changes` stays hand-built.
- `src/document/types/active-effect/TitanActiveEffect.js` — `buildChatMessageData()` +
  `sendToChat()` rewrite.
- `src/document/types/active-effect/chat-message/EffectChatMessage.svelte` — one-line system read.
- `src/document/types/chat-message/ChatMessage.js` — dark-mode-`'all'` relocation.
- `src/index.js` — drop the legacy hook import/registration.
- `src/hooks/OnceInit.js`, `system.json`, `lang/en.json` — registration.
- `docs/TODO.md`, `.claude/skills/titan-codebase/` — see Docs.

### Deleted

- `src/hooks/OnRenderChatMessageHTML.js`
- `src/document/types/chat-message/ChatMessageShell.svelte`

## Test plan

- **Unit:**
  - `EffectSchemaEquivalence.test.js` — golden masters for the refactored AE schema (gates the
    live-document refactor; element-initial omission documented in-file) and the chat schema.
  - `buildChatMessageData()` — type is `'effect'`; `system` carries
    `name/img/rulesElement/description/duration/check/customTrait` and NOT `id`/document-`type`;
    mirrors the existing `TitanItem.buildChatMessageData` test if present, else authored fresh.
- **e2e (`effect-chat-card.spec.js`):**
  - Create an effect (with a check and a custom trait) on the test actor → `sendToChat()` → assert
    `message.type === 'effect'`, the card renders (label, duration tag, trait tag, description), and
    clicking the embedded check button produces an `itemCheck` message (the
    `requestItemCheck({itemRollData})` path).
  - Dark-mode regression: with `darkModeChatMessages` set to `'all'`, a NON-TITAN message (e.g. a
    plain OOC message) gets `titan-dark-mode`; restore the setting after.
- **Grep gates:** zero importers of the two deleted files; zero `flags.titan` reads/writes in chat
  produce/render code (`TitanActiveEffect.js`, `src/document/types/**/chat-message/**`,
  `src/hooks/`); document-flag users enumerated in Non-goals remain.
- Full unit + e2e suites green before merge (two-stage review rhythm). Build before e2e; world
  restart per Registration.

## Risks & mitigations

- **Live-document schema refactor (DATA-INTEGRITY SENSITIVE).** `TitanActiveEffectDataModel` schema
  now builds from the shape — effects persist in worlds. Mitigated by the byte-exact golden master
  (follow-up-B recipe) and the known-inert element-initial delta being explicitly documented and
  omitted from the gate.
- **Embedded check roll path.** The card's check buttons pass the whole snapshot as `itemRollData`;
  the typed schema must not drop a field that `getItemCheckParameters` reads (follow-up D lesson:
  typing a bag exposes latent producers). Mitigated: the snapshot surface is byte-identical to the
  legacy flags payload (minus `id`/document-`type`, which the item flow also drops), and the e2e
  rolls a check from the card.
- **Dark-mode feature loss on hook deletion.** Caught in design research; mitigated by the
  relocation (Key decision 4) + the explicit e2e regression case.
- **Stale-world subtype rejection.** Restart gotcha called out in Registration; the plan sequences
  the user relaunch before the e2e run.

## Docs & skill updates (on completion)

- `docs/TODO.md` — mark Phase 4 and the entire chat-subtypes effort DONE; delete the
  ChatMessageShell dead-entries cleanup note (resolved by deletion).
- `titan-codebase` skill — chat section now states ALL chat messages are self-rendering subtypes;
  remove the legacy-hook/`flags.titan` chat references; reflect the AE schema's shape-template
  source.

## Roadmap

This is the final phase. After merge, the chat-subtypes roadmap (Phases 1–4 + follow-ups B/D) is
complete and closed.
