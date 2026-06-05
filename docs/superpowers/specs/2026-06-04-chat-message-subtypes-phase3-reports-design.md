# Chat Message Subtypes — Phase 3 (Reports)

- **Date:** 2026-06-04
- **Status:** Approved (design); ready for implementation plan
- **Scope:** Phase 3 of the phased chat-message-subtypes refactor
  (`specs/2026-06-03-chat-message-subtypes-phase1-design.md`). Phase 1 (infrastructure + 5
  checks) and Phase 2 (7 item cards, + follow-ups B/D) are shipped. This phase converts the
  **13 report chat messages** into first-class Foundry v14 `ChatMessage` subtypes. The
  `effect` subtype and the deletion of the legacy hook/`ChatMessageShell.svelte` remain
  **Phase 4**.

## Context

Report chat messages (damage taken, healing, rest, turn-start/turn-end effect processing, …)
are today plain `ChatMessage`s carrying their payload in `flags.titan`, discriminated by
`flags.titan.type`. They render through the legacy global hook
`src/hooks/OnRenderChatMessageHTML.js`, which mounts `ChatMessageShell.svelte` and dispatches via
a hardcoded `type → component` switch (`ChatMessageShell.svelte:66-99`).

Phase 1 established the target model — a manifest `documentTypes.ChatMessage` entry + a typed
`DataModel` in `CONFIG.ChatMessage.dataModels`, with `ChatMessage#renderHTML` delegating to
`system.renderHTML()` (inherited from `TitanChatMessageDataModel`). Checks (Phase 1) and items
(Phase 2) already render themselves this way; the legacy hook carries an
`instanceof TitanChatMessageDataModel` guard that skips them. Reports are the last family still
flowing through the legacy hook (alongside `effect`, which Phase 4 handles).

This phase moves the 13 report payloads into typed `message.system` and makes each report render
itself, exactly mirroring the item-card conversion.

## Goals

- One Foundry subtype per current report leaf type (13 total), keyed identically to today's
  `flags.titan.type` strings.
- A single **report family base** `ReportChatMessageDataModel` (extends `TitanChatMessageDataModel`)
  holding the fields common to all reports (`actorName`, `actorImg`); 13 thin leaves under it.
- Payloads live in typed `message.system`, built from co-located single-source shape factories via
  the existing `buildSchemaFromShape` helper (consistent with Phase 2 items and follow-ups B/D).
- Reports render themselves via `system.renderHTML()`; no new global hook.
- Regression-free: every report that renders today still renders, with the **same** components and
  the **same** confirm/apply behavior, reading `system.*` instead of `flags.titan.*`.
- Incidentally fix the two revert reports that currently render blank (see "Pre-existing bug").

## Non-goals

- **No Phase 4 work.** The `effect` subtype, the deletion of `OnRenderChatMessageHTML.js`, and the
  deletion of `ChatMessageShell.svelte` are explicitly out of scope. The legacy hook and shell stay,
  still serving the `effect` type.
- **No backward compatibility for pre-existing report messages.** Old `flags.titan` report messages
  created before this phase are deprecated and render blank (consistent with the Phase 1 non-goal;
  chat is semi-ephemeral). No world migration.
- **No change to engine report behavior.** The 13 report *types* the engine produces, and the
  conditions under which it produces them, are unchanged. This is a render-path/typing conversion,
  not a redesign of what gets reported.
- **No change to the confirm/apply actor-mutation logic.** Buttons still call the same
  `CharacterDataModel` methods (`applyDamage`/`applyHealing`/`regainResolve`/…); only the chat-doc
  path they read and write changes (`flags.titan` → `system`).
- **No deep typing of opaque snapshot internals.** The per-effect snapshot array *elements* inside
  turn reports stay `ObjectField` (see Typing policy).

## Key decisions

