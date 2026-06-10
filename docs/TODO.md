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

### 12. Chat-message ↔ document path parity (schema-from-shape)

- **Update (2026-06-09):** strategy locked **component-driven** (spec
  `specs/2026-06-09-path-parity-strategy-and-checktags-chat-design.md`): each increment converges
  one duplicated cross-surface display onto a shared component reading parity paths; schema work
  only where parity is missing. Increment 1 shipped — `ItemChatMessageItemChecks` renders intrinsic
  check tags via the shared `CheckTags` (zero schema change). Increment 2 = #25 (CastingCheckTags).
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

### 25. CastingCheckTags: extract the shared casting-check tag display

- **What:** The casting-check tag display (AttributeCheckTag + stats) is hand-rendered on three
  spell surfaces: `SpellChatMessage.svelte` (snapshot paths `item.castingCheck.*`),
  `CharacterSheetSpellCastingCheck.svelte` (engine `checkParameters.*`), and
  `SpellSheetSidebarCastingCheck.svelte` (spell document config paths).
- **To do:** Extract a shared casting-check tag component per the component-driven path-parity
  strategy (increment 2 of #12); the actor-context consumer passes resolved overrides, document
  consumers read config paths.
- **Found by:** #12 increment-1 gap inventory (2026-06-09).