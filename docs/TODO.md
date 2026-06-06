# Deferred Work / Backlog

Work that has been intentionally parked. Each item should graduate into its own
spec (`docs/superpowers/specs/`) and plan (`docs/superpowers/plans/`) when picked up.
Completed items are deleted, not marked done.

## Active Effects conversion — related items

The "Effects → TitanActiveEffect" effort (specced in
`specs/2026-05-30-titan-active-effects-conversion-design.md`) has shipped; these are its
surviving deferrals.

### 2. Seeded standard-effects compendium (sub-project B)

- **What:** Ship a seeded *standard effects* compendium for the Effect Tray. Needs a
  pack-build pipeline (foundryvtt-cli `compilePack` or ClassicLevel) and the effect content
  (a future rulebook-scrape script). The tray already works against the empty scratch pack
  and user packs; B just fills a pack with shipped defaults.
- **Why deferred:** Content + pipeline work, independent of the tray feature that shipped.

### 6. Convert effect Items inside compendium-packed actors

- **What:** The `convertEffectItemsToActiveEffects` migration handles world
  actors and unlinked token actors, but NOT actors stored inside compendium
  packs. Those actors keep their legacy `effect` Items.
- **To do:** Extend the converter (or add a one-shot tool) to iterate unlocked
  actor compendium packs and convert their effect Items, then re-lock.
- **Depends on:** The "Effects → TitanActiveEffect" spec.

## E2E suite — related items

### 18. Shared-world e2e fixture hygiene: token-control fixtures orphan a token per run

- **What:** The token-control fixtures in `effect-hud.spec.js`, `effect-tray.spec.js`, and
  `effect-chat-card.spec.js` delete the prior run's stale actor (`game.actors.getName(name)` →
  `stale.delete()`), but deleting an actor does NOT delete its placed tokens — so each run leaves one
  orphaned token on the fixture scene.
- **To do:** Add a suite-wide orphaned-token cleanup (e.g. delete scene tokens whose `actorId` no longer
  resolves, in the shared fixture or `tests/e2e/world.js`). The improved fixture shape to promote
  already exists in `tests/e2e/embedded-context-effects.spec.js` (`deleteFixtureActor`).
- **Found by:** Phase 4 (effect chat subtype) review.

### 19. Bounded canvas-drawn polls give up silently — make exhaustion throw

- **What:** The bounded canvas-drawn polls in the same three specs (50 × 50 ms `setInterval` loops waiting
  for `tokenDoc.object`, ~2.5 s budget) resolve silently on exhaustion, so a never-drawn placeable defers
  the failure to a later, less-diagnostic timeout instead of failing at the poll with a clear message.
- **To do:** Reject (throw) on poll exhaustion with a descriptive message (the `titanWait` pattern in
  `tests/e2e/embedded-context-effects.spec.js` is the model).
- **Found by:** Phase 4 (effect chat subtype) review.

## Chat message subtypes — related items

The "first-class ChatMessage subtypes" effort (Phases 1-4 + follow-ups B/D) has shipped — all 26
chat messages are self-rendering subtypes. Specs/plans under `specs/2026-06-03-chat-message-subtypes-*`
and successors. These are its surviving deferrals. (Note: NPC `overkillDamage` (`NPCDataModel.js:47`)
is written-but-never-read and schema-stripped — harmless dead data, a candidate for producer cleanup.)

### 13. E2E: `effectsExpiredReport` render not covered

- **What:** `tests/e2e/report-cards.spec.js` (Phase 3, Task 5) covers 12 of the 13 report subtypes via
  direct `CharacterDataModel` triggers, but NOT `effectsExpiredReport`. That report is produced only by
  the deep `onInitiativeAdvanced` initiative-effect-expiry path (`CharacterDataModel.js` ~5015), which
  requires seeding an `initiative`-duration effect with `remaining: 1`, advancing combat initiative past
  its threshold, with `autoDecreaseEffectDuration` enabled and `reportEffects`/`autoRemoveExpiredEffects`
  configured. Driving that reliably needs intricate multi-combatant initiative setup; a thin trigger
  would be flaky.
