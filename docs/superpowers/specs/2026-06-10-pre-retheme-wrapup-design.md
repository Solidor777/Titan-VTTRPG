# Pre-retheme wrap-up: clear the small-item backlog — design

**Date:** 2026-06-10
**Status:** Design — user-approved (scope, sequencing, convergence cut list, verification bar).

## Goal

Clear the entire small-item backlog — TODOs #12, #13, #16, #17, #18, #19, #24, #25 and open bugs
#1, #2, #3, #5, #6, #7, #8 — so the upcoming major retheme starts from a clean, fully-verified
`main` with every duplicated cross-surface display already converged onto one styleable component.
TODO #2 (seeded standard-effects compendium) stays parked: content/pipeline work unrelated to
retheming.

## User decisions (locked)

1. **Scope:** the 8 TODOs plus all 7 open bugs. New todos that arise are dealt with inline, not
   deferred.
2. **#12 meaning:** inventory every remaining duplicated cross-surface display and ship ALL vetted
   convergences now (not just #25). The inventory below is verified against source.
3. **#13 bar:** a real e2e via the combat harness; fall back to a unit-level render smoke only if
   the e2e proves genuinely flaky after honest effort (findings re-logged in that case).
4. **Verification cadence:** build + lint + unit + targeted e2e per batch; ONE full e2e + unit run
   as the final gate after the last batch.
5. **Sequencing:** approach A — four risk-ordered batches, one branch each, merged serially to
   `main`.
6. **Branch cleanup:** the 5 stale merged work branches and the stale remote feat branch are
   deleted (done at design time); local `development` is kept.

## Batch 1 — housekeeping & bug fixes

Branch: `chore/pre-retheme-housekeeping`. All items mechanical, unit/lint-verifiable.

- **#17 lang TYPES:** remove the stale `TYPES.Item.effect` label from `lang/en.json`; add a
  `TYPES.ActiveEffect` map with labels for the `effect` and `condition` ActiveEffect subtypes.
- **Bug #8:** `TitanDataModel._migrateComponentData` (line ~108) and
  `_prepareComponentDerivedData` (line ~153) iterate `Object.entries(...)` so the loop variable is
  a `[key, value]` pair and the component hooks can never run. Iterate `Object.values(...)` in
  both.
- **Bug #3:** `createItemCheckParametersShape()` defaults `resistanceCheck: ''` while all guards
  compare against `'none'`. Change the shape default to `'none'` and update the golden's
  `resistanceCheck` initial from `stringField('')` to `stringField('none')`.
- **Bug #5:** `WeaponDataModel.addAttack` reads `this.parent._sheet` into a local but guards on
  `this._sheet` (always undefined) and would call the wrong handler anyway. Guard on the local
  `sheet` and call `sheet.addAttack()` so a new attack mounts expanded (mirrors `deleteAttack`).
- **Bug #2:** `CharacterDataModel.getAttackCheckParameters` never sets `parameters.attackName`, so
  the attack chat header sub-label has always rendered blank. Set it from the attack data — the
  correct source field is verified against the attack shape at plan time — and add a test
  assertion. No golden change (shape default stays `''`).
- **Bug #7:** `CharacterSheetWeaponAttack.svelte` dereferences the `attack` derived unguarded in
  `trainingDice`, `getCheckMod`, and template reads. Add an `{#if attack}` template gate and guard
  the deriveds.
- **Bug #1:** `MoveEffectToFolderDialogShell.svelte:22` `$state(initialValue)` triggers the
  `state_referenced_locally` compile error. `initialValue` never changes during the dialog's
  lifetime, so suppress locally with an explanatory `svelte-ignore` comment (the
  `SpellChatAspects.svelte` precedent) rather than re-deriving.

Verification: `npm run build` clean, ESLint clean (bug #1 was the system's only error), unit suite
green, targeted e2e for the attack-card sub-label (bug #2).

## Batch 2 — shared fingerprint harness

Branch: `chore/shared-fingerprint-harness`.

- **#16:** the four schema-equivalence suites (`ItemDataModelSchemaEquivalence.test.js`,
  `CheckChatMessageSchemaEquivalence.test.js`, `ReportChatMessageSchemaEquivalence.test.js`,
  `EffectSchemaEquivalence.test.js`) each duplicate the field-walker/fingerprint harness. Extract
  it into one shared `tests/unit/` helper module. The golden masters themselves stay inline,
  hand-authored literals per the characterization-test rule — only the walker moves.

Verification: unit suite green (the frozen goldens passing proves the shared walker produces
byte-identical fingerprints).

## Batch 3 — e2e fixture hygiene

Branch: `chore/e2e-fixture-hygiene`.

- **#24 (folds #18 + #19):** promote the hardened helper copies — `newestMessageType`,
  `deleteFixtureActor`, `controlFixtureActorToken`, `buildCheck`; the check-parity spec's variants
  are the most complete — into `tests/e2e/world.js`, parameterizing the fixture-count assumptions
  flagged in review, and retrofit the `embedded-context-*` family plus the three token-control
  specs (`effect-hud.spec.js`, `effect-tray.spec.js`, `effect-chat-card.spec.js`). While in the
  same code:
  - **#18:** suite-wide orphaned-token cleanup — delete fixture-scene tokens whose `actorId` no
    longer resolves (actor deletion does not delete placed tokens).
  - **#19:** the bounded canvas-drawn polls (50 × 50 ms waiting for `tokenDoc.object`) reject on
    exhaustion with a descriptive message (the `titanWait` pattern) instead of resolving silently.
- **Bug #6:** harden `tests/e2e/componentProbe.js` `ensureProbe` — wait for `globalThis.game?.titan`
  before injecting, and `waitForFunction(() => !!game?.titan?._probe)` after, so a mid-boot
  injection blocks instead of stranding the first probe test.
- **#13:** new e2e in `report-cards.spec.js`: `seedCombatEncounter` + an
  `initiative`-duration effect with `remaining: 1` + the `autoDecreaseEffectDuration` /
  `reportEffects` / `autoRemoveExpiredEffects` settings + `combat.nextTurn()` until expiry; assert
  `type === 'effectsExpiredReport'` and a non-empty card. Fallback per locked decision 3.

Verification: targeted run of every touched spec file; no fixed sleeps introduced (only
auto-retrying waits, per conventions).

## Batch 4 — component convergence (closes the #12 inventory)

Branch: `feat/cross-surface-display-convergence`.

The inventory was gathered by a read-only sweep and **each entry below was verified directly
against source** at design time. Two of the sweep's candidates were already converged and are
excluded: spell aspects (`SpellChatAspects` is a thin wrapper over the shared `SpellAspectTags`)
and the item-sheet sidebar check row (already renders the shared `CheckTags`).

### 4a. #25 — CastingCheckTags (increment 2 of the path-parity strategy)

Extract the shared casting-check tag display across the three spell surfaces:
`SpellChatMessage.svelte` (snapshot paths `item.castingCheck.*`),
`CharacterSheetSpellCastingCheck.svelte` (engine `checkParameters.*`),
`SpellSheetSidebarCastingCheck.svelte` (spell document config paths). The actor-context consumer
passes resolved overrides; document consumers read config paths — per the component-driven
strategy spec (`2026-06-09-path-parity-strategy-and-checktags-chat-design.md`).

### 4b. Eight per-type stats convergences

Every item type plus effect duplicates its entire footer/stats block between the character-sheet
row and the chat card, near-identically, with `system.*` path parity already holding (item cards
snapshot full `system.*`; the effect card builds from the shared `createEffectSystemTemplate()`).
Each gets ONE shared component reading the nearest `'document'` context at parity paths — the
CheckTags increment-1 pattern — replacing both the sheet footer block and the `*ChatStats`
component:

| Type | Sheet surface (footer block) | Chat surface | Contents |
|---|---|---|---|
| Ability | `CharacterSheetAbility.svelte` | `AbilityChatStats.svelte` | rarity, action/reaction/passive, xpCost, custom traits |
| Armor | `CharacterSheetArmorStats.svelte` | `ArmorChatStats.svelte` | armor icon-stat (value/max), rarity, value, traits, custom traits |
| Shield | `CharacterSheetShieldStats.svelte` | `ShieldChatStats.svelte` | defense icon-stat, rarity, value, traits, custom traits |
| Weapon | `CharacterSheetWeapon.svelte` | `WeaponChatStats.svelte` | rarity, value, custom traits |
| Equipment | `CharacterSheetEquipment.svelte` | `EquipmentChatStats.svelte` | rarity, value, custom traits |
| Spell | `CharacterSheetSpell.svelte` | `SpellChatStats.svelte` | rarity, tradition, xpCost, custom traits |
| Commodity | `CharacterSheetCommodity.svelte` | `CommodityChatStats.svelte` | quantity, rarity, value, custom traits |
| Effect | `CharacterSheetEffect.svelte` | `EffectChatStats.svelte` | duration, expired tag, custom traits |

Accepted display deltas (same class as CheckTags increment 1, converging chat and sheet):

- SCSS containers converge to the `tag-container` mixin family.
- Armor/shield trait tags converge the sheet's `TraitTag` with the chat card's
  `StatTag`/`Tag` conditional (one renderer for numeric-vs-flag traits).
- Commodity tag order unifies on the sheet's order (quantity/rarity/value — quantity is the
  commodity-salient stat); the chat card converges to it.
- Sheet `testId`s (e.g. `effect-row-duration`) appear on chat cards; e2e selectors stay
  container-scoped.

### Logged rejects (not converged, with rationale)

- **Weapon attack rows** (`CharacterSheetWeaponAttack` vs `WeaponChatAttacks`): the sheet row
  computes actor-derived dice/training/expertise the snapshot card intentionally lacks — same
  shape as the locked chat-CheckRow non-goal. `AttackTags` is already shared.
- **Item-sheet sidebar traits** (`ItemSheetSidebarTraits` + per-type wrappers): edit/add
  affordances and a component-descriptor abstraction — a deliberately different surface, not a
  display duplicate.
- **Effect-HUD inline duration** (`EffectHudRow.svelte`): a layout-specific inline use of the
  already-shared `DurationTag` primitive; no block duplication.

Verification: build clean; unit green; targeted e2e — item-cards, embedded-context family,
effect-tray/HUD/chat-card, spell casting-check surfaces.

## Final gate & documentation

- After batch 4 merges: ONE full `npm run test:e2e` + unit run on `main` (world launched, no
  concurrent build, foreground runner).
- Per batch (project rule): completed items deleted from `docs/TODO.md` / `docs/OPEN_BUGS.md`,
  fixed bugs moved to `docs/CLOSED_BUGS.md` with history, `titan-codebase` skill updated where the
  touched facts changed.
- At the end: TODO #12's entry is rewritten to record the completed inventory and that future
  increments are retheme-driven (the retheme is the next gap-finder); #25 and the other completed
  entries are deleted.