1. **Granularity: 13 per-leaf report subtypes.** Uniform with checks (5) and items (7); 1:1 with the
   13 report components that already exist. The alternative — one `report` subtype with an internal
   `reportType` dispatch — would force an opaque payload bag (losing the typed-schema parity B/D
   established) and re-introduce the very dispatch switch Phase 1 set out to delete. The leaves are
   genuinely thin (a shape factory + `get component()`), so per-leaf is cheap.
2. **Family base.** `ReportChatMessageDataModel extends TitanChatMessageDataModel` hoists the
   universal report fields `actorName` / `actorImg`. Each leaf spreads its own shape on top.
3. **Typing: hybrid (typed-from-shape, opaque snapshot elements).** See Typing policy.
4. **Data home: typed `message.system`** (not `flags.titan`).
5. **Render seam: self-rendering** via inherited `TitanChatMessageDataModel.renderHTML()` /
   `get component()`.
6. **Producer split at the chokepoint.** All 13 builders funnel through
   `CharacterDataModel._whisperOwners`; the `type`-to-root + `system` split happens there, so the
   builders are otherwise untouched.
7. **Coexistence preserved.** The legacy hook's `instanceof` guard already skips subtyped messages —
   no double-mount. The hook + shell are removed in Phase 4, not here.

### Typing policy (hybrid)

Each report's `system` schema is built from a co-located zero-value shape factory
(`create<T>ReportShape()`) fed to `buildSchemaFromShape`, the same single-source mechanism used by
item cards (Phase 2/B) and check chat schemas (follow-up D). This yields:

- **Flat scalar fields** — fully typed (`StringField`/`NumberField`/`BooleanField`). Examples:
  `damageTaken`, `damageResisted`, `staminaLost`, `woundsSuffered`, `ignoredArmor`, `staminaRestored`,
  `resolveSpent`, `resolveShortage`, `armorLost`, `armorRepaired`, `woundsHealed`, `armorName`,
  `armorImg`, `expiredEffectsRemoved`.
- **Resource sub-objects** — typed `SchemaField`s: `stamina {value, max}`, `wounds {value, max}`,
  `resolve {value, max}`, `armor {value, max}`.
- **Confirm-offer sub-objects** — typed `SchemaField`s with their known fields:
  `damageApplied {total, confirmed}`, `fastHealing {total, confirmed, …}`,
  `persistentDamage {…}`, `resolveRegain {…}`, and the `*Revert` variants. (The plan extracts the
  exact field set of each from the producers; these drive both the schema and the confirm-button
  read/write paths.)
- **Tag sub-objects** — typed: `tags {penetrating, ineffective}`.
- **Effect-snapshot arrays** — `effects` is a typed `SchemaField` whose keys
  (`turnStart`, `turnEnd`, `initiative`, `custom`, `expired`) are each an `ArrayField`, but the array
  **element stays an untyped `ObjectField`** — exactly what `buildSchemaFromShape([])` already
  produces for an array literal. The element internals (`label`, `img`, optional `description`,
  `remaining`, `initiative`, `custom`) are simple display values the components read directly; they
  already round-trip safely as plain objects through `flags` today. Bounding the typing at the array
  boundary keeps Phase 3 tractable without sacrificing the typed top-level structure.
- **Message array** — `message` (the turn messages) is an `ArrayField`; its element type
  (string vs. object) is read off the `rulesElementsCache.turnMessage` producer in the plan.
- **Conditions array** — `conditions` is an `ArrayField` with an `ObjectField` element
  (`{label, img, description}`), same boundary rationale as effect snapshots.

This is **DATA-INTEGRITY SENSITIVE**: it changes how report payloads are stored. It is gated by a
byte-exact golden-master characterization test of all 13 schemas (see Test plan), mirroring
`ItemDataModelSchemaEquivalence` (B) and `CheckChatMessageSchemaEquivalence` (D).

## The 13 report leaf types