- **To do:** Add a reliable e2e case (likely via `seedCombatEncounter` + an initiative-duration effect +
  `combat.nextTurn()` until the effect expires) asserting `type === 'effectsExpiredReport'` and a
  non-empty card, OR a unit-level render smoke of the leaf component. The leaf schema is already covered
  by the golden master (`tests/unit/ReportChatMessageSchemaEquivalence.test.js`).
- **Why deferred:** Per the project no-flaky-tests rule — the other 12 reports (incl. the two revert
  regressions and the fast-healing apply-confirm flow) are covered reliably; this one needs a bespoke
  combat-initiative harness rather than a one-line trigger.
- **Found by:** Phase 3 reports, Task 5 (e2e coverage).

### 10. Chat-message Svelte mount is keyed per-document, not per-element

- **What:** `TitanChatMessage` stores a single `_svelteComponent = { handle, bridge }`
  per message document. Foundry renders one message into TWO elements when chat
  notifications are active — the main chat log (`ChatLog#postOne` / `#updateMessage`)
  AND the notifications pane (`ChatLog#postNotification`) — each calling `renderHTML`.
  The second render's `_teardownComponent()` unmounts the first element's component
  (leaving its `.message-content` blank until the next re-render), and the
  notification-pane mount + its `ReactiveDocument` bridge later leak, because
  notification auto-dismissal removes the element without a teardown hook.
- **Severity:** Only manifests when the chat sidebar tab is NOT the active tab (so a
  notification is posted). **Pre-existing:** the legacy `OnRenderChatMessageHTML` hook
  (since deleted; Phase 4) used the identical single-slot `message._svelteComponent`
  pattern, so the Phase 1 refactor preserved parity rather than regressing.
- **To do:** Key the mount per rendered element (store `{ handle, bridge }` on the
  `<li>` element, or a `WeakMap<HTMLElement, …>` keyed by target), tearing down
  per-element; on delete, tear down all of a message's mounts. Consider a
  MutationObserver (or Foundry hook) to unmount on notification-pane element removal.
  Only `TitanChatMessage.renderHTML` carries the pattern now.
- **Why deferred:** Out of scope for Phase 1 (parity migration of checks); the
  mount-tracking model rework remains the actual fix.
- **Found by:** Opus code-quality review of Phase 1, Task 3.

### 11. Check chat components mutate the live DataModel before `update()`

- **What:** Several check chat components — `CheckChatMessageDie.svelte`,
  `CheckChatResetExpertiseButton.svelte`, `CastingCheckChatMessageScalingAspect.svelte` —
  mutate `document.data.system.results` / `.parameters` (and `die.*`) in place on the live
  `system` DataModel instance, then persist via
  `document.data.update({ system: { results: structuredClone(...) } })`.
- **Severity:** Not a corruption bug — Foundry's `update()` diffs the submitted payload against
  `_source`, not the mutated prepared data, and the component remounts on the resulting
  `updateChatMessage` render (discarding the transient mutated state). This is a **pre-existing**
  pattern carried over unchanged from the `flags.titan` implementation.
- **To do:** Refactor to build a local plain object (e.g. from `document.data.system.toObject()`),
  mutate only that, and pass it to `update()` — never mutate the live model. Mirrors the clean
  clone-then-update pattern already used in `OnGetChatLogEntryContext.js`.
- **Why deferred:** Behavior-preserving cleanup, low risk; outside Phase 1's parity scope.
- **Found by:** Opus code-quality review of Phase 1, Task 5.

### 12. Chat-message ↔ document path parity (schema-from-shape)

