# Closed Bugs

Previously closed bugs and their history. Open bugs live in `docs/OPEN_BUGS.md`; entries move here
when fixed.

### 1. Casting-check roll-time auto-max added the purchase count, not the increment-scaled amount

- **What:** `calculateCastingCheckResults` (`src/check/types/casting-check/CastingCheckResults.js`),
  in the single-affordable-scaling-aspect auto-maximize branch, grew `currentValue` by
  `delta * Math.max(initialValue, 1)` but added only `delta` (the purchase count) to
  `results.damage`/`results.healing`. The chat card's per-step controls
  (`CastingCheckChatMessageScalingAspect.svelte`) move damage/healing by `max(initialValue, 1)` per
  step, so for an `initialValue: 2` damage aspect with 2 extra successes the roll auto-maxed value
  +4 / damage +2, and two card decreases then subtracted 4 — leaving damage 2 below its base.
- **Severity:** Low / narrow. The divergence is reachable only with `initialValue > 1` scaling
  aspects (at `initialValue` 0 or 1 the increment is 1, so `delta × 1 ≡ delta`).
- **Found:** 2026-06-06 by the Task 4 quality review of the chat-mount-keying characterization
  tests (plan `docs/superpowers/plans/2026-06-06-chat-mount-keying-and-clone-update.md`).
