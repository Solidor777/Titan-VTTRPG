# TITAN E2E Test Suite — Status & Resume Handoff

**Last updated:** 2026-06-01. **Branch:** `development`. **Next action:** **none queued — Phase 4 complete.**
ALL of Phase 3 AND Phase 4 are complete. Full e2e suite is **312 passing** (`npx playwright test`, on the
`npm run build:e2e` bundle); unit suite **35 passing** (`npx vitest run`). Phase 3a, ALL of Phase 3b
(component-probe coverage of all 84 primitives), ALL of Phase 3c (integration manifest drift guard),
and ALL of Phase 3d (reactive-control sweep) are done. **Phase 3 is fully complete.** **Phase 4
(multi-user permissions + 2-client socket sync) is fully complete — see the "Phase 4 — DONE" section
below; it found + fixed two real engine bugs (#17 const self-shadow crash, #18 socket relay passed dead
serialized objects).**

**Phase 3d outcome:** swept all 12 character-sheet row components for the Svelte 4→5 stale-prop reactivity
bug class (reading `<prop>.system.x` off a passed Document prop instead of through `document.data`). Found +
fixed **3 real bugs** (#13 item/effect EXPAND toggle dead on all 4 list tabs; #14 spells-tab filter
cross-wired; #15 the display-read sweep itself). +14 new e2e tests. **Canonical fix recipe** (validated):
per-leaf `$derived(document.data.<collection>.get(id)?.system.<leaf>)` — NOT `$derived(...get(id))` of the
whole doc (silently non-reactive: stable instance). One deferral: the effect duration INPUTS (two-way
`bind:value`) need a shared-input-primitive refactor → own spec. See
`docs/superpowers/specs/2026-05-31-titan-e2e-3d-reactive-sweep-design.md` + `…-worklist.md` and
`docs/superpowers/plans/2026-05-31-titan-e2e-3d-reactive-sweep.md`.

### Phase 3c — DONE (integration manifest drift guard)

- **Spec:** `tests/e2e/integration-manifest.spec.js` (8 tests). Parses `system.json` via Node
  `fs.readFileSync` inside Playwright's Node process (no `page.evaluate`) to get the ground-truth manifest,
  then asserts live Foundry `CONFIG`/`game` state against those parsed values — making the manifest
  the unambiguous source of truth.
- **What it guards (one test each):**
  1. `documentTypes` ↔ `dataModels` parity — every subtype declared in `system.json` has a registered
     `CONFIG` data model, and no extra subtypes exist at runtime.
  2. `ChatMessage` declares no subtypes (the dead `testChat` scaffolding was removed as part of this work).
  3. Every pack declared in `system.json` resolves via `game.packs.get(`titan.${name}`)` with matching
     `metadata.type` and `metadata.packageName === 'titan'`.
  4. Grid and socket config — `game.system.grid.units`/`.diagonals` and `game.system.socket` equal the
     manifest `grid` block and `socket` flag.
  5. Titan document classes are proper subclasses of the Foundry base — asserted structurally
     (`cls.prototype instanceof FoundryBase && cls !== FoundryBase`), NOT by class name (see minification
     finding below).
  6. Per-subtype sheet registration — a `titan.`-prefixed sheet with `default === true` is registered for
     every Actor/Item subtype AND the ActiveEffect `effect` subtype, and the core AppV1 sheets
     (`core.ActorSheet` / `core.ItemSheet`) are unregistered (one combined test).
  7. Runtime CONFIG flags — `CONFIG.time.roundTime === 6`, `CONFIG.ActiveEffect.legacyTransferral === false`,
     and the initiative formula prefix `@rating.initiative.value`.
  8. Titan conditions present in `CONFIG.statusEffects`; a representative set of `game.settings.settings`
     keys registered.
- **`testChat` removal** — `system.json` previously declared a `testChat` subtype under
  `documentTypes.ChatMessage`. It had NO `CONFIG.ChatMessage.dataModels` entry (OnceInit only sets the
  ChatMessage `documentClass`) and no production-code references — pure dead scaffolding. The drift-guard
  test found it; the manifest declaration was removed and ChatMessage now declares no subtypes.
- **Build minification finding (reusable gotcha):** Vite/Rollup minifies the system bundle, mangling all
  system class names (e.g. `TitanActor` → `ro`). Asserting `.name` against a literal is therefore
  unreliable in tests AND in runtime branching code. The tests instead assert document-class identity
  structurally (`cls.prototype instanceof <FoundryBaseGlobal> && cls !== <FoundryBaseGlobal>`) and match
  titan sheets by the `titan.` id prefix. Foundry CORE class names (`core.ActorSheet`, etc.) are NOT
  mangled (separate bundle), so those ids remain stable.
- Spec/plan: `docs/superpowers/specs/2026-05-31-titan-e2e-3c-integration-manifest-design.md`,
  `docs/superpowers/plans/2026-05-31-titan-e2e-3c-integration-manifest.md`.

### Phase 3b (first pass) — DONE (component-tier probe harness)

- **Gated probe harness** — `src/test-probe/` (`componentRegistry.js` + `registerProbe.js`) installs
  `game.titan._probe = { components, mount(name, props?, context?), unmount(id), unmountAll() }` inside the
  live Foundry runtime. `mount` drops a detached `<div data-titan-probe="<id>">` (positioned `fixed`, max
  `z-index` so it clears Foundry chrome for pointer events), mounts the named primitive, returns
  `{ id, selector }`. A string `text` prop becomes a `children` snippet via `createRawSnippet` (text via
  `textContent`, never raw HTML). Gated by `__TITAN_PROBE__` (Vite `define`, `true` only under
  `vite build --mode e2e`); `OnceInit.js` registers it via a fire-and-forget dynamic `import()` so terser
  tree-shakes it out of production (verified: `npm run build` → 0 probe identifiers in `index.js`).
- **New npm script** — `build:e2e` (`vite build --mode e2e`). **Build gotcha:** the component-probe specs
  require this bundle, NOT `npm run build`. The live Foundry on :30000 serves the built `index.js`, so run
  `npm run build:e2e` after any `src/` edit before running probe specs.
- **Page object** — `tests/e2e/componentProbe.js`: `mountProbe`/`readProbeEvents`/`clearProbeEvents`/
  `unmountAll`. Callbacks are instrumented INSIDE `page.evaluate` (functions can't cross the Node↔page
  boundary) and record `{ event, key }` into `window.__titanProbeEvents`.
- **Behavioral probes** — `tests/e2e/component-probe.spec.js`, 14 tests across the core set: `Button` (click
  fires/disabled suppresses/testId), `TextInput` (typing commits + keyup forwarded/disabled), `NumberInput`
  + `IntegerInput` (clamp-to-max on commit + onchange/integer commit/disabled/testId), `CheckboxInput`
  (toggle flips glyph + 2× onchange/disabled blocks), `Select` (change fires onchange + value updates,
  mount-clamp onchange cleared/disabled), `LabelTag` (renders label + testId). **No engine bugs found.**
- **testId parity** — added a `testId` (`data-testid`) prop to `NumberInput`, `IntegerInput`,
  `CheckboxInput`, `Select`, `LabelTag` (Button/TextInput already had it).
- **Backlog (3b-remaining):** the other **77** components in `src/helpers/svelte-components/**`. See the
  dedicated "Phase 3b-remaining worklist" section below for the categorized inventory and recommended order.
- Spec/plan: `docs/superpowers/specs/2026-05-31-titan-e2e-component-probe-design.md`,
  `docs/superpowers/plans/2026-05-31-titan-e2e-component-probe.md`.

## Phase 3b-remaining — DONE (full component-probe coverage)

**Outcome:** ALL **84** primitives in `src/helpers/svelte-components/**` are registered in
`componentRegistry.js` and behaviorally probed. New per-family specs: `component-probe-context.spec.js`
(11), `-tags.spec.js` (17), `-labels.spec.js` (5), `-inputs.spec.js` (8), `-selects.spec.js` (16),
`-buttons.spec.js` (13), `-display.spec.js` (7) — plus the original 7-component core
`component-probe.spec.js`. Suite **276 passing**. testId parity on every component **except `Text`** (no
root element — probe locates via the container selector). Harness extensions (Task 1/2): `mountProbe`
forwards a `context` Map; `documentContext({ isOwner })` stub; `probeComponent(name)` / `probeFn(kind, …)`
markers resolved in-page by `registerProbe.js` (component- and function-valued props can't cross the
Node↔page boundary). **Three real bugs found + fixed** (see #10–#12 in the bug log). Spec/plan:
`docs/superpowers/specs/2026-05-31-titan-e2e-3b-remaining-design.md`,
`docs/superpowers/plans/2026-05-31-titan-e2e-3b-remaining.md`. The detailed pre-execution worklist below is
retained as historical reference.

### Phase 3b-remaining worklist (historical — completed)

**Per-component recipe** (from `titan-codebase` conventions.md → "Component-probe harness"): add the import +
entry to `src/test-probe/componentRegistry.js`; add a `testId` (`data-testid`) prop if the component lacks
one; append a behavioral `describe` block to `tests/e2e/component-probe.spec.js`; `npm run build:e2e`; run.
**Build gotcha:** probe specs require the `build:e2e` bundle, NOT `npm run build`.

**Inventory by family (counts exclude the 7 already done):**
- **Tier 1 — simple leaves (do first, context-free, mostly props-only):**
  - top-level (8): `Text`, `Label`-likes, `Meter`, `ScrollingContainer`, `Tabs`, `LabeledElement`,
    `BorderedColumnList`. (`Tabs` lazy-mounts only the active tab — see Phase 3d note.)
  - label/ (5): `IconLabel`, `Label`, `ModifiableStatValueLabel`, `ModifiedValueLabel`, `TextLabel`.
  - tag/ (18): `Tag`, `IconTag`, `IconStatTag`, `LabelTag`(done-pattern), `StatTag`, `ValueTag`,
    `RarityTag`, `DurationTag`, `AttributeTag`, `AttributeCheckTag`, `OpposedCheckTag`, `ResistanceTag`,
    `ResistedByTag`, `TraitTag`, `SpellAspectTag(s)`, `SpellCustomAspectTag`, `TagContainer`, `EditDeleteTag`.
  - input/ leaves (8): `TextAreaInput`, `LabeledTextInput`, `IntegerIncrementInput`, `AttributeInput`,
    `RarityInput`, `ResistanceInput`, `ImagePicker`, `TopFilter`.
  - button/ leaves (most of 14): `IconButton`, `IconLabelButton`, `ImageButton`, `MiniButton`,
    `MiniIconButton`, `ExpandButton`, `ToggleButton`, `ToggleOptionButton`, `AttributeButton`,
    `SpendResolveButton`.
- **Tier 2 — typed selects (16, batchable):** `AttributeSelect`, `SkillSelect`, `RaritySelect`,
  `RatingSelect`, `ResistanceSelect`, `ResourceSelect`, `SpeedSelect`, `ModSelect`, `AttackTypeSelect`,
  `CheckDifficultySelect`, `DamageReducedBySelect`, `InventoryItemTypeSelect`, `RulesElementOperationSelect`,
  `ArmorTraitSelect`, `AttackTraitSelect`, `ShieldTraitSelect`. These mostly wrap the (done) `Select` with
  preset options — verify each one's required props (some take an `options`/value source); the `Select`
  probe (mount-clamp `onchange` cleared after mount) is the template.
- **Tier 3 — data/context-dependent (do last; decide harness extension):**
  - **Uses `getContext` (3):** `RichText`, `CondensedCheckButton`, `FiltereedList` — supply a stub via the
    harness's `mount(name, props, context)` `context` Map param (already designed in, currently unused).
  - **tag/effects/ (7):** `CustomEffectTag`, `EffectTag`, `ExpiredEffectTag`, `InitiativeEffectTag`,
    `PermanentEffectTag`, `TurnEndEffectTag`, `TurnStartEffectTag` — likely need an effect Document prop;
    may be better probed through the effect sheet (compare `effect-traits.spec.js`) than via the harness.
  - **editor (1):** `ProseMirrorEditor` — wraps Foundry's editor; probe render + teardown only.
  - **check-coupled buttons:** `ItemCheckButton`, `ResistanceButton`, `ResistanceCheckButton` — take check
    data; the check-dialog specs (2b-3) show the data shapes.
- Open harness question to settle in the plan: whether to extend `mount` to accept a stub Document (for the
  effect tags / check buttons) or to cover those via their sheets instead. The core-set harness deliberately
  scoped to context-free leaves; Tier 3 is where that boundary gets revisited.

### Phase 3a — DONE (sheet array-CRUD reactivity)

- **Concern A (custom traits):** items — `tests/e2e/traits.spec.js` (5 tests), found+fixed **four** real
  bugs (#4 idx string, #5 FA `font-family`/`<button>` icon, #7 localized-description tooltip, #6 edit-dialog
  missing class); effects — `tests/e2e/effect-traits.spec.js` (2 tests, lock-in, reuse the fixed sidebar).
- **Concern B (rules elements):** `tests/e2e/rules-element-crud.spec.js` (1 test) — add/delete list
  reactivity **works** (no bug; the in-place mutation is benign because `this.rulesElement` is prepared
  data, not `_source`, so Foundry still diffs and `updateItem` fires). Regression lock-in.
- **Mid-stream (reported by user):** effect-toggle reactivity bug #8 fixed (`tests/e2e/effect-reactivity.spec.js`,
  seeds Phase 3d), icon hover #9 restored.

## Phase 3d — reactive-control e2e sweep (scoped per user, 2026-05-31)

**Decision:** the systemic Svelte-5 reactivity issue (a control reading `someDocProp.system.x` off a passed
Document prop instead of through `document.data` → stale-until-remount) is verified **behaviorally in the
e2e suite**, one test per interactive reactive control. Pattern: render the sheet, activate the control,
assert the rendered result updates **in place (no tab switch)**. Each failure is a real bug → fix by reading
through `document.data` (e.g. `$derived(document.data.<collection>.get(id)?.system.x)`), TDD red→green.

- **Done:** effect **active** toggle — `tests/e2e/effect-reactivity.spec.js` (fixed bug #8).
- **Backlog (named by user):** item/effect **expanded** toggle; then sweep the remaining toggles, selects,
  and inputs whose displayed value derives from a passed Document prop (inventory/ability/spell/effect
  rows). Add a test per control; fix any that fail.
- Note: `Tabs.svelte` lazy-mounts only the active tab, so cross-tab effects always re-mount regardless —
  in-place reactivity tests must stay within the active tab.

This is a living status doc for the multi-phase E2E test suite. Read it on resume to continue without
re-deriving context.

## Working agreements (carry across all phases)

- **Delegation:** route ALL `.js` / `.svelte` / `.svelte.js` work to the `titan-svelte-dev` subagent
  (loads `svelte-5`/`foundry-vtt`/`foundry-svelte`/`titan-codebase`). Follow `.claude/CLAUDE.md` style.
- **Execution:** subagent-driven-development — fresh subagent per task, Sonnet for mechanical tasks,
  Opus for integration/judgment/bug-fixes. Per-task spec+quality review (inline for trivial tasks).
- **No git worktree:** the running Foundry on `:30000` serves THIS directory's built `index.js`, so the
  e2e loop requires working in-place. Stay on `development`.
- **Login as `E2E GM 1`** (the `login(page, user)` default) — never the human's `Gamemaster` session.
  Four test users exist: `E2E GM 1/2`, `E2E Player 1/2` (no passwords) — see `tests/e2e/users.js`.
- **Build output is gitignored** (`index.js`, `index.js.map`, `style.css`) — never `git add` it;
  rebuild with `npm run build` so the live Foundry serves source changes.
- **Quench is removed** — it is broken on v14; logic layer is Playwright + fast-check. Do not reintroduce.
- **packs/effects/** LevelDB files churn during e2e runs (runtime noise, incl. a `lost/` recovery dir) —
  leave them uncommitted. (Candidate future cleanup: gitignore `packs/**/*.log`, `MANIFEST-*`, `lost/`.)

## Specs & plans (committed)

- Suite spec (Foundation/UI/multi-user): `docs/superpowers/specs/2026-05-30-titan-e2e-suite-design.md`
  (its Quench logic layer is **superseded**).
- Logic-layer spec (Playwright + fast-check): `docs/superpowers/specs/2026-05-30-titan-e2e-logic-layer-design.md`.
- Checks-surface spec: `docs/superpowers/specs/2026-05-30-titan-e2e-checks-design.md` (4 concerns →
  plans 2b-1..2b-4).
- Plans: `docs/superpowers/plans/2026-05-30-titan-e2e-foundation.md`,
  `…-logic-foundation-rules-elements.md`, `2026-05-31-titan-e2e-checks-engine.md`.

## Done

- **Phase 1 Foundation** ✅ — `users.js`, `login(page,user)`→`E2E GM 1`, Playwright `webServer`
  auto-launch + npm scripts, shared builders (`tests/shared/builders.js` return create-payloads),
  `testId` prop on `Button`/`TextInput`. (Quench bridge from this phase was later removed.)
- **Phase 2a rules elements** ✅ — fast-check harness (`tests/e2e/global-setup.js` esbuild-bundles
  fast-check to an IIFE; `tests/e2e/fast-check.js` `injectFastCheck(page)` adds it as the `fc` page
  global via `addInitScript` — note the esbuild `footer:{js:'globalThis.fc = fc;'}` is REQUIRED because
  addInitScript wraps the script in a function). `tests/e2e/logic/rules-elements.spec.js`: flatModifier
  / mulBase example tests + a fast-check stacking/clamp property test. Builders:
  `buildFlatModifierAbilityData`, `buildMulBaseAbilityData` (use ABILITY items — they apply rules
  elements on ownership; weapons/equipment need `equipped===true`; armor/shield must be equipped slot).
  Derived attribute path: `actor.system.attribute.body.value`; player base = 1.
- **2b-1 checks-engine** ✅ — `tests/unit/check/` vitest + fast-check: `calculate-check-results.test.js`,
  `apply-expertise.test.js`, `type-results.test.js`, `check-test-helpers.js`. fast-check imported as
  `import fc from 'fast-check'` (works). Full unit suite: 32 tests green.
- **2b-2 checks-integration** ✅ — forced-dice Playwright proof that all five `roll<Type>Check` APIs
  assemble parameters from the actor and plumb dice into `flags.titan`. Determinism seam: `tests/e2e/dice.js`
  `forceDice(page,faces)`/`resetDice(page)` stub `CONFIG.Dice.randomUniform` (force face `f` via
  `u=(6.5-f)/6`; `mapRandomFace` confirmed `ceil((1-u)*6)` on v14). Independent results oracle (no engine
  import): `tests/shared/checkOracle.js` `expectedCheckResults(faces, params)`, validated by
  `tests/unit/check/check-oracle.test.js`. Shared fixture builders `buildE2ERollerActorData` /
  `buildE2ERollerItemData` in `tests/shared/builders.js` (roller actor + weapon/spell/ability; ability
  carries the inlined item-check entry AND flatModifier +2 body/+2 mind → those checks roll 3 dice).
  `tests/e2e/checks-integration.spec.js`: 5 tests, all at `totalExpertise=0`, difficulty 4; complexity 0 for
  attribute/resistance, 1 for attack/casting/item; **resistance stays 1 die** (resistances derive from
  attribute baseValues, so attribute flatModifiers don't boost resilience). No engine bugs found; all
  fixture-table values held without loosening any assertion.
- **2b-3 checks-dialog** ✅ — drives all five rendered Svelte check-option dialogs from Playwright.
  Added a `testId` prop to the shared wrappers (`CheckDialogField`→`.field`, `CheckDialogSummary`→
  `.tag`, `CheckDialogBase` Roll/Cancel buttons) and stable keys to all 18 concrete field/summary
  components (`check-field-<key>`, `check-summary-<key>`, `check-dialog-roll`). Page object
  `tests/e2e/checkDialog.js` opens via the gated `request<Type>Check` (sets `getCheckOptions`), drives
  native widgets (number input commits on **keyup** via a dispatched keyup; native `<select>`;
  checkbox is a toggle `<button>`, checked = `i.fa-check`), reads `.tag` totals, clicks Roll, reads
  newest `flags.titan`. Spec `tests/e2e/checks-dialog.spec.js`: 5 core (mutate diceMod/expertiseMod/
  doubleExpertise → assert recomputed totals → reset expertise to 0 → Roll → verify via the 2b-2
  `expectedCheckResults` oracle) + attribute difficulty-`<select>` flow-through + attack `targetDefense`
  clamp-to-6 flow-through = **7 tests, all green**. **Gotcha:** the per-type dialog CSS classes
  (`titan-<type>-check-dialog`) are NOT rendered — v14 `TitanDialog` hardcodes `['titan','titan-dialog']`
  and never calls the (dead) `_getDialogClasses()` overrides; select dialogs by the stable element **id**
  prefix `[id^="titan-<type>-check-dialog-"]` instead. Found + fixed one real engine bug (#3 below).

- **2b-4 checks-opposed** ✅ — drives both opposed mechanics through the dialog-bypassing roll APIs;
  spec `tests/e2e/checks-opposed.spec.js` = **6 tests, all green**. **Part A (attack vs Defense, 4 tests):**
  skips the canvas entirely — temporarily reassigns `game.user.targets` to a fake `Set` of `{ actor }`
  entries (the exact shape `getTargetedCharacters()` reads via `Array.from`), restoring it in a `finally`.
  `User#targets` is a plain own-property, not a getter, so this is safe. `rollAttackCheck` (bypass API)
  reaches `initializeAttackCheckOptions`'s target auto-populate, so no dialog/canvas is needed. Covers
  interior difficulty, **both** clamp bounds (2 and 6 — needs the roller's attack rating boosted to 6 via a
  `rating`/`melee`+`accuracy` flatModifier ability, because Defense floors at 0 so a base-1 attacker can't
  drive the lower clamp), first-target-wins (`targets[0]`), and the no-target fallback (difficulty 4). Tests
  read `targetDefense`/`attackerRating` from `flags.titan.parameters` and recompute the clamp, so they don't
  hardcode rating internals. **Part B (resistance vs damage, 2 tests):** `rollResistanceCheck({ resistance,
  difficulty, complexity, damageToReduce })` — the same options the Resist button passes — with forced dice
  controlling `succeeded`; asserts `flags.titan.results.damageTaken === damageToReduce − successes` on a
  failed resist and `=== 0` on a successful one. New builders in `tests/shared/builders.js`:
  `buildE2ETargetActorData`, `buildE2ETargetDefenseItemData`, `buildE2EAttackerRatingItemData`. No engine
  bugs found; all fixture-table difficulties held exactly. Spec/plan:
  `docs/superpowers/specs/2026-05-31-titan-e2e-checks-opposed-design.md`,
  `docs/superpowers/plans/2026-05-31-titan-e2e-checks-opposed.md`.

## Bugs found & fixed (by this testing effort)

(Newest first. #4–#7 found by `tests/e2e/traits.spec.js`; #8 by `tests/e2e/effect-reactivity.spec.js`;
#10–#12 by the Phase 3b-remaining component probes; #13–#15 by the Phase 3d reactive-control sweep;
#17–#18 by the Phase 4 socket-sync tests.)

18. **System socket relayed dead (serialized) document objects → cross-client turn effects never applied**
    — `SocketManager.triggerSocketHook` fires the hook locally with live `Combatant`/`Combat` instances, then
    `game.socket.emit`s the SAME args; socket.io JSON-serializes them, so REMOTE clients received plain
    objects (no methods/getters — `combat.constructor.name === 'Object'`, `combat.id === null`, only raw
    fields like `._id`/`initiative` survive). `onCombatNextTurn`/`onCombatPreviousTurn` then threw on
    `combat.getCharacterCombatants()` and applied nothing. So whenever the best-owner client was NOT the one
    that advanced the turn (e.g. two GMs), the turn effect never replicated — defeating the socket's entire
    purpose. Latent in single-GM play (the advancer IS the best owner, handled by the local fire). Fixed by
    emitting combatant/combat **IDs** from `TitanCombat.nextTurn`/`previousTurn` and re-resolving to live
    documents at the top of both handlers (`isCurrentUserBestOwner` single-writer gating unchanged). Found by
    socket-sync test A5; replicated with a throwaway diagnostic before fixing. Commit `b4ca5729`; regression
    `tests/e2e/socket-sync.spec.js` A5. **Rule:** never pass live Documents through `triggerSocketHook` — pass
    IDs and re-resolve.
17. **Turn-effect paths crashed via `const` self-shadowing an imported accessor** — multiple turn-start/
    turn-end/resolve paths in `CharacterDataModel` wrote `const reportEffects = reportEffects()` (and the same
    for `autoRemoveExpiredEffects`, `autoRegainResolve`, `autoRevertResolveRegain`) — a `const` whose RHS calls
    the identically-named imported function, a temporal-dead-zone `ReferenceError` ("Cannot access 'X' before
    initialization") thrown every time those paths run. So `onTurnEnd` / `_calculateResolveRegain` / the
    resolve-revert path crashed for ANY actor in combat. Fixed by renaming the locals to distinct names
    (`shouldReportEffects` / `autoRemoveExpiredEffectsSetting` / `autoRegainResolveSetting` /
    `autoRevertResolveRegainSetting`); behavior-preserving. Swept all of `src/` — no other instances. Found by
    socket-sync test A1 (`onTurnStart → _calculateResolveRegain` threw, blocking the persistent-damage apply).
    Commit `00769f0a`.
16. **Dead `testChat` ChatMessage subtype in `system.json` (manifest drift)** — `system.json` declared a
    `testChat` document subtype under `documentTypes.ChatMessage`. There was NO matching
    `CONFIG.ChatMessage.dataModels` entry (OnceInit only sets the ChatMessage `documentClass`), no sheet
    registration, and no production-code reference — pure dead scaffolding. Found by the Phase 3c
    `integration-manifest.spec.js` no-subtypes assertion. Removed the manifest declaration (commit
    `566c7d0f`). ChatMessage now correctly declares no subtypes.

15. **Character-sheet row display values stale-until-remount (Svelte 4→5 migration fallout, systemic)** —
    all 12 character-sheet row components (`CharacterSheetAbility`/`Commodity`/`Equipment`/`Armor`(+`Stats`)/
    `Shield`(+`Stats`)/`Weapon`(+`Attack`/`Attacks`/`MultiAttackButton`)/`Spell`/`ItemTradition`/`Effect`)
    read `item.system.x` / `effect.system.x` off the passed Document prop, so edits made while the row stayed
    mounted (rarity, value, defense, xpCost, description, duration tag, isExpired, etc.) did not re-render
    until the list re-mounted. Fixed by re-reading each DISPLAY value through the reactive store, **per-leaf**:
    `$derived(document.data.<collection>.get(id)?.system.<leaf>)`. **Gotcha (load-bearing):** deriving the
    whole doc — `$derived(document.data.items.get(id))` then `x?.system.y` — is **silently non-reactive**
    because `.get(id)` returns the SAME instance across `update()`, so the `$derived` `===` check
    short-circuits; you must derive a CHANGING leaf (a primitive, or a `.system.<subobject>` whose ref is
    rebuilt on update). Anchor `CharacterSheetAbility` (commit `0efaf9b6`) used a function-accessor variant
    for its 8 reads. Commits `0efaf9b6`/`eb680405`/`9d29b843`/`6d5d5092`/`338c2dd3`/`e1e21a1a` (+`let`→`const`
    review fix). Regressions: `tests/e2e/reactive-{ability,inventory-basic,armor-shield,weapon,spell,effect-rows}.spec.js`.
    **DEFERRED:** the effect duration INPUTS (two-way `bind:value`) still don't reflect external in-place
    updates — needs a one-way `value`+commit refactor of the shared `IntegerIncrementInput`/`NumberInput`
    primitives (cascading → own spec). conventions.md documents the rule.
14. **Spells-tab filter input cross-wired to the abilities filter** — `CharacterSheetSpellsTab` bound its
    filter `TextInput` to `$appState.tabs.abilities.filter` while the list read `tabs.spells.filter`, so the
    spells filter box did nothing (and silently mutated the abilities filter). One-line fix; found by the
    expand-toggle code review. Commit `a509a771`; regression `tests/e2e/spells-filter.spec.js`.
13. **Item/effect EXPAND toggle dead on all 4 list tabs (effects/abilities/spells/inventory)** — clicking a
    row's expand chevron flipped the bound `isExpanded` but nothing re-rendered. Root cause: expansion state
    lives in the `applicationState` `writable` store under `tabs.<tab>.isExpanded` (a plain `{}`), but each
    tab passed that inner object DOWN as an `isExpandedMap` prop and the leaf bound
    `bind:isExpanded={isExpandedMap[id]}`. Mutating a plain object member is not a `$appState.x = v`
    assignment, so Svelte emitted no `appState.set()` → no subscriber notified → no re-render. (The sibling
    `bind:value={$appState.tabs.effects.filter}` works precisely because it is rooted at `$appState`.) Fixed
    by **re-rooting the bind at `$appState`** inside the 3 list components (`CharacterSheetEffectList` static
    path; `CharacterSheetItemList`/`CharacterSheetMultiItemList` via a new `tabKey` string prop +
    `$appState.tabs[tabKey].isExpanded[id]`), the 4 tabs passing `tabKey`. Confirmed Svelte DOES emit the
    store-write for dynamic-keyed `$appState` assignments. The user had flagged this control as the 3d
    backlog item. Commit `5ed6ce3b` (+review `7790d241`); regression `tests/e2e/reactive-expanded-toggle.spec.js`.
12. **`ToggleOptionButton` off-state silently un-clickable (Foundry global `.disabled` collision)** — the
    component rendered its OFF state as `<div class="toggle disabled">`. Foundry's `foundry2.css` defines
    `.disabled { pointer-events: none; }`, so the wrapper and its inner `<button>` became non-interactive
    whenever `enabled` was falsy. `ToggleOptionButton` is the filter-option toggle on the character
    ability/inventory tabs and spell aspect settings — so a filter toggled OFF could never be clicked back
    ON. Fixed by renaming the off-state class to `not-enabled` (the component's own SCSS only styles
    `.enabled`, so the off-state carried no intended styling). Same class-of-bug as #5. Found by
    `component-probe-buttons.spec.js`; commit `98ce4e29`. conventions.md now documents the `.disabled`
    gotcha.
11. **`IntegerIncrementInput` imported `~/system/icons.js` (lowercase)** — the file is `Icons.js`; all 117
    other imports use the capital form. Works on Windows (case-insensitive FS) but a latent failure on
    case-sensitive filesystems (Linux/CI). Fixed the casing; commit `a69ce75e`.
10. **`FiltereedList` rendered the UNFILTERED list (item-sheet Checks-tab search filter was dead)** — it
    computed `filteredEntries` (filter + map) and gated the list on `filteredEntries.length > 0`, but the
    `{#each}` iterated the raw `entries`, so the filter/map were discarded at render — typing in the
    Checks-tab filter narrowed nothing, and a no-match filter hid the whole list. Sole consumer is
    `ItemSheetChecksTab`, whose child `ItemSheetCheckSettings` indexes the UNFILTERED arrays by `idx`, so the
    fix had to preserve each entry's ORIGINAL index. Fixed (user-approved contract): `filteredEntries =
    entries.map((entry, idx) => ({ entry, idx })).filter(({ entry }) => filterFunction(entry))`, `{#each
    filteredEntries as { entry, idx } …}` passing original entry+index to `id`/`component`/`propsFunction`;
    removed the now-unused `mapFunction` prop (+ its call-site line) and dead `getContext` reads. Regression:
    `component-probe-context.spec.js` (isolation, proves filter + original-index preservation) +
    `filtered-list-checks.spec.js` (live checks-tab narrow). Commits `95b7d216`, `587c33c9`.
9. **Edit/delete icon buttons lost their hover highlight** — the anchors→buttons conversion (`5ea0c5d5`)
   dropped Foundry's default `a:hover` glow. Restored a `text-shadow: 0 0 8px var(--color-shadow-primary,
   currentColor)` hover on the reset `.tag button` (text-shadow inherits to the inner `<i>`). Commit
   visual-only (no automated test). Commit on `development`.
8. **Sheet not reactive on effect toggle (Svelte 4→5 migration fallout)** — toggling an effect's active
   state updated the data and fired `updateActiveEffect`, but the rendered toggle's checkmark stayed stale
   until the tab re-mounted. Root cause: `CharacterSheetEffectToggleActiveButton` read
   `active={effect.system.isActive}` off the **passed doc prop**, not through the reactive `document.data`
   bridge — Svelte 5 fine-grained reactivity only tracks reads that go through `document.data`, so the
   expression had no dependency and never re-ran. Fixed with
   `$derived(document.data.effects.get(effect.id)?.system.isActive)`. Commit `a960e135`. **SYSTEMIC RISK:**
   this antipattern (`someProp.system.x` read off a Document prop instead of `document.data...`) likely
   recurs across other list/row components from the in-progress Svelte-5 migration; each instance is
   stale-until-remount. A comprehensive audit/sweep is its own task (flagged, awaiting decision) — the
   `titan-codebase` conventions note now documents the rule. Also note: `Tabs.svelte` lazy-mounts only the
   active tab (`{#if tab.id === activeTab}`), so cross-tab effects always need a re-mount regardless.

7. **Custom-trait description tooltip was localized** — the description is user-written, but
   `ItemSheetCustomTraitTag` passed it to `labelTooltip` as a bare string, and `processTextData` runs plain
   strings through `localize()`. A description equal to a key (or any future key collision) would be
   replaced by its localized value. Fixed by passing `{ text: description, localize: false }` (the
   `TextData` opt-out); edit/delete tooltips remain localized keys. Commit `f4247c55`. Regression reads the
   label's tippy `props.content` and asserts it is the raw text.
6. **Edit-custom-trait dialog never got its CSS class** — `EditCustomTraitDialog` added
   `titan-edit-custom-trait-dialog` via the dead `_getDialogClasses()` override (not called in v14), unlike
   `AddCustomTraitDialog` which uses `classes:[...]`. Fixed by moving it to `classes:[...]` in `super()` and
   deleting the dead override. Commit `a07323c4`. (Select that dialog by class OR id prefix now.)
5. **Trait edit/delete icons rendered as the notdef "missing" box** — root cause is **`font-family`**, not
   weight: `EditDeleteTag` put the FontAwesome class directly on a `<button>`, and Foundry's button UI font
   (`Signika…`) overrides `.fas`'s `font-family` (higher specificity), so the glyph fell back to notdef.
   (The old code used `<a>` anchors, which weren't overridden.) Fixed by moving the icon class onto an
   **inner `<i>`** — the standard FA pattern, matching every working icon in the system. Commit `aa13c8b4`.
   Regression asserts the icon element's computed `font-family` matches `/Font Awesome/`. NOTE: an earlier
   commit (`3a8ef8d1`) also dropped a `font-weight: inherit` from the same reset — a real-but-incidental
   tidy-up that did NOT fix the icons (it was a red herring surfaced by a too-weak first assertion); the
   font-family/inner-`<i>` fix is the actual one.
4. **Custom-trait edit and delete silently no-op'd** — `ItemSheetSidebarTraits.svelte` built the trait tags
   with `for (const [idx] in document.data.system.customTrait)`. `for...in` yields string keys and the
   `const [idx]` destructuring takes the first character, so `idx` was a **string** ("0",…). The downstream
   handlers compare strictly against numeric indices (`deleteCustomTrait`: `filter((t,i)=> i !== traitIdx)`
   → `0 !== "0"` true → nothing removed; `editTrait`: `map((t,i)=> i === traitIdx ? …)` → `0 === "0"` false
   → nothing replaced). ADD ignores the index, so it appeared to work — exactly the reported symptom. Fixed
   with a numeric `for` loop; the same copy-pasted antipattern in `ArmorSheetSidebarTraits` /
   `ShieldSheetSidebarTraits` (`system.trait`, render-only `LabelTag`s — benign except mis-keying ≥10
   entries) was corrected too. Commit `c7a543f6`. Found by `tests/e2e/traits.spec.js`.

1. **Trait reactivity** — in-place mutation of `document.system.customTrait` before `update()` defeated
   `ReactiveDocument` change-detection (saved but didn't re-render). Fixed across custom-trait
   add/edit/delete (items + effects). Regression test: `tests/e2e/trait-add-custom.spec.js`. (Same
   antipattern still lurks in `TitanActiveEffect` inline-`check` paths and `RulesElementMixin`
   add/delete — see conventions.md gotcha.)
2. **Expertise overspend** — `_applyExpertise` (`src/check/Check.js`) crit-success loop spent expertise
   it didn't have (negative remaining, unpaid crit). Found by the fast-check invariant. Fixed with an
   affordability guard (commit `29c5083e`).
3. **Item check-options dialog self-closes** — `createItemCheckOptions` defaults `itemRollData` to the
   literal `false`, but `validateItemCheckOptions` resolved it with `??` (`options.itemRollData ?? items
   .get(itemId)?.getRollData()`), so the `false` never fell back to the item lookup → validation failed
   → the item dialog's mount `$effect` ran `onCheckInvalid()` → `application.close()`, making item checks
   unrollable via the dialog. The 2b-2 bypass-API tests missed it (they don't round-trip initialized
   options through validate). Fixed by aligning validate to the truthy fallback (`||`) its two siblings
   (`initializeItemCheckOptions`, `getItemCheckParameters`) already use (commit `f155c1e0`). Found by the
   2b-3 item dialog test.

## Phase 4 — DONE (multi-user permissions + 2-client socket sync)

**Spec/plan:** `docs/superpowers/specs/2026-06-01-titan-e2e-phase4-multiuser-design.md`,
`docs/superpowers/plans/2026-06-01-titan-e2e-phase4-multiuser.md`. Suite **312 passing** (+14).

- **Two-client harness** — `tests/e2e/multiClient.js`: `withClients(browser, { label: userName }, fn)` creates
  one browser CONTEXT per client (separate sessions), logs each in via `login`, yields a page map, and
  closes all contexts in a `finally`. `awaitUsersActive(page, names)` polls until users report active.
  Two simultaneous clients = two contexts in ONE test (config is `workers:1, fullyParallel:false`).
- **Settings control** — `tests/e2e/settings.js`: `setWorldSetting(gmPage,…)` (world scope ⇒ GM writer; read
  live so no reload), `setClientSetting(page,…)` (per-client), `getSetting`.
- **Combat seeding** — `tests/shared/combat.js`: `seedCombatEncounter(opts)` / `teardownCombatEncounter(ids)`,
  self-contained fns passed to `page.evaluate`. Creates two `player` actors (effect actor at the LOWER
  initiative so one `nextTurn()` starts its turn), a scene with a token per actor (REQUIRED — `Combatant.actor`
  resolves via `this.token.actor`; `actorLink` defaults true), and a started Combat at round 1/turn 0.
  Pre-seeds stamina/resolve and grants an observer OWNER.
- **Plan Group A — socket sync** (`tests/e2e/socket-sync.spec.js`, 5 tests A1–A5): GM advances the turn, the
  best owner applies the turn effect, the OTHER client observes the replicated `system.resource.*` via
  `waitForFunction`. A1 persistent damage, A2 fast healing (pre-seed stamina low), A3 resolve regain
  (resolve max for a base player is **1**: soul baseValue 1 × 0.5, floored → regain 0→1), A4 `previousTurn`
  reversion, **A5 the relay proof** (two GM clients: GM 2 advances, GM 1 = best owner applies exactly once).
- **Plan Group B — permissions**: B1 sheet ownership levels (`permissions-ownership.spec.js`, 4 tests —
  asserts via `testUserPermission`/`sheet.isVisible`/`isEditable`; NOTE Foundry replicates the Actor doc to
  ALL clients regardless of ownership, so NONE asserts no-view-permission, not absence); B3 compendium
  ownership (`permissions-compendium.spec.js` — fs-parses `system.json`, asserts `CompendiumCollection#getUserLevel`:
  GM→3 OWNER, player→2 OBSERVER, matching `effects` pack `PLAYER:OBSERVER`); B4 auto-open settings
  (`permissions-auto-open.spec.js`, 2 tests — client-scope `autoOpenCharacterSheetsGM` `all`/`disabled`,
  asserts `actor.sheet.rendered` after turn start). B2 (best-owner write routing) = A5, counted once.

**Reusable findings:** (a) `SocketManager` JSON-serializes its emit args — NEVER pass live Documents through
`triggerSocketHook`; pass IDs and re-resolve (bug #18). (b) `const X = X()` shadowing an imported accessor is
a TDZ ReferenceError (bug #17). (c) `CompendiumCollection#getUserLevel(user)` returns the numeric ownership
level via `Math.max` over satisfied roles. (d) `requiresReload:true` settings still read live via their
accessors, so `game.settings.set` takes effect in-test without reload.

**Open follow-ups:**
(1) **DONE (2026-06-01)** — hardened the bug-#18 socket relay against the theoretical remote race: both
combat turn hooks now re-resolve the relayed combat/combatant IDs via a bounded retry (`retryResolve`,
5×50 ms) and `warn` on exhaustion instead of dropping the apply silently. Spec/plan
`docs/superpowers/specs/2026-06-01-socket-relay-race-hardening-design.md` /
`docs/superpowers/plans/2026-06-01-socket-relay-race-hardening.md`; util
`src/helpers/utility-functions/RetryResolve.js` (+ `tests/unit/RetryResolve.test.js`, 4 cases); commits
`5310e850`/`33750d50`/`f0a2b138`. Suite still **312 e2e** / **39 unit** passing.
(2) **OPEN (needs user go-ahead)** — make the effect-duration INPUTS reactive (one-way value+commit refactor
of the shared `IntegerIncrementInput`/`NumberInput`, carried over from Phase 3d; see the "Deferred" block
lower in this doc).

### Phase 4 kickoff prep (historical — completed)

- **Test identities** (`tests/e2e/users.js`): four no-password users — `E2E GM 1/2` (`GM_USERS`),
  `E2E Player 1/2` (`PLAYER_USERS`); `DEFAULT_GM = 'E2E GM 1'`. `login(page, user)` (`tests/e2e/fixtures.js`)
  already accepts any identity by display name.
- **Two simultaneous clients = two browser CONTEXTS in ONE test.** `playwright.config.mjs` runs
  `workers: 1, fullyParallel: false`, so multi-client must happen WITHIN a single test: create
  `const ctxA = await browser.newContext()` / `const pageA = await ctxA.newPage()` (repeat for B), then
  `login(pageA, 'E2E GM 1')` + `login(pageB, 'E2E Player 1')`. Each context has its own session/cookies so
  the two Foundry clients are genuinely independent. (Tests get `browser` from the Playwright fixture.)
  Remember to `ctx.close()` both in a `finally`.
- **Socket-sync surface is SMALL and known.** The only system socket usage is `system.titan` →
  `SocketManager.triggerSocketHook(id, ...args)` (`src/helpers/SocketManager.js`), emitted ONLY by
  `TitanCombat` (`src/document/types/combat/TitanCombat.js`) for `'combatNextTurn'` / `'combatPreviousTurn'`.
  Those hooks drive cross-client replication of turn-change effects (auto fast-healing / persistent-damage
  apply+revert, gated by the world settings in `SystemSettings.js`). So a socket-sync test = drive a Combat
  turn change on the GM client, assert client B receives the hook / sees the replicated document state
  (`page.waitForFunction` on the second client to avoid flakiness — never a fixed sleep).
- **Permissions surface = Foundry document ownership/visibility.** Brainstorm what a Player client should
  see vs a GM: sheet ownership levels (NONE/LIMITED/OBSERVER/OWNER), which documents/fields are visible or
  editable, the `autoOpenCharacterSheetsPlayer` / `autoOpenCharacterSheetsGM` settings, and the
  `effects` compendium `ownership` (`PLAYER: OBSERVER`, `ASSISTANT: OWNER`) declared in `system.json`.
- **Open questions to settle in the brainstorm:** (a) scope — permissions only, socket only, or both?
  (b) determinism — the auto-apply settings have `enabled`/`showButton`/`disabled` modes; pin them per test.
  (c) does the test need to seed a `Combat` encounter with combatants (reuse `tests/shared/builders.js`)?
  (d) assertion strategy on client B (poll the document/hook, not the DOM, where possible).

**Deferred (optional, not Phase 4):** make the effect duration INPUTS reactive — needs a one-way
`value`+commit-with-value refactor of the shared `IntegerIncrementInput`/`NumberInput` primitives
(cascading; own spec + user approval). See the 3d worklist "Deferred / follow-up".

**DONE (2026-06-01, was: Deferred Phase 4 outcome):** hardened the combat-turn socket relay against the
theoretical remote race. The bug-#18 fix emits IDs and re-resolves in
`OnCombatNextTurn`/`OnCombatPreviousTurn` via `game.combats.get(combatId)` / `combat.combatants.get(id)`; the
`system.titan` socket and Foundry's native combat replication are independent network paths, so on a congested
remote client the socket could arrive before the embedded-combatant update applied → `.get(id)` `undefined` →
the guard dropped the apply silently. Resolved: both handlers now wrap the three-way resolution in
`retryResolve` (`src/helpers/utility-functions/RetryResolve.js`, bounded 5×50 ms, yields between attempts) and
`warn` on exhaustion (diagnosable, no longer silent). The downstream best-owner write gate is unchanged, so
retry cannot double-apply. Spec/plan `2026-06-01-socket-relay-race-hardening-*`.

Load `foundry-vtt` + `titan-codebase` (+ `svelte-5` + `foundry-svelte` for any component/sheet surface
touched). Route all `.js`/`.svelte` work through the `titan-svelte-dev` subagent.

**Reuse across phases:** `forceDice`/`resetDice` (`tests/e2e/dice.js`), `expectedCheckResults`
(`tests/shared/checkOracle.js`), the shared builders (`tests/shared/builders.js`), the dialog page object
(`tests/e2e/checkDialog.js`), and the fake-target-set pattern from 2b-4 (`game.user.targets` reassignment).
Dialogs select by element-id prefix, not by per-type class (the `_getDialogClasses()` overrides are dead in
v14 — see conventions.md).

## How to verify current state quickly on resume

- `npx vitest run` → expect 35 passing (incl. `tests/unit/check/**` and `check-oracle.test.js`).
- `npm run build:e2e` then `npx playwright test --reporter=list` → expect **312 passing** (Foundry must be
  running on :30000, or the `webServer` config launches it). The full suite includes the seven
  `tests/e2e/component-probe*.spec.js` family files (all 84 primitives), the Phase 3d
  `tests/e2e/reactive-*.spec.js` + `spells-filter.spec.js` files, the Phase 3c
  `tests/e2e/integration-manifest.spec.js` (8 tests), and the Phase 4 multi-user files
  (`multi-client`, `combat-seed`, `socket-sync` A1–A5, `permissions-ownership`, `permissions-compendium`,
  `permissions-auto-open`) — all REQUIRE the `build:e2e` bundle (a plain `npm run build` strips the gated
  probe).
- **Build discipline:** after editing any `.svelte`/`.js` source, run `npm run build:e2e` first so the live
  Foundry serves the change AND keeps the gated component probe available (a plain `npm run build` strips the
  probe, breaking `component-probe.spec.js`). Test-only changes don't need a build.