- **Update (2026-06-05):** the embedded-document-stores spec shipped
  (`specs/2026-06-03-embedded-document-stores-design.md`): `EmbeddedDocument` +
  `EmbeddedDocumentProvider` + the two-context convention (`'document'` nearest/shadowed,
  `'sheetDocument'` top-level/never shadowed), with the shared `AttackTags` component rendering
  identically across the weapon sheet, the character sheet (through the provider), and the weapon
  chat card (snapshot path parity) — the component-reuse proof this item envisioned now exists. The
  remaining north-star (ALL fields on ALL documents on consistent `system.*` paths) stays open; see
  also "Embedded document contexts — follow-ups" below for the decomposed sheet-side reuse items.
- **What:** Bring chat messages to **path parity** with their source documents so
  the same display/edit components are reusable across item sheets, character
  sheets, and chat — e.g. the weapon **item** card shows attacks via
  `document.data.system.attack[index]` (parity with the weapon item document),
  and the attack-**check** chat message gains parity with the attack check
  (deep `parameters` / `results` schemas instead of opaque `ObjectField`s).
- **Mechanism:** a `buildSchemaFromShape(shape)` helper that recursively converts
  a canonical plain-object shape into an appropriate Foundry schema (string →
  `StringField`, number → `NumberField`, bool → `BooleanField`, array →
  `ArrayField`, nested object → `SchemaField`). One shape feeds both the source
  document schema and the chat-message document schema; differentiating fields
  are added/overridden on top of the base shape.
- **No migration:** chat cards are historical snapshots — new messages carry the
  parity shape; historical messages are not retrofitted, and the source document
  is *not* resolved live (a card must not mutate when the weapon is later edited
  or deleted).
- **North-star:** progressively move all fields on all documents onto consistent
  `system.*` paths via the helper.
- **Depends on / sequencing:** the chat-message-subtypes conversion shipped; the remaining
  north-star is incremental.
- **Origin:** branched off the embedded-document-stores design —
  `specs/2026-06-03-embedded-document-stores-design.md` (Follow-up work →
  "Chat-message path parity").

### 16. Consolidate the golden-master fingerprint harness into a shared helper

- **What:** Four unit suites carry near-identical copies of the byte-exact schema-fingerprint harness:
  `tests/unit/ItemDataModelSchemaEquivalence.test.js`, `CheckChatMessageSchemaEquivalence.test.js`,
  `ReportChatMessageSchemaEquivalence.test.js`, and `EffectSchemaEquivalence.test.js` each duplicate the
  field-walker/fingerprint code.
- **To do:** Extract the harness into a shared `tests/unit/` helper module. The golden masters themselves
  stay inline per suite (hand-authored literals, per the characterization-test rule).
- **Why deferred:** Until after the Phase 4 merge, so no frozen golden-master gate is touched mid-refactor.
- **Found by:** Phase 4 (effect chat subtype) review.

### 17. Lang TYPES housekeeping: stale `TYPES.Item.effect` label; no `TYPES.ActiveEffect` map

- **What:** `lang/en.json` `TYPES.Item` still carries an `"effect"` label, but `effect` is no longer an
  Item subtype (effects became native Active Effects); and there is no `TYPES.ActiveEffect` map for the
  `effect`/`condition` ActiveEffect subtypes. Both are inert (the stale key is unread; missing AE labels
  fall back to the type string).
- **To do:** Remove `TYPES.Item.effect` and add a `TYPES.ActiveEffect` map in the same pass.
- **Found by:** Phase 4 (effect chat subtype) review.

### 24. Extract the shared e2e fixture helpers into `tests/e2e/world.js`

