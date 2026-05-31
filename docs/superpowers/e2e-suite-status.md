# TITAN E2E Test Suite — Status & Resume Handoff

**Last updated:** 2026-05-31. **Branch:** `development`. **Next action:** **Phase 3b / 3c / 3d.** Phase 3a
is **complete**. Pick up at 3b (component-tier probe harness over the base primitives), 3c (integration
manifests), and continue **3d — reactive-control sweep** (next backlog item: item/effect **expanded**
toggle; see the 3d section). Full e2e suite is **61 passing** (`npx playwright test`). All of the checks
surface (2b-1..2b-4) and Phase 3a are done.

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

(Newest first. #4–#7 found by `tests/e2e/traits.spec.js`; #8 by `tests/e2e/effect-reactivity.spec.js`.)

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

## NEXT: Phase 3 — UI component / manifest tiers (BRAINSTORM first, then plan, then execute)

**Start by invoking `superpowers:brainstorming`.** The checks surface (2b-1..2b-4) is complete. Phase 3
covers the UI component / manifest tiers: drive the rendered Svelte component surfaces (buttons, inputs,
sheet sections) and assert manifest-driven wiring. `testId` is already on the base primitives
(`Button`/`TextInput`) and on the check-dialog field/summary wrappers, so the first open question is which
component/sheet tiers to cover and what additional `testId` anchors are needed. Load `foundry-vtt` +
`titan-codebase` (+ `svelte-5` + `foundry-svelte` for any component/sheet surface touched). Route all
`.js`/`.svelte` work through the `titan-svelte-dev` subagent.

**After Phase 3:** Phase 4 (multi-user permissions + 2-client socket sync via per-user browser contexts).

**Reuse across phases:** `forceDice`/`resetDice` (`tests/e2e/dice.js`), `expectedCheckResults`
(`tests/shared/checkOracle.js`), the shared builders (`tests/shared/builders.js`), the dialog page object
(`tests/e2e/checkDialog.js`), and the fake-target-set pattern from 2b-4 (`game.user.targets` reassignment).
Dialogs select by element-id prefix, not by per-type class (the `_getDialogClasses()` overrides are dead in
v14 — see conventions.md).

## How to verify current state quickly on resume

- `npx vitest run` → expect 35 passing (incl. `tests/unit/check/**` and `check-oracle.test.js`).
- `npx playwright test tests/e2e/render-smoke.spec.js tests/e2e/logic tests/e2e/trait-add-custom.spec.js tests/e2e/traits.spec.js tests/e2e/interaction-rolls.spec.js tests/e2e/interaction-dialogs.spec.js tests/e2e/dice.spec.js tests/e2e/checks-integration.spec.js tests/e2e/checks-dialog.spec.js tests/e2e/checks-opposed.spec.js --reporter=list`
  → expect 51 passing (Foundry must be running on :30000, or webServer launches it). **After editing any
  `.svelte`/`.js` source, run `npm run build` first** so the live Foundry serves the change (test-only
  changes don't need a build).
