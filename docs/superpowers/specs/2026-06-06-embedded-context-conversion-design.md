# Embedded-Context Conversion — Design

**Date:** 2026-06-06
**Status:** Design — approved, pending implementation plan
**Scope:** Convert every remaining embedded-document consumer on the character sheet (all item rows,
all effect rows, the Effect HUD row) from the `item`/`effect` prop-threading +
`document.data.items.get(id)…` lookup pattern onto the embedded-document context
(`EmbeddedDocumentProvider` + the `'document'`/`'sheetDocument'` two-context convention), and close
`docs/TODO.md` #21 (provider wrap + a unified read-only check display) and #22 (commodity/effect
rows). **No new features**: no new edit surfaces, no new capabilities — display and behavior parity
throughout. TODO #20 (inline attack editing — the provider's first write-path consumer) stays
deferred.

**Parent spec:** `2026-06-03-embedded-document-stores-design.md` (shipped the `EmbeddedDocument`
bridge, `EmbeddedDocumentProvider`, the two-context convention, and the shared `AttackTags` proof).
This spec is the sheet-wide rollout that spec decomposed to follow-up work.

## Problem

The embedded-document machinery exists and is proven, but only one subtree uses it (the weapon
row's attacks list). Everything else on the character sheet still reaches embedded documents the
old way:

- **55 occurrences across 19 `.svelte` files** of `document.data.items.get(item._id)?.system.X`
  per-leaf deriveds under `…/character/sheet/items/` (the 7 item-type rows, their stats
  subcomponents, the shared row machinery, and both item list components).
- **12 occurrences across 4 files** of `document.data.effects.get(effect.id)?…` in the
  `CharacterSheetEffect*` family, plus **1** in `src/ui/effect-hud/EffectHudRow.svelte`.
- Every row component threads a live `item`/`effect` document prop (captured at render — the exact
  staleness class the bridge retires) into its shell and leaf components.
- Two check-display renderers exist for the same information: the item-sheet sidebar's labeled
  column (`ItemSheetSidebarCheck`) and the character sheet's tag row (`CharacterSheetItemCheck`).

## Decisions (user-confirmed, 2026-06-06)

1. **Scope** — full fold-in of the conversion + #21 + #22, **without new features**. #20 stays
   deferred.
2. **#21 closure** — provider wrap (inherent in the conversion) **plus** unifying the read-only
   check display into one shared component (the AttackTags pattern). Mounting *settings/editing*
   components on the character sheet is a new edit surface — excluded, deferred with #20.
3. **Provider placement** — **list-level**: the three list components wrap each row in a provider
   inside their already-id-keyed `{#each}`. `EffectHudRow` self-wraps (it has no list parent).
4. **Prop fate** — the `item`/`effect` prop **drops entirely** from row subtrees. Hard acceptance
   criteria: (a) cross-sheet reactivity holds (editing an item on its item sheet live-updates the
   character-sheet row), and (b) zero functionality loss (every row button — including rolling item
   checks from the character sheet — keeps working).
5. **E2E depth** — **full per-type sweep**: parity + button functionality e2e for each of the 7
   item types, plus effects, plus the cross-sheet reactivity and check-display parity cases.
6. **Approach** — **family-atomic conversion** (Approach 1): effects family → item family → check
   unification. No transitional scaffolding; green at every stage boundary.
7. **Check-display convergence direction** — the shared component uses the **tag-row**
   presentation; the item-sheet sidebar converges onto it. The character sheet keeps its current
   look (its intrinsic tags become parity-locked).

## Goals

- Zero `document.data.items.get(` / `document.data.effects.get(` occurrences in `.svelte` files
  under `src/document/types/actor/types/character/sheet/items/` and `src/ui/effect-hud/`
  (list-script drag/sort/filter code, which legitimately operates on the actor's collections,
  excepted — see Architecture).
- Zero live-document props (`item`, `effect`) threaded through those subtrees. Surviving props are
  UI-state and addressing only: `bind:isExpanded`, array indices (`attackIdx`, `checkIdx`, `idx`).
- ONE shared read-only check-display component consumed by the item-sheet sidebar, the
  character-sheet item rows, the character-sheet effect rows, and the Effect HUD (via its existing
  reuse of the effect leaf components).
- `docs/TODO.md` #21 and #22 closed; #20 untouched and strictly easier afterwards.

## Non-goals

- **No new edit surfaces** — `WeaponSheetAttackSettings`, `ItemSheetCheckSettings`, and the
  rules-element settings components do NOT mount on the character sheet (that is #20 and the
  feature half of #21, deferred).
- **No machinery changes** — `EmbeddedDocument`, `EmbeddedDocumentProvider`, `ReactiveDocument`,
  and the `'sheetDocument'` context wiring in `DocumentSheetShell` ship unchanged.
- **No chat-message work** — chat cards read snapshots, not bridges; item cards do not display
  item checks today, so the unified check display has no chat consumer.
- **No schema or producer changes** — no `buildSchemaFromShape`, no DataModel edits, no golden
  masters touched.
- **No visual redesign** beyond the single deliberate convergence: the item-sheet sidebar check
  body adopts the shared tag presentation (Decision 7).

## Architecture — end-state convention

No new machinery; this is a pure consumer-side conversion that extends the two-context convention
sheet-wide:

- **List-level providers.** `CharacterSheetMultiItemList`, `CharacterSheetItemList`, and
  `CharacterSheetEffectList` wrap each row in `<EmbeddedDocumentProvider doc={…}>` inside their
  `{#each}` blocks, which are (and MUST remain) keyed by document id — the provider captures its
  target at init by design.
- **List scripts stay on the actor bridge.** The lists' own code (sort/filter deriveds, drag
  handlers reading `document.data.items.get(id)` to build drag payloads, the
  `$appState.tabs[tabKey].isExpanded[id]` expand-state binding) sits *outside* the providers and
  legitimately operates on the actor's collections. These reads are NOT converted.
- **Inside a row subtree**, `getContext('document')` is the embedded item/effect:
  - display reads: `document.data.system.X`, `document.data.name`, `document.data.img`;
  - ids for engine-call args: `document.data._id`;
  - document methods / write-backs (send-to-chat): the non-subscribing `document.doc`;
  - actor engine calls (roll checks/attacks, equip, `safeDeleteItem`, `requestEffectDeletion`,
    `getItemCheckParameters`/`initializeItemCheckOptions`): `getContext('sheetDocument')` — never
    the shadowed context.
- **Effect HUD.** *(Amended at plan time, user-approved 2026-06-06: the row DOES have a list
  parent.)* `EffectHudSection` wraps each row in a provider inside its already-id-keyed `{#each}`
  (`EffectHudSection.svelte:16`) — the same list-level convention as the sheets — and
  `EffectHudShell` additionally sets the `'sheetDocument'` context (one line) so actor-coupled
  leaves keep their escape hatch on the HUD surface. `EmbeddedDocument` delegates to *any* ancestor
  bridge, so the HUD's reuse of the character sheet's effect leaf components keeps working with
  zero HUD-specific code in the leaves.
- **The bespoke `CharacterSheetWeaponAttacks` provider wrap dissolves** — its subtree now sits
  inside the row's list-level provider; the component keeps only its attack-list iteration.

### Reactivity guarantee (acceptance criterion 4a)

Unchanged mechanism, already e2e-proven by the parent spec: `EmbeddedDocument.data` re-resolves
`parent.data[collection].get(id)` through the actor bridge's `createSubscriber`, so an edit on the
item sheet (or any client, including socket-relayed updates) invalidates the actor's subscription
and every character-sheet read re-runs against the fresh live document. No new hooks, no staleness
window.

## Staged design (family-atomic; each stage lands green)

Wrap and conversion are **atomic per subtree**: the provider *shadows* `'document'`, so the moment
a list wraps its rows, every descendant still reading `document.data.items.get(…)` breaks. The
shared row machinery spans all 7 item types, so the item family converts as one task. Stage order
sequences risk small → bulk → novel.

### Stage 1 — effects family (small, proves the pattern end-to-end)

- `CharacterSheetEffectList` wraps each row in a provider (already keyed by `effect.id`).
- Convert: `CharacterSheetEffect` (9 lookups), `CharacterSheetEffectChecks`,
  `CharacterSheetEffectCheck`, `CharacterSheetEffectToggleActiveButton`.
- `EffectHudRow` wraps its detail subtree in a provider and drops its own
  `effects.get(effect.id)` re-resolve derived.
- The `effect` prop drops from the family.

### Stage 2 — item family (bulk-mechanical, one task)

- `CharacterSheetMultiItemList` and `CharacterSheetItemList` wrap each row in a provider (already
  keyed by `item._id`).
- Convert all 7 row types: `CharacterSheetWeapon` (8 lookups) + `WeaponAttack`/`WeaponAttacks` +
  `WeaponMultiAttackButton`, `CharacterSheetSpell` (8) + `SpellCastingCheck` +
  `CondensedCastingCheckButton`, `CharacterSheetCommodity` (7), `CharacterSheetEquipment` (6),
  `CharacterSheetArmor` + `ArmorStats` (8), `CharacterSheetShield` + `ShieldStats` (7),
  `CharacterSheetAbility` (1).
- Convert the shared machinery: `CharacterSheetItem` (shell), `ItemImage`, `ItemExpandButton`,
  `ItemFooter`, `ItemTradition`, `ItemChecks`/`ItemCheck`, the send-to-chat / edit / delete /
  equip buttons, `CondensedAttackCheckButton`, `CondensedItemCheckButton`.
- Every edit is the same rewrite shape: `document.data.items.get(item._id)?.system.X` →
  `document.data.system.X`; live-doc props dropped; ids from `document.data._id`; actor calls via
  `'sheetDocument'`.
- 27 files under `…/character/sheet/items/` (the directory's 34 `.svelte` files minus the 5
  effect-family files converted in Stage 1 and minus the two deletions below).
- *(Amended at plan time, user-approved 2026-06-06)*: `CharacterSheetItemTradition.svelte` and
  `CharacterSheetItemFooter.svelte` have **zero consumers** (grep-proven) and are **deleted**, not
  converted.

### Stage 3 — shared check display (`CheckTags`, the #21 deliverable)

The two existing renderers present the same intrinsic information differently: the item-sheet
sidebar as a labeled column (name + "Attribute (Skill) D:C" + expandable resolve/resisted/opposed
details), the character sheet as a tag row driven by actor-computed `ItemCheckParameters`.
Following the AttackTags precedent:

- New shared **`CheckTags`** component at `src/document/svelte-components/check/CheckTags.svelte`
  (the existing home for document-generic context-reading components — checks live on items *and*
  effects, so it belongs to no one document type), rendering the **intrinsic** tag set from the
  `'document'` context's
  `document.data.system.check[idx]`: attribute/skill + difficulty:complexity, resolve cost,
  resisted-by, opposed-by. Renders nothing when the check is absent (deletion window).
- **Character-sheet consumers** (`CharacterSheetItemCheck`, `CharacterSheetEffectCheck`, and the
  HUD via reuse) render `CheckTags` plus their actor-derived extras (dice pool, expertise,
  training tags; roll + spend-resolve buttons). Their visuals are unchanged except where a
  display-parity bug fix lands (each with a regression lock); the intrinsic tags become
  parity-locked across all consumers.
- **`ItemSheetSidebarCheck`** adopts `CheckTags` for its body — the deliberate, contained visual
  convergence (Decision 7). Its name header and expand behavior survive as the sidebar's framing.
- Like the AttackTags pass, this stage may surface pre-existing display-parity bugs between the
  two renderers; fixes land with regression locks, mirroring the parent spec's bonus-fix pattern.

## Data flow & error handling

- **Read path:** actor update (any client) → actor `ReactiveDocument` invalidation → row reads
  re-run → `EmbeddedDocument.data` re-resolves by id → fresh `system.X`.
- **Deletion window:** an embedded document can vanish between deletion and the list re-derive
  unmounting its row; `EmbeddedDocument.data` returns `undefined` then. Converted reads keep the
  existing `?.` guard discipline (`document.data?.system.X`) — the guard moves from after
  `.get(id)` to after `.data`; no new failure mode.
- **Write path:** unchanged mechanics, new sourcing — document methods via `document.doc`, actor
  mutations via `'sheetDocument'` methods. No new edit surfaces.

## Risks & mitigations

1. **Atomicity breakage** — a wrapped-but-unconverted (or converted-but-unwrapped) subtree renders
   wrong/blank. Mitigation: family-atomic stages; each stage ends green (build + unit + affected
   e2e) before the next starts; never build during an e2e run.
2. **Keying rule regression** — providers capture their doc at init; un-keying a list `{#each}`
   silently binds rows to stale documents. Mitigation: convention call-out in `titan-codebase`
   `conventions.md` + explicit review-checklist item.
3. **Wrong-context engine calls** — calling actor methods on the embedded bridge (or vice versa)
   is the classic conversion slip. Mitigation: review-checklist item; the per-type button e2e
   catches it behaviorally.
4. **Carried gotchas** — e2e helpers must not blind-toggle expanders (weapon attacks seed
   expanded); Effect HUD e2e must control a token (GM first-selected-token rule); `git add`
   explicit paths only.

## Testing (full per-type sweep — Decision 5)

**Unit**

- New `CheckTags` suite on the established context-Map render harness
  (`tests/unit/AttackTags.test.js` pattern): intrinsic tags across check configs (skill /
  skill-less, resolve cost, resisted-by, opposed-by, absent check → renders nothing).
- Existing context-harness suites (`CharacterSheetWeaponAttack`, `AttackTags`) updated only if
  their injected context shape changes.

**E2E**

1. **Cross-sheet reactivity** (criterion 4a) — one case per surface class: edit an item field on
   its item sheet → the character-sheet row updates live; same for an effect row; same for the
   Effect HUD row.
2. **Per-type functional sweep** (criterion 4b) — for EACH of the 7 item types: the row renders
   its parity fields (name/img + type-specific leaves), the expander works, and every button
   functions (send-to-chat produces the right card subtype, edit opens the item sheet, delete runs
   the confirm flow, equip toggles where applicable, condensed/check/attack buttons roll the right
   chat subtype). Effects: toggle-active, check roll, delete confirm flow.
3. **Check-display parity** — the same check renders identical intrinsic tags on the item-sheet
   sidebar, the character-sheet row, and the Effect HUD; rolling the check from the character
   sheet still produces the item-check chat message.
4. **Regression floor** — the existing suite (unit 177 / e2e 386 at `7c58883c`) stays green; the
   suite grows by the sweep.

## Implementation routing & process

- All `.svelte` work routes through `titan-svelte-dev` subagents with `svelte-5`, `foundry-vtt`,
  and `foundry-svelte` loaded; two-stage review per task + final holistic review (per the parent
  spec's execution pattern).
- On completion: delete `docs/TODO.md` #21 and #22 (#20 stays, now easier); update the
  `titan-codebase` skill (`conventions.md` — the sheet-wide list-level provider convention and the
  keying rule; `abstractions.md` — `CheckTags` and its consumers).

## Follow-up work (decomposed, out of scope here)

- **#20** — inline attack editing on the character sheet via the provider (the write path; reuse
  `WeaponSheetAttackSettings` through the row provider).
- **Settings/editing reuse** (the feature half of #21) — mounting `ItemSheetCheckSettings` /
  rules-element settings components on character-sheet rows once a write-path consumer (#20) has
  proven the pattern.
- **TODO #12 north-star** — all fields on all documents on consistent `system.*` paths.