- **What:** `newestMessageType`, `deleteFixtureActor`, `controlFixtureActorToken`, and `buildCheck`
  now exist in 3-4 near-identical copies across the `embedded-context-*` spec family (plus the
  older token-control specs #18 targets).
- **To do:** Promote the hardened copies (the check-parity spec's variants are the most complete)
  into `tests/e2e/world.js` (parameterizing the fixture-count assumptions flagged in review), and
  retrofit the family; fold in the #18/#19 token-fixture cleanup while touching the same code.
- **Why deferred:** Touches four reviewed spec files at the tail of the conversion branch; better as
  its own small pass with one full-suite verification.
- **Found by:** Task 6 quality review of the embedded-context conversion.

### 23. Extract the shared check-row presentation from ItemCheck/EffectCheck

- **What:** After the CheckTags extraction (embedded-context conversion, Stage 3),
  `CharacterSheetItemCheck.svelte` and `CharacterSheetEffectCheck.svelte` are byte-identical in
  template + styles (~115 lines each, roll-handler name aside); only the script's options-building
  differs (static `itemId` capture vs fresh `itemRollData` from the effect).
- **To do:** Extract one shared presentational check-row component taking `checkParameters` + an
  `onRoll` callback; the two consumers keep their options-building scripts.
- **Why deferred:** Touches roll wiring — scope creep for the conversion spec; needs its own small pass.
- **Found by:** Task 5 quality review of the embedded-context conversion.

## Embedded document contexts — follow-ups

The embedded-document-stores spec
(`docs/superpowers/specs/2026-06-03-embedded-document-stores-design.md`) shipped `EmbeddedDocument`,
`EmbeddedDocumentProvider`, the two-context convention, and the shared `AttackTags` component across its
three consumers. The spec's wider sheet-side reuse items below were each a deliberate deferral.

### 20. Inline attack editing on the character sheet via the provider (write path)

- **What:** The character sheet's weapon rows display attacks through `EmbeddedDocumentProvider` but
  offer no inline editing — owners must open the weapon sheet to edit an attack. The editor component
  `WeaponSheetAttackSettings` is written against `document.data.system.*`, so it should render unchanged
  under the provider.
- **To do:** Reuse `WeaponSheetAttackSettings` on the character sheet's weapon rows through the provider —
  the first consumer to exercise the provider's WRITE path (`document.data.update(...)` /
  `refreshSystemDocument` against an `EmbeddedDocument`); the shipped consumers are read-only displays.
- **Why deferred:** Sheet-side reuse follow-up split from the embedded-document-stores spec
  (`docs/superpowers/specs/2026-06-03-embedded-document-stores-design.md`) to keep its scope to the
  read-path proof (AttackTags across three surfaces).
- **Found by:** the embedded-document-stores design (decomposed follow-up).

### 21. Generalize the provider treatment to the checks tab and rules-elements tab

- **What:** The character sheet's checks tab and rules-elements tab still render embedded-item data via
  passed props / `item._id` lookups rather than through `EmbeddedDocumentProvider`.
- **To do:** Wrap their rows in `EmbeddedDocumentProvider` so the existing item sheet components (checks,
  rules-element settings) become reusable there, mirroring the AttackTags pattern.
- **Why deferred:** Sheet-side reuse follow-up split from the embedded-document-stores spec
  (`docs/superpowers/specs/2026-06-03-embedded-document-stores-design.md`).
- **Found by:** the embedded-document-stores design (decomposed follow-up).

### 22. Migrate commodity/effect rows off the `item._id`-lookup pattern

- **What:** `CharacterSheetCommodity.svelte` and `CharacterSheetEffect.svelte` (and similar rows) reach
  reactivity via per-leaf `document.data.<coll>.get(id)?.system.<leaf>` deriveds and function bindings
  (see conventions.md).
- **To do:** Replace those with an `EmbeddedDocumentProvider` per row so descendants get the plain
  `document.data.system.*` path, retiring the bespoke lookup boilerplate.
- **Why deferred:** Sheet-side reuse follow-up split from the embedded-document-stores spec
  (`docs/superpowers/specs/2026-06-03-embedded-document-stores-design.md`).
- **Found by:** the embedded-document-stores design (decomposed follow-up).