| Subtype key (`flags.titan.type` → root `type`) | Component | Payload tier |
|---|---|---|
| `damageReport` | `report/types/damage/DamageReportChatMessageShell.svelte` | flat + `damageApplied` confirm-offer |
| `healingReport` | `report/types/healing/HealingReportChatMessageShell.svelte` | flat |
| `spendResolveReport` | `report/types/spend-resolve/SpendResolveReportChatMessageShell.svelte` | flat |
| `rendReport` | `report/types/rend/RendReportChatMessageShell.svelte` | flat + armor |
| `repairsReport` | `report/types/repairs/RepairsReportChatMessageShell.svelte` | flat + armor |
| `removeCombatEffectsReport` | `report/types/remove-combat-effects/RemoveCombatEffectsReportChatMessage.svelte` | header-only |
| `shortRestReport` | `report/types/short-rest-report/ShortRestReportChatMessage.svelte` | header-only |
| `longRestReport` | `report/types/long-rest/LongRestReportChatMessage.svelte` | flat + wounds |
| `turnStartReport` | `report/types/turn-start/TurnStartReportChatMessage.svelte` | nested (effects/conditions/message/confirm-offers/resources) |
| `turnEndReport` | `report/types/turn-end/TurnEndReportChatMessage.svelte` | nested (effects.expired/message/confirm-offers) |
| `turnStartRevertReport` | `report/types/turn-start-revert/TurnStartRevertReportChatMessage.svelte` | nested (revert confirm-offers/resources) |
| `turnEndRevertReport` | `report/types/turn-end-revert/TurnEndRevertReportChatMessage.svelte` | nested (revert confirm-offers/resources) |
| `effectsExpiredReport` | `report/types/effects-expired/EffectsExpiredReportChatMessage.svelte` | nested (effects.expired) |

All components live under `src/document/types/chat-message/report/types/<name>/` and currently read
`document.data.flags.titan.*` (shared parts in `report/components/`).

## DataModel hierarchy

```
TitanDataModel
 └─ TitanChatMessageDataModel            (existing; owns renderHTML/mount/teardown, get component contract)
     └─ ReportChatMessageDataModel       (NEW family base; schema: actorName, actorImg)
         ├─ DamageReportChatMessageDataModel
         ├─ HealingReportChatMessageDataModel
         ├─ SpendResolveReportChatMessageDataModel
         ├─ RendReportChatMessageDataModel
         ├─ RepairsReportChatMessageDataModel
         ├─ RemoveCombatEffectsReportChatMessageDataModel
         ├─ ShortRestReportChatMessageDataModel
         ├─ LongRestReportChatMessageDataModel
         ├─ TurnStartReportChatMessageDataModel
         ├─ TurnEndReportChatMessageDataModel
         ├─ TurnStartRevertReportChatMessageDataModel
         ├─ TurnEndRevertReportChatMessageDataModel
         └─ EffectsExpiredReportChatMessageDataModel
```

Each leaf:

```js
static _defineDocumentSchema() {
   return {
      ...super._defineDocumentSchema(),               // actorName, actorImg from ReportChatMessageDataModel
      ...buildSchemaFromShape(create<T>ReportShape()), // leaf-specific typed fields
   };
}
get component() { return <T>ReportChatMessage; }
```