- **Fixed:** 2026-06-06 on the `chat-mount-keying` branch — damage/healing now add the same
  increment-scaled `increase` as `currentValue`, gated by a TDD unit case
  (`tests/unit/check/type-results.test.js`, "scales auto-maximized damage by the aspect increment,
  not the purchase count").

### 2. `report-cards.spec.js` fast-healing apply-confirm e2e read-race flake (was OPEN_BUGS #4)

- **What:** The apply-confirm e2e (`tests/e2e/report-cards.spec.js`, "clicking apply heals the actor
  and partial-merges fastHealing") flaked once in a 2026-06-05 full-suite run (logged as OPEN_BUGS
  #4, mechanism unknown) and recurred in the 2026-06-06 full-suite verification on the
  `chat-mount-keying` branch (`fastHealing.confirmed` read `false`). Mechanism: the apply handler
  (`ChatMessageApplyFastHealingButton.svelte`) updates the ACTOR first (`applyHealing`) and the
  MESSAGE second (`fastHealing.confirmed: true`); the test polled only the stamina (the first
  update), then single-shot read the message (the second) between the two updates — a read-race
  that loses under full-suite load.
- **Evidence:** The Playwright failure snapshot showed both rendered cards already re-rendered in
  the confirmed state moments after the failed read — the message update landed late, not never.
  The file passed 13/13 in isolation.
- **Found:** 2026-06-05 (original flake, full-suite run); mechanism identified 2026-06-06.
- **Fixed:** 2026-06-06 on the `chat-mount-keying` branch — the test now polls
  `fastHealing.confirmed` via `expect.poll` before asserting `total`. Production code is unchanged
  (the handler's actor-then-message update ordering is legitimate).
- **Gate now:** `tests/e2e/combat-turns.spec.js` "clicking apply heals the actor and partial-merges fastHealing (total
  survives)" polls `fastHealing.confirmed` before it reads `total`.

### 3. `MoveEffectToFolderDialogShell` initial-only `$state(prop)` capture lint error (was OPEN_BUGS #1)

- **What:** `let selectedFolderId = $state(initialValue);` tripped the `state_referenced_locally`
  compile error (`svelte/valid-compile`). The capture is intended — a new dialog is constructed per
  move request, so `initialValue` never changes during the component's lifetime.
- **Found:** during follow-up D's verification (2026-06-04), logged as OPEN_BUGS #1.
- **Fixed:** 2026-06-10 on `chore/pre-retheme-housekeeping` (`fa159570`) — suppressed locally with a
  rationale comment (the `SpellChatAspects.svelte` precedent). A SECOND pre-existing instance of the
  same class surfaced once this one was fixed (the "system's only ESLint error" claim was stale):
  `EmbeddedDocumentProvider.svelte`'s unsupported-type `warn(...)` path — its existing in-block
  `svelte-ignore` did not suppress; moving the comment above the `if` statement does (`2c1a2162`).
  `npx eslint .` now reports 0 errors.

### 4. Attack chat header sub-label always blank — `attackName` never set by the producer (was OPEN_BUGS #2)

- **What:** `AttackCheckChatHeader.svelte` renders `system.parameters.attackName`, but
  `CharacterDataModel.getAttackCheckParameters` never assigned it, so the sub-label rendered blank
  since the field was introduced.
- **Found:** follow-up D's whole-branch review (2026-06-04), logged as OPEN_BUGS #2.
- **Fixed:** 2026-06-10 on `chore/pre-retheme-housekeeping` (`c1fd1b40`) —
  `parameters.attackName = attackData.label;` in the item-roll-data caching block (the same field
  the weapon sheet row renders), plus an e2e asserting the stored parameter AND the rendered sub-label
  match the rolled attack's label; that e2e is now the `check-math.spec.js` test "attack check carries the attack label
  as attackName" (the stored parameter and the label rendered on the posted card).

### 5. Item-check `resistanceCheck` shape default `''` vs `'none'` guards (was OPEN_BUGS #3)

- **What:** `createItemCheckParametersShape()` defaulted `resistanceCheck: ''` while the item check
  template and every consumer guard compare against `'none'` — a schema-initialized message with no
  stored value would spuriously show the resistance button.
- **Found:** follow-up D (2026-06-04), logged as OPEN_BUGS #3.
- **Fixed:** 2026-06-10 on `chore/pre-retheme-housekeeping` (`c10e680d`) — shape default is now
  `'none'`; the check chat golden master's `resistanceCheck` initial updated to match.

### 6. `WeaponDataModel.addAttack` sheet notification dead AND mis-targeted (was OPEN_BUGS #5)

- **What:** `addAttack` read `this.parent._sheet` into a local but guarded on `this._sheet` (always
  undefined on the data model), and the dead body called `postAddCheck()` (the CHECKS-tab handler)
  instead of the attack-expansion handler — new attacks mounted collapsed.
- **Found:** embedded-document-stores Task 4 code review (2026-06-05), logged as OPEN_BUGS #5.
- **Fixed:** 2026-06-10 on `chore/pre-retheme-housekeeping` (`7af8272d`) — guards the local `sheet`
  and calls `sheet.addAttack()` (mirrors the correct sibling `deleteAttack`).

### 7. `CharacterSheetWeaponAttack.svelte` dereferenced the `attack` derived unguarded (was OPEN_BUGS #7)

- **What:** The `attack` derived can be `undefined` in the mid-frame window between a document
  mutation (deleted weapon / removed attack index) and the row unmount, yet `trainingDice`,
  `getCheckMod`, and the template reads all dereferenced it unguarded.
- **Found:** the embedded-context conversion's final holistic review (2026-06-06), logged as
  OPEN_BUGS #7.
- **Fixed:** 2026-06-10 on `chore/pre-retheme-housekeeping` (`73d8fae3`) — `{#if attack}` template
  gate plus guards in `getCheckMod`, `trainingDice`, `dicePool`, and `expertise`.

### 8. `TitanDataModel` component prepare/migrate hooks could never run (was OPEN_BUGS #8)

- **What:** `_migrateComponentData` and `_prepareComponentDerivedData` iterated
  `Object.entries(...)`, so the loop variable was a `[key, value]` pair and the per-component
  `migrateData`/`prepareDerivedData` hooks were always `undefined` — a latent dead path (no
  registered component defines either hook yet).
- **Found:** Task 5 quality review of the chat-mount-keying branch (2026-06-06), logged as
  OPEN_BUGS #8.
- **Fixed:** 2026-06-10 on `chore/pre-retheme-housekeeping` (`f056dc88`) — both methods iterate
  `Object.values(...)`.

### 9. E2E `ensureProbe` stranded the first probe test when injected mid-boot (was OPEN_BUGS #6)

- **What:** The probe IIFE registers immediately when `game.titan` exists and otherwise arms a
  one-shot ready-hook fallback; an injection during a page boot window (`game` exists, `game.titan`
  not yet set) skipped the immediate path and stranded the current test on
  `game.titan._probe === undefined`. Observed once (2026-06-06) during a run that overlapped a
  concurrent `npm run build`.
- **Found:** embedded-document-stores final verification (2026-06-06), logged as OPEN_BUGS #6.
- **Fixed:** 2026-06-10 on `chore/e2e-fixture-hygiene` (`2ab39a48`) — `ensureProbe` now waits for
  `game.titan` before injecting and for `game.titan._probe` after, so a mid-boot injection blocks
  until registration instead of stranding the test. (The operator rule stands: never run
  `npm run build` concurrently with an e2e run.)

### 10. `TitanActor.createItemFromType` crashed on world actors (`this.parent` is null)

- **What:** The method read `this.parent.items` as if it lived on the data model; on a `TitanActor`
  document, `parent` is null for world actors, so every Add New Item/Spell/Effect-style button threw
  `TypeError: can't access property "items", this.parent is null`.
- **Found:** 2026-06-10 by the user during the theming-foundation visual pass (pre-existing on main).
- **Fixed:** 2026-06-10 on `feature/theme-foundation` — reads `this.items`; regression-locked by
  `tests/e2e/character-sheet-rows.spec.js` ("the Abilities tab add button gives a world actor an owned ability": the
  tab's add button on a world actor's sheet).

### 11. Sheet drag-drop never fired: no DragDrop binding + un-wrapped single-item payloads

- **What:** Two stacked faults. (1) ApplicationV2 wires no drag-drop handlers, and no TITAN sheet
  bound a `DragDrop` controller, so `TitanActorSheet._onDrop` was dead code — dropping an item from
  the directory or a compendium did nothing, silently. (2) Once bound, the drop path still failed:
  `TitanActor.addItem`/`addActiveEffect` guarded with `!data instanceof Array`, which parses as
  `(!data) instanceof Array` (always false), so the single-object payload from `_onDropItem` was
  never wrapped and `createEmbeddedDocuments` rejected it.
- **Found:** 2026-06-10 by the user during the theming-foundation visual pass (pre-existing on main).
- **Fixed:** 2026-06-10 on `feature/theme-foundation` — `_onRender` binds a
  `foundry.applications.ux.DragDrop` controller (drop permission = `isEditable`), the instanceof
  guards are parenthesized, and `_onDrop` uses the namespaced v14 `TextEditor`. Regression-locked by
  `tests/e2e/drag.spec.js` ("a world item dragged from the Items directory creates an owned copy that keeps its
  name", a real drag from the Items directory).

### 12. Weapon attacks tab crashed on load (`$appState.attacks` does not exist)

- **What:** `WeaponSheetAttackSettings.svelte` read `$appState.attacks.isExpanded[idx]` but the
  weapon sheet state defines `tabs.attacks.isExpanded` — `$appState.attacks` is undefined, so the
  attacks tab threw on first open.
- **Found:** 2026-06-10 by the user during the theming-foundation visual pass (pre-existing on main).
- **Fixed:** 2026-06-10 on `feature/theme-foundation` — path corrected to `tabs.attacks` with an
  `?? true` fallback for freshly added attacks; regression-locked by
  `tests/e2e/surfaces.spec.js` ("the weapon attacks tab renders its seeded attack").

### 13. Adding a check crashed the open sheet (`props_invalid_value` on an undefined bind)

- **What:** `TitanItem.addCheck` updates the document before the sheet state's expansion array
  grows, so the freshly rendered sidebar row bound `undefined` into `ExpandButton`'s defaulted
  `expanded` prop — Svelte 5 throws `props_invalid_value` and the checks list failed to render
  until the tab was reloaded.
- **Found:** 2026-06-10 by the user during the theming-foundation visual pass (pre-existing on main).
- **Fixed:** 2026-06-10 on `feature/theme-foundation` — the bind is a function binding falling back
  to the seeded expanded default; same treatment on the weapon attack sidebar. Regression-locked by
  `tests/e2e/item-sheet-rolls.spec.js` ("adding a check while the sheet is open renders the new check row").

### 14. Every TITAN setting name rendered as a raw `SETTINGS.*.text` key

- **What:** All `game.settings.register` calls referenced `SETTINGS.<key>.text` for their names, but
  `lang/en.json` defines `SETTINGS.<key>.label` — `game.i18n.localize` returns the key unchanged
  when missing, so the v14 settings window showed raw keys for every TITAN setting.
- **Found:** 2026-06-10 while registering the theme settings (pre-existing on main).
- **Fixed:** 2026-06-10 on `feature/theme-foundation` — every name reference now uses the `.label`
  keys the lang file actually defines.

### 15. Mini buttons rendered square: a CSS custom-property cycle zeroed their radius

- **What:** The `button` mixin derives `--titan-border-radius` FROM `--titan-button-border-radius`;
  the `mini-button` mixin then redefined `--titan-button-border-radius` from `--titan-border-radius`
  on the same element. The cycle invalidates both properties, so every mini/option/toggle button
  rendered with radius 0 regardless of theme.
- **Found:** 2026-06-10 chasing the user's "option buttons should be rounded" feedback
  (pre-existing on main).
- **Fixed:** 2026-06-10 on `feature/theme-foundation` — `mini-button` derives its radius from the
  non-circular `--titan-tag-border-radius` token (Tabs zeroes that token inside its strip).

### 16. Spell aspect selects and the training-mod field double-localized their labels

- **What:** `SpellSheetStandardAspectsTab` pre-localized aspect option labels and
  `CheckDialogTrainingModField` pre-localized its field label; both feed `Text`-localizing leaves,
  so the rendered strings re-localized to `LOCAL.Self.text`, `LOCAL.Rounds.text`,
  `LOCAL.Training Mod.text`, etc.
- **Found:** 2026-06-10 by the user (aspect options); pinned today by `tests/e2e/surfaces.spec.js` ("every spell tab
  shows no LOCAL. text with range, duration and
  inflict-condition aspects" and "every check type opens its options dialog without LOCAL. text").
- **Fixed:** 2026-06-10 on `feature/theme-foundation` — both sites pass raw i18n keys per the
  Text/tooltip value contract.

### 17. Check roll path used deprecated v13/v14 APIs and loaded an empty media URI

- **What:** Rolls warned on every use: global `KeyboardManager`, the `core.rollMode` setting,
  `ChatMessage.applyRollMode`, and global `TextEditor` are all deprecated in v14; item/effect check
  chat headers also rendered `<img src="">` when the document had no image, logging
  "Invalid URI. Load of media resource failed".
- **Found:** 2026-06-10 by the user during the theming-foundation visual pass (pre-existing on main).
- **Fixed:** 2026-06-10 on `feature/theme-foundation` — namespaced v14 equivalents
  (`foundry.helpers.interaction.KeyboardManager`, `core.messageMode`, `ChatMessage.applyMode`,
  `foundry.applications.ux.TextEditor.implementation`) and an `{#if img}` guard on the header image.

### 18. Sheet unlink control toggled the prototype instead of the placed token

- **What:** Double-clicking a LINKED token opens its world Actor's sheet, and v14 passes the
  originating token only as a render option (`sheet.render(true, {token})`) that nothing captured —
  so the sheet's `token` getter returned null and the header's link control fell into the
  directory branch, silently toggling the PROTOTYPE token's link. The placed token stayed linked
  (edits still hit the source actor) while the next dragged copy came out unlinked. Once captured,
  a second fault surfaced: `_onUnlinkToken` re-read `this.token` AFTER the update, getting null and
  throwing (`can't access property "actor"`).
- **Found:** 2026-06-10 by the user (pre-existing since the v14 migration; v13 conveyed the token).
- **Fixed:** 2026-06-10 on `main` — `_configureRenderOptions` captures the originating token onto a
  private field, the `token` getter validates it (same actor, still on its scene), and
  `_onUnlinkToken` keeps the pre-update reference for the close-and-reopen onto the synthetic
  actor's sheet, with an assert guard. Regression-locked in `tests/e2e/sheet-header.spec.js` ("the Unlink button of
  the sheet a token double-click opens unlinks the token, not the prototype").

### 19. Effect HUD rendered in the bottom right with its elements smooshed together (was OPEN_BUGS #1)

- **What:** After the theming-foundation restyle, the native Effect HUD (`src/ui/effect-hud/`)
  rendered with its elements compressed together — fallout from the panel-mixin rework (the new
  `panel-1` mixin no longer carries padding/border/spacing, which the HUD shell relied on).
- **Found:** 2026-06-10 by the user during the second theming-foundation visual pass.
- **Fixed:** 2026-06-11 by replacement: the Player HUD's effects panel
  (spec `docs/superpowers/specs/2026-06-11-player-hud-design.md`) supersedes the Effect HUD
  wholesale; `src/ui/effect-hud/` is deleted and the new panel spaces rows with explicit
  between-row margins and panel padding.

### 20. Player HUD post-ship defect batch (portrait offset, chip overlap, expand direction, effects row)

- **What:** Six defects found in live use of the shipped Player HUD:
  1. The default portrait docked ~2× too far from the left edge (`PlayerHudDefaults.js` portrait
     `dx: 500`).
  2. The action-menu minimize chip overlapped the category buttons — the chip corner was already
     placed on the stable side, but `.categories` reserved no gutter for it.
  3. The action-menu expand-direction setting appeared dead: `resolveCascadeDirection` silently
     flipped the cascade away from the configured side whenever that side lacked room, and the
     default corner placement always lacked room, so the configured direction was never honored.
  4. In a vertical layout the sub-button direction was an independent (and confusing) control rather
     than following the sub-option direction.
  5. The portrait resource max rendered as a plain chip instead of the character sheet's
     `ModifiableStatValueLabel` (mod breakdown + bonus/penalty colour).
  6. Selecting an effect in the list-panel grew the row header (the expanded `.row` added padding
     around the header), and the name/duration sat on one cramped line.
- **Found:** 2026-06-11 by the user during live testing of the shipped Player HUD.
- **Fixed:** 2026-06-11 on the `player-hud-bugfixes` branch
  (spec `docs/superpowers/specs/2026-06-11-player-hud-bugfixes-design.md`): portrait `dx → 250`;
  `.categories` reserves a chip gutter; the configured expand direction is now authoritative
  (`resolveCascadeDirection` deleted) with vertical sub-buttons following the sub-option direction;
  `PortraitBars` uses `ModifiableStatValueLabel`; the effects row keeps a fixed header (panel/padding
  moved to a `.detail` wrapper) with the icon centred against a stacked name/duration column. Shipped
  alongside friendlier setting labels ("Category Expansion"/"Category Button"), staggered slide-in
  transitions for the sub-options, and a presence-first e2e for the sub-button gate.

### 21. Stale player-HUD reset-all e2e expected the pre-#20 portrait offset

- **What:** `player-hud-layout.spec.js` ("the settings app reset-all restores options and layout")
  asserted the reset-all control restored the portrait offset to `portraitDx: 500`. CLOSED_BUGS #20
  changed the portrait default to `dx: 250` (`PlayerHudDefaults.js`) but did not update this
  expectation, so the test failed against the corrected default (it was looking for the old value).
- **Severity:** Test-only; no shipping-code defect. The reset-all behaviour was correct; the
  assertion was stale.
- **Found:** 2026-06-11 in the full-suite verification on the `item-sheet-roll-checks` branch.
- **Fixed:** 2026-06-11 — expectation updated to `portraitDx: 250` to match the current default;
  `player-hud-layout.spec.js` passes 10/10.
- **Gate (2026-10-07):** `tests/e2e/player-hud.spec.js`, "the settings app reset-all restores options and layout".

### 22. Player-HUD effect row header clipped its text out the bottom

- **What:** `EffectsListRow.svelte`'s row header was a raw `<button>` that left Foundry core's
  `min-height`/`line-height` in place. The stacked icon + name + duration-tag column is taller than
  that forced box, so the content overflowed the bottom of the header.
- **Found:** 2026-06-18, user-reported.
- **Fixed:** 2026-06-18 on `fix/player-hud-styling` — the header routes through the new
  `HudButton` (`ghost` variant), whose `--titan-button-height: auto` lets content drive the height.

### 23. Player-HUD action-menu sub-options/sub-buttons clipped long labels

- **What:** Sub-option and sub-button rows are `width: 100%; white-space: nowrap` inside flyout
  columns that had no intrinsic width, so long option/item names spilled past the button.
- **Found:** 2026-06-18, user-reported.
- **Fixed:** 2026-06-18 on `fix/player-hud-styling` — the flyout sub-option column
  (`ActionMenuFlyout.svelte` `.sub-options`) and the sub-button lane (`ActionMenuSubButtons.svelte`
  `.sub-buttons`) use `width: max-content`, so the column grows to the longest label.

### 24. Player-HUD action-menu button text ignored the theme

- **What:** Every HUD button carried `@include panel-2/3` (a paired, readable panel font color) and
  then overrode it with `color: inherit`. The HUD renders outside any `.titan` themed scope, so
  `inherit` resolved to Foundry core's bright ambient text — the text neither matched nor tracked
  the theme.
- **Found:** 2026-06-18, user-reported.
- **Fixed:** 2026-06-18 on `fix/player-hud-styling` — all HUD buttons route through `HudButton`,
  which defines every box/text property from `--titan-button-*` tokens via `@include button` with
  per-variant overrides (text from the paired panel tokens). No HUD button uses `color: inherit`.

### 25. Rich-text headings stayed bright and unreadable on light themes

- **What:** Heading elements (`h1`–`h6`) in rich text (effect descriptions, sheets) had no color
  rule. On the un-themed HUD and on light themes they fell back to Foundry core's bright heading
  color, becoming unreadable on a light surface.
- **Found:** 2026-06-18, user-reported.
- **Fixed:** 2026-06-18 on `fix/player-hud-styling` — a new themed `heading-font-color` token
  (contract + all four built-in themes) plus a `.rich-text :is(h1..h6)` rule in `Global.scss`.

### 26. Player-HUD minimize chip overlapped the categories

- **What:** The action-menu categories bar reserved a fixed gutter (`padding-right: 22px` /
  `padding-bottom: 18px`) that did not track the chip's computed corner
  (`actionMenuChipCorner`) across every layout/direction permutation, so the chip overlapped the
  category buttons in some configurations.
- **Found:** 2026-06-18, user-reported.
- **Fixed:** 2026-06-18 on `fix/player-hud-styling` — `PlayerHudShell` passes the chip corner into
  `ActionMenuElement`, which reserves the gutter on the chip's own corner (`chip-<corner>` root
  class driving corner-specific padding).

### 27. Player-HUD flyout accent referenced an undefined `--titan-cyan`

- **What:** The action-menu accent (the open-category edge-bar and the revealed sub-option's inset
  bar) referenced `--titan-cyan`, which is defined nowhere in `src/` and is not a theme token, so
  the accent resolved to nothing.
- **Found:** 2026-06-18, during the bug-fix brainstorm.
- **Fixed:** 2026-06-18 on `fix/player-hud-styling` — a new themed `accent-color` token (contract +
  all four built-in themes, a cyan/sky value per theme); the HUD accent references it via
  `HudButton`'s `accentEdge` prop and the sub-option inset shadow. The sibling undefined palette
  colors feeding the chat resource-mod tag gradients are logged separately (OPEN_BUGS #1).

### 28. Action-menu sub-button lane appeared instantly instead of animating

- **What:** The action-menu sub-button lane (`ActionMenuFlyout.svelte`) popped in instantly when a
  sub-option was revealed, unlike the flyout itself.
- **Found:** 2026-06-18, user-reported.
- **Fixed:** 2026-06-18 on `fix/hud-anim-and-theme-contrast` — a directional `in:fly` on the lane
  (`subButtonFly`, 24px/180ms), sliding in from the sub-option toward `subButtonsSide`.

### 29. Opening a category inconsistently auto-opened its sub-buttons

- **What:** Opening a category could open it with a sub-option's sub-buttons already showing or not,
  depending on where the category button was clicked. The flyout swooshes in under the cursor; the
  sub-option under the cursor fired `pointerenter` and auto-revealed its sub-buttons (clicking the side
  the flyout opens toward put the cursor on a sub-option; the opposite side did not).
- **Found:** 2026-06-18, user-reported.
- **Fixed:** 2026-06-18 on `fix/hud-anim-and-theme-contrast` — a sub-option now reveals its sub-buttons
  on pointer movement over the row (`onpointermove`) rather than `onpointerenter`. A flyout sliding in
  under a stationary cursor generates no `pointermove`, so a category always opens with sub-buttons
  closed; a genuine hover (or keyboard focus) still reveals.

### 30. Headers (and text) used Foundry's color, unreadable on TITAN light themes (supersedes #25)

- **What:** Foundry core paints headings — and assorted text — with `var(--color-text-primary)`, which
  tracks Foundry's color scheme and mismatches the active TITAN theme (light text on a TITAN light
  theme). The earlier `heading-font-color` fix (CLOSED_BUGS #25) was wired only to `.rich-text`, so
  TITAN's own headings (e.g. the theme-editor `<h3>` section titles) were never covered.
- **Found:** 2026-06-18, user-reported (theme-editor section headers).
- **Fixed:** 2026-06-18 on `fix/hud-anim-and-theme-contrast` — `heading-font-color` replaced by per-level
  tokens `header-1-font-color` … `header-6-font-color` (new `headers` contract group, all four themes).
  `Global.scss` redefines Foundry's `--color-text-*` within `.titan` to the TITAN body color, and sets
  per-level header color on `.titan`/`.rich-text` headings by overriding `--color-text-primary` on the
  heading element itself (so Foundry's own heading rule resolves to the TITAN token regardless of its
  specificity) plus an explicit `color` for the non-`.titan` HUD. Every TITAN app/dialog/sheet/chat
  already carries the base `titan` class (verified — `TitanDocumentSheet`/`TitanDialog` bases merge it,
  the direct `ApplicationV2` subclasses set it, and `ChatMessage` adds it).

### 31. Light-theme panels were indistinguishable from the background

- **What:** Both light themes collapsed panels into the app background (`HeritageLight` `panel-2 #f2f2f6`
  ≈ `app-background #f4f4f6`; `CleanNeutralLight` `panel-3 #ffffff` == `app-background #ffffff`), so
  panels and panel-surfaced controls (e.g. the HUD action-menu buttons) did not read as distinct.
- **Found:** 2026-06-18, user-reported.
- **Fixed:** 2026-06-18 on `fix/hud-anim-and-theme-contrast` — retuned `HeritageLight` and
  `CleanNeutralLight` so `app-background → panel-1 → panel-2 → panel-3` step progressively darker
  (distinct raised surfaces), keeping each panel's dark text color.

### 32. E2E ran below Foundry's minimum resolution, so a warning banner intercepted HUD clicks

- **What:** `playwright.config.mjs` set no `viewport`, so the suite ran at Playwright's 1280x720
  default. Foundry v14 requires 1366x768 and otherwise raises a permanent
  "requires a screen resolution of 1366px by 768px or greater" notification. The `#notifications`
  banner spans the full viewport width at y=72..172; the player HUD's effects panel mounts at
  `top: 16` with height 320, so the banner's `<p>` sat over the panel and intercepted every click
  on an effect row — Playwright retried the click until the 60s test timeout.
- **Symptom:** 3 specs timed out on an effect-row click
  (`embedded-context-check-parity.spec.js` x2, `embedded-context-effects.spec.js`). Measured, not
  inferred: the probe read `innerWidth/innerHeight` 1280x720 against the banner's rect and the
  panel's rect.
- **Gate now:** the effect-row clicks of `tests/e2e/character-sheet-rows.spec.js` and, for the Player HUD, the clicks
  of `tests/e2e/player-hud.spec.js` "a row expands to its description and controls" and "the duration controls step the
  effect duration"; the viewport is `use.viewport` of `playwright.config.mjs`.
- **Fix:** `use.viewport` set to 1920x1080 — above Foundry's minimum, so the warning never fires.
  Full suite 497/497 after the change.

### 33. Two e2e specs asserted markup and a palette value that had since changed

- **What:** Two stale expectations, both masked behind bug #32 above and initially misfiled as
  product defects:
  - `.row .row-header` — the effect-row header element was replaced by a `HudButton` in
    `252dac10` ("route effect row header through HudButton so its text no longer clips").
    `.row-header` exists nowhere in `src/`; the name now lives at `.row .name`, and the row carries
    `data-testid="player-hud-effect-row"` (the idiom `player-hud-effects-panel.spec.js` already
    used). Affected `embedded-context-check-parity.spec.js` and `embedded-context-effects.spec.js`; the character-sheet
    and Effect HUD check tag comparison is now `tests/e2e/character-sheet-rows.spec.js` ("effect check tags render
    identical values on the character sheet and the Effect HUD").
  - `theme.spec.js` hardcoded `#f4f4f6` as the light world default. `010c2e1e` ("step light-theme
    panels darker") deliberately changed `HeritageLight`'s `app-background` to `#fbfbfc`. The theme
    system was verified working live — the core scheme flips `body.theme-light`, `prefersDark()`
    follows, and `getActiveTheme()` resolves `heritage-light`.
- **Fix:** the row specs use the `player-hud-effect-row` testid; `theme.spec.js` resolves both
  expected backgrounds from the theme registry via `getSchemeTheme()` and additionally asserts the
  resolved theme ids differ, so a future palette change cannot silently stale it again.
- **Gate (2026-10-07):** `tests/e2e/player-hud.spec.js` effects-panel tests (the `player-hud-effect-row` testid) and
  `tests/e2e/theme.spec.js` "auto follows the Foundry core color scheme" (both expected backgrounds from
  `getSchemeTheme()`).

### 34. Chat resource-mod tag gradients referenced an undefined named palette

- **What:** The three resource-mod tag mixins in `src/styles/Mixins/SystemMixins.scss`
  (`fast-healing-tag`, `persistent-damage-tag`, `resolve-regain-tag`, consumed by
  `ChatMessageResourceModTag.svelte`) built `--titan-tag-background` from `--titan-green`,
  `--titan-yellow`, `--titan-maroon`, `--titan-orange`, `--titan-blue`, and `--titan-cyan` — a named
  brand palette defined nowhere in `src/`, so the declaration was invalid at computed-value time and
  the tag lost its intended background.
- **Fix:** each tag now carries the themed identity pair of the resource it modifies — fast healing →
  `stamina`, persistent damage → `wounds`, resolve regain → `resolve` — setting both
  `--titan-tag-background` and `--titan-tag-font-color` so the theme contract's fill/text pairing
  holds. The apply-confirm case (now "clicking apply heals the actor and partial-merges fastHealing (total
  survives)" in `combat-turns.spec.js`) asserts the confirmed fast-healing tag's computed colors equal the resolved
  `--titan-stamina-*` tokens.

### 35. The release workflow targeted a module layout this system does not have

- **What:** `.github/workflows/main.yml` was the unmodified League-of-Foundry-Developers *module*
  template: it substituted URLs into a `module.json` this repo does not have and zipped `assets/`,
  `LICENSE`, and `AUTHORS`, none of which exist, while omitting `system.json`. It had never fired
  (0 workflow runs). `system.json` also pointed `license` at a nonexistent `LICENSE.txt` and used
  `releases/download/latest/…` URLs, which require a tag literally named `latest`.
- **Fix:** replaced by `release.yml` (on `release: published`: stamp the tag into `system.json`,
  build, zip `system.json dist/ lang/ packs/ fonts/ LICENSE-MIT README.md CHANGELOG.md`, attach the
  manifest and archive) and a new `ci.yml` (on push and pull request: `npm ci`, ESLint, stylelint,
  the unit suite, and the production build — the e2e suite needs a live Foundry server and stays
  local). The manifest now uses GitHub's `releases/latest/download/…` redirect for the manifest,
  readme, and changelog, a versioned download URL, and `LICENSE-MIT`. The workflow files themselves
  landed in commit `194c1991`.

### 36. Attack and resistance check dialogs showed raw `LOCAL.*` keys for five field labels

- **What:** `AttackCheckDialogAttackerAccuracyField`, `…AttackerMeleeField`, `…AttackTypeField`,
  `…TargetDefenseField`, and `ResistanceCheckDialogResistanceField` passed `label={localize('…')}`
  into `CheckDialogField`, whose `<Text>` localizes the label again, so the dialogs rendered
  `LOCAL.Attacker Melee.text`, `LOCAL.Target Defense.text`, `LOCAL.Type.text`, and
  `LOCAL.Resistance.text`. The localization e2e of the time scanned only the casting-check dialog.
- **Found:** 2026-09-10, from a screenshot sweep of every TITAN surface for the redesign passes.
- **Fix:** the five fields pass the raw key like every other dialog field. `surfaces.spec.js` ("every check type
  opens its options dialog without LOCAL. text") opens all five check-options dialogs from the shared roller's
  sheets and scans each.

### 37. Six item sheet headers rendered "Rarity" twice

- **What:** The armor, commodity, equipment, shield, spell, and weapon sheet headers wrapped
  `ItemSheetRaritySelect` in their own `{localize('rarity')}` label, but the select already renders
  a labelled `LabeledElement`, so the header read "Rarity Rarity Common". The ability header used
  the select alone and was correct.
- **Found:** 2026-09-10, from the surface screenshot sweep.
- **Fix:** the six headers keep only the self-labelled select. `surfaces.spec.js` (the item sheet tests, one per
  item type) asserts every rarity-bearing item sheet header shows exactly one "Rarity" label.

### 38. The effect sheet's description tab rendered an empty inactive editor

- **What:** `ActiveEffectSheetDescriptionTab` mounted `ProseMirrorEditor` in toggled mode with no
  `enriched` HTML. Foundry's `<prose-mirror>` constructor sets `#enriched = enriched || innerHTML`,
  which is `''` (not nullish) when neither is supplied, and `_refresh()` paints
  `#enriched ?? _value` — so the inactive view was always blank even though the value was set.
  Item description tabs did not share the defect because `DocumentBoundEditorInput` enriches first.
- **Found:** 2026-09-10, from the surface screenshot sweep (the seeded description never appeared).
- **Fix:** the tab now uses `DocumentEditorInput` with `path: 'description'`, which enriches the
  native field for the inactive view and persists edits through the document. `surfaces.spec.js` ("the effect
  sheet shows a description typed in the editor in the inactive view") asserts the inactive editor shows a
  description typed in the editor and saved.

### 39. Effect Tray folders created after a pack's expansion state was saved rendered collapsed

- **What:** `EffectTrayState` persisted the EXPANDED folder ids per pack and restored that list verbatim,
  so a folder created after the entry was saved was absent from it and derived as collapsed — the same
  state as a folder the user had deliberately closed. Deleted folder ids also lingered in the entry.
- **Found:** 2026-09-10, by the whole-branch final review of the redesign surface passes.
- **Fix:** the setting is now `effectTrayCollapsedFolders` (pack collection id → COLLAPSED folder ids).
  Every refresh derives `expandedFolders` as the pack's current folders minus that set, so absence means
  expanded; `toggleFolder` persists the current folders absent from the reactive set, which drops deleted
  ids.
- **Superseded:** the #63 rewrite (2026-09-27) replaced the saved list with an in-memory set of expanded folders
  (`expandedFolders` in `EffectTrayState.svelte.js`; read: no file in `src` mentions `effectTrayCollapsedFolders`), so
  no saved list can omit a new folder, and every folder starts collapsed. No test of the saved-list shape exists
  because the shape does not. `effect-tray.spec.js` asserts the current rule in 'nested folders render inside their
  parent folder, not at the top level' and 'collapsing a folder collapses its subfolders': folders are collapsed after
  Collapse All and reopen with their subfolders collapsed.

### 40. The system failed to build on case-sensitive filesystems (miscased import)

- **What:** `CharacterDataModel.js` imported `~/helpers/utility-functions/appendUniqueByFunctionValue.js`
  while the tracked file is `AppendUniqueByFunctionValue.js`. Windows resolves the path case-insensitively,
  so every local build, unit run, and e2e run passed; the first GitHub Actions run on `ubuntu-latest`
  failed in Vite with "Failed to resolve import". Present since the 2024 data-model rebuild.
- **Found:** 2026-09-10, by the first CI run after the release/CI workflows landed.
- **Fix:** the import now matches the tracked filename. A scan of every `~/` and relative import/export
  specifier across the 985 tracked source, test, and script files against `git ls-files` found no other
  case mismatch. CI on Linux is the standing guard against a recurrence.

### 41. `ImportDialogShell.svelte` failed `npm run eslint` with two `svelte/valid-compile` errors

- **What:** `src/spreadsheet/ui/ImportDialogShell.svelte` initialized `targetMode`/`targetCollection`
  with `$state(...)` expressions that read the `initialPack` prop directly, which the Svelte 5
  compiler flags as `state_referenced_locally` (an eslint ERROR under this project's config) — the
  branch's `eslint` CI gate was red because of it.
- **Severity:** Low-to-medium. Functionally harmless: `TitanDialog` only mounts on `isFirstRender`
  and every `ImportDialog` call site constructs a fresh instance, so `initialPack` never changes
  post-mount — confirmed by reading both call sites and the mount lifecycle, not assumed.
- **Found:** 2026-09-10, during the compendium-spreadsheet Task 18 final `npm run eslint` gate run.
  Introduced by an earlier task on the same branch (commit `0d9c114e`, "feat: add the compendium
  spreadsheet import dialog") and not caught by that task's review.
- **Fixed:** 2026-09-10 on the `compendium-spreadsheet` branch — wrapped both prop reads in
  `untrack(...)`, matching the identical one-shot-capture-from-context pattern already established
  in `DocumentPathRaritySelect.svelte`.

### 42. Dynamic-import unit tests intermittently time out under the full suite's parallel workers (was OPEN_BUGS #1)

- **What:** `tests/unit/spreadsheet/ui/ExportDialog.test.js`, `ImportDialog.test.js`, and
  `tests/unit/hooks/OnGetCompendiumContextOptions.test.js` mocked a dialog shell with `vi.mock(...)`
  then, inside each `it(...)` body, ran `await import(...)` to pull in the module under test after
  `beforeEach` had installed the `foundry.applications.api.ApplicationV2` stand-in it reads at
  module-evaluation time. That dynamic `import()` pays the cold Vite transform of the module graph
  under the 5000ms per-test timeout; under full-suite parallel worker load the transform could exceed
  5s, timing the test out non-deterministically while passing reliably standalone.
- **Severity:** Low. Reproduced intermittently under full-suite parallel load only.
- **Found:** 2026-09-10, during the compendium-spreadsheet Task 15/16 reviews.
- **Fixed:** 2026-09-10 on the `campaign/spreadsheet-backlog` branch — the three files now establish
  the `ApplicationV2` stand-in in a `vi.hoisted(() => { ... })` block (which Vitest hoists above the
  hoisted `vi.mock` calls and the file's static imports) and statically import the module under test,
  removing the per-test dynamic import entirely; per-test global mutation stays in `beforeEach`/the
  test body. `tests/unit/GetBestCharactersToUpdate.test.js` used a per-test `await import(...)` after
  `vi.doMock(...)` + `vi.resetModules()` to swap the mocked `GetFocusedCharacterSheetActor` return
  value; since the module under test is a pure function with no per-test state to isolate, it was
  converted to a statically-imported `vi.mock(...)` with `getFocusedCharacterSheetActor.mockReturnValue(...)`
  set per test instead, eliminating the dynamic import without needing module resets.
  `tests/unit/ChatMessageMountRegistry.test.js` also dynamically imports inside `beforeEach`, but its
  `vi.resetModules()` is load-bearing: the module under test holds private module-scope singleton
  state (`mounts` Map, the notification `MutationObserver`) that must be fresh per test, which a
  static import cannot provide without adding a test-only reset export to the production module (out
  of this fix's scope; not attempted). All other `await import(` hits found by grepping `tests/unit`
  live inside `beforeAll` in the schema golden-master suites (covered by the deliberate 60s
  `hookTimeout`) and were left untouched per the fix's own scope.

### 43. Foundry server dropped mid-run under the full throttled e2e suite (was OPEN_BUGS #1)

- **What:** One full `npm run test:e2e` run (2026-09-10) saw the server stop answering `/join`
  (`net::ERR_CONNECTION_REFUSED`) partway through, failing 10 unrelated specs at `login()` and leaving 11
  not run (494/515). The specs themselves were never implicated.
- **Diagnosis:** Not reproduced. Two instrumented full throttled runs (`BelowNormal`, 12/24 cores) passed
  515/515 (8.5 min with two concurrent vitest suites saturating the CPU; 5.0 min with one), with the
  launched server alive to the end and its log carrying no error beyond the unrelated `dnd5e` metadata
  warning at boot; minimum available memory across both runs was 9.5 GB. The original run's server
  ownership is not recoverable from its (unsaved) output. One mechanism that produces exactly the reported
  symptom without a code defect was demonstrated in the same session: a Foundry process started from an
  agent tool call that has since returned is torn down about a minute later, while a separately started
  Playwright run keeps going and every later login is refused (see memory
  `long-runs-use-run-in-background`).
- **Fixed:** 2026-09-10 on `campaign/e2e-server-drop` — `scripts/lib/superviseServer.mjs` gained an
  optional `logFile`; `scripts/e2e-foundry-server.mjs` tees the launched server's stdout/stderr, with an
  ISO timestamp per line and a final exit line, into `debug/dumps/e2e-server.log` (`FOUNDRY_SERVER_LOG`
  overrides), so any recurrence carries the server-side timeline to correlate against the failing specs.

### 44. Full unit-suite runs timed out under heavy concurrent machine load (was OPEN_BUGS #2)

- **What:** Four consecutive `npx vitest run` attempts on 2026-09-10 showed climbing durations (48s to
  100s) and a shifting set of 60000ms `beforeAll` timeouts in the schema golden-master suites, with 5-6
  extra `node.exe` processes present before each run.
- **Diagnosis:** Load artifact, not a test defect. The runs coincided with two other full vitest suites
  and a throttled e2e suite executing on the same machine from parallel work trees. Re-run on the same
  code once the concurrent workloads finished: 474/474 in 40.7s and 474/474 in 31.8s, no hook timeouts;
  the two earlier clean baselines on sibling trees (474/474 at 40.1s and 40.9s, 514/514 on the markdown
  tree) agree. No test content or timeout headroom changed.
- **Fixed:** 2026-09-11, closed without a code change.

### 45. Spell aspect cost double-counted per-option costs for `optionCosts` aspects with 2+ options

- **What:** `SpellDataModel.prepareDerivedData`'s `optionCosts` branch (used by `inflictCondition`)
  nested a `for...of` loop over `aspect.option` around an inner `aspect.option.forEach(...)` over the
  same array, so every selected option's cost was added once per selected option — a 2-option
  selection doubled every option's contribution (e.g. `blinded` (4) + `deafened` (1) summed to 10
  instead of 5), and a 3-option selection tripled it. `range`/`radius`/`duration` (`initialValueCosts`/
  `unitCosts`), `optionCost` (uniform per-option cost), and `allOptionsCost` aspects were unaffected.
- **Severity:** Medium. Every spell using `inflictCondition` (the only aspect configured with
  `optionCosts`, a per-option cost map — `blinded`, `contaminated`, `deafened`, etc. are its selectable
  condition options, not separate aspects) with two or more selected options auto-calculated an
  inflated casting DC and total aspect cost. `removeCondition` uses a uniform `optionCost` plus
  `allOptionsCost` and was never affected.
- **Found:** 2026-09-10, while designing the Markdown export (the renderer needed the same cost math,
  which surfaced the nested-loop bug on read).
- **Fixed:** extracted the cost math into a pure `calculateSpellAspectCosts(aspects, customAspects)`
  in `CalculateSpellAspectCosts.js`, shared by `SpellDataModel.prepareDerivedData` and (later) the
  Markdown spell renderer, with the nested loop collapsed to a single pass over `aspect.option`.
  `CalculateSpellAspectCosts.test.js` asserts a two-option `inflictCondition` aspect costs `5`
  (`4 + 1`), plus initial-value/unit/optionCost/allOptionsCost costs, resistance halving with the
  minimum-1 floor, requireOption-with-no-options disabling, custom aspect cost summation, and the
  difficulty/complexity thresholds (4→4:1, 5→5:1, 6→5:2, 8→5:4, 2→4:1 clamped).

### 46. Spell enhancement displays showed the build cost instead of the per-success `scalingCost`

- **What:** `SpellAspectTag.svelte` and `RenderSpell.js`'s `formatEnhancement` rendered a scaling
  aspect's `/ N` per-increment suffix from its computed build cost, while casting charges
  `scalingCost ?? cost` extra successes per increment (`CharacterDataModel`). A spell with a
  `scalingCost` of 1 and a build cost of 2 displayed `(1 + ES / 2)` but charged 1 ES per increment.
- **Severity:** Low. Display only; casting math was correct.
- **Found:** 2026-09-23, comparing rendered compendium spells against the rules source during the
  `titan-vttrpg-compendium` module update.
- **Fixed:** 2026-09-23 on branch `fix/spell-scaling-cost-display` — both displays use
  `scalingCost ?? cost`, gated by a `RenderSpell.test.js` case ("renders a standard aspect's
  per-success cost from scalingCost when set, not its build cost").

### 47. Character and item sheet portrait picks were not saved

- **What:** `DocumentImagePicker.svelte` bound `document.data.img` (a plain assignment on the in-memory document)
  and its `onchange` called `refreshSystemDocument`, which sends only `system` and `flags`. `img` never reached
  the stored source, so a picked portrait showed until the sheet re-prepared or the page reloaded, then reverted.
  Affected every sheet using `DocumentImagePicker` (actor portrait in `CharacterSheetPortrait.svelte`, item
  portrait in `ItemSheetHeader.svelte`).
- **Severity:** Medium. Every portrait change from a sheet was lost.
- **Found:** 2026-09-26, user report; reproduced live on the `test-titan` world (in-memory `img` changed,
  `_source.img` did not).
- **Fixed:** 2026-09-26 — `DocumentImagePicker` now persists with `document.data.update({ img })`, as
  `DocumentIconPicker` does. Gated by `tests/e2e/surfaces.spec.js` ("a character sheet portrait pick persists
  across a reload", "an item sheet portrait pick persists across a reload": picks through Foundry's file picker,
  read back after a full page reload).

### 48. E2E tab clicks matched hidden compendium pack labels (12 timeouts)

- **What:** 12 specs clicked sheet tabs with `page.getByText('Effects' | 'Abilities' | 'Spells', { exact: true
  }).first()`. The sidebar Compendium directory renders each pack title as a hidden `<strong>`, and the compendium
  module's packs are labelled "Abilities", "Spells" and "Effects", so `.first()` resolved to the hidden label and the
  click timed out.
- **Found:** 2026-09-26 full e2e run (505 passed / 12 failed) after the compendium module update.
- **Fixed:** 2026-09-26 — `openSheetTab()` in `tests/e2e/fixtures.js` scopes the click to the open sheet's `.tab-list`;
  all 15 unscoped tab clicks use it.

### 49. `conditionalCheckModifier is not defined` on casting, attack and item checks

- **What:** `CharacterDataModel._getConditionalCheckModsForSelectorKeys` read `conditionalCheckModifier` (undefined)
  instead of its `conditionalCheckModifiers` parameter. Any check on an item with custom traits threw once the actor had
  a conditional check modifier from an ability or effect; spell rows on the Spells tab failed to render. The spells
  themselves carry no rules elements.
- **Fixed:** 2026-09-26. `no-undef` is now enforced by ESLint. Gated by `tests/e2e/logic/rules-elements.spec.js`
  ("casting check options apply custom-trait dice and casting expertise modifiers" and "conditional dice and expertise
  apply to item checks and to tradition-keyed casting checks": the dialogs of a casting check and an item check read the
  modifiers of a Void custom trait and a tradition from rules elements added in the Rules Elements tab). No run of this
  test against the code before the fix exists.

### 50. Conditional expertise modifiers never applied to casting or item checks

- **What:** casting and item checks looked up conditional modifiers under `'expertiseMod'`; the rules-element sheet
  stores `'expertise'`, so bonuses such as Spellcasting Specialization's +1 expertise never applied.
- **Fixed:** 2026-09-26. Gated by `tests/e2e/logic/rules-elements.spec.js` ("casting check options apply custom-trait
  dice and casting expertise modifiers": the casting dialog shows the +1 expertise of an any-selector element;
  "conditional dice and expertise apply to item checks and to tradition-keyed casting checks": the item dialog shows the
  expertise). No run of this test against the code before the fix exists.

### 51. Deleting an item showed "Item is already owned by actor" and left armor equipped

- **What:** `CharacterDataModel.preDeleteItem` asserted `!this.parent.uuid === item.parent?.uuid` (always false),
  raising an error toast on every confirmed delete and skipping the armor/shield un-equip branch.
- **Fixed:** 2026-09-26 — the assertion compares ownership correctly and `TitanActor.deleteItem` awaits `preDeleteItem`.
  Gated by `tests/e2e/character-sheet-rows.spec.js` ("deleting an equipped armor row with confirmation on un-equips it
  quietly": no error notification, the equipped slot cleared).

### 52. Spell sheet "resisted by" tag rendered empty

- **What:** `SpellSheetSidebarStandardAspect.svelte` passed a `label` prop `ResistanceTag` no longer accepts, so the tag
  had no text.
- **Fixed:** 2026-09-26 — the text is child content. Gated by `tests/e2e/surfaces.spec.js` ("the spell sheet
  sidebar labels the aspect resistance").

### 53. Effect Tray list could not scroll

- **What:** the frameless sidebar tab root had no height bound, so the list grew to its content height and the sidebar
  clipped it.
- **Fixed:** 2026-09-26 — the tab root clips like core directories and the tray is a `min-height: 0` flex child. Gated
  by `effect-tray.spec.js` 'the tray list scrolls so its last row can be brought fully into view': at 1366x768 the
  shipped pack's rows overflow the list, the list stays inside the sidebar, and scrolling to the end shows the last
  row. With `min-height: 0; overflow: hidden` in `EffectTray.svelte` replaced by `overflow: visible` the test fails at
  its bounded-scroll-container assertion (`.superpowers/sdd/test-suite-rewrite/phase-6/mutations/A-T4-scroll.log`).

### 54. Sheet content links unreadable in dark themes

- **What:** `.titan .content-link` set only the text colour (`#191813` in every theme) over Foundry's scheme background,
  which is near-black in the dark scheme. Chat stayed readable because the chat log is a light-scheme region.
- **Fixed:** 2026-09-26 — `content-link-background` and `content-link-border-color` theme tokens (panel-2 pair per
  theme); saved custom themes are completed with later contract tokens. Gated by a WCAG AA unit test and
  `content-link-theme.spec.js`.
- **Gate (2026-10-07):** `tests/e2e/theme.spec.js`, the `content links` tests, one per built-in theme.

### 55. Skill rows clipped and misaligned

- **What:** the check button and attribute select had content-driven widths and absorbed the row's squeeze, so columns
  started at different x per row and the widest rows clipped at the 850px sheet width. The skills filter's attribute
  fallback also read `defaultAttribute` off `[key, value]` entries.
- **Fixed:** 2026-09-26 — fixed-size row parts that wrap identically. Gated by `character-sheet-layout.spec.js`
  ("every skill row places its parts identically and nothing is cut off") and `sheet-filters.spec.js` ("the skills
  filter falls back to matching the default attribute").

### 56. Browser zoom clipped the character sheet

- **What:** the auto-height character sheet sized itself to its sidebar; when zoom shrank the viewport, Foundry clamped
  the window but the window content clipped the sheet's sidebar and tab lists.
- **Fixed:** 2026-09-26 — the sheet is bounded by the window and the sidebar scrolls. Gated by the "browser zoom" tests
  of `character-sheet-layout.spec.js` (character, item and effect sheets of the shared bulk actor; last entry of a long
  list fully visible at 50–150% zoom).

### 57. Observers could not switch tabs or expand rows

- **What:** `DocumentSheetV2._onRender` disables every form control present at render when the viewer cannot edit, which
  included the tab strips and expand toggles; the item-row expand toggle was also a `DocumentOwnerButton`.
- **Fixed:** 2026-09-26 — `TitanDocumentSheet._toggleDisabled` re-enables controls in `[data-view-controls]` containers.
  Gated by `tests/e2e/ownership.spec.js` "an observer can switch character and item sheet tabs and expand rows,
  but not edit".

### 58. Character sidebar section labels touched their contents

- **Fixed:** 2026-09-26 — `.section-label` has the standard bottom margin. Gated by `character-sheet-layout.spec.js`
  ("sidebar section labels are spaced from the items they contain").

### 59. Player HUD toggles and actions lacked icons and state

- **What:** the inspiration toggles showed no pressed state, and action-menu skills, resistances and utilities had no
  icons.
- **Fixed:** 2026-09-26 — `pressed` prop on `HudButton`/`IconButton`; skills show the primary actor's current default
  attribute icon. Gated by `BuildActionMenuModel.test.js` and `player-hud-action-menu.spec.js`.
- **Gate (2026-10-07):** `tests/e2e/player-hud-action-menu.spec.js`, "skill sub-options show the icon of the actor's
  current default attribute", "resistance and utility sub-options carry icons" and "inspiration toggles show whether
  inspiration applies".

### 60. Compendium: legacy rules elements, Mystwalker icon, Healer's Kit

- **What:** three "Specialization (Choose)" abilities and Rending Blow carried unregistered legacy operations
  (Spellcasting Specialization's showed as invalid rows); Rending Blow also had a roll message its rules text does not
  support. Mystwalker abilities and effects used a placeholder icon. The Healer's Kit was missing.
- **Fixed:** 2026-09-26 in the compendium module (`a6588af`, `031f612`): legacy elements removed, the path icon applied,
  and the Healer's Kit (commodity, value 100, common) added in a new Equipment pack. The live `packs/` still need
  compiling (`npm run packs:compile` with Foundry stopped).

### 61. Heavy armor did not decrease speeds

- **What:** the equipped-armor pass compared trait names against `'heavy.armor'`; the trait is named `'heavy'`, so the
  -1 to all speeds never applied. Its zero-speed guard also read the not-yet-derived `speed.value`.
- **Fixed:** 2026-09-27 — matches `'heavy'` and guards with `baseValue` plus mods. Gated by
  `tests/e2e/character-sheet-rows.spec.js` ("equipping Heavy armor lowers non-zero speeds by 1": the Heavy trait is
  chosen in the armor's Edit Traits dialog and the armor equipped with its row toggle).

### 62. Compendium: rules elements that disagreed with the rules text

- **What:** a read-only audit of every compendium item and effect against the 2026-09-26 rules found wrong check
  skills and resistances, missing or wrong speed values, half-stamina and halved-speed arithmetic errors, roll messages
  on the wrong check type or naming the wrong ability, ranged weapons rolling as melee, stray armor traits, empty spell
  aspects and label typos.
- **Fixed:** 2026-09-27 in the compendium module (`4aecccc`), 52 documents; validated with `npm run validate` (0
  errors). Findings that need a rules decision are listed in `docs/TODO.md`.

### 63. Effect Tray listed nested folders flat ("Abilities 1", "Abilities 0")

- **What:** the tray rendered every folder of the selected pack as one flat, name-sorted list, ignoring each folder's
  parent, and printed the folder's direct effect count after its name. Nested packs such as the compendium module's
  Effects (Sacred Arts → path → Abilities/Apex) showed a dozen indistinguishable "Abilities N" rows (the user-reported
  "Abilitises" categories). Its look also differed from the core directories.
- **Fixed:** 2026-09-27 — the tray mirrors the pack's core folder tree (`pack.tree`) in core directory markup styled by
  core CSS, with core collapse, search, and sort behaviour. Gated by `effect-tray.spec.js`, in its describe 'the folder
  tree of a nested pack': 'nested folders render inside their parent folder, not at the top level', 'collapsing a
  folder collapses its subfolders', 'searching shows matching effects inside their expanded folders' and 'tray folders
  and entries match the core Items sidebar tab styles' (computed-style parity with the Items tab), and by
  `FilterEffectTree.test.js`. With the render of a folder's child folders removed from `EffectTrayList.svelte`, the
  describe's `beforeAll` cannot rename the child folder it creates, and the describe fails there before its test bodies
  run (`.superpowers/sdd/test-suite-rewrite/phase-6/mutations/F-T5-nested.log`).

### 64. Move-to-Folder dialog showed localization keys for folder names

- **What:** the dialog passed folder names (and the already-localized root label) to the TITAN `Select` as plain
  strings, which it runs through TITAN localization, so they displayed as `LOCAL.<name>.text`.
- **Fixed:** 2026-09-27 — folder names pass as `{ text, localize: false }` and the root label as its key. Gated by
  `effect-tray.spec.js` 'the move-to-folder dialog lists nested folders by name under their parents'. With
  `localize: false` changed to `localize: true` in `MoveEffectToFolderDialog.js` the test fails at the option list,
  which holds `LOCAL.E2E Parent Folder.text`
  (`.superpowers/sdd/test-suite-rewrite/phase-6/mutations/E-T3-move-dialog.log`).

### 65. Character `mod.damage` and `mod.healing` were never applied

- **What:** the two character mods were settable by a `flatModifier` and shown in the sidebar, but no check read them.
  Since the 2023 conditional-modifier work, check damage and healing bonuses come only from `conditionalCheckModifier`
  elements (the `any` check type with the `any` selector covers "all checks"); the 2024 data-model rebuild dropped the
  last fallback read.
- **Fixed:** 2026-09-28 — removed as vestigial: the schema fields, the `MODS` entries (so the flat-modifier key
  select no longer offers them), and the sidebar rows. No migration (first release): the soresokai world's 56
  actors and the compendium's Astral Assassin had only the default `static: 0` values, which were stripped directly;
  no rules element anywhere targeted them. Damage/healing conditional modifiers are gated by
  `tests/e2e/logic/rules-elements.spec.js` ("damage and healing conditional modifiers apply to attack, casting, and
  item checks": the damage and healing parameters of rolled attack, casting and item checks). No run of this test
  against the code before the fix exists.

### 66. Effect Tray offered Create Folder on folders already at the pack's depth limit

- **What:** `EffectTrayList.svelte` showed a folder header's create-subfolder control below `CONST.FOLDER_MAX_DEPTH`
  (4), but compendium packs allow one level less (`CompendiumCollection#maxFolderDepth`, 3; the server rejects a
  fourth level with "You may not nest Folders more than 3 levels deep"). A depth-3 folder offered a control that always
  failed.
- **Found:** 2026-09-27 while bringing the tray's folders to parity with core's compendium directory.
- **Fixed:** 2026-09-27 — the control is gated on `trayState.maxFolderDepth` (`pack.maxFolderDepth`), as core's folder
  partial gates it on the collection's `maxFolderDepth`. Gated by `effect-tray.spec.js` 'folder nesting stops at the
  pack folder depth limit'. With the gate replaced by `true` in `EffectTrayList.svelte` the test fails at the depth-3
  folder's create-subfolder control (expected 0, received 1;
  `.superpowers/sdd/test-suite-rewrite/phase-6/mutations/E-T1-depth.log`).

### 67. An open Item Check dialog kept rolling its source after the item or effect was deleted

- **What:** an Item Check's dialog validated and initialized from `options.itemRollData`, a copy of the item's data
  taken when the dialog opened, so deleting the item (or, for a check opened from an effect row or the Effect HUD, the
  effect) left the dialog open and its Roll button rolled the deleted source from the stale copy.
- **Found:** 2026-09-28 while making check dialogs follow the live Actor.
- **Fixed:** 2026-09-28 — `_getItemCheckRollData` resolves an Item Check's source live: `itemId` names an owned item and
  `effectId` an effect among `actor.allApplicableEffects()`; `itemRollData` is used only when neither is given (the item
  chat card's snapshot). A deleted source fails validation and the dialog closes without a page error. Commits
  `15f35020` (items) and `23b33c46` (effects). Gated by `tests/e2e/check-dialog.spec.js` ("deleting the owned ability
  while its item dialog is open closes the dialog without a page error", and "deleting the effect while its Item Check
  dialog is open closes the dialog without a page error": the item or effect is deleted with its row's Delete button)
  and `rebuild-check-options.test.js`. No run of this test against the code before the fix exists.

### 68. An explicit Complexity or Difficulty of 0 on a Casting or Item Check was replaced by the derived value

- **What:** `initializeCastingCheckOptions` and `initializeItemCheckOptions` tested `!options.complexity` and
  `!options.difficulty`, and the option factories defaulted them to 0, so a 0 the caller or the dialog user supplied
  was indistinguishable from "unset" and snapped back to the spell's or item's value.
- **Found:** 2026-09-28 while rebuilding dialog options from caller options and user edits.
- **Fixed:** 2026-09-28 — the factories leave both `undefined` when unset and the initializers derive them only when
  `=== undefined`, so a supplied 0 is kept. Commit `15f35020`. Gated by `rebuild-check-options.test.js`
  ("Casting and Item Complexity and Difficulty").

### 69. Hotbar macros: Attack Check and document-ID macros did nothing; sheet-toggle macros used a deprecated global

- **What:** `TitanMacros#getAttackCheckMacro` (`src/system/Macros.js`) wrote the command
  `game.titan.macros.requestAttackCheck(...)`, but `TitanMacros` has only `rollAttackCheck`, so every Attack Check
  macro threw "not a function". `getMacroID` matched the ID method `'id'` while the Create Macro dialog and
  `getMacroItemFromID` use `'documentId'`, so a document-ID macro stored the Item's TITAN uuid and looked it up as a
  document ID, finding nothing. Sheet-toggle macros called the bare `Hotbar` global, a v13-deprecated alias.
- **Found:** 2026-09-28 by the plan A final whole-branch review (attack command); the document-ID and `Hotbar`
  defects while verifying every generated command.
- **Fixed:** 2026-09-29 — the Attack command calls `rollAttackCheck`, `getMacroID` matches `'documentId'`, and the
  sheet toggle calls `foundry.applications.ui.Hotbar.toggleDocumentSheet`. Gated by `tests/unit/Macros.test.js`
  (executes every generated command under each ID method) and `tests/e2e/macros.spec.js` (creates and executes each
  macro kind in the live world). Macros created before the fix keep their stored command and are not migrated (user
  decision); CHANGELOG.md tells users to re-create them by dragging the item to the hotbar again.

### 70. Rolling an item chat card's check through the check dialog raised a page error and posted nothing

- **What:** with the check options dialog shown, an item (or effect) chat card's check button opened the Item Check
  dialog, but Roll threw "Cannot assign to read only property '0' of object '[object Array]'" and no message was
  created. The dialog holds its Check Options frozen, the card's snapshot `itemRollData` among them, and
  `getItemCheckParameters` copies `itemRollData.customTrait` into the parameters by reference; `TitanCheck#sendToChat`
  handed the parameters to `ChatMessage.create`, whose `ArrayField#_cleanType` assigns each element back into the
  given array (read in `common/data/fields.mjs`), which a frozen array rejects.
- **Found:** 2026-09-29 by the plan A final-wave e2e for the item card → dialog → Roll path (V1).
- **Fixed:** 2026-09-29 — `sendToChat` passes `structuredClone` copies of `parameters` and `results`, so the message
  shares no array or object with the check. Gated by `tests/unit/check/check-send-to-chat.test.js` (a stub `create`
  that cleans arrays in place, fed frozen parameters) and `tests/e2e/chat-cards.spec.js` "an item card's check rolls
  through the shown dialog from the card snapshot" (rolls a deleted item's card check through the shown dialog and
  asserts the created message).

### 71. Name-identified hotbar macros broke on names containing an apostrophe, backslash, or double quote

- **What:** `TitanMacros` (`src/system/Macros.js`) wrote each generated command with the item name or uuid inside
  single quotes (`rollAttackCheck('${id}', ...)`). A name such as `Bob's Sword` ended the string early
  ("missing ) after argument list"), and a backslash was consumed as an escape. Pre-existing; affected every
  macro kind (Attack, Casting, Item, sheet toggle).
- **Found:** 2026-09-29 by the plan A fix-wave verification.
- **Fixed:** 2026-09-29 — every string argument is `JSON.stringify`-encoded. Gated by `tests/unit/Macros.test.js`
  (names with `'`, `\`, and `"` compile through `AsyncFunction` and pass the exact name through). The command text
  now uses double quotes, so `getOrCreateMacro` does not match a macro dragged before this version and a re-drag
  creates a new one; the older macros still run.

### 72. A blank selector key matched inconsistently, and a truthy non-Boolean multiAttack read differently per consumer

- **What:** Conditional check modifier lookups accepted a blank key inside an array key but not as a single key, and
  the cache builders stored blank-key elements under `''`. `multiAttack` reached the lookups as whatever the caller
  passed, so a truthy non-Boolean value applied the rating and roll-message consumers (truthiness) but not the check
  modifier lookup (`=== true`).
- **Found:** 2026-09-29 by the plan A fix-wave verification.
- **Fixed:** 2026-09-29 — a blank selector key never matches: the three keyed cache builders (roll messages,
  conditional rating modifiers, conditional check modifiers) group through `_sortElementsByKey` and store nothing under
  a blank key, and the check modifier lookup skips a blank key (single and inside arrays). The situational cache
  builder skips blank-key situations too, and `_sortElementsByKey` treats a missing key as blank. `multiAttack` is a
  Boolean from `createAttackCheckOptions` and from the weapon-derived default. Gated by the blank-key, whitespace-key,
  and multiAttack cases in `tests/unit/CharacterCheckModifiers.test.js`.

### 73. camelize dropped every literal 0, so keys such as "Level 0 Ward" lost their digit

- **What:** `camelize` (`src/helpers/utility-functions/Camelize.js`) removed a regex match when `+match === 0`,
  which is true for the string `'0'` as well as for whitespace runs. A 0 at the start of a word was deleted and
  `camelize('0')` returned an empty (blank) key. `_sortElementsByKey` carried a post-group blank check only to absorb
  that case.
- **Fixed:** 2026-09-29 - only whitespace matches are removed; every digit is kept. A string with any non-whitespace
  character now camelizes to a non-blank string, so the post-group blank check in `_sortElementsByKey` is removed.
  Every caller builds and looks up through `camelize` in memory; no camelized value is persisted to documents or
  flags. Gated by `tests/unit/Camelize.test.js`.

### 74. Migration Mode "Disabled" still ran the world migration

- **What:** `onceReady` ran `migrateWorld()` in the `else` branch of its prompt-mode test, so the "Disabled" choice
  migrated exactly like "Automatic", contradicting the setting's hint ("Disabled: skips migration entirely"); the
  legacy effect-Item converter also ran before the mode was read (see #82).
- **Found:** 2026-09-29 while planning the condition-effect sync (spec B, conditions rework).
- **Fixed:** 2026-09-29 (the version chain) and 2026-09-30 (the converter) — `resolveMigrationAction(mode,
  needsMigration)` (`src/helpers/migration/MigrateWorld.js`) maps the mode to none / migrate / prompt before any scan,
  and every migration step runs inside `migrateWorld` (#82). No live gate: the tests that gated it
  (`tests/unit/MigrationAction.test.js`, `tests/unit/OnceReady.test.js`,
  `tests/e2e/condition-migration.spec.js`) were deleted in `d874870b` (no migration tests while no migration is active).

### 75. Stat breakdowns never listed condition modifiers

- **What:** `ModifiableStatValueLabel` and `createModifiableStatTooltip` took one prop per modifier bucket and had no
  `condition` bucket, so no sheet or Player HUD stat tooltip showed a condition's penalty; the Speed and Mod rows also
  omitted Abilities, and the skill Training/Expertise tooltip hand-rolled its own partial breakdown.
- **Found:** 2026-09-29 while planning spec B's sheet-rating checks.
- **Fixed:** 2026-09-29 — the label takes the stat's `mod` object and the tooltip walks `MOD_BUCKET_LABELS`
  (`src/system/ModBuckets.js`), whose dynamic buckets `_resetDynamicMods` also reads. Gated by
  `tests/unit/ModBuckets.test.js` (bucket order, tooltip, and a scan rejecting any Svelte source that names a bucket)
  and `tests/e2e/logic/conditions.spec.js` ("Blinded lowers the sheet's Defense by a quarter of its base and the
  breakdown lists Conditions": Blinded is applied from the Token HUD and the sheet's Defense tooltip is read). No run of
  this test against the code before the fix exists.

### 77. Opening a Multiply Base or Multiply Sum editor saved "up" for an element with no stored rounding

- **What:** the rounding select listed `up` first; `Select`'s clamp effect writes its first option into an unlisted
  bound value and fires `onchange`, which `DocumentSelect` persists, so merely opening `ItemSheetMulBaseSettings` or
  `ItemSheetMulSumSettings` for an element without `rounding` (engine default `down`) silently stored `up` and changed
  what the element applied.
- **Found:** 2026-09-29 while planning the `nearest` rounding option.
- **Fixed:** 2026-09-29 — both editors read `ROUNDING_DIRECTIONS`, led by `down` (Task 1). Gated by
  `tests/unit/RoundingDirections.test.js` (the list order and every rounding editor on it) and
  `tests/e2e/component-probe-inputs.spec.js` (the "multiplier editors with no stored rounding" probes mount both editors
  on a synthetic element with no `rounding`: the select shows `down` and the element stores `down`) and
  `tests/e2e/rules-element-editor.spec.js` (the rounding select of both editors offers every direction and stores
  `nearest`).

### 78. A turn-start report never showed the conditions of an actor with no other effect

- **What:** `onTurnStart` stored `conditions` in the report but set `effects` only when the actor had an
  `effect`-subtype Active Effect, and `TurnStartReportChatMessage` mounted the effect-and-condition tags only when
  `system.effects` was set, so an actor with conditions and no effect got a report that stored its conditions and
  never drew them.
- **Found:** 2026-09-30 while folding the report's condition-description key into the conditions rework plan.
- **Fixed:** 2026-09-30 — the card mounts `ChatMessageEffectsTags` when effects or conditions are reported, and
  `ChatMessageEffectsTags` reads each duration list through `effects?.` (Task 5). Gated by
  `tests/e2e/combat-turns.spec.js` "a turn-start report stores the description key and its tooltip shows the text, with
  no effect" (a Blinded-only actor's turn-start report shows Blinded). The older-report case is not tested: it fed
  data of an earlier shape, which the rewritten suite does not test.

### 79. Report effect tags showed "LOCAL.….text" tooltips

- **What:** `EffectTag` built its tooltip from already-localized text and passed the string to `tooltipAction`, whose
  `processTextData` localizes a string as a key again, so every turn-start, turn-end, and effects-expired report
  entry's tooltip read "LOCAL.Effect lasts ….text".
- **Found:** 2026-09-30 while folding the report's condition-description key into the conditions rework plan.
- **Fixed:** 2026-09-30 — `EffectTag` passes its tooltip as `TextData` with `localize: false` (Task 5). Gated by
  `tests/unit/BuildEffectTagTooltip.test.js` (the tooltip is localized exactly once) and
  `tests/e2e/combat-turns.spec.js` "a turn-start report stores the description key and its tooltip shows the text,
  with no effect" (a live report tag's tooltip holds no `LOCAL.`).

### 80. Every report tag tooltip led with the Custom-duration text

- **What:** `EffectTag.svelte` prefixed every tooltip with `effect.custom.desc` ("Effect lasts for a Custom duration."),
  so condition tags and Permanent, Turn Start, Turn End, Initiative, and Expired effect tags all claimed a Custom
  duration. The per-type `effect.*.desc` keys had no reader since the six tag components were merged into `EffectTag`.
- **Found:** 2026-09-30 by the Task 5 buddy check (plan B).
- **Fixed:** 2026-09-30 — each duration tag passes its own `leadKey` (`effect.<type>.desc`) and a condition entry has
  none; `buildEffectTagTooltip` (`src/helpers/utility-functions/BuildEffectTagTooltip.js`) builds the tooltip. Gated by
  `tests/unit/BuildEffectTagTooltip.test.js` (the builder, plus scans deriving the duration types from the
  `effect.<type>.desc` keys: every duration tag passes its own key and every report list renders through its own tag),
  `tests/e2e/component-probe-context.spec.js` (each tag's live tooltip leads with its own text), and
  `tests/e2e/combat-turns.spec.js` "a turn-start report stores the description key and its tooltip shows the text,
  with no effect" (a condition tag's tooltip is its description alone).

### 81. Legacy base-type condition effects were inert and never migrated

- **What:** condition Active Effects created before conditions became the `condition` subtype are `base`-type effects
  flagged `flags.titan.type: 'condition'`; the condition sync skipped them.
- **Found:** 2026-09-30 by the Task 5 buddy check (plan B).
- **Resolved:** won't fix in code (user decision 2026-09-30): base-type condition effects are removed from the user's
  worlds by a one-off cleanup; TITAN does not load base-type Active Effects (see #92).

### 82. The legacy effect-item converter ran on every GM load regardless of Migration Mode

- **What:** `onceReady` ran `convertEffectItemsToActiveEffects()` before the Migration Mode was resolved, so "Disabled"
  still scanned and could write world data, "Prompt" wrote before its dialog appeared, and every unlinked token's actor
  was materialized on each load.
- **Found:** 2026-09-30 by the Task 5 buddy check (plan B).
- **Fixed:** 2026-09-30 — the converter runs only inside `migrateWorld`, per stored actor in `migrateStoredActors`
  (`src/helpers/migration/MigrateStoredActors.js`) before the version chains, and `worldNeedsMigration` reports legacy
  effect Items, so all three modes govern it; only the active GM migrates, a token's actor is read only to write it,
  and the final notification counts failures. No live gate: the tests that gated it (`tests/unit/OnceReady.test.js`,
  `tests/unit/MigrateStoredActors.test.js`,
  `tests/unit/MigrateWorld.test.js`, `tests/unit/ConvertEffectItemsToActiveEffects.test.js`,
  `tests/unit/StoredActorSources.test.js`, `tests/e2e/condition-migration.spec.js`,
  `tests/e2e/pack-conversion.spec.js`) were deleted in `d874870b` (no migration tests while no migration is active).

### 83. Condition sync and effect-item converter missed actors stored in world Scene and Adventure packs

- **What:** the condition sync covered world actors and scene tokens; the converter also covered world Actor packs.
  Neither reached unlinked-token deltas in world Scene packs or the actors and scenes in world Adventure packs, and the
  sync did not reach world Actor packs, so stored copies stayed stale and re-imported stale data.
- **Found:** 2026-09-30 by the Task 5 buddy check (plan B).
- **Fixed:** 2026-09-30 — `walkStoredActorSources` (`src/helpers/migration/StoredActorSources.js`) lists the stored
  actors in world actors, unlinked world-scene tokens whose base actor exists, world Actor packs, unlinked tokens in
  world Scene packs whose base world actor exists, and the actors and unlinked scene tokens in world Adventure packs,
  reading packs through a server projection that loads no document; the converter, the condition sync, and the
  migration scan all walk it, and a pack is unlocked only to write and locked again. One exception, by design: an
  orphaned token (an unlinked token whose base actor is gone) on a world scene or in a world Scene pack is never
  written, because Foundry v14 core cannot create or delete entries in its delta (#96); one with pending work is
  reported as a failure that names it and says to delete it (#105). An Adventure's scene tokens are data, and are
  walked whatever their base actor. No live gate: the tests that gated it (`tests/unit/StoredActorSources.test.js`,
  `tests/e2e/condition-migration.spec.js`) were deleted in `d874870b` (no migration tests while no migration is active).

### 84. Report text reached tooltips and rich text as unsanitized HTML

- **What:** report chat data stores HTML in `StringField` / `ObjectField` values (a turn report's `message` entries, an
  older report's condition `description`), which bypass core's `HTMLField` sanitization. `tooltipAction` handed its
  content to tippy with `allowHTML: true`, and `RichText.svelte` passed its value to `enrichHTML` (which assigns it to
  a live element's `innerHTML`) and then `{@html}`, so a message author could run script in every reader's client.
- **Found:** 2026-09-30 by the Task 5 buddy check (plan B).
- **Fixed:** 2026-09-30 — `tooltipAction` cleans every non-blank tooltip with `foundry.utils.cleanHTML` (the cleaner
  core's TooltipManager applies) before tippy receives it, on creation and on update, and `RichText` cleans its value
  before `enrichHTML`. Gated by `tests/e2e/html-sanitization.spec.js` (a report message and a report tag tooltip
  carrying an `onerror` payload render their text and markup with no handler, and icon markup survives) and by
  `tests/e2e/custom-traits.spec.js` ("a live tooltip updated to user HTML is cleaned on update": the description is
  edited to the payload in the Edit dialog).

### 85. Turn-start and turn-end report messages rendered blank

- **What:** `ChatMessageRichTextMessages.svelte` passed `text={message}` to `RichText`, which reads only `value`, so
  every rules-element turn message rendered `enrichHTML(undefined)`, an empty string.
- **Found:** 2026-09-30 by the Task 5 buddy check (plan B), by reading the code.
- **Fixed:** 2026-09-30 — the component passes `value={message}`, together with #84 (the prop fix enables the rich-text
  sink). Gated by `tests/e2e/html-sanitization.spec.js` (a turn-start report's message renders its text).

### 86. A two-way-bound prop whose parent bound an undefined value crashed with Svelte `props_invalid_value`

- **What:** `$bindable(void 0)` compiles to a fallback thunk, and Svelte throws when a parent `bind:`s an undefined
  value to a bindable prop with any fallback (40 components with `$bindable(void 0)`, and 7 with `false`/`0`/`''`
  defaults). The component rendered with a `props_invalid_value` error, then failed to render until re-mounted.
- **Found:** 2026-09-30 (Task 1 fix round 1; diagnosed when the e2e `no stored rounding` tests failed RED-after-GREEN).
- **Fixed:** 2026-09-30 — all 62 `$bindable(void 0)` / `$bindable(undefined)` declarations in `src/**/*.svelte` became
  `$bindable()`, with defaults applied at read sites via `$derived(x ?? default)`. Gated by
  `tests/unit/BindableNoFallback.test.js` (scans rejecting any `$bindable(` with a non-empty argument) and
  `tests/unit/BindablePropDefaults.test.js` (CheckboxInput and ExpandButton unbound and bound to `undefined`).

### 87. The spell sheet's Casting Check tab never showed its Aspect Costs panel

- **What:** `SpellSheetCastingCheckTab.svelte` gated the Aspect Costs panel on `document.data.aspect` (undefined on the
  Item; the aspects are in `system.aspect`), so the panel and its ScrollingContainer never mounted. The `{#each}` also
  read the wrong path, and the scroll binding wrote to a misspelled `tabs.castingCheck.ScrollTop`.
- **Found:** 2026-09-30 (Task 1 fix round 2; e2e "lists the spell aspect costs" failed with `.aspect-costs` not found).
- **Fixed:** 2026-09-30 — the panel gates on `displayedAspects.length > 0` (output of a shared selector), the `{#each}`
  reads the correct path, and scroll binding uses `scrollTop`. Gated by `tests/e2e/spell-sheet.spec.js` ("lists the
  aspects that make up the total cost", "keeps its aspect list scroll position across tab switches") and
  `tests/unit/SheetStatePaths.test.js` (checks every `$appState` dotted path against the initial state factory).

### 88. That tab's scroll position was bound to a misspelled state key (`ScrollTop`)

- **What:** `SpellSheetCastingCheckTab.svelte` bound the scroll container to `tabs.castingCheck.ScrollTop` (capital S)
  instead of the defined state key `scrollTop`. The misspelled key was created on first write and read back on remount,
  so retention appeared to work behaviourally despite the typo; the e2e passed under the broken key and failed with
  `SheetStatePaths.test.js`.
- **Severity:** Low / latent. Correcting the key broke no behaviour; the typo was a stale data artifact.
- **Found:** 2026-09-30 (Task 1 fix round 2/3, detected by `SheetStatePaths.test.js` path validation).
- **Fixed:** 2026-09-30 — scroll binding uses `scrollTop`. Gated by `tests/unit/SheetStatePaths.test.js`.

### 89. Spell aspect tags never sorted by size

- **What:** `SpellAspectTags.svelte` computed `calculateAspectTagSize` on the `{idx, standardAspect}` index entries, so
  every size was 0 and the tags stayed in input order instead of sorting by cost (range 0, damage 1,
  inflictCondition 3, etc.).
- **Found:** 2026-09-30 (Task 1 fix round 5; new e2e assertion comparing rendered order against expected).
- **Fixed:** 2026-09-30 — `sortedAspects` derives via `[...aspects].sort(...)` by
  `calculateAspectTagSize(entry.aspect)`, operating on the aspect objects themselves (not index entries). Gated by
  `tests/unit/SpellAspectTags.test.js` (multiple aspect set with known sizes asserts order) and
  `tests/e2e/chat-cards.spec.js` "the spell card lists the displayed aspect tags by size, as the character sheet row
  does" (character-sheet row and chat card both list aspects by size).

### 90. A `'none'` resistance check added 2 to an aspect tag's size though no resistance stat renders

- **What:** `calculateAspectTagSize` in `SpellAspectTags.svelte` counted a resistance check's size contribution
  whenever `aspect.resistanceCheck` was truthy; the value `'none'` is truthy but `SpellAspectTag` and
  `SpellCustomAspectTag` render no resistance stat for `'none'`, inflating the tag's size and breaking sort order.
- **Found:** 2026-09-30 (Task 1 fix round 5, detected in the same sort test with a custom aspect having
  `resistanceCheck: 'none'`).
- **Fixed:** 2026-09-30 — size calculation guards with `&& aspect.resistanceCheck !== 'none'`. Gated by same as #89.

### 91. Turn-start report effects were drawn with the Turn End tag

- **What:** `ChatMessageEffectsTags.svelte` rendered a report's `effects.turnStart` list with `TurnEndEffectTag`, so
  turn-start effects showed the Turn End icon and colors; `TurnStartEffectTag` had no reader outside the component
  probe.
- **Found:** 2026-09-30 while planning the fix for #80.
- **Fixed:** 2026-09-30 — the list renders through `TurnStartEffectTag`. Gated by the report-list scan in
  `tests/unit/BuildEffectTagTooltip.test.js` and `tests/e2e/combat-turns.spec.js` "a turn-start report tags a turn-start
  effect with the Turn Start tag and its duration lead" (a live turn-start report tags a turn-start effect with the
  Turn Start icon, not the Turn End one, and its tooltip leads with the Turn Start text).

### 93. Migration writes into an Adventure pack counted as stored when Foundry rejected them

- **What:** The Adventure write target in `src/helpers/migration/StoredActorSources.js` never checked what
  `adventure.update` returned. Core resolves `undefined`, without throwing, when the dry-run validation fails or a
  `preUpdate` hook vetoes the write, so the migration counted the actor as updated and could announce "complete" over
  writes that were never stored. Each actor's write also sent the Adventure's whole actor (or scene) list, which core
  validates element by element (`ArrayField#_updateDiff`): while any actor in it still held a legacy `effect` Item, an
  unregistered Item subtype, every write of that list failed, including the converter's own save between creating the
  new effects and removing the legacy Items (read in core source; legacy Items cannot be seeded live). A rejected
  working copy was never reset.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B), read in core source.
- **Fixed:** 2026-09-30 — an Adventure's actors and scene tokens edit a working copy that the walk stores in one
  `Adventure#update` per field when it leaves the Adventure, so the conversion of every actor in it (the created
  effects and the removed legacy Items) lands in one write that holds no legacy Item. The write is checked (an
  `undefined` result throws); each actor it carried counts as updated only once it is stored and as failed when it is
  not; the working copy lives for one walk. Scope: one actor or scene token whose conversion cannot complete still
  fails the write of its whole Adventure field, because core validates every element of the field; the failure names
  each entry still holding a legacy effect Item. The cure is to resolve the failure the pass reports for that entry by
  name (its conversion's own error), or to remove the entry from the Adventure; the next migrating GM load then stores
  the field. No live gate: the tests that gated it (`tests/unit/StoredActorSources.test.js`,
  `tests/unit/MigrateStoredActors.test.js`, `tests/e2e/condition-migration.spec.js`) were deleted in `d874870b` (no
  migration tests while no migration is active).

### 94. Legacy timed effects converted inside an Adventure were stored enabled after they expired

- **What:** `TitanActiveEffect._preCreate` shows an effect's status icon and disables a timed effect with no time
  remaining. Neither the migration's Adventure write path nor `Adventure#importContent` runs `_preCreate` for embedded
  effects, and `buildEffectData` stores every timed effect with `disabled: false`, so an expired timed legacy effect
  converted inside an Adventure applied its rules once the Adventure was imported, while the same effect converted on
  an actor was disabled.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B), read in core source.
- **Fixed:** 2026-09-30 — one rule, `getEffectCreationChanges`
  (`src/helpers/utility-functions/GetEffectCreationChanges.js`), gives an `effect`-subtype effect's creation changes;
  `_preCreate` applies it, and the Adventure write path builds every created effect with
  `TitanActiveEffect.buildCreationSource`, which constructs the effect (so its schema cleans the data as creation does)
  and applies the same rule and core's `transfer: false`. The data path stores what creation stores except `start`,
  which records a creation moment that inline data lacks. Gated by `tests/unit/GetEffectCreationChanges.test.js` (the
  rule). The tests that also gated it (`tests/unit/StoredActorSources.test.js`,
  `tests/e2e/effect-creation-source.spec.js`) were deleted in `d874870b` (no migration tests while no migration is
  active); the Adventure write path and the stored `disabled`,
  `showIcon` and `transfer` have no live gate.

### 95. Migration showed "complete" when a world pack could not be read or re-locked

- **What:** `walkWorldPacks` reported a pack whose projection failed and skipped it, and the lock restore logged and
  swallowed its own failure. Neither failure was counted, so `migrateWorld` still showed "migration complete", and
  when the only pending work sat in an unreadable pack, the scan answered "nothing to migrate" and no failure was ever
  shown.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B).
- **Fixed:** 2026-09-30 — `walkStoredActorSources(failures)` records each pack it cannot read and each lock it cannot
  restore; `migrateStoredActors` adds them to `failed`, and `storedActorsNeedMigration` reports work when a pack could
  not be read, so a pack that stays unreadable is reported as a failure on every migrating load. A pack the walk
  could not read is not read again in the same walk, so an Adventure pack, walked for its actors and its scene tokens,
  counts as one failure. No live gate: the tests that gated it (`tests/unit/StoredActorSources.test.js`,
  `tests/unit/MigrateStoredActors.test.js`) were deleted in `d874870b` (no migration tests while no migration is
  active).

### 96. Unlinked tokens whose base actor is gone were never migrated in world scenes and Scene packs

- **What:** The stored-actor walker skipped an unlinked token without a base actor (an orphaned token) in world scenes
  and world Scene packs, so its delta kept legacy `effect` Items and stale condition effects, while the Adventure path
  migrated such a token's delta as data. CLOSED_BUGS #83 said every stored actor was walked, which was not true for
  these tokens.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B).
- **Resolved:** 2026-10-01. An orphaned token is never written, by design. Since #105 it is reported instead: the
  scan reports the pending work of its own delta (a legacy `effect` Item or a stale condition), and the pass counts
  it as a failure with a console line that names its scene and the token and says to delete the token. An orphaned
  token with nothing pending produces no report. The GM therefore sees a migration prompt (Prompt) or a reported
  failure (Automatic) on every load until the token is deleted. A token holding only a stale condition is not written
  either, because:
  - the token has no actor in the game;
  - deleting the token is the remedy;
  - removing a key inside an entry through a parent update (the condition sync's description removal) has not been
    measured;
  - the content scan runs on every load, so a skipped orphan keeps being reported.

  The write limitation comes from Foundry v14 core: core cannot create or delete entries in an orphaned token's
  delta, and the conversion needs both (`docs/POST_WORK_FINDINGS.md`, 2026-10-01).
  - Measured live with raw-data tokens, pending real-path re-run, on a world-scene and a Scene-pack token, with a second
    GM connected and a reload read-back: a parent Token or Scene update that adds an entry is rejected by the client's
    dry run (`EmbeddedCollectionDelta#_prepareDeltaUpdate`); one that drops an entry, or deletes it with an update
    operator, stores nothing; one that updates an entry the delta already holds is stored, and tombstones survive.
  - Measured live with a raw-data token, pending real-path re-run, on the Scene-pack token only: an embedded create
    through the token's ActorDelta threw on the client.
  - Read in core, not run: the throw site, `TokenDocument#_onRelatedUpdate` (`client/documents/token.mjs:3809`),
    which dereferences the token's null actor; the same create on the world-scene token; and the embedded update and
    delete, which reach the same line.
  - Inferred, not read back: the throw comes after the server write.
  - Orphaned tokens were removed from the user's worlds by a one-off cleanup outside the code: logged in
    `docs/TODO.md` and done 2026-10-01.
  - The walker comments state the reasons, and CLOSED_BUGS #83 states the exception.
  - An Adventure's scene tokens are inline data written through the Adventure, which core writes cleanly whatever the
    base actor (live with a raw-data token, pending real-path re-run), so they are migrated.
  - No live gate: `tests/unit/StoredActorSources.test.js` was deleted in `d874870b` (no migration tests while no
    migration is active).

### 97. A failed version migration stored part-migrated data under the previous version

- **What:** `migrateDocument` in `src/helpers/migration/MigrateWorld.js` accumulated changes across the levels of a
  version. When a later level threw, it wrote the earlier levels' changes together with the previous
  `documentVersion`, so a retry re-ran migrations on data they had already changed. Latent: no version migrations
  exist yet.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B).
- **Fixed:** 2026-09-30 — `migrateDocument` copies the update data after each fully completed version
  (`foundry.utils.deepClone`, which keeps an update operator such as `_del` by reference) and writes that copy, so no
  part of a failed version is stored. No live gate: `tests/unit/MigrateWorld.test.js` was deleted in `d874870b` (no
  migration tests while no migration is active).

### 98. A stored actor whose migration write a hook vetoed counted as skipped

- **What:** `migrateStoredActors` counted an actor whose writes changed nothing as skipped, so a `preCreate`,
  `preUpdate`, or `preDelete` hook that vetoed a migration write left the actor's work pending while the migration
  announced completion, and the next GM load found the same work again.
- **Found:** 2026-09-30 while planning the fix for #93.
- **Fixed:** 2026-09-30 — after its writes, each actor's data is checked again (`storedActorNeedsMigration`); an
  actor with work left counts as failed and is reported. No live gate: `tests/unit/MigrateStoredActors.test.js` was
  deleted in `d874870b` (no migration tests while no migration is active).

### 99. An Adventure token whose legacy Item overrode its base actor's legacy Item ended up with two converted effects

- **What:** The Adventure walk read only a scene token's own delta effects, so when the delta held a legacy `effect`
  Item with the same id as a legacy Item on its base actor (an override, for example an effect toggled on the token),
  the token converted its own copy while the base actor converted the base copy; after import the token held both
  effects.
- **Found:** 2026-09-30 while planning the fix for #93.
- **Fixed:** 2026-10-01 — with #100 and #101, by one change of identity: a converted effect takes its legacy Item's
  `_id` (`buildEffectData`; `keepId` on documents), the id core relates a token's delta to its base actor by
  (`common/documents/actor-delta.mjs` `#mergeEmbeddedCollection`). The token's own Item converts into the token's own
  effect in the base conversion's slot (hidden by a tombstone first, then created over it), so core's merge shows one
  effect, the token's. An Adventure token's base actor is the Adventure's actor with its actor id, else the world
  actor. No live gate: the tests that gated it (`tests/unit/StoredActorSources.test.js`,
  `tests/unit/ConvertEffectItemsToActiveEffects.test.js`, `tests/e2e/converted-effect-identity.spec.js`)
  were deleted in `d874870b` (no migration tests while no migration is active).

### 100. A token's overriding legacy Item converted into a duplicate when its base actor's conversion was not stored

- **What:** When a base actor's conversion write was vetoed or not stored, an unlinked token whose delta overrode one
  of the base actor's legacy `effect` Items converted its own copy; when the base actor converted on a later load, the
  token held both effects. Converted effects got fresh random ids, so core's delta merge (by `_id`) could not tell the
  token's copy overrode the base's. Affected world tokens and Adventure tokens.
- **Found:** 2026-09-30 while planning the fix for #99.
- **Fixed:** 2026-10-01 — the identity change of #99: both conversions take the Item's id, so whichever side converts
  first, and whether or not the other side's write is stored, the token's own effect overrides the base actor's. A
  token's Item deletion in an Adventure stores what core stores for a world token's deletion: a tombstone where the base
  actor holds a valid Item with the id, and none for an Item the base actor lacks (both read back after a reload; live
  with a raw-data token, pending real-path re-run). A legacy `effect` Item of the base actor takes no tombstone: it is
  an invalid document, which core's base collection never holds, and core's client deletion tombstones only an id its
  base collection holds. That case follows core's client deletion and is not measured: the server refuses a legacy Item,
  so none can be seeded. No live gate: `tests/unit/StoredActorSources.test.js` was deleted in `d874870b` (no migration
  tests while no migration is active).

### 101. An inherited legacy Item a token removed came back as a converted effect

- **What:** An unlinked token that removed an inherited legacy `effect` Item held a tombstone for that Item's id. The
  base actor's conversion created the replacement effect with a fresh random id, which the tombstone did not hide, so
  the token regained the effect. Affected world tokens and Adventure tokens.
- **Found:** 2026-09-30 while planning the fix for #99.
- **Fixed:** 2026-10-01 — a token's inherited conversion of an Item its own data claims (an Item entry of its delta,
  a tombstone included, or a conversion it holds itself) is hidden with an effects tombstone, as core deletes an
  inherited effect from a synthetic actor; every walked source carries the effects it inherits, so the scan finds such
  a token, and the stamp also finds the conversions older versions created under random ids. No live gate: the tests
  that gated it (`tests/unit/StoredActorSources.test.js`,
  `tests/unit/MigrateStoredActors.test.js`, `tests/e2e/converted-effect-identity.spec.js`)
  were deleted in `d874870b` (no migration tests while no migration is active).

### 103. Deleting an item or effect without confirmation still tried to open the confirmation dialog

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).

- **What:** `requestItemDeletion` and `requestEffectDeletion` deleted at once when confirmation was off, then fell
  through to the confirmation branch (read: there was no `else`). The document is normally already gone, so no dialog
  opened. When the delete was refused (a `preDelete` hook that returns false), the confirmation dialog opened after the
  user had turned confirmation off.
- **Found:** 2026-10-01 while diagnosing #102 (read in code).
- **Fixed:** 2026-10-02. The confirmation branch is the `else` of the `shouldConfirm...` check in both methods.
- **Gate tests:** `tests/e2e/character-sheet-rows.spec.js` ("with confirmation off, a refused item delete leaves the
  item deletable and opens no dialog" and the same for an effect). The tests install a `preDelete` listener that
  returns false, a test instrument in the page: with a delete that succeeds, "the row deletes and no dialog opens"
  cannot fail before the fix. The test clicks the row's delete button with confirmation off, waits until the listener
  refused the delete (the positive edge), waits two animation frames, and expects no dialog and the document still
  there. Before, measured with only the `else` of the confirm branch removed in both methods (the rest of the current
  code kept, built; `phase-3/build-before-fix103-else.log`): the item test failed with a dialog present
  (`Expected 0, Received 1`, `phase-3/gate103-else-before-fix-item.log` and `-item-run1.log` to `-run5.log`: 6 of 6
  runs) and the effect test failed the same way (`phase-3/gate103-else-before-fix-effect.log` and
  `-effect-run1.log` to `-run5.log`: 6 of 6 runs). The delay between the refusal and the dialog was not measured, so
  the two-frame wait is justified only by those 12 failures. The earlier effect-variant evidence
  (`phase-3/gate103-before-fix-effect.log`) was for an earlier form of the test and is superseded. After: both
  passed (`phase-3/gates-fix-after.log`). The plain confirmation-off delete of an item and of an effect (no dialog,
  the document gone) and the confirmation-on cancel and confirm paths are tested beside them.

### 104. Open sheets re-rendered on changes to a different actor that shared their id

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-2/` (local, not checked in).

- **What:** `ReactiveDocument.svelte.js` invalidated on `update<Document>` and on embedded Item/ActiveEffect hooks when
  the changed document's `id`, or its parent's, equaled the bridged document's `id`. An unlinked token's synthetic
  actor has its base actor's id, so an edit to a token's synthetic actor invalidated an open base-actor sheet.
- **Found:** 2026-10-01 while diagnosing #102 (read in code).
- **Fixed:** 2026-10-02. The three comparisons use `uuid` (`changed?.uuid`, `parent?.uuid`, `parent?.parent?.uuid`
  against `this.doc.uuid`).
- **Gate tests:**
  - `tests/unit/ReactiveDocument.test.js`, two cases with two fakes that share `id` and differ in `uuid` (an update, and
    an embedded Item and ActiveEffect update, of the sibling leave the reader alone; those of the wrapped document
    re-render it). Before: 2 failed, 1 passed (`unit-before-fix.log`). After: 3 passed (`unit-after-fix.log`).
  - `tests/e2e/sheet-header.spec.js` ("an edit on an unlinked token sheet leaves the open base actor sheet
    unchanged"): a counting getter on the base actor's `system` and on the token's synthetic actor's `system` counts
    what the open sheets read. An edit of the name on the base sheet raises the base count (presence), the same edit
    on the unlinked token's sheet raises the token count and leaves the base count unchanged. Before: failed, the base
    count went from 588 to 1129 (`pin-before-fix.log`). After: passed (`pin-after-fix.log`).

### 105. Orphaned tokens with pending migration work were skipped silently

- **What:** The stored-actor walker skipped an orphaned token (an unlinked token whose base actor is gone) on a world
  scene or in a world Scene pack. When its own delta held a legacy `effect` Item or a stale condition, the scan did
  not report the work, the pass counted no failure, and the migration announced completion, so the GM was never told
  the token existed or that deleting it is the remedy.
- **Found:** 2026-10-01 by the buddy check of the Task 5 fix round 2 code (plan B).
- **Fixed:** 2026-10-01. `walkSceneTokens` and `walkScenePackRecord` (`src/helpers/migration/StoredActorSources.js`)
  yield an orphaned token from its own stored delta with no way to open it (`open: null`, `orphan` names the token,
  its scene and its pack). The scan reports its pending work; `migrateStoredActors` counts it as one failure and logs
  `Failed to migrate the unlinked token "<token>" on scene "<scene>"[ in pack "<label>"]: its base actor is gone, so
  the migration does not write to it. Delete the token.` It never opens or writes the token, and never changes the
  lock of its Scene pack (#96 gives the reasons). An orphaned token with nothing pending is silent. The GM sees a
  migration prompt or a reported failure on every load until the token is deleted.
  - No live gate: the tests that gated it (`tests/unit/StoredActorSources.test.js`,
    `tests/unit/MigrateStoredActors.test.js`, `tests/e2e/condition-migration.spec.js`) were deleted in `d874870b` (no
    migration tests while no migration is active).

### 112. The Effect Tray's pack list did not show a compendium created after the tray was built

- **What:** `EffectTrayState` read the ActiveEffect packs once, in its constructor, and its hooks refreshed only on
  Active Effect and Folder changes. The tray is a sidebar tab built at ready, so a compendium created later in the
  session was never offered in `effect-tray-pack-select`, and a deleted one stayed listed. Measured: once the Phase 0
  sweep had removed the world pack `E2E Tray Effects`, `effect-tray.spec.js:331` failed. Its `beforeEach` re-created
  the pack, and the select offered only `TITAN Effects Effects TITAN Effects (Copy)` (`e2e-phase0.log`).
- **Evidence:** the files named in this entry are in `.superpowers/sdd/test-suite-rewrite/phase-0/` (local, not checked
  in).
- **Found:** 2026-10-01, Phase 0 of the test-suite rewrite.
- **Fixed:** 2026-10-01.
  - Core citations in this entry refer to Foundry 14.364 at `C:\FoundryVTT\V14\dev\foundry`, the build the server runs.
  - Core fires no hook named for a compendium's creation or deletion. It changes `game.packs` and then calls
    `ui.compendium.render()`. This runs on the creating client and, through the `manageCompendium` socket, on every
    other client. A world compendium configuration change does the same. Read:
    `client/documents/collections/compendium-collection.mjs:736-749, 917-926, 935-942, 950-966`.
  - That re-render calls the `renderCompendiumDirectory` hook (read: `client/applications/api/application.mjs:588-589,
    1674-1680`). The directory has always rendered by then, because the sidebar force-renders every visible tab at
    startup (read: `client/applications/sidebar/sidebar.mjs:198-213`).
  - `EffectTrayState` (`src/sidebar/tray/EffectTrayState.svelte.js`) now registers `renderCompendiumDirectory`. On
    each call it re-reads `getEffectCompendiums()` and replaces `compendiums` when the list differs. When the selected
    pack is gone, the selection falls back as it does on construction (`#resolveSelection`) and the tray reloads.
  - Measured with two GM clients (probe `diag112.mjs`, result `diag112.json`): a pack created on one client appeared in
    both tray selects, and deleting it removed it from both. The client that had it selected fell back to
    `TITAN Effects`.
  - Gated by `tests/e2e/effect-tray.spec.js` 'the tray follows a world compendium created and deleted in the Compendium
    directory, on both GM clients' (its last test). It needs no leftover state; every step uses a real control. It
    runs on the spec's E2E GM 1 page and on a second client logged in as E2E GM 2, which sees the pack change only
    through the `manageCompendium` socket:
    - with both trays already built, it creates a pack with a run-unique `E2E Tray Pack <timestamp>` label through
      the first client's Create Compendium dialog;
    - on each client it asserts the tray offers the pack, selects it in the tray, and sees the empty-pack state;
    - it deletes the pack through the first client's directory context menu and confirmation;
    - on each client it asserts the tray no longer offers the pack, has fallen back to `TITAN Effects`, and lists that
      pack's top-level folders and root effects;
    - it asserts that neither client raised a page error, and that core reported no error through `Hooks.onError` on
      either client. Core catches a hook listener's throw in `Hooks.#call` and passes it to `Hooks.onError`, which
      calls the `error` hook only when the thrown value is an `Error` (`Error.isError`); a thrown non-`Error` value is
      logged as a console warning and reported nowhere (read: `client/helpers/hooks.mjs:158-168, 182-188`). The
      shared page-error harness collects the page errors and the reported `Error`s: `login` installs
      `installHookErrorReporting` (`tests/e2e/world.js`) on every client page, and each `attachPageErrors` collector
      receives the page's `pageerror` messages and its `Hooks.onError` reports. The console is not read. The harness
      gate of `tests/e2e/harness.js` `test` also fails the test on any such error, on either client.
  - Measured mutations of `EffectTrayState`, one run each, each rebuilt and then restored (script
    `fix5-mutate-e2e.mjs`, output `fix5-mut112-*.log`):
    - the `renderCompendiumDirectory` hook renamed away: fails, expected 1 option, received 0;
    - no reload after the fallback: fails, the empty-pack state is still shown;
    - the hook skipped on E2E GM 2 only: fails at the option count, expected 1, received 0. Which client's iteration
      failed is inferred, not measured: the failure output does not name the client, and only E2E GM 2 was mutated;
    - a throw inside the hook after a pack deletion, before the fallback, on E2E GM 1 only and then on E2E GM 2 only:
      fails, the selection never falls back (expected `TITAN Effects`, received `undefined`); for E2E GM 2, which
      client's iteration failed is likewise inferred;
    - the same throw at the end of the hook, after the fallback, on E2E GM 1 only and then on E2E GM 2 only: fails
      at the error assertion of the mutated client, which names the client and lists the reported error, e.g.
      `Hooks.onError (Hooks.#call): Error thrown in hooked function '' for hook 'renderCompendiumDirectory'.
      mutation: throw at the end of a deletion on E2E GM 1` (`fix5c-mut112-throw-at-end-on-gm1-shared-harness.log`,
      `fix5c-mut112-throw-at-end-on-gm2-shared-harness.log`; script `fix5-mutate-e2e.mjs`, restore record
      `fix5c-mutate.out`). Before hook errors were collected, both runs passed
      (`fix5b-mut112-throw-at-end-on-gm1-before-test-fix.log`, `fix5b-mut112-throw-at-end-on-gm2-before-test-fix.log`).
  - The test was rewritten in Phase 6 of the test-suite rewrite: the pack is made with the `createCompendium` flow
    (the Compendium tab's Create dialog) and deleted through the directory's context menu and confirmation, on E2E
    GM 1, with E2E GM 2 as the second client. With the `renderCompendiumDirectory` registration removed from
    `EffectTrayState.svelte.js` it fails at 'the tray offers the pack' (expected 1 option, received 0;
    `.superpowers/sdd/test-suite-rewrite/phase-6/mutations/D-T2-multi-client.log`). The throw-at-the-end mutation above
    was run on the earlier version of the test and not on the rewritten one.

### 113. `condition-description.spec.js` failed when no scene was active at its start

- **What:** after the Phase 0 sweep deleted the active scene, `condition-description.spec.js:103` failed. Its
  `toggleStatusEffect` threw `TypeError: Cannot read properties of undefined (reading 'OBJECTS')` in `RenderFlags.set`,
  and the page logged `Cannot read properties of undefined (reading 'addChild')` (`e2e-phase0.log`).
- **Evidence:** the files named in this entry are in `.superpowers/sdd/test-suite-rewrite/phase-0/` (local, not checked
  in).
- **Cause, measured:** a probe (`diag113.mjs`) replayed `controlFixtureActorToken` (`tests/e2e/world.js`) from a login
  with no active scene (`diag113-a.json`).
  - Right after `Scene.create({ active: true })`: `canvas.loading` was true, `canvas.ready` was false, and
    `canvas.pendingRenderFlags` and `canvas.tokens.objects` did not exist.
  - The token created next had a placeable at once, but an unparented one. So the helper's wait for `tokenDoc.object`
    passed immediately.
  - `Token._draw` → `TokenRuler.draw` → `GridLayer.addHighlightLayer` threw the `addChild` error. The actor update
    reached `TokenDocument._onRelatedUpdate` → `RenderFlags.set`, which reads `canvas.pendingRenderFlags[priority]`
    (read: `client/canvas/interaction/render-flags.mjs:94-100`).
  - `Canvas#draw` creates `pendingRenderFlags` only when it activates its ticker, after loading textures (read:
    `client/canvas/board.mjs:1209, 2550-2587`).
  - Every stack frame is core's, and the draw finished about 270 ms later with the placeable parented. The fault is
    the helper's order: it creates the token before the canvas has drawn the scene it just activated.
- **Found:** 2026-10-01, Phase 0 of the test-suite rewrite.
- **Fixed:** 2026-10-01.
  - Core citations in this entry refer to Foundry 14.364 at `C:\FoundryVTT\V14\dev\foundry`, the build the server runs.
  - `controlFixtureActorToken` waits for `canvas.ready && canvas.scene?.id === scene.id` (`titanWait`) before creating
    the token.
  - The same probe, waiting for the draw, threw nothing; the placeable was parented and `toggleStatusEffect`
    succeeded (`diag113-b.json`).
  - Gated by `tests/e2e/condition-description.spec.js` 'with no scene active, the fixture token is placed on a fully
    drawn fallback scene' (its last test). That spec is replaced by the last test of `tests/e2e/combat-turns.spec.js`,
    'with no scene active, a token placed on a new scene is on a fully drawn canvas', which makes the scene and the
    token through the `createScene` and `placeToken` flows and not through `controlFixtureActorToken`; the helper was
    deleted in Phase 6 of the test-suite rewrite, once `effect-tray.spec.js` (its last importer, read: grep) moved to
    the flows. The old test established and asserted its own precondition, and the new one does the same:
    - it waits until no scrolling text animates (OPEN_BUGS #114), clears the active flag of the active test scene
      (a direct update: no control deactivates a scene) and reloads;
    - it asserts that no scene is active or drawn.
  - The old test then:
    - called `controlFixtureActorToken` with a new fallback name;
    - asserted the token sat on the drawn scene's token layer;
    - applied Deafened through the token HUD, with no page error.
  - Measured with the helper's canvas-ready wait removed (`fix5-mut113-no-canvas-ready-wait.log`): the test fails. Its
    placement check finds no token placeable for the actor (`TypeError: Cannot read properties of undefined (reading
    'center')`), the page logs the `addChild` error, and the file's teardown hits the `'OBJECTS'` TypeError in
    `RenderFlags.clear`. The helper and the spec are replaced in the test-suite rewrite (Phases 5-6).

### 115. A turn report threw when an owning player had no assigned character

Found 2026-10-01 when the e2e harness gate began failing tests on page errors (test-suite rewrite, Phase 0 fix round
5e). The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-0/` (local, not checked in).

- **Measured** (`e2e-fix5e-gate.log`; stacks in `fix5e-diag-stacks-all.log`): every `socket-sync.spec.js` test raised
  `TypeError: Cannot read properties of null (reading 'id')` on E2E GM 1, in a `filter` callback of
  `getBestPlayerOwner` <- `_getTurnReportUserID` <- `onTurnStart` / `onTurnStartReverted`.
- **Cause, read:** `src/helpers/utility-functions/GetBestPlayerOwner.js` compared `owner.character.id` for each player
  owner. A user's `character` is a nullable `ForeignDocumentField` (Foundry 14.364 `common/documents/user.mjs:57`;
  `common/data/fields.mjs` `ForeignDocumentField` defaults `nullable: true`), so an owner with no assigned character
  throws.
- **Fixed:** 2026-10-01 (commit `7ee14f8b`): both comparisons read `owner.character?.id`. Measured after the fix
  (`fix5e-diag-stacks-socket-sync-after-115-fix.log`): 0 `reading 'id'` errors (20 matching lines before,
  `fix5e-diag-stacks-all.log`).
- **Gate now:** the five replication tests of `tests/e2e/combat-turns.spec.js` (persistent damage, fast healing,
  resolve regain, the previous turn, a second GM) under the harness gate; they were not re-run against the code from
  before the fix.
- **Gate test (before the rewrite):** `socket-sync.spec.js` (A1-A5) under the harness gate, which fails on this error.
  It also failed on
  #116 and #118 until those were fixed: 5 of 5 failed in `fix6-before-combat-seed-socket-sync.log`, and all passed in
  `fix6-after-combat-seed-socket-sync.log`. The full e2e passed 656 of 656 (`e2e-fix6-gate.log`).

### 116. The combat tracker of a client threw on every update of an encounter it was not viewing

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-0/` (local, not checked in). Core
citations refer to Foundry 14.364 at `C:\FoundryVTT\V14\dev\foundry`.

- **Reported:** in every `socket-sync.spec.js` test, the E2E Player 1 client (and in A5 the E2E GM 2 client) raised
  `TypeError: Cannot use 'in' operator to search for 'turn' in undefined` at `CombatTracker._onRender`
  (`e2e-fix5e-gate.log`, `fix5e-diag-stacks-all.log`). Every stack frame is `foundry.mjs`.
- **Measured** (`fix6-probe-116.mjs`; `fix6-probe-116-as-is.log`, `fix6-probe-116-as-is-timeline.log`; `test-titan`,
  TITAN loaded, E2E GM 1 seeding, E2E Player 1 observing): a wrapper recorded every `CombatTracker#_onRender` on the
  player's page.
  - `test-titan` holds one combat of its own (id `HEMLYsZTfLuZU2oi`: no scene, four combatants, none E2E-named; read: `census.js` `takeCensus` lists only actors, items, scenes, folders, macros, tables,
    journal, playlists and cards, so it does not count combats; `fix6-inspect-world-1.log`). Before the seed, every client's tracker viewed it.
  - The seeded combat's `startCombat` updates (round, then turn) rendered the player's tracker with the seeded
    combat's data while `viewed` was still `HEMLY...`: `renderData` held only the seeded combat's id, `find` found
    nothing, and both renders threw. The log holds four renders: the create, the two throwing updates, and a last render about 1 s
    later (no render context) whose `viewed` is the seeded combat and which did not throw. What issued the last render
    was not traced; it is inferred to be the scene activation of #118.
  - With the seeded scene created inactive (the #118 fix) and no `viewCombat`, the player's tracker never left
    `HEMLY...` and the updates of the seeded combat threw (`fix6-probe-116-inactive-scene-no-viewCombat.log`).
- **Cause:** a core defect with a test-setup trigger. Read: `CombatTracker#_onRender` evaluates `"turn" in data` on the
  `find` result with no check (`client/applications/sidebar/tabs/combat-tracker.mjs:185-188`), and
  `_configureRenderOptions` infers a combat to view only while `viewed` is null (`:105-113`, `#inferCombat` `:759`).
  The trigger is the test's: `seedCombatEncounter` set `ui.combat.viewed` on the seeding client only, so each other
  client kept viewing the world's own combat while the seeded one started. No TITAN frame is in any stack. **Not
  run:** a control in a world without TITAN.
- **Fixed:** 2026-10-02, in the test layer. `tests/shared/combat.js` gains `viewCombat(combatId)` (sets the client's
  `ui.combat.viewed`, the way core documents for changing the viewed combat, `combat-tracker.mjs:786-789`) and
  `startCombatEncounter(combatId)`; `seedCombatEncounter` takes `start` (default true).
  `seedEncounterForClients(gm, viewers, seed)` in `tests/e2e/multiClient.js` seeds unstarted, calls `viewCombat` on
  every other client, then starts. `socket-sync.spec.js` seeds through it (A1-A4 with the player, A5 with E2E GM 2).
- **Gate now:** `tests/shared/combat.js` and `seedEncounterForClients` are deleted; `combat-turns.spec.js` makes its
  combats through the Combat Tracker (the `createCombat`, `addCombatant` and `startCombat` flows), and its replication
  tests run under the harness gate, which fails a test on a page error of any client. The pre-fix code was not re-run.
- **Gate test (before the rewrite):** `socket-sync.spec.js` A1-A5. Before: 5 of 5 failed
  (`fix6-before-combat-seed-socket-sync.log`). After:
  5 of 5 passed (`fix6-after-combat-seed-socket-sync.log`); full e2e 656 of 656 (`e2e-fix6-gate.log`).

### 117. Deleting a chat message while core posted its notification threw

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-0/` (local, not checked in). Core
citations refer to Foundry 14.364 at `C:\FoundryVTT\V14\dev\foundry`.

- **Reported:** the `spell-rules-regressions.spec.js` test "the character sheet spell row and the spell chat card list
  the displayed aspect tags by size" raised `TypeError: Cannot set properties of null (setting
  'hidden')` at `#postNotification` (`e2e-fix5e-gate.log`, `fix5e-diag-stacks-all.log`).
- **Read:** `ChatLog#postNotification` awaits a 100 ms spacer animation, then re-queries the notification by message
  id and sets `element.hidden = false` with no null check (`client/applications/sidebar/tabs/chat.mjs:1296-1304`), and
  deleting a message removes its notification element (`:1234`).
- **Measured** (`fix6-probe-117.mjs`, `fix6-probe-117.log`; E2E GM 1, TITAN loaded, plain `ChatMessage.create`, 3
  repeats per delay, delay counted from the card appearing in `#chat`): the deletion raised exactly this error in 3 of
  3 at 0 ms, 3 of 3 at 20 ms, 1 of 3 at 60 ms, 2 of 3 at 100 ms, and 0 of 3 at 150, 300 and 600 ms.
  `fix6-probe-117-dom.log` (one message, five samples each printed after waiting its label's delay): the notification
  element (in `#chat-notifications`) is `hidden` at the samples labelled +0 ms and +50 ms and shown from the one
  labelled +100 ms on.
- **Cause:** a core defect with a test trigger. The spec deleted its card in the `finally` block right after the card
  appeared in `#chat` (`tests/e2e/spell-rules-regressions.spec.js`), inside that window. The race needs no TITAN
  document (the probe used a base message), but no run without TITAN loaded was made.
- **Fixed:** 2026-10-02. The spec waits for the notification to be shown
  (`#chat-notifications .message[data-message-id=...]:not([hidden])`) before it deletes the card.
- **Gate now:** none specific to this race: `chat-cards.spec.js` does not delete a card right after it appears (read:
  only its mount-keying tests delete messages).
- **Gate test (before the rewrite):** the same `spell-rules-regressions.spec.js` test. Before: failed in 3 of 3 runs
  (`fix6-before-spell-rules-regressions-run1.log` to `-run3.log`). After: the file passed 9 of 9 in each of 3 runs
  (`fix6-after-spell-rules-regressions-run1.log` to `-run3.log`); full e2e 656 of 656 (`e2e-fix6-gate.log`).

### 118. Seeding a combat with no active scene created tokens on a scene whose canvas was still drawing

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-0/` (local, not checked in). Core
citations refer to Foundry 14.364 at `C:\FoundryVTT\V14\dev\foundry`.

- **Reported:** with no active scene, `combat-seed.spec.js` raised `TypeError: Cannot read properties of undefined
  (reading 'addChild')` twice at `GridLayer.addHighlightLayer` <- `TokenRuler.draw` <- `Token._draw`
  (`fix5e-diag-stacks-combat-seed-no-active-scene.log`); `socket-sync.spec.js` also raised `Cannot read properties of
  undefined (reading 'OBJECTS')` at `RenderFlags.set` <- `TokenDocument._onRelatedUpdate` on E2E Player 1, E2E GM 1 and
  E2E GM 2 (counts of the error lines in `fix5e-diag-stacks-all.log`: 10, 12 and 2;
  `fix5e-diag-stacks-socket-sync-after-115-fix.log`).
- **Measured** (`fix6-probe-116-as-is.log`; `test-titan` with no active scene before the seed): after
  `seedCombatEncounter`, the scene it created was the active and viewed scene on both clients
  (`activeScene: "E2E Probe116 Scene"`). The earlier description of this bug, a scene that is not activated, did not
  hold for this world state.
- **Read:** `Scene._preCreateOperation` activates a created scene when no scene is active, unless the scene's data names
  `active` (`client/documents/scene.mjs:1038-1042`), and `_onActivate` views it (`:1401-1402`), which draws its canvas
  on every client. The helper then created tokens, and the test later updated actors, while those canvases were still
  drawing. The frames are the ones of CLOSED_BUGS #113, whose cause was the same order of events.
- **Fixed:** 2026-10-02. `seedCombatEncounter` creates its scene with `active: false`, so it is never drawn. Read: the
  grep `canvas\.` over `src` finds one line, `GetControlledTokens.js:6` (`canvas.tokens.controlled`); the
  optional-chained reads `canvas?.` remain at `GetActorFromSpeaker.js:8` and `TitanPlayerHud.js:134, 139, 161`. Read,
  not run: none is on the combat path. `GetActorFromSpeaker` is called only by the chat-card apply, revert and remove
  buttons and the chat context menu (`OnGetChatLogEntryContext.js`), and `TitanPlayerHud.js` is the Player HUD, whose
  `refresh` unmounts it when `canvas?.scene` is empty (`:161`); the turn hooks (`OnCombatNextTurn.js`,
  `OnCombatPreviousTurn.js`) name none of them. The combatants resolve through the scene's token documents.
- **Gate now:** `seedCombatEncounter` is deleted. `combat-turns.spec.js` makes its scene with the `createScene` flow
  and its combats through the Combat Tracker; the pre-fix code was not re-run.
- **Gate test (before the rewrite):** `combat-seed.spec.js` and `socket-sync.spec.js` with no active scene (the state of
  `test-titan`).
  Before: 6 of 6 failed (`fix6-before-combat-seed-socket-sync.log`). After: 6 of 6 passed
  (`fix6-after-combat-seed-socket-sync.log`); full e2e 656 of 656 (`e2e-fix6-gate.log`).

### 119. Deleting an equipped armor with confirmation off left the actor's equipped slot set

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).

- **What:** `CharacterDataModel#safeDeleteItem`, which the row delete button uses when confirmation is off, deleted
  through `deleteEmbeddedDocuments`. The confirmation dialog uses `TitanActor#deleteItem`, which first un-equips armor
  and shields (`preDeleteItem`, read: `CharacterDataModel.js` armor and shield cases). With confirmation off the armor
  row was deleted and `system.equipped.armor` kept its value (measured); the shield case is the same code path (read,
  not run). The defect class is the one of #51, on the other path.
- **Found:** 2026-10-02 while writing the equipped-armor delete test of `character-sheet-rows.spec.js` through the
  row's delete button.
- **Fixed:** 2026-10-02. `safeDeleteItem` deletes through `TitanActor#deleteItem`.
- **Gate tests:** `tests/e2e/character-sheet-rows.spec.js` ("deleting an equipped armor row with confirmation off
  un-equips it quietly", and the same with confirmation on). Before (`safeDeleteItem` back on
  `deleteEmbeddedDocuments`, built): the confirmation-off test failed with "the deleted armor is no longer equipped"
  (`phase-3/gate119-split-before-fix.log`; the confirmation-on test then failed in the restarted worker, a cascade of
  the first failure). After: both passed (`phase-3/gate119-split-after-fix.log`).
- **Second defect, found 2026-10-02 in review of this fix:** `TitanItem#safeDelete` writes
  `flags.titan.isMarkedForDeletion: true` and then calls `this.delete()`, which resolves undefined when a `preDelete`
  hook refuses the delete. The item stayed marked, `postDeleteItem` still ran, and every later delete of the item hit
  the "already marked for deletion" assertion in `TitanActor#deleteItem` (read). `deleteItem` is the path of the
  confirmation dialog and of the row button with confirmation off.
- **Second fix:** `safeDelete` clears the mark and returns false when the delete resolves undefined; `deleteItem`
  skips `postDeleteItem` for a false result.
- **Second gate tests:** "with confirmation off, a refused item delete leaves the item deletable and opens no dialog"
  (asserts no deletion mark, then removes the refusal and deletes the same row) and "with confirmation on, a refused
  confirmed item delete leaves the item deletable". Before: the first failed with the mark true
  (`gates-fix-before.log`) and the second failed at the second confirmed delete
  (`gates-fix-before-refused-confirmed-item.log`). After: both passed (`gates-fix-after.log`).
- **Third defect, found 2026-10-02 in the second review of this fix:** `TitanActor#deleteItem` ran
  `system.preDeleteItem` (un-equips a deleted armor or shield, `CharacterDataModel.js`) and `sheet.preDeleteItem`
  (drops the row's expanded state, `CharacterSheetState.js`) before `safeDelete`, so a refused delete still un-equipped
  the armor and dropped the expanded state (read). Measured before the fix: a refused delete of an equipped armor left
  `system.equipped.armor` null, and a reopened sheet showed the row collapsed (`gate119-predelete-before-fix.log`).
- **Third fix:** the two `preDeleteItem` hooks are removed. `TitanActor#deleteItem` awaits `system.postDeleteItem(id,
  type)` and calls `sheet.postDeleteItem(id, type)` only after a confirmed delete; `CharacterDataModel#postDeleteItem`
  un-equips the deleted armor or shield and `CharacterSheetState` drops the expanded flag. With the item gone,
  `getEquippedArmor` returns false for the stale id until the update lands (read: it returns `false` when
  `items.get` finds nothing).
- **Third gate test:** "a refused delete of an equipped armor leaves it equipped and its row expanded" (then removes
  the refusal, deletes again and expects the slot empty). Before: failed on both assertions
  (`gate119-predelete-before-fix.log`). After: passed (`gate119-predelete-after-fix.log`, with the other delete tests).
- **Fourth defect, found 2026-10-02 in the closing review:** a delete that does not go through `TitanActor#deleteItem`
  (a macro or module calling `item.delete()`) never un-equipped a deleted armor or shield, because the cleanup hung off
  `deleteItem`. Measured: deleting an equipped armor with `item.delete()` left `system.equipped.armor` holding the id
  (`gate-outside-delete-before-fix.log`).
- **Fourth fix:** the cleanup hangs off `TitanActor#_onDeleteDescendantDocuments`, which Foundry calls on every client
  for a deletion (read: `client/data/client-backend.mjs` `#handleDeleteDocuments` dispatches the `onDelete` descendant
  event, and `client/documents/abstract/client-document.mjs` `_dispatchDescendantDocumentEvents` calls the method; dev
  install 14.364.0). Every client drops its own sheet state; only the client whose user id equals the `userId` argument
  (the deleting user) writes the un-equip, so there is one writer. `deleteItem` no longer calls the post-delete hooks.
- **Fourth gate tests:** "an equipped armor deleted outside the sheet, as a macro deletes it, is un-equipped" (the
  delete is `item.delete()`, since no control but the row button deletes an owned item) and "only the client that
  deletes an equipped armor writes the un-equip" (a second client, E2E GM 2, counts its own `preUpdateActor` calls and
  expects 0). Before: the first failed (`gate-outside-delete-before-fix.log`) and the second failed because the slot
  never emptied on the observer (`gate-single-writer-before-fix.log`). After: both passed
  (`gate-outside-delete-after-fix.log`). With the writer guard replaced by `true` the second test failed with 1
  observer write (`gate-single-writer-guard-removed.log`), so the counter detects a second writer.
- **Robustness:** `safeDelete` clears the mark when `delete()` rejects or is refused, and rethrows the first error (an
  error of the clearing update does not replace it). No gate: I found no flow through the UI that makes `delete()`
  reject, and did not measure it.

### 120. Apply Edits in the Edit Traits dialog threw and stored nothing

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).

- **What:** `EditTraitsDialogBase.applyTraitEdits` assigned the filtered trait options, which are reactive state
  proxies, to the item's traits and then called `structuredClone(item.system)`. The browser raised `Failed to execute
  'structuredClone' on 'Window': #<Object> could not be cloned`, the dialog stayed open and the traits were not
  stored. The armor, shield and attack trait dialogs share this component. Cause: inferred from the proxy values
  and the removal of the error by the fix.
- **Found:** 2026-10-02 by the harness page-error gate during the Heavy armor test of `character-sheet-rows.spec.js`
  (measured: `git grep` over `tests` at `6b7ce703` finds no test that opens the Edit Traits dialog).
- **Fixed:** 2026-10-02. The options are copied with `$state.snapshot` before they are assigned.
- **Gate test:** `tests/e2e/character-sheet-rows.spec.js` ("equipping Heavy armor lowers non-zero speeds by 1": the
  Heavy trait is chosen and applied in the armor's Edit Traits dialog). Before: failed with the `structuredClone`
  error and the dialog still open (`gate120-before-fix.log`). After: passed (`gate120-after-fix.log`).
- **Siblings, same defect (found 2026-10-02 in review):** `AddCustomAttackTraitDialogShell` pushed a state proxy into
  the document's attack data and called `structuredClone` on it; `EditCustomAttackTraitDialogShell` assigned a state
  proxy and did the same. Both now clone the attacks first and put `$state.snapshot` copies into the clone. Other sites
  checked (`rg structuredClone src --glob "*.svelte"`, read): every other clone is of plain document data or a
  constant; `AddCustomTraitDialogShell` and `EditCustomTraitDialogShell` pass their state objects to
  `item.update` without `structuredClone`, and the custom-traits tests that add and edit through them pass.
- **Sibling gate tests:** `tests/e2e/custom-traits.spec.js` ("the attack Add Custom Trait dialog stores the trait and
  renders its tag", "the attack Edit dialog stores the edited trait in place"). Before: the add test failed with the
  dialog still open and the page error (`phase-3/gates-fix-before-attack-traits.log`); the edit shell was reachable
  only after #125 and, with that fixed and the shell not, failed with the `structuredClone` error
  (`phase-3/gate120-edit-shell-before-fix.log`). After: both passed (`phase-3/gates-fix-after.log`).

### 121. `checks-opposed.spec.js` threw `_drawTargetArrows is not a function` when GM 1 viewed a drawn scene

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in). Core line
numbers are from Foundry 14.364.0, the install at `C:\FoundryVTT\V14\dev\foundry` that serves the world.

- **Cause (measured):** the spec replaced `game.user.targets` with a `Set` of plain `{ actor }` objects during each
  roll. Core's token-layer ticker calls `t._drawTargetArrows(config)` on every entry each frame
  (`client/canvas/layers/tokens.mjs:460`, found with `grep -n`), so a frame inside the roll window threw. Alone the
  spec passed 7 of 7 runs (`opposed-alone-1.log`, `opposed-alone-r1.log` to `-r6.log`). Right after the "check tags
  across surfaces" tests of `character-sheet-rows.spec.js`, which view the shared scene as E2E GM 1, it failed 3 of 3
  (`rows-then-opposed-1.log` to `-3.log`). Both earlier Part A full runs failed on it.
- **Fix:** the spec targets real placed tokens through core's Target key (`targetPlacedToken`, `releaseTargets` in
  `tests/e2e/flows.js`), so `game.user.targets` holds real Token objects. No fake targets remain.
- **Gate:** `checks-opposed.spec.js` passed alone (`opposed-real-alone-1.log`), after the rows spec's token tests
  in 2 of 2 runs (`rows-then-opposed-real-1.log`, `-2.log`), and in full-suite order (`e2e-full-3.log`: 628 passed,
  0 failed, census zero). Phase 4 merged that spec into `check-math.spec.js`, whose tests "targeted attack derives
  difficulty from the target Defense (interior)", "attack difficulty clamps to both bounds (2 and 6)", "with multiple
  targets the first target Defense is used" and "with no target the attack falls back to the attacker rating (difficulty
  4)" target real placed tokens through `targetPlacedToken` and `releaseTargets`; they passed in the full-suite order
  run `phase-4/e2e-full-6.log` (644 passed, census zero). No run of the merged tests before the Phase 3 fix exists.
- **Found:** 2026-10-02 in Phase 3 Part A. **Closed:** 2026-10-02.

### 123. The attack Edit Traits dialog failed to render

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).

- **What:** `EditAttackTraitsDialog` passed the weapon as the prop `document`; `EditAttackTraitsDialogShell` reads
  `item`. Opening the dialog raised "Cannot read properties of undefined (reading 'system')" and no window opened.
- **Found:** 2026-10-02 by the shield and attack Edit Traits gate added in review.
- **Fixed:** 2026-10-02. The dialog passes `item`.
- **Gate test:** `tests/e2e/character-sheet-rows.spec.js` ("the weapon attack Edit Traits dialog stores the chosen
  trait"). Before: failed, "the Edit Traits dialog opens" plus the render error
  (`phase-3/gates-fix-before-weapon-attack-Edit-Traits.log`). After: passed (`phase-3/gates-fix-after.log`).

### 124. Remove Expired Effects asked for confirmation by the items setting

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).

- **What:** `CharacterDataModel#requestRemoveExpiredEffects` decided whether to ask with `shouldConfirmDeletingItems`.
  It deletes Active Effects, and the setting for those is `confirmDeletingEffects` ("Confirm Deleting Effects from
  Actors", `lang/en.json`). The two settings were independent, so the button followed the wrong one (read).
- **Found:** 2026-10-02 in review (read in code).
- **Fixed:** 2026-10-02. It uses `shouldConfirmDeletingEffects`.
- **Gate test:** `tests/e2e/character-sheet-rows.spec.js` ("Remove Expired Effects follows the effects confirmation
  setting, not the items setting"). Before: failed, "the confirmation dialog opens"
  (`phase-3/gates-fix-before-Remove-Expired-Effects-follows.log`). After: passed (`phase-3/gates-fix-after.log`).

### 125. The attack custom trait tag's edit and delete icons did nothing, and its Edit dialog opened the wrong shell

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).

- **What:** `WeaponSheetAttackCustomTraitTag` called `document.data.editCustomAttackTrait` and
  `document.data.deleteCustomAttackTrait`; both methods are on `document.data.system` (the weapon's data model), so
  the click raised "n.data.editCustomAttackTrait is not a function". `EditCustomAttackTraitDialog` also mounted the
  item-level `EditCustomTraitDialogShell` instead of `EditCustomAttackTraitDialogShell`, which nothing mounted.
- **Found:** 2026-10-02 while writing the gate of the #120 siblings.
- **Fixed:** 2026-10-02. The tag calls the data-model methods; the dialog mounts the attack shell with the weapon as
  `document`.
- **Gate tests:** `tests/e2e/custom-traits.spec.js` ("the attack Edit dialog stores the edited trait in place", "the
  attack trait tag delete icon removes the trait"). Before (the add fix in, the tag and dialog at their old code):
  both failed, the edit test on "the edit dialog opens" with the not-a-function error and the delete test on "the
  trait was removed from the attack" (`phase-3/gate125-attack-controls-before-fix.log`). After: both passed
  (`phase-3/gates-fix-after.log`).

### 126. The Checks tab of an effect sheet could not reorder checks or accept a dropped check

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).

- **What:** `ItemSheetChecksTab` calls `document.data.moveCheck` and `document.data.insertCheck` for a drag reorder and
  for a check dropped from another sheet; `ActiveEffectSheetTabs.svelte` mounts the same tab for effects, and
  `TitanActiveEffect` had neither method (read). Measured live: dragging the second check of an effect above the first
  raised "moveCheck is not a function" and changed nothing; dropping an equipment's check onto the effect raised
  "insertCheck is not a function" (`gate-effect-checks-before-fix-dragging-a-check-above.log`,
  `gate-effect-checks-before-fix-dropping-a-check-from-an-equipment.log`). The rest of the tab calls `addCheck` and
  `deleteCheck` (which the effect had) and reads `system.check` and `uuid` (read: `grep` of `document.data` in
  `src/document/types/item/sheet/check`).
- **Found:** 2026-10-02 in the second review of Part A fixes.
- **Fixed:** 2026-10-02. The four check-list mutators (`addCheck`, `deleteCheck`, `moveCheck`, `insertCheck`) live in
  `CheckListMixin`, which `TitanItem` and `TitanActiveEffect` both use; the effect sheet gains `postMoveCheck` and
  `postInsertCheck`. In the closing review the duplicated pieces were moved to shared places too: the three custom-trait
  mutators to `CustomTraitMixin` (both documents) and the four sheet forwarders to `CheckListSheetMixin` (both
  sheets), so a method cannot exist on one and not the other.
- **Gate tests:** `tests/e2e/character-sheet-rows.spec.js` ("dragging a check above another on the effect sheet
  reorders the checks", "dropping a check from an equipment sheet onto the effect sheet copies it in"), driven by
  dragging the rows' drag handles. Before: both failed with the not-a-function page errors
  (`gate-effect-checks-before-fix-*.log`). After: both passed (`gate-effect-checks-after-fix.log`). The tests also
  collapse the first check before the move or insert and expect the collapsed state to stay with that check; with the
  `postMoveCheck` and `postInsertCheck` forwarders emptied, the reorder test failed on "the collapsed check stays
  collapsed" (`gate-effect-checks-expansion-before-fix.log`; the insert test then failed in the restarted worker, so the
  insert assertion has no separate before-fix run). After: both passed (`gate-effect-checks-expansion-after-fix.log`).

### 107. Dropping an Item folder on an actor sheet created nothing

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).

- **What:** `TitanActorSheet#_onDropFolder` (`src/document/types/actor/sheet/TitanActorSheet.js`) read
  `if (folder && folder.type !== 'Item')`. The condition was inverted, so it turned away every Item folder and handled
  only folders of other types. Dropping an Item folder from the Items sidebar onto an actor sheet created no Item, with
  no notification and no error (measured on an actor sheet in `gate107-before-fix.log`: the actor held no item
  after the drop; the observation on two token sheets in the #102 repro has no saved log).
- **Found:** 2026-10-01 during the #102 real-path repro.
- **Fixed:** 2026-10-02. The condition is `folder.type === 'Item'`; a folder of another type is refused (`false`) with
  no error. The method serves every `TitanActorSheet`, so the token sheet path is the same code (read).
- **Gate test:** `tests/e2e/drag.spec.js` ("an Item folder creates an owned copy of each item in it and an Actor folder
  creates nothing"). It makes an Item folder holding a weapon and a spell and an Actor folder holding an actor through
  the sidebar's own Create Folder and Create buttons, drags each folder's header onto an actor sheet, and expects one
  owned copy per Item folder item, nothing from the Actor folder and no page error. Before: the Item folder step failed
  with the actor holding no item (`gate107-before-fix.log`; the `dist/` served was built at 07:57 by
  `build-final-3.log`, before the edit). The Actor folder step on that old build: the drop created no item and the
  harness failed the test on a core `ClientDatabaseBackend##preCreateDocumentArray` validation error for the actor
  data it tried to add as an item (`actor-folder-old-code.log`, a temporary spec run once). After: 13 of 13 passed on a
  build made after the edit (`build-107.log`, `drag-3.log`).

### 127. An owned item dropped on another row of its own actor's sheet threw and sorted nothing

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).

- **What:** `TitanActorSheet#_onSortItem` (`src/document/types/actor/sheet/TitanActorSheet.js`) has four faults, read:
  it looks the source up with `items.get(itemData.id)` while `_onDropItem` passes `item.toObject()`, which carries `_id`
  and no `id`, so `source` is undefined; it sorts only `if (source.id === target.id)`, the inverse of core's
  `if ( source.id === target.id ) return;` (Foundry 14.364, `client/applications/sheets/actor-sheet.mjs:384`); it writes
  the sort updates with `update.id` where `updateEmbeddedDocuments` needs `_id`; and it calls the deprecated global
  `SortingHelpers`. Measured live with a real drag: dragging the Copy UUID button of an owned weapon's sheet (a drag
  source for the item, core `document-sheet.mjs` `_renderFrame`) onto another weapon row raised "Cannot read properties
  of undefined (reading 'id')" and the order stayed as it was (`gate127-before-fix.log`).
- **Reach:** a character sheet's own rows reorder through the list's drop zone, which stops the event, so the drop
  reaches this method only for an owned item dragged from somewhere else (read: `CharacterSheetItemList.svelte` and
  `CharacterSheetMultiItemList.svelte` write `toDragData()` payloads and `reorderDropZone` handles only an active grip
  drag). The other drop paths of the sheet were read: `_onDropActiveEffect` returns at once for an effect of this actor,
  `_onDropFolder` is CLOSED_BUGS #107, and `_onDropItem` creates a copy for any other actor's item.
- **Found:** 2026-10-02 in the review of Phase 3 Part B.
- **Fixed:** `_onSortItem` reads `itemData._id`, returns false when there is no source, row or target, and writes
  `_id` on each update; it calls `foundry.utils.performIntegerSort`. Its direction is core's automatic one (read:
  `client/utils/helpers.mjs:277`): before the target when the dropped item's sort is greater, else after it, so a drop
  on a row of equal sort lands after it (measured, `measure-127-sorts.log` from `scripts/measure-127-sorts.spec.js`:
  three fresh weapons A, B, C all at sort 0; after C was dropped on A's row the sorts were A 100000, B 300000,
  C 200000).
- **Gate:** `drag.spec.js` "a weapon dragged from its own sheet onto another row sorts it relative to that row": a grip
  drag out and back stores distinct sorts, then the last weapon dropped on the first row sorts before it, and dropped on
  the last row sorts after it. Before the fix (`gate127-before-fix-final-test.log`; `gate127-before-fix.log` is the
  first version of the test): failed with the page error "Cannot read properties of undefined (reading 'id')". After
  (`gate127-after-fix.log`, and `drag-fix-1.log` to `drag-fix-3.log` for the whole file): passed.
- **Process note:** this entry was written alongside the fix; the OPEN_BUGS entry was not committed before the fix
  commit (c819dd1b), and history is not rewritten.
- **Status:** Closed 2026-10-02.

### 130. `pickPortrait` selected a file before the file picker's browse re-rendered the list, so the pick was lost

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).

- **What:** the two portrait tests of `surfaces.spec.js` failed intermittently once `expect` was capped at 1 s: 2 of 5
  runs (`audit-surfaces-3.log`: the first pick was not stored, stored value still `icons/svg/sword.svg`;
  `audit-surfaces-5.log`: the second pick was not stored) and 1 of 6 runs with a 10 s ceiling
  (`measure-portrait-6.log`: the file picker stayed open after the submit click for the whole 10 s). In the passing runs
  the stored value settled in 1 to 5 ms (`measure-portrait-1.json` to `-6.json`), so the failures were not a slow
  update.
- **Read:** the flow (`pickPortrait`, `tests/e2e/flows.js`) pressed Enter in the picker's address bar and then clicked
  the file. Enter calls `FilePicker#browse`, which awaits a server request and then renders the picker again
  (`client/applications/apps/file-picker.mjs:645-690`, `:999-1003`); the submit handler stores nothing and raises
  "You must select a file to proceed." when no file is selected (`:1127-1134`). **Inferred, not measured:** a file
  clicked before the re-render lost its selection to it.
- **Found:** 2026-10-02 in the 1 s wait audit.
- **Fixed:** `pickPortrait` marks the picker's file list (`data-stale`), presses Enter, and waits for the marker to go
  before it clicks the file.
- **Gate:** the two portrait tests of `surfaces.spec.js`. Before: failures in `audit-surfaces-3.log`,
  `audit-surfaces-5.log` and `measure-portrait-6.log`. After: 8 of 8 runs passed under the 1 s ceiling
  (`audit-portrait-fix-1.log` to `-8.log`).
- **Status:** Closed 2026-10-02.

### 131. Action helpers return before the effect of their action is observable, so the caller's next action races the re-render

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).

- **What:** four failures share one mechanism: an action is taken before the previous action's re-render has finished,
  and the re-render discards or reorders the later action. #122 (a typed check label stored as "Check"), #128 (the
  same in `fillList`), the second grip drag of the #127 gate (`e2e-full-fix2.clean.txt`, failure 1: the rows came out
  reversed) and #130 (the file picker). Fixing each test did not stop the next one.
- **Read, per helper:** `selectTitanOption`, `setSelectField`, `setCheckbox`, `clickRoll`, `openSheetTab`, `openTab`,
  `addAttack`, `addCustomAspect`, `pickPortrait`, `dragGrip`, the inline `fill` plus `blur` pairs of the flows and
  specs, `typeInto` (whose comment said it waited for the document to store the value and did not) and the setters
  that write through the API returned at the click or at the awaited write, before the renders that write queued had
  finished. `titanSelectOptionValues` returned before its list closed. The flows that read the stored document after the
  action (`addCheck`, `addRulesElement`, `enableAspect`, `createOwnedItem`, `placeToken`) already waited for it.
- **Found:** 2026-10-02 in the Part B review fixes.
- **Cause of the residual race (measured, `phase-3/measure-settle.log`, line `OPTIMISTIC`, 8 samples; script
  `phase-3/scripts/measure-settle.spec.js`):** the Add Check button changes the sheet's local document state at once
  and sends the update afterwards, so the new check's count showed 0 to 4 ms after the click with 2 operations pending
  (field `pendingWhenVisible`), and the pending count reached 0 at 17 to 31 ms (field `pendingZeroMs`). The same file's
  `TRACKER` line shows the counter at 1 during an `Item.update`, 2 after it resolved and 0 after the awaited render. A
  flow that typed into the new row when the count appeared could be undone by the server echo's re-render. The first
  full run after the helper change failed once this way (`e2e-r2-gate-1.log`: `addCheck` stored "Check" for "E2E Bulk
  Check 2"); the add flows now call `settle` after the count shows (commit `ed09de31`).
- **Fixed:** `settle.js` (in-flight document operations, renders and window transitions, installed by `joinWorld`),
  `actions.js` (`clickSheetTab` and `clickTabButton` end at their active-tab assertion and do not settle; `commitText`
  and `dragGrip` settle), and waits for the effect in `selectTitanOption`, `titanSelectOptionValues`, `setSelectField`,
  `setCheckbox`, `clickRoll`, the add flows of `flows.js` (those after which the caller edits the new row wait for its
  transition: `addCheck`, `addAttack`, `addCustomAspect`, `addRulesElement`, `createOwnedItem`, `addEffect`),
  `pickPortrait`, `dragGripToMove` and the API setters of the specs.
- **Gate (2026-10-07):** `tests/e2e/action-helpers.spec.js` runs eight helpers and reads what is in flight, and the
  helper's stored effect where it has one, in one `evaluate` the moment each returns (9 tests, all pass, twice:
  `phase-3/r5-gate-intact-1.log`, `-2.log`). The tab helpers have no `settle` and no test: a pending-only test of them
  could not fail without a `settle` (`r4f-gate-disabled-clickSheetTab.log`, `-clickTabButton.log`: 10 of 10 passed with
  their `settle` removed), and their own active-tab assertion is their contract. With the helper's own `settle` call
  removed, 10 repeats each (`phase-3/r4f-gate-disabled-<helper>.log`):
  - fail 10 of 10: `addAttack`, `addRulesElement`, `addCheck`, `addCustomAspect` (6 to 16 finite window animations in
    flight; `addRulesElement` also 1 operation), `selectTitanOption` (1 operation in flight) and `commitText` (1
    operation in flight; the stored label was already the typed one);
  - `dragGrip`: 0 of 10 failed in the final run (`r4f-gate-disabled-dragGrip.log`) and 1 of 10 in an earlier run of the
    same test (operation and animation in flight, order not stored yet, `r4-gate-disabled-repeat10-dragGrip.log`), so
    1 of 20 runs: **shown necessary at a low rate**;
  - `clickRoll` and a test that types into two fields of a new row back to back after `commitText` (the shape of #122
    and #128) passed 20 of 20 each without their `settle` (`r4f-gate-disabled-clickRoll.log`,
    `r4-gate-disabled-repeat10-clickRoll.log`; `r4f-gate-disabled-commitText-twice.log`,
    `r4-gate-disabled-repeat10-commitText-twice.log`): **no run shows those two `settle` calls necessary**, and the
    necessity of `commitText`'s `settle` for the #122 and #128 race in isolation is not demonstrated. The `settle` calls
    stay as the contract of the helpers.
- **Runs of the final code:** 653 passed with census zero in the full run on the final code
  (`phase-3/e2e-r5-gate-1.log`). Before it, 3 full runs of 655 that included the two tab tests (`e2e-r4-gate-1.log`
  before the `item-sheet-rolls.spec.js` change, `-2.log` before the comment-only change of `playwright.config.mjs`,
  `-3.log`), and 10 runs of the 44 tests of `armor-trait-situations`, `attack-tags`, `character-sheet-layout`,
  `condition-description` and `surfaces`, all passed (`r4-reverify-run-1.log` to `-10.log`; the only later change to
  the code is the removal of the `settle` call of the two tab helpers). The tab clicks of `surfaces.spec.js` go
  through `clickTabButton`; other inline tab clicks in specs do not.
- **Status:** Closed 2026-10-02.

### 132. `verifySettle` once timed out at 1 s waiting for the boot renders at login

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).

- **What:** in 1 of 10 runs of the 44 tests of `armor-trait-situations`, `attack-tags`, `character-sheet-layout`,
  `condition-description` and `surfaces`, `armor-trait-situations.spec.js:121` failed in `login` with "titanWait timed
  out after 1000ms waiting for: the boot renders finished" (`verifySettle`, `settle.js`); run 1 of
  `final-reverify-run-1.log` to `-10.log` failed 1 test and the other 9 passed.
- **Context (read):** `npm test` ran on the same machine during that run. **Inferred, not diagnosed:** machine load
  slowed the boot's renders past 1 s.
- **Cause (read):** `verifySettle` first waited on the loaded page until the counter was 0, so that a rise during its
  own calls could not come from the boot's renders. That wait is the one that timed out.
- **Fixed:** the wait is removed. `verifySettle` reads the counter right before each probe call and right after the
  call starts, in the same synchronous turn, and asserts it rose by 1, so renders of the boot cannot change the result
  and the check waits on nothing.
- **Gate:** 10 runs of the same 44 tests on the code of commit `b8f14185`, all passed (`r4-reverify-run-1.log` to
  `-10.log`; the later changes do not touch `verifySettle`); with each of the four wrappers left out of
  `installSettle`, login fails and names the call (`r4-verify-settle-disabled-createDocuments.log`,
  `-updateDocuments.log`, `-deleteDocuments.log`, `-render.log`). The load that was present in the failing run was not
  reproduced, and the wait that failed no longer exists, so the runs show that the code does not wait, not that load
  cannot break login.
- **Found:** 2026-10-07 in Phase 3 Part B round 3.
- **Status:** Closed 2026-10-07.

### 133. Deleting an owned item while its own sheet was open threw, and left a check dialog opened from that sheet open

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-4/` (local, not checked in).

- **What:** deleting an owned weapon, spell or ability while its item sheet was open threw a page error (the weapon and
  the spell: "Cannot read properties of undefined (reading 'system')"; the ability: "Cannot read properties of undefined
  (reading 'check')"; `gate133-prefix.log`), and a check dialog opened from the sheet's roll button stayed open. The
  weapon's "reading 'system'" error was first seen on `item.delete()` with the weapon's sheet open and no dialog
  (`scratch-delete.json` variant `a`; its stack was read from the console and the file was overwritten, so only the
  message survives).
- **Cause (read):** the item sheet's `CondensedAttackCheckButton`, `CondensedCastingCheckButton` and
  `CondensedItemCheckButton` read `rollActor.data.system.initialize<Type>CheckOptions` in a `$derived` guarded only by
  the sheet's own item bridge (`git show
  9103a659^:src/document/svelte-components/check/CondensedAttackCheckButton.svelte`). Why the derived ran without the
  item was not traced: the order in which the roll actor and the bridge drop the item was not instrumented.
- **Fixed:** the three buttons also require `rollActor.data.system.validate<Type>CheckOptions(checkOptions, false)`, as
  the dialogs' rebuild does (commit `9103a659`); a comment states that the roll actor validates the options first.
- **Gate:** `tests/e2e/check-dialog.spec.js`, "deleting the owned weapon while its attack dialog is open closes the
  dialog without a page error", "deleting the owned spell while its casting dialog is open closes the dialog without a
  page error" and "deleting the owned ability while its item dialog is open closes the dialog without a page error":
  each opens the dialog from the item sheet's roll button and deletes the item
  with the Delete button of its row. Measured on the final code with only the three guards removed
  (`gate133-prefix.log`): the weapon, spell and ability tests all failed with the dialog still open and the page error
  named above for each; the effect test, which uses no item button, passed. With the guards in place all passed
  (`e2e-full-7.log`).
- **Status:** Closed 2026-10-07.

### 134. The Token HUD flows were blocked by a chat card over the token

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-4/` (local, not checked in).

- **What:** `logic/conditions.spec.js` failed in the full run in its `afterEach` when `hoverToken` timed out waiting for
  the token's `hover` flag (`e2e-full-2.log` and `e2e-full-3.log`, test 464), and the tests after it did not run.
- **Cause, measured:** a diagnostic written when the hover wait failed in `e2e-full-3.log` (`hud-diag-run3.jsonl`)
  shows the token visible, in the viewed scene, with no stuck interaction manager, and `document.elementFromPoint` at
  the token's centre (x 1335, y 565, the seventh token placed in the shared scene) returning a `.stat` inside the
  `.check-chat-message` card of a chat notification: the Reflexes check rolled by the test a moment earlier. Read in
  core: `ChatLog.NOTIFY_DURATION` is 5000 ms and `_toggleNotifications` hides the notification log only while the chat
  tab is the active sidebar tab (`sidebar/tabs/chat.mjs`). The failure needs a token placed far enough right to sit
  under the cards, which a spec that runs after other token specs gets; 150 toggles on the seventh token with no roll
  failed 0 times (`scratch-hud4.json`).
- **Found:** 2026-10-07 in the Phase 4 full run.
- **Fixed:** `hoverToken` makes the chat tab the active sidebar tab (`showChatLog`) before it moves the pointer, so no
  card is on the canvas (`tests/e2e/flows.js`). The same change added `restOnToken`: the pointer moves onto the token
  from outside it and the flow waits for `hover`; the closing click re-enters the token first, because a token's
  interaction manager handles a pointer-down only from its HOVER state on (read: `#handleLeftDown` and
  `#handleRightDown`, `client/canvas/interaction/mouse-handler.mjs:474-475` and `565-566`, Foundry 14.364 at
  `C:\FoundryVTT\V14\dev\foundry`). An earlier `restOnToken` also waited two animation frames; that wait is removed,
  because (inferred) it waited on nothing observable and could hide OPEN_BUGS #129. Whether `restOnToken` is needed is
  not measured: the only saved run of the unchanged earlier flow is `scratch-hud.json` (21 of 240 toggles failed), and
  the flows with it failed 0 of 720 toggles in three runs without the wait (`hud-flows-nopad-run1.json` to `-run3.json`,
  spec `hud-flows.spec.js.txt`).
- **Gate:** `logic/conditions.spec.js` failed at the same test in `e2e-full-2.log` and `e2e-full-3.log` before the
  change and passed in the full runs after it (`e2e-full-4.log`, `e2e-full-5.log`, `e2e-full-6.log`, `e2e-full-7.log`,
  and `e2e-full-8.log`).
- **Not closed here:** an earlier run failed with no `#token-hud` after a right-click (`e2e-full-1.log`, test 453), and
  a loop of 240 toggles failed 21 times for the same symptom (`scratch-hud.json`). That symptom has no located cause
  and is tracked in OPEN_BUGS #129.
- **Status:** Closed 2026-10-07 for the chat card cause only.

### 135. A check dialog closed by a deleted item or effect raised an error notice and a duplicate notice, and the
notices covered the next create dialog

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-4/` (local, not checked in).

- **Symptom:** in the Phase 4 full run, `Click` of the core create dialog's OK button at `tests/e2e/flows.js` took 3.6
  to 4.8 s four times (`e2e-full-4.log`, `e2e-full-5.log`), over the 1000 ms ceiling.
- **Measured:** a diagnostic that listed the `#notifications` toasts before each OK click found a notification at the
  OK button's position (x 1307, y 157) in each of the four creations that followed a delete test (`ok-diag.jsonl`).
  With the test already dismissing the info notice, the toasts present were a warning notice ("TITAN | Attack Check no
  longer valid.") and an error notice ("TITAN | Attack Check failed before construction. Item ID was invalid."; for an
  Item Check "... No valid Item ID, Effect ID, or Item Roll Data was provided.") (`ok-diag2.jsonl`). After the error was
  removed, a wrapper around `ui.notifications` recorded exactly one info and one warning call per delete, with the
  same text (`notification-log.jsonl`).
- **Cause (read):** the `$effect` in the five check dialog shells (`src/check/types/<type>-check/dialog/*Shell.svelte`)
  called `validate<Type>CheckOptions($checkOptions)` with `report` defaulting to `true`, so the validation that detects
  the deleted source also reported it through `game.titan.error`; the method's own comment says an open dialog tests
  speculative options silently. The info and the warning: the shells call `ui.notifications.info(...)` and then
  `warn(...)`, and `warn` raises a UI warning notification itself (`src/helpers/utility-functions/Warn.js`, added by
  commit `9e0e90e0`, 2026-04-21; the shells' info call dates from `2edf6262`, 2024-05-09, when `warn` only logged to
  the console). The duplicate follows from the logger change, not from a decision to show both.
- **Found:** 2026-10-07 in the Phase 4 full run.
- **Fixed:** the validity `$effect` of the five shells passes `false` (commit `f9a69009`); the shells no longer call
  `ui.notifications.info`, and `warn` keeps its console details and its one notice (commit `a44e43ef`). The delete tests
  read the one "no longer valid" notice, assert no "failed before construction" notice exists, and dismiss it with a
  click.
- **Gate:** `tests/e2e/check-dialog.spec.js`, the delete tests "deleting the owned weapon, spell and ability while its
  dialog is open ..." and "deleting the effect while its Item Check dialog is open ...". Measured on the final code with
  one line reverted at a time: with the shells' `validate` reporting restored all four failed on the "failed before
  construction" absence (Expected 0, Received 1; `gate135-a1-validate-reporting.log`); with the info notice restored all
  four failed on the single-notice assertion (Expected 1, Received 2; `gate135-a2-two-notices.log`). On the final code
  the file passed with no create click over 1000 ms (`e2e-full-7.log`).
- **Status:** Closed 2026-10-07.

### 111. A condition's description edited in its sheet was ignored by the HUD and chat reports

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/bug-111/` (local, not checked in).

- **Symptom:** a condition effect opened core's `ActiveEffectConfig`; a description typed into it was stored on the
  effect, and the Player HUD detail and the turn-start report kept showing the condition's definition text.
- **Cause (read):** TITAN's Active Effect sheet was registered for the `effect` subtype only (`src/hooks/OnceInit.js`),
  and `EffectsDetailBody.svelte` and `CharacterDataModel._getConditionReportData` read only the definition text for a
  condition.
- **Measured:** the pre-change test run opened no TITAN sheet (`gate-pre-change.log`); the earlier measurement of the
  same flow on the old code is in `.superpowers/sdd/test-suite-rewrite/phase-4/e2e-full-6.log`.
- **Found:** 2026-10-01 by a reviewer of the test-suite rewrite plan.
- **Ruling:** user, 2026-10-07: a condition effect opens TITAN's own Active Effect sheet and an edited description is
  what the HUD and the chat reports show.
- **Fixed:** 2026-10-07. A new `TitanConditionSheet` (Description and Rules Elements tabs, name and image header, no
  sidebar) is the default `ActiveEffect` sheet for the `condition` subtype. A condition effect is still created with a
  blank description; `getEditedConditionDescription` (`src/system/Conditions.js`) returns its description when
  non-blank, and the HUD detail (`getConditionDescription`) and the turn-start report entry (`description` in place of
  `descriptionKey`) read it before the definition. An unedited condition shows the same text as before.
- **Gate:** `tests/e2e/logic/conditions.spec.js` "a condition opens TITAN's own sheet, and a description edited there
  is what the HUD and the report show": applies Blinded from the Token HUD, opens the sheet from the Player HUD row,
  types into the description editor, saves, and reads the edit in the Player HUD detail and in the Blinded tag of the
  turn-start report (before the edit the report's tooltip must hold the definition phrase; after it, the edit and not the
  phrase). On the pre-change code it failed at the sheet assertion (`.application.titan-condition-sheet` not
  found; `gate-pre-change.log`). With only the report reading reverted it failed at the report's edit assertion after passing the HUD and the unedited
  report (`gate-pre-change-report-half.log`); with only the HUD reading reverted it failed at the HUD's edit assertion
  (`gate-pre-change-hud-half.log`); with the absence assertion pointed at the edit text it failed on a tooltip that
  holds it (`gate-absence-half-can-fail.log`). On the final code it passed, and the full e2e passed 645 of
  645 with census zero (`e2e-full-1.log`). Unit: `tests/unit/ConditionReportData.test.js` covers the edited and blank
  descriptions (1513 of 1513, `unit.log`).
- **Status:** Closed 2026-10-07.

### 137. The test flow that takes control of a token read a second press on the same token as a double click

- **What:** `controlPlacedToken` failed about 1 time in 4 when it pressed a token that the previous call had already
  pressed less than 250 ms earlier: core reads two presses within `MouseInteractionManager.DOUBLE_CLICK_TIME_MS`
  (250 ms) and 5 px as a double click, which opens the token's actor sheet and does not control the token.
- **Read in core:** `client/canvas/interaction/mouse-handler.mjs` (press handling around lines 480-497 and 905-913);
  `manager.lcTime` and `manager.rcTime` are public fields.
- **Found:** 2026-10-07 while building the player-hud specs (test-suite rewrite, Phase 5 Part A).
- **Measured before the fix** (sources and logs in `.superpowers/sdd/test-suite-rewrite/phase-5/`): 18 loops of
  `controlPlacedToken` alternating between two tokens (`ctl-loop-18.spec.js.txt`) failed 5 times
  (`scratch-ctl-2.log`). Two variants that press with `page.mouse.click` and log the pointer events
  (`ctl-diagnostic-3.spec.js.txt`, with the edit in `ctl-diagnostic-4-edit.txt`) also failed 5 of 18 each
  (`scratch-ctl-3.log`, `scratch-ctl-4.log`); their event logs showed the pointerup landing on a sheet DIV or BUTTON and
  not on the canvas.
- **Fixed:** 2026-10-07. `restOnToken` (`tests/e2e/flows.js`) waits until `performance.now()` minus the later of
  `lcTime` and `rcTime` exceeds `DOUBLE_CLICK_TIME_MS` before the caller presses.
- **Gate:** the same loop with 60 iterations and no event log, after the fix (`ctl-loop-60.spec.js.txt`): 0 failures,
  slowest 181 ms (`scratch-ctl-5.log`). The loop sources are text files in the evidence directory, not specs in
  `tests/`; the player-hud and player-hud-action-menu specs press a token in nearly every test.
- **Relation to OPEN_BUGS #129:** not established. #129 (a right-click that opens no Token HUD) has a different
  symptom; the fix here was not measured against it. #129 stays open.
- **Status:** Closed 2026-10-07.

### 138. Escape did not release token control after the action menu's open category left the menu

- **Found:** 2026-10-07 while building the player-hud-action-menu spec (test-suite rewrite, Phase 5 Part A).
- **What:** `ActionMenuElement` consumes the Escape key (closes the cascade and stops core from releasing control)
  whenever `layoutState.openCategory` holds a key. After the open category leaves the model (inferred: the Effects
  category disappears with its last entry), the stored key still names it, no cascade is shown
  and the first Escape does nothing visible.
- **Read:** `src/ui/player-hud/elements/action-menu/ActionMenuElement.svelte`, `onWindowKeyDown` read
  `layoutState.openCategory` while the shown cascade is the derived `openCategory`, which is null when the model no
  longer lists the key.
- **Measured before the fix:** after the spec test that removes an effect through the Effects sub-button, pressing
  Escape left the token controlled (`phase-5/menu-2.log`, "options > the weapons filter hides action-less weapons
  until disabled": the Escape key released the controlled tokens, expected 0, received 1).
- **Fixed:** 2026-10-07. The handler tests the derived `openCategory`.
- **Gate:** `tests/e2e/player-hud-action-menu.spec.js` "effect duration and remove sub-buttons update and delete the
  effect" followed by "the weapons filter hides action-less weapons until disabled", whose `control` call releases
  control with Escape; it passed after the fix and a rebuild (`phase-5/menu-3.log`, `menu-4.log`). The flow
  `releaseTokenControl` also closes an open cascade first when one is shown.
- **Status:** Closed 2026-10-07.

### 106. `player-hud-visibility.spec.js` leaves tokens whose actors it deleted

- **What:** after the spec ran (also alone), the world still held the unlinked `HUD Vis NPC` token and three linked
  tokens, all on scenes, whose actors were gone. `deleteFixtureActor` alone removes a placed token (measured), so the
  leak came from another part of the spec's setup or cleanup. The cause was not diagnosed. A leaked orphan with pending
  migration work would count as a migration failure in later specs (#105).
- **Found:** 2026-10-01 by an orphan census after the Task 5 fix round 3 full e2e (654 passed).
- **Fixed:** 2026-10-07 by the conversion of the player-hud specs to real flows (test-suite rewrite, Phase 5 Part A).
  The spec is deleted; `player-hud.spec.js` places its tokens with `placeToken`, which records each token on the running
  list, and the suite-end teardown deletes the tokens of every scene and sweeps orphans.
- **Gate:** the teardown line of the final full run (`phase-5/b/e2e-full-b2.log`; 645 passed in 14.7 m) reports
  `"orphanTokens":0` in its sweep and in its census, and the census counts 0 of every document class. That run's
  sweep removed 2 actors and 1 pack and no scene or token; they come from specs that are not yet converted (see the
  sweep entry in `docs/TODO.md`).
- **Status:** Closed 2026-10-07.

### 108. `TitanActor#getCombatant` used a core API that is deprecated and removed in v15

- **What:** `TitanActor#getCombatant` called `game.combat?.getCombatantByActor(this.id)`. Foundry logs a deprecation
  warning for it (deprecated since v14, removed in v15). The call passed `this.id`; for a token's synthetic actor that
  is the base actor's id (read), the same identity pattern as #104. Whether it found the wrong
  combatant was not measured.
- **Measured before the fix:** with the deprecation listener of `combat-turns.spec.js` attached to all three clients,
  the warning `Combat#getCombatantByActor is deprecated` was logged on E2E GM 1 from `getCombatant` <-
  `_getInitialDocumentData` <- `onPreCreate` (read: the Active Effect data model's initiative capture,
  `TitanActiveEffectDataModel.js:93`), and 2 tests failed, 15 passed and 1 did not run
  (`phase-5/b/gate-108-before-fix.log`). Test 16 failed on the
  deprecation listener (the stack runs `tp.getCombatant` -> `getCombatantByActor` in the built `dist/index.js`, the code
  from before the fix). Test 17 failed at `flows.js:80` because 2 directory entries were named "E2E Turns Scene"; that
  is a cascade (inferred: the failure restarted the worker, which re-ran the file's `beforeAll` and made the scene
  again), not a second finding.
- **Found:** 2026-10-01 during the #102 real-flow repro.
- **Fixed:** 2026-10-07 (commit `d7a7acc7`). `getCombatant` returns `game.combat?.combatants.find((combatant) =>
  combatant.actor === this)`: the combatant is found by actor identity, so a token's synthetic actor is its own actor
  and a combatant of an unlinked token resolves to that token's synthetic actor.
- **Gate:** `tests/e2e/combat-turns.spec.js` attaches a console listener to each of its three pages before the page
  boots, and its `afterEach` fails the test if any warning naming `getCombatantByActor` has been logged. After the fix
  the spec's 19 tests passed (`phase-5/b/gate-108-after-fix.log`).
- **Status:** Closed 2026-10-07.

### 139. The Create Macro dialog showed an item's attacks and checks as `LOCAL.Attack (1).text`

- **What:** the Attack and Check selects of `CreateItemMacroDialogShell.svelte` passed their option text, built from the
  attack or check label and its position, through localization, so a weapon's attack listed as `LOCAL.Attack (1).text`.
- **Found:** 2026-10-07 by the last test of `macros.spec.js` while it was written (test-suite rewrite, Phase 5 Part B).
- **Measured before the fix:** that test failed on "the dialog shows no untranslated text"
  (`phase-5/b/gate-macro-label-before-fix.log`).
- **Fixed:** 2026-10-07 (commit `9b0bd916`). Both options pass their text as `{ text, localize: false }`.
- **Gate:** `tests/e2e/macros.spec.js` "the Create Macro dialog names the attack of a weapon, and a cancelled dialog
  makes no macro" reads the dialog's text for `Attack (1)` and for no `LOCAL.`. It passed after the fix in the
  final full run (`phase-5/b/e2e-full-b2.log`, 645 passed).
- **Status:** Closed 2026-10-07.