The `create<T>ReportShape()` factory is colocated with the leaf (a sibling `*Shape.js` file, mirroring
follow-up D's `create<T>Check…Shape()` colocation). It is the single source feeding both the schema
and the golden-master test. Shared sub-shapes (resource `{value,max}`, the effect-snapshot element,
confirm-offer objects) are extracted into small shared shape helpers under
`report/` to avoid drift across the turn reports.

## Producer migration

### `_whisperOwners` — the split point

`CharacterDataModel._whisperOwners(messageData, userId, playSound)` (CharacterDataModel.js:5918)
currently wraps `messageData` (which includes `messageData.type`) into `flags.titan`. Change it to
split the discriminator to the message root and the rest into `system`:

```js
const { type, ...system } = messageData;
const message = {
   type,                                   // selects the ChatMessage subtype
   system,                                 // typed payload
   user: userId,
   speaker: this.parent.getSpeaker(),
   style: CONST.CHAT_MESSAGE_STYLES.OTHER,
   whisper: getOwners(this.parent),
};
if (playSound) { message.sound = CONFIG.sounds.notification; }
await ChatMessage.create(message);
```

All 13 builders (`_createDamageReportData`, `_createHealingReportData`, `onTurnStart`, … and the
inline builders) still set `reportData.type = '<leaf>'` and pass the object to `_whisperOwners`
unchanged. The single split point keeps the builder bodies untouched.

### Confirm/apply buttons

The report confirm/apply components (`report/components/ReportConfirmApplyDamageButton.svelte`,
`ReportConfirmResolveRegainButton.svelte`, the fast-healing/persistent-damage/resolve-regain buttons,
and the revert buttons) currently:

- read `document.data.flags.titan.X` → repoint to `document.data.system.X`;
- write `document.data.update({ flags: { titan: {…} } })` → write
  `document.data.update({ system: {…} } })`.

The actor-method calls and the `getActorFromSpeaker` / owner-guard logic are unchanged.

## Component sweep

Mechanical `document.data.flags.titan.X → document.data.system.X` across:

- the 13 leaf report shells under `report/types/<name>/`;
- the shared report components under `report/components/` (`ReportChatMessageBase.svelte`,
  `ReportChatMessageHeader.svelte`, the confirm buttons, and any per-effect snapshot renderers).

The implementation plan enumerates the exact sites via
`grep -rn "flags.titan" src/document/types/chat-message/report`.

## Registration & manifest

- **`src/hooks/OnceInit.js`** — import the 13 leaf DataModels; add the 13 keys to
  `CONFIG.ChatMessage.dataModels` (after the item keys, lines 105-117).
- **`system.json`** — add the 13 keys (empty objects) to `documentTypes.ChatMessage`.
- **`lang/en.json`** — add the 13 labels to `TYPES.ChatMessage`.
- **`src/hooks/OnRenderChatMessageHTML.js`** — remove the 11 report keys (and leave only `effect`,
  pending Phase 4) from the legacy `TITAN_CHAT_MESSAGE_TYPES` set. (The two revert keys are already
  absent — see below.) This is belt-and-suspenders: the `instanceof` guard already skips the new
  subtypes, but trimming the set keeps the legacy path honest about what it still serves.

**Restart required:** `documentTypes` manifest changes register only after a Foundry restart (known
gotcha). The plan's verification steps call this out, and the e2e run needs a rebuilt `dist/` + a
relaunched world.

## Pre-existing bug fixed for free

`onTurnStartReverted` and `onTurnEndReverted` (CharacterDataModel.js:5404, 5448) produce
`turnStartRevertReport` / `turnEndRevertReport` messages, and `ChatMessageShell.svelte` maps both
(lines 90-91) — but the legacy hook's `TITAN_CHAT_MESSAGE_TYPES` set
(`OnRenderChatMessageHTML.js:20-33`) **omits both**, so today these messages render **blank** (the
hook skips them; no component mounts). Making them first-class self-rendering subtypes fixes this
automatically. The Test plan adds an explicit e2e assertion that both revert reports now render.

## File inventory

### New

- `src/document/types/chat-message/report/ReportChatMessageDataModel.js` — family base.
- 13 × `src/document/types/chat-message/report/types/<name>/<T>ReportChatMessageDataModel.js`.
- 13 × colocated `…/<T>ReportShape.js` shape factories (single source for schema + golden master).
- Shared sub-shape helpers under `report/` (resource, effect-snapshot element, confirm-offer) as
  needed to keep the turn-report shapes DRY.
- `tests/unit/ReportChatMessageSchemaEquivalence.test.js` — byte-exact golden master of all 13
  report schemas.
- `tests/e2e/report-cards.spec.js` — per-report render + the revert-report regression + the
  apply-damage confirm flow.

### Modified

- `src/hooks/OnceInit.js` — import + register 13 report DataModels.
- `system.json` — 13 `documentTypes.ChatMessage` keys.
- `lang/en.json` — 13 `TYPES.ChatMessage` labels.
- `src/hooks/OnRenderChatMessageHTML.js` — trim the report keys from the legacy set.
- `src/document/types/actor/types/character/CharacterDataModel.js` — `_whisperOwners` split (one
  method); builder bodies unchanged.
- Report Svelte components under `src/document/types/chat-message/report/` — `flags.titan.X →
  system.X` read sweep + confirm-button write repoint.

### Untouched (Phase 4)

- `src/hooks/OnRenderChatMessageHTML.js` is **not deleted** (still serves `effect`).
- `src/document/types/chat-message/ChatMessageShell.svelte` is **not deleted** (still the legacy
  dispatch for `effect`).

## Test plan

- **Unit:**
  - `ReportChatMessageSchemaEquivalence.test.js` — hand-authored golden master asserting each of the
    13 leaf schemas is byte-exactly the expected field set/types (gates the data-integrity change;
    must be hand-authored literals to avoid circularity, per the B/D lesson).
  - Per-leaf: `get component()` resolves to the expected `.svelte`; `renderHTML()` returns an
    `<li.message.titan>` with `data-message-id` and populated `.message-content`; a representative
    payload round-trips through the schema.
- **e2e (`report-cards.spec.js`):** trigger each report (apply damage/healing, spend resolve, rend,
  repairs, short/long rest, remove combat effects, turn start, turn end, **turn-start revert**,
  **turn-end revert**, effects expired); assert `message.type === '<leaf>'` and the card content
  renders. Add a focused case for the **apply-damage confirm flow**: click Apply, assert the actor
  resource changed and `message.system.damageApplied.confirmed === true` + the updated
  `message.system.stamina.value`/`wounds.value`.
- Full unit + e2e suites green before merge (the project's two-stage review rhythm). E2E is
  world-launch-gated and needs a rebuilt `dist/` after the src changes.

## Risks & mitigations

- **Data-integrity (schema drift).** Mitigated by the byte-exact golden master + factory-driven
  single-source shapes. Typing a previously-untyped bag can expose latent bad-data producers (the
  B/D lesson: e.g. follow-up D's `damageMod`→`NaN`); the plan verifies both the dialog and API
  production paths for each report and adds `?? 0`/default guards where a producer emitted a value
  the typed field would reject.
- **Subtype registration needs a restart** (manifest `documentTypes`). Called out in verification.
- **Confirm-offer field extraction.** The exact field sets of `damageApplied` / `fastHealing` /
  `persistentDamage` / `resolveRegain` (+ `*Revert`) must be read off the producers
  (`_calculateTurnHealingAndDamage`, `_calculateResolveRegain`, and their revert variants), not
  guessed — the golden master is only as correct as this extraction. The plan makes this an explicit
  per-report step.
- **Re-render / notification double-mount (DEFERRED, pre-existing).** Inherited from the
  single-slot `_svelteComponent` pattern; tracked in `docs/TODO.md` #10. Phase 3 preserves parity.
- **Live-model mutation in confirm buttons (DEFERRED, pre-existing).** Tracked in `docs/TODO.md`
  #11; not in scope.

## Phased roadmap (remaining)

4. **Effect + cleanup** — `EffectChatMessageDataModel` (1 subtype); delete `OnRenderChatMessageHTML`
   mounting and `ChatMessageShell.svelte`; final full e2e pass; update the `titan-codebase` skill.
   After Phase 3 the legacy hook serves only `effect`, so Phase 4 is small.
