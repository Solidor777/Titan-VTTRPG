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
  theme); saved custom themes are completed with later contract tokens. Gated by a WCAG AA unit test
  (`tests/unit/ThemeContract.test.js`) and the `content links` tests of `tests/e2e/theme.spec.js`.
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
  and every migration step runs inside `migrateWorld` (#82).
- **Gate:** not tested: migration tests deleted 2026-10-02 (`d874870b`) by project rule (ruling 2026-10-01); the
  migration system was confirmed once by the one-off check (§7.0 of
  `docs/superpowers/plans/2026-10-01-test-suite-real-data.md`). The deleted tests were
  `tests/unit/MigrationAction.test.js`, `tests/unit/OnceReady.test.js` and `tests/e2e/condition-migration.spec.js`.

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

### 76. A GM targeting nothing had the attacker's own Defense read as the target's

- **What:** `getTargetedCharacters` (via `getTargetedCharacterTokens`) falls back to a GM's controlled tokens when
  nothing is targeted. Read at the commit before the fix (`c750ef41~1`): the attack check read the first of them as the
  target (`CharacterDataModel.js` `initializeAttackCheckOptions` `targets[0]`, and `_createAttackCheckDialog` through
  `getTargetedCharacters().length`), so a GM rolling from the attacker's own controlled token used the attacker's
  Defense as the target's.
- **Found:** 2026-09-29 by the plan buddy check of the conditions rework (per the plan's bug list).
- **Fixed:** 2026-10-09 — `getTargetedCharacterTokens(fallbackExcludedIds)` skips the given token ids in the GM fallback
  only, and `_getAttackTargetToken()` passes the attacker's own token ids
  (`src/helpers/utility-functions/GetTargetedCharacterTokens.js`, `CharacterDataModel.js` `_getAttackTargetToken`), so
  an explicit target is never excluded, even a second token of the attacker's own Actor. Gated by the unit test "never
  reads the attacker's own controlled token as a GM's target" (`tests/unit/check/rebuild-check-options.test.js:1189`)
  and by `tests/e2e/target-conditions.spec.js` "a GM who controls a Prone attacker and targets nothing is not read as
  the attacker's own target" and "an explicit target that shares the attacker's actor is read as the target"; the task's
  mutation proof (removing the exclusion) failed the first
  (`.superpowers/sdd/2026-09-29-conditions-rework/task-14-logs/part-a-mutation.log`).

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
  `tests/e2e/component-probe-display.spec.js` (each tag's live tooltip leads with its own text), and
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
  and the final notification counts failures.
- **Gate:** not tested: migration tests deleted 2026-10-02 (`d874870b`) by project rule (ruling 2026-10-01); the
  migration system was confirmed once by the one-off check (§7.0 of
  `docs/superpowers/plans/2026-10-01-test-suite-real-data.md`). The deleted tests were `tests/unit/OnceReady.test.js`,
  `tests/unit/MigrateStoredActors.test.js`, `tests/unit/MigrateWorld.test.js`,
  `tests/unit/ConvertEffectItemsToActiveEffects.test.js`, `tests/unit/StoredActorSources.test.js`,
  `tests/e2e/condition-migration.spec.js` and `tests/e2e/pack-conversion.spec.js`.

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
  walked whatever their base actor.
- **Gate:** not tested: migration tests deleted 2026-10-02 (`d874870b`) by project rule (ruling 2026-10-01); the
  migration system was confirmed once by the one-off check (§7.0 of
  `docs/superpowers/plans/2026-10-01-test-suite-real-data.md`). The deleted tests were
  `tests/unit/StoredActorSources.test.js` and `tests/e2e/condition-migration.spec.js`.

### 84. Report text reached tooltips and rich text as unsanitized HTML

- **What:** report chat data stores HTML in `StringField` / `ObjectField` values (a turn report's `message` entries, an
  older report's condition `description`), which bypass core's `HTMLField` sanitization. `tooltipAction` handed its
  content to tippy with `allowHTML: true`, and `RichText.svelte` passed its value to `enrichHTML` (which assigns it to
  a live element's `innerHTML`) and then `{@html}`, so a message author could run script in every reader's client.
- **Found:** 2026-09-30 by the Task 5 buddy check (plan B).
- **Fixed:** 2026-09-30 — `tooltipAction` cleans every non-blank tooltip with `foundry.utils.cleanHTML` (the cleaner
  core's TooltipManager applies) before tippy receives it, on creation and on update, and `RichText` cleans its value
  before `enrichHTML`. Gated, on synthetic props because a real flow cannot carry the handler into these sinks (read:
  `common/prosemirror/schema/attribute-capture.mjs:83-93` drops attributes that `ALLOWED_HTML_ATTRIBUTES` in
  `common/constants.mjs` does not list, and that list has no event handlers), by
  `tests/e2e/component-probe-display.spec.js` ('RichText HTML cleaning': a payload with an `onerror` image renders its
  text, the image keeps no handler and no page flag is set) and `tests/e2e/component-probe-buttons-tags.spec.js`
  ('tooltip HTML cleaning': an `EffectTag` tooltip holds core's cleaned HTML and renders it on a real hover with no
  handler, and a `Tag` tooltip keeps icon markup and drops the handler), and by `tests/e2e/custom-traits.spec.js` ("a
  live tooltip updated to user HTML is cleaned on update": the description is edited to the payload in the Edit dialog).
  The three probe tests fail when `foundry.utils.cleanHTML` is replaced by the identity in the page before the mount
  (`.superpowers/sdd/test-suite-rewrite/phase-6/partB/mutations/M1-richtext-uncleaned-page-run.log`,
  `M2-tooltip-uncleaned-page-run.log`, `M2b-tag-uncleaned-page-run.log`). That replacement is a page-level stand-in for
  removing the two `cleanHTML` calls of `RichText.svelte` and `TooltipAction.js`; an edit of `RichText.svelte` itself
  was refused by the tool permission check and is not run.

### 85. Turn-start and turn-end report messages rendered blank

- **What:** `ChatMessageRichTextMessages.svelte` passed `text={message}` to `RichText`, which reads only `value`, so
  every rules-element turn message rendered `enrichHTML(undefined)`, an empty string.
- **Found:** 2026-09-30 by the Task 5 buddy check (plan B), by reading the code.
- **Fixed:** 2026-09-30 — the component passes `value={message}`, together with #84 (the prop fix enables the rich-text
  sink). Gated by `tests/e2e/combat-turns.spec.js` "a turn message rules element posts its message in the
  turn-start report": a Turn Message element is typed into its editor on an ability, a combat is started with the Combat
  Tracker flows, and the report card shows the message. With `ChatMessageRichTextMessages` passing `text` instead of
  `value` that test fails (`.superpowers/sdd/test-suite-rewrite/phase-6/partB/mutations/M5-richtextprop-run.log`). The
  test that gated it before was a turn-start report made by API; the `RichText` probe of
  `tests/e2e/component-probe-display.spec.js` covers `RichText`'s value handling, not this wiring. Building the new test
  found #144 and #145.

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
  the field.
- **Gate:** not tested: migration tests deleted 2026-10-02 (`d874870b`) by project rule (ruling 2026-10-01); the
  migration system was confirmed once by the one-off check (§7.0 of
  `docs/superpowers/plans/2026-10-01-test-suite-real-data.md`). The deleted tests were
  `tests/unit/StoredActorSources.test.js`, `tests/unit/MigrateStoredActors.test.js` and
  `tests/e2e/condition-migration.spec.js`.

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
  which records a creation moment that inline data lacks.
- **Gate:** the rule is gated by `tests/unit/GetEffectCreationChanges.test.js`, which stays (its function is not
  migration code). The Adventure write path and the stored `disabled`, `showIcon` and `transfer` are not tested:
  migration tests deleted 2026-10-02 (`d874870b`) by project rule (ruling 2026-10-01); the migration system was
  confirmed once by the one-off check (§7.0 of `docs/superpowers/plans/2026-10-01-test-suite-real-data.md`). The
  deleted tests were `tests/unit/StoredActorSources.test.js` and `tests/e2e/effect-creation-source.spec.js`.

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
  counts as one failure.
- **Gate:** not tested: migration tests deleted 2026-10-02 (`d874870b`) by project rule (ruling 2026-10-01); the
  migration system was confirmed once by the one-off check (§7.0 of
  `docs/superpowers/plans/2026-10-01-test-suite-real-data.md`). The deleted tests were
  `tests/unit/StoredActorSources.test.js` and `tests/unit/MigrateStoredActors.test.js`.

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
  - Measured live with raw-data tokens, not re-run; no migration tests while no migration is active (project rule), on a
    world-scene and a Scene-pack token, with a second GM connected and a reload read-back: a parent Token or Scene
    update that adds an entry is rejected by the client's dry run (`EmbeddedCollectionDelta#_prepareDeltaUpdate`); one
    that drops an entry, or deletes it with an update operator, stores nothing; one that updates an entry the delta
    already holds is stored, and tombstones survive.
  - Measured live with a raw-data token, not re-run; no migration tests while no migration is active (project rule), on
    the Scene-pack token only: an embedded create through the token's ActorDelta threw on the client.
  - Read in core, not run: the throw site, `TokenDocument#_onRelatedUpdate` (`client/documents/token.mjs:3809`),
    which dereferences the token's null actor; the same create on the world-scene token; and the embedded update and
    delete, which reach the same line.
  - Inferred, not read back: the throw comes after the server write.
  - Orphaned tokens were removed from the user's worlds by a one-off cleanup outside the code: logged in
    `docs/TODO.md` and done 2026-10-01.
  - The walker comments state the reasons, and CLOSED_BUGS #83 states the exception.
  - An Adventure's scene tokens are inline data written through the Adventure, which core writes cleanly whatever the
    base actor (live with a raw-data token, not re-run; no migration tests while no migration is active (project
    rule)), so they are migrated.
- **Gate:** not tested: migration tests deleted 2026-10-02 (`d874870b`) by project rule (ruling 2026-10-01); the
  migration system was confirmed once by the one-off check (§7.0 of
  `docs/superpowers/plans/2026-10-01-test-suite-real-data.md`). The deleted test was
  `tests/unit/StoredActorSources.test.js`.

### 97. A failed version migration stored part-migrated data under the previous version

- **What:** `migrateDocument` in `src/helpers/migration/MigrateWorld.js` accumulated changes across the levels of a
  version. When a later level threw, it wrote the earlier levels' changes together with the previous
  `documentVersion`, so a retry re-ran migrations on data they had already changed. Latent: no version migrations
  exist yet.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B).
- **Fixed:** 2026-09-30 — `migrateDocument` copies the update data after each fully completed version
  (`foundry.utils.deepClone`, which keeps an update operator such as `_del` by reference) and writes that copy, so no
  part of a failed version is stored.
- **Gate:** not tested: migration tests deleted 2026-10-02 (`d874870b`) by project rule (ruling 2026-10-01); the
  migration system was confirmed once by the one-off check (§7.0 of
  `docs/superpowers/plans/2026-10-01-test-suite-real-data.md`). The deleted test was `tests/unit/MigrateWorld.test.js`.

### 98. A stored actor whose migration write a hook vetoed counted as skipped

- **What:** `migrateStoredActors` counted an actor whose writes changed nothing as skipped, so a `preCreate`,
  `preUpdate`, or `preDelete` hook that vetoed a migration write left the actor's work pending while the migration
  announced completion, and the next GM load found the same work again.
- **Found:** 2026-09-30 while planning the fix for #93.
- **Fixed:** 2026-09-30 — after its writes, each actor's data is checked again (`storedActorNeedsMigration`); an
  actor with work left counts as failed and is reported.
- **Gate:** not tested: migration tests deleted 2026-10-02 (`d874870b`) by project rule (ruling 2026-10-01); the
  migration system was confirmed once by the one-off check (§7.0 of
  `docs/superpowers/plans/2026-10-01-test-suite-real-data.md`). The deleted test was
  `tests/unit/MigrateStoredActors.test.js`.

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
  actor.
- **Gate:** not tested: migration tests deleted 2026-10-02 (`d874870b`) by project rule (ruling 2026-10-01); the
  migration system was confirmed once by the one-off check (§7.0 of
  `docs/superpowers/plans/2026-10-01-test-suite-real-data.md`). The deleted tests were
  `tests/unit/StoredActorSources.test.js`, `tests/unit/ConvertEffectItemsToActiveEffects.test.js` and
  `tests/e2e/converted-effect-identity.spec.js`.

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
  with a raw-data token, not re-run; no migration tests while no migration is active (project rule)). A legacy `effect`
  Item of the base actor takes no tombstone: it is an invalid document, which core's base collection never holds, and
  core's client deletion tombstones only an id its base collection holds. That case follows core's client deletion and
  is not measured: the server refuses a legacy Item, so none can be seeded.
- **Gate:** not tested: migration tests deleted 2026-10-02 (`d874870b`) by project rule (ruling 2026-10-01); the
  migration system was confirmed once by the one-off check (§7.0 of
  `docs/superpowers/plans/2026-10-01-test-suite-real-data.md`). The deleted test was
  `tests/unit/StoredActorSources.test.js`.

### 101. An inherited legacy Item a token removed came back as a converted effect

- **What:** An unlinked token that removed an inherited legacy `effect` Item held a tombstone for that Item's id. The
  base actor's conversion created the replacement effect with a fresh random id, which the tombstone did not hide, so
  the token regained the effect. Affected world tokens and Adventure tokens.
- **Found:** 2026-09-30 while planning the fix for #99.
- **Fixed:** 2026-10-01 — a token's inherited conversion of an Item its own data claims (an Item entry of its delta,
  a tombstone included, or a conversion it holds itself) is hidden with an effects tombstone, as core deletes an
  inherited effect from a synthetic actor; every walked source carries the effects it inherits, so the scan finds such
  a token, and the stamp also finds the conversions older versions created under random ids.
- **Gate:** not tested: migration tests deleted 2026-10-02 (`d874870b`) by project rule (ruling 2026-10-01); the
  migration system was confirmed once by the one-off check (§7.0 of
  `docs/superpowers/plans/2026-10-01-test-suite-real-data.md`). The deleted tests were
  `tests/unit/StoredActorSources.test.js`, `tests/unit/MigrateStoredActors.test.js` and
  `tests/e2e/converted-effect-identity.spec.js`.

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
- **Gate:** not tested: migration tests deleted 2026-10-02 (`d874870b`) by project rule (ruling 2026-10-01); the
  migration system was confirmed once by the one-off check (§7.0 of
  `docs/superpowers/plans/2026-10-01-test-suite-real-data.md`). The deleted tests were
  `tests/unit/StoredActorSources.test.js`, `tests/unit/MigrateStoredActors.test.js` and
  `tests/e2e/condition-migration.spec.js`.

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
    `EffectTrayState.svelte.js` the test fails on an unlabelled `toHaveCount(1)` of the tray's pack options filtered
    by the new pack's label (expected 1, received 0; `effect-tray.spec.js:1278`;
    `.superpowers/sdd/test-suite-rewrite/phase-6/mutations/D-T2-multi-client.log:18-40`). The throw-at-the-end
    mutation above was run on the earlier version of the test and not on the rewritten one.

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
    - it waits until no scrolling text animates (CLOSED_BUGS #114), clears the active flag of the active test scene
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
  `phase-3/scripts/measure-settle.spec.js`):** the Add Check button changes the sheet's local document model at once
  and sends the update afterwards (read: `CheckListMixin.addCheck` pushes into the live model before it sends the
  update, `src/document/types/item/CheckListMixin.js:27-32`), so the model's check count (`item.system.check.length`,
  read by the script; not a DOM row) showed the new check 0 to 4 ms after the click with 2 operations pending
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
  sweep removed 2 actors and 1 pack and no scene or token; they came from
  specs that were not yet converted. Since Phase 6 Part A a sweep that deletes anything fails the run
  (`phase-6/sweep-gate-fail.log`), and the sweep entry of `docs/TODO.md` is deleted.
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

### 141. `placeToken` waited about 1.5 s for a chat notification that covered its drop spot

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-6/` (local, not checked in).

- **What:** the slow-operation record of a full run listed one 'Drag and drop' (the drag in `placeToken`, `flows.js`)
  of about 1.5 s. It was listed in each of the 8 full runs that had the slow-operation reporter and the drag fix not yet
  applied: runs 1, 2, 3 and 7 at 1545, 1528, 1527 and 1544 ms (`e2e-full-1.log`, `e2e-full-2.log`, `e2e-full-3.log`,
  `e2e-full-7.log`), and runs 5, 6, 8 and 9, which carried temporary instrumentation, at 1585, 1510, 1010 and 1511 ms
  (`e2e-full-5-dragtime.log`, `e2e-full-6-pwapi.log`, `e2e-full-8-cover.log`, `e2e-full-9-chain.log`). Run 4 used the
  JSON reporter and has no slow-operation table. The ten spec files that call `placeToken`, run alone with the
  reporter active, listed no drag (`drag-hunt2/`: eight completed runs with a table; `chat-cards` and `combat-turns`
  were re-run to completion in `drag-hunt2/chat-cards-rerun.log` and `drag-hunt2/combat-turns-rerun.log`).
- **Measured cause:** a temporary timing line in `placeToken` named the test in runs 5, 6, 8 and 9: 'an edit on an
  unlinked token sheet leaves the open base actor sheet unchanged' of `sheet-header.spec.js`. Playwright's call log of
  that drag (run 6) shows six retries of "subtree intercepts pointer events". The element read at the drop point just
  before the drag (run 9) was a `.section` inside a `.chat-message` of `#chat-notifications`, with no application window
  open (`e2e-full-9-chain.log:634`). Inferred, not measured: the cover is the notification of a card posted by one of
  the Send to Chat tests earlier in the file.
- **First hypothesis, falsified:** that core opens the new document's sheet after `createActor` returns and the sheet
  renders after `closeAllApps`. Waiting for that sheet in `createFromDirectory` left the drag at 1544 ms
  (`e2e-full-7.log`), and the change was reverted.
- **Fixed:** 2026-10-08. The drop-spot search of `placeToken` skips a spot where `document.elementFromPoint` is not the
  canvas.
- **Gate:** the slow-operation record of the full run. After the fix it lists no drag in runs 10, 11 and 12
  (`e2e-full-10.log`, `e2e-full-11.log`, `e2e-full-12.log`; 657, 657 and 656 passed, sweep and census zero). Three runs
  are a sample, not a proof that the drag cannot recur.
- **Status:** Closed 2026-10-08.

### 142. The first scene of `combat-turns.spec.js` timed out drawing when the spec was run alone

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-6/` (local, not checked in).

- **What:** run alone, `combat-turns.spec.js` failed in its `beforeAll` in 4 of 5 runs: `waitForSceneDrawn`
  (`flows.js:309`, 1000 ms) timed out inside `createScene` (spec line 325), so all 19 tests failed or did not run
  (`drag-hunt/combat-turns.log`, `drag-hunt2/combat-turns.log`, `scene-first/combat-turns-2.log`,
  `scene-first/combat-turns-3.log`; the passing run is `scene-first/combat-turns-1.log`). In full runs the spec passed.
- **Measured:** creating the first scene in a page with one client took 421, 580 and 446 ms until the dialog closed and
  424, 610 and 432 ms until `canvasReady` (`scene-first-draw-probe.log`, a throwaway spec, removed).
- **Cause (inferred, not isolated):** the spec created the scene after opening two more clients, and the draw happened
  with three clients connected. Moving `createScene` before `openClient` made the spec pass in 4 of 4 runs
  (`scene-first/combat-turns-reordered-1.log` to `-4.log`), and in the re-run with the reporter
  (`drag-hunt2/combat-turns-rerun.log`).
- **Fixed:** 2026-10-08. `combat-turns.spec.js` creates its scene before the other clients join.
- **Gate:** the spec run alone. Five runs after the fix passed (`scene-first/combat-turns-reordered-1.log` to `-4.log`,
  `drag-hunt2/combat-turns-rerun.log`); before it, 1 of 5 passed.
- **Status:** Closed 2026-10-08.

### 144. The message editor of a Turn Message or Roll Message rules element had no width when empty

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-6/partB/` (local, not checked in).

- **What:** the rich-text editor of an empty Turn Message element measured 0 px wide and 150 px high
  (`turnmessage-probe.log`), so its edit control could not be reached by hover or click; the Roll Message element's
  editor measured the same (`rollmessage-probe.log`). The `.message` row of both settings components had no width.
- **Found:** 2026-10-08 while writing the live turn-message test of #85 (the flow's hover on the editor timed out:
  "element is not visible").
- **Fixed:** 2026-10-08. `ItemSheetTurnMessageSettings.svelte` and `ItemSheetRollMessageSettings.svelte` give the
  `.message` row `width: 100%`; both editors measure 414 px (`turnmessage-probe-after.log`,
  `rollmessage-probe-after.log`).
- **Gate:** `tests/e2e/combat-turns.spec.js` "a turn message rules element posts its message in the turn-start
  report" types into the Turn Message editor through `addRulesElement`. The Roll Message editor has no test of its own.
- **Status:** Closed 2026-10-08.

### 145. A Turn Message typed into its editor was never saved to the document

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-6/partB/` (local, not checked in).

- **What:** after a message was typed and saved in the editor of a Turn Message element, no item update was made in
  1.5 s, the document's `_source` held no message and only the live `system` data did
  (`turnmessage-persist-probe-3.log`); when the sheet closed the message was gone from the live data too
  (`turnmessage-dbg4.log`, `D3`). The Roll Message element uses the same component; its saving before the fix was not
  measured.
- **Found:** 2026-10-08 while writing the live turn-message test of #85 (a combat started with the element posted no
  turn-start report, `turnmessage-dbg.log`).
- **Measured:** with the component as it was (`DocumentBoundEditorInput.svelte` saving in an effect on its bound value),
  the effect ran 3 times for an item description edit, which was saved with one item update, and 0 times after the Turn
  Message edit, which made no update (`old-effect-probe.log`). Why the two bindings differ is not isolated; the
  description control that saved is unexplained.
- **Fixed:** 2026-10-08. `ProseMirrorEditor.svelte` takes an `onchange` callback that it calls after writing a committed
  edit to the bound value, and `DocumentBoundEditorInput.svelte` saves in that callback instead of in the effect. The
  item description still saves, with one update (`description-persist-probe-after.log`); an edit of the Turn Message
  makes one update that carries the message (`turnmessage-update-count.log`; the two other updates of that probe are
  the add and the operation select).
- **Gate:** `tests/e2e/combat-turns.spec.js` "a turn message rules element posts its message in the turn-start report"
  and `tests/e2e/chat-cards.spec.js` "a roll message rules element shows its message on the attribute check card": the
  `addRulesElement` flow waits for the message in the document's `_source`. With the callback made a no-op both fail at
  that wait (`mutations/M6-editor-persist-run.log`, `mutations/M8-rollmessage-persist-run.log`; restore build
  `M6-restore-build.log`).
- **Status:** Closed 2026-10-08.

### 146. A Roll Message never reached the check it applies to

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-6/partB/` (local, not checked in).

- **What:** the roll messages of an actor's rules elements were collected into an empty list: with a Roll Message for
  Body checks on an actor, `_getAttributeCheckMessages({ attribute: 'body' })` returned `false` while the rules cache
  held the message, and the rolled Body check stored no message (`rollmessage-dbg2.log`, `PRE` and `POST`). The helper
  `appendUnique` assigned the merged array to its own parameter instead of changing the destination array, and every
  roll-message collector (any, attribute, skill, resistance, attack type and trait, custom trait, multi-attack, spell
  tradition) called it (read: `AppendUnique.js` and the callers in `CharacterDataModel.js`).
- **Found:** 2026-10-08 while adding a live Roll Message test.
- **Fixed:** 2026-10-08. `appendUnique` adds the missing entries to the destination array in place.
- **Gate:** `tests/e2e/chat-cards.spec.js` "a roll message rules element shows its message on the attribute check card"
  (typed through the editor, a Body check rolled from the sheet, the card shows the message and the check stores one)
  and `tests/unit/AppendUnique.test.js`. With the old assignment both fail (`mutations/M7-appendunique-run.log`,
  `mutations/M7-appendunique-unit.log`).
- **Status:** Closed 2026-10-08.

### 92. A world actor, token or pack holding a base-type Active Effect fails to load

The evidence files named here are in `.superpowers/sdd/2026-09-29-conditions-rework/bug92-logs/` (local, not checked in)
unless a path says otherwise.

- **What:** TITAN set `CONFIG.ActiveEffect.dataModels` to `{ effect, condition }`, replacing core's
  `{ base: ActiveEffectTypeDataModel }`. Measured earlier (2026-09-30, 2026-10-08, from the entry's former text):
  `createEmbeddedDocuments` with a `base` effect and no `changes` stored nothing and raised `changes is not iterable`; a
  world actor holding one stopped the world from loading; a packed actor holding one loaded it as an invalid document
  that could not be deleted. A third-party module or another system therefore could not store a `base` effect on a TITAN
  actor, item or token.
- **Found:** 2026-09-30 by the Task 5 fix round (plan B). The existing local worlds and packs held no foreign Active
  Effect (inventory 2026-10-08, `.superpowers/sdd/test-suite-rewrite/non-titan-effects/`).
- **Decision (user, 2026-10-08):** register core's model for `base` permanently, so TITAN stores a `base` effect and
  never uses it; core applies its native `changes`.
- **Superseded (user ruling, 2026-10-08):** "never uses it" now reads: TITAN reads no TITAN field off a `base` effect,
  and the character sheet's Effects tab and the Player HUD effects panel list it as a plain row that opens core's
  default effect sheet.
- **Fixed:** 2026-10-08.
  - `src/hooks/OnceInit.js` registers `base: foundry.data.ActiveEffectTypeDataModel` beside `effect` and `condition`.
  - Audit of every TITAN read of effects: `bug92-audit.md` in the campaign folder
    (`.superpowers/sdd/2026-09-29-conditions-rework/`). Every rules, duration, condition, turn-report, sheet-list, tray
    and migration reader selects the `effect` or `condition` subtype before it reads a TITAN field. Two sites listed
    every effect and are fixed: the Player HUD action menu's effects category (`BuildActionMenuModel.js` `buildEffects`;
    its Send to chat button would call `TitanActiveEffect#getRollData`, which a `base` system does not define) and the
    HUD's effects-panel visibility (`PlayerHudShell.svelte`; an actor holding only a `base` effect kept the panel
    showing).
  - The sheet needed no change. Measured (`probe-sheet.json`): the sheet of a `base` effect is core's
    `ActiveEffectConfig`, it renders with the name, disabled, show-icon, duration and changes controls and raises no
    page error. TITAN registers its own sheets for `types: ['effect']` and `['condition']` only (`OnceInit.js`).
  - One shared test of "an effect TITAN defines", `isTitanEffect` with `EFFECT_TYPE`, `CONDITION_TYPE` and
    `TITAN_EFFECT_TYPES` (`src/system/EffectTypes.js`, unit-pinned in `tests/unit/EffectTypes.test.js`), serves the
    action menu, the effects-panel visibility and, as its one filter, the effects panel's lists. Every other literal
    Active Effect subtype test in `src/` uses the constants too; the hand-read table is `fix3/literal-sweep.md`.
  - A foreign `base` effect with `statuses: ['prone']` and a `flags.titan` description, measured
    (`fix2/probe-statuses.json`, snapshot of rating, speed, attribute, resource, resistance, mod and skill): core's
    `actor.statuses` holds `prone`; the derived stats are unchanged;
    `getConditions()` is null, `getExpiredEffects()` and `getSortedEffects()` are false, the rules-element sources
    number 0 and the immunity sources 0; `toggleStatusEffect('prone')` (core) then removes the effect. So TITAN applies
    none of the Prone rules to it, and only core's status display and toggle see it. The e2e spec pins this against a
    control (a Blinded condition from the Token HUD changes the same stats of the same actor).
  - Measured with the registration (`specs-final.log`): a `base` effect made with a name and a type only is stored (the
    server copy has type `base`), its `system` is `ActiveEffectTypeDataModel`, and `invalidDocumentIds` is empty on the
    actor, on an owned ability and on an unlinked token's actor, including after a reload; the derived stats equal
    those of the same actor before the effect existed; a native change to `system.rating.awareness.mod.static` (add 3,
    entered in core's config sheet) raised Awareness by 3 and deleting the effect returned it. `probe-sheet.json`
    (a `base` effect created with `system.changes: []`) read Awareness 1 and then 4.
  - A `base` effect in a user (world or module) effect pack is listed by the Effect Tray (user packs show every subtype;
    system packs show only `effect`, `EffectTrayState.svelte.js:227-229`) and a click on its row opens core's config
    sheet.
  - Spreadsheet round trip: an exported and unchanged re-imported `base` row in an effect pack and under an
    actor of an actor pack leave the stored effect as it was, except an unset change priority (undefined before, null
    after; both unset). `tests/e2e/compendium-spreadsheet.spec.js` pins both.
  - A native change on an item-owned `base` effect transfers to the actor: core yields an item's effects with
    `transfer` true in `Actor#allApplicableEffects` (`client/documents/actor.mjs:310-316`; `transfer` initial true,
    `common/documents/active-effect.mjs:71`), and the spec raises Awareness through the effect's config sheet.
- **Gate:** `tests/e2e/base-effect.spec.js` (10 tests; module-made `base` effects created through the document API, the
  rest through flows) and the two base-row pins of `tests/e2e/compendium-spreadsheet.spec.js`. The manifest drift guard
  (`tests/e2e/integration-manifest.spec.js`) compares the registered Active Effect `dataModels` with the types
  `system.json` declares; it now leaves out core's `base` type, which no manifest declares (`coreTypes`,
  `common/abstract/document.mjs:135`); before that change it failed with `base` as the one extra registered type
  (`e2e-full-1.log`).
  - Registration removed: all 10 tests fail, tests 3, 4 and 5 on their own assertion "the base effect was created"
    (`fix1/mut1-no-registration.log`; an earlier attempt hit the open bug #143's scene dialog,
    `fix1/mut1-attempt1-flake143.log`).
  - `isTitanEffect` made always true: the Player HUD test fails at the effects-panel row count and the panel-hides test
    fails at its row click (two rows), the other 8 pass, and the unit pin fails
    (`fix2/mut-predicate-always-true.log`; the unit pin's failing test, "accepts an effect and a condition and rejects
    any other subtype", is in `fix3/mut-predicate-unit.log`). Since the panel's `effects` list also tests
    `=== EFFECT_TYPE`, the always-true predicate alone no longer adds a row to the panel lists; the effects-panel
    visibility (`PlayerHudShell.svelte`) and the action menu carry that mutation.
  - Only the action menu's `.filter(isTitanEffect)` removed: the Player HUD test fails on its own assertion that the
    base effect has no sub-option (`base-effect.spec.js:353`), the other 9 pass (`fix3/mut-actionmenu-filter.log`).
  - The two HUD fixes of the first round, removed: the same two tests fail (`mut2-no-hud-fixes.log`).
  - Restored files verified by sha256 (`fix1/sha-before.txt`, `fix1/sha-after-m1.txt`, `fix1/sha-after-m2.txt`,
    `fix2/sha-before.txt`, `fix2/sha-after.txt`, `fix3/sha-before.txt`, `fix3/sha-after-predicate.txt`,
    `fix3/sha-after-actionmenu.txt`).
  - After the third fix round: unit 1555 of 1555 (`fix3/unit.log`); full e2e 704 of 704 with the sweep and census at 0
    (`fix3/e2e-full.log`).
- **Status:** Closed 2026-10-08.
### 147. A label typed without a key event into a `DocumentTextInput` was lost when another client's update arrived

The evidence files named here are in `.superpowers/sdd/2026-09-29-conditions-rework/bugbatch1-logs/` (local,
not checked in).

- **What:** `DocumentTextInput` sent its update on `change` and `keyup`. Text entered without a key event (the
  Playwright `fill`, a mouse paste, an input method, autofill) was only in the bound model until the `change` event, and
  an update that rebuilt the document before then (here: another client renaming the item) reset the input to the stored
  text, so the typed text was never sent. Related to the label failures of #122 and #128.
- **Failing first (measured):** `tests/e2e/item-text-input.spec.js` makes a weapon with a check through the flows,
  `fill`s the check's label without blurring, has a second client (E2E GM 2) rename the item through its sheet, waits
  until the rename reached the first page, blurs the input and reads the label with `readServerSystem`. On the build
  before the fix the server held "Check" (expected "E2E Typed Label") (`failfirst-147.log`; `dist/index.js` sha256
  `5490ae64...`, `dist-sha-prefix.txt`).
- **Fixed:** `TextInput` forwards `oninput`; `DocumentTextInput` sends on `change` and `input` (not `keyup`). Green on
  the fixed build (`green-147-148-run1.log`; `dist/index.js` sha256 `fa2af98c...`, `dist-sha-fix.txt`).
- **Mutation (measured):** `oninput` put back to `onkeyup`: the spec fails (`mut-m147-keyup-run.log`; before, mutated
  and after sha256 and `git hash-object` in `mut-m147-keyup-hashes.log`; restored build `fa2af98c...`).
- **Numeric document inputs (read, then measured):** `DocumentIntegerInput`, `DocumentNumberInput` and
  `DocumentIntegerIncrementInput` bind `value` to the model and send on `change` / `keyup`, but `NumberInput.svelte`
  keeps the typed text in its own `input` state: the effect that copies the bound value into `input` runs only while
  `editingActive` is false (`NumberInput.svelte:47-51`), and the value is written back on `change`.
  `DocumentNameInput` keeps a local `value` and commits through its own `document.data.update({ name })`. Measured:
  `item-text-input.spec.js` `fill`s a check's Resolve Cost with "7" and no key event, has a second client rename the
  item, blurs and reads `resolveCost` from the server: it passes on build `cffa8268...`
  (`green-undo-inverse-run2.log`), so the numeric inputs are not affected and the spec stays as a regression lock.
  Mutation: the `editingActive` guard replaced by `true` fails the spec and leaves the other two passing
  (`mut-u-numberinput-guard-run.log`; hashes in `mut-u-numberinput-guard-hashes.log`).
- **Typed key by key (measured):** the same file types a check label with `pressSequentially` and no delay (every key
  event dispatched at once, the send now on `input`). The input keeps the typed text and the server holds it before and
  after the blur; it passes (`green-undo-inverse-run2.log`), so no new bug. Mutation, on the source before the later
  fixes below: the `oninput` line of `DocumentTextInput.svelte` removed fails this spec and the label spec above and
  leaves the numeric spec passing (`mut-u-textinput-oninput-run.log`; hashes in `mut-u-textinput-oninput-hashes.log`).
- **Input-method composition (measured, a second defect of the same fix):** the spec drives Chromium's input method
  editor through CDP (`Input.imeSetComposition`, then `Input.insertText`). The events are `compositionstart`, an `input`
  event with `isComposing` true per composition update, and `compositionend` (`diag-ime-events.jsonl`). With a send on
  every `input` event the spec passed 3 times and then failed 8 of 20 repeated runs (`ime-repeat20.log`, build
  `0d925153...` in `ime-repeat-hashes.txt`): the input held the committed text twice. The probe without waits between
  the steps (`ime-probe3.spec.js.txt`) showed the composition ending after the second update with no `compositionend`
  event in 9 of 12 runs, so the final `insertText` was appended to the finished text. That the echo of an own update
  rewrites the input's value and ends the composition is inferred, not measured.
- **Fixed (composition):** `DocumentTextInput` sends on `input` only when `event.isComposing` is false and on
  `compositionend`; `TextInput` forwards `oncompositionend`. The composition spec asserts the count of updates the page
  sees (`preUpdateItem`): 0 across both `imeSetComposition` calls, and exactly 1 after `insertText`, so it no longer
  depends on a race. Mutations on the shipped source (build `f48707e8...` restored after each; hashes in
  `mut-u4-<name>-hashes.log`): the guard replaced by `true` fails 6 of 6 repeats of the composition spec
  (`mut-u4-ime-guard-run.log`); the `oncompositionend` line removed fails 6 of 6 (`mut-u4-ime-compositionend-run.log`).
- **Cancelled composition (measured):** the spec sets a known label, composes " extra" at its end (the input shows the
  original plus the composition, no update is sent), then cancels with an empty composition text. The input and the
  server hold the original label after the blur. It passes with the guard (`r4-item-text-run1.log`).
- **A remote update during a composition (measured, a third defect):** with nothing sent during a composition, another
  client's update that rebuilds the document replaced the input's text. The spec composes "E2E Remote", has a second
  client rename the item and reads the input: it showed "Check" (the composition text was lost; failed first on build
  `4121c5d7...`, `r4-item-text-run1.log`, hashes in `r4-run-hashes.txt`). Fix: `DocumentTextInput` keeps the text the
  input shows in its own state and copies the stored value into it only while the input has no focus (as
  `NumberInput` does with `editingActive`); `updateDocument` writes the text into the model before it sends, because
  the model may have been rebuilt since the text was entered. `TextInput` forwards `onfocus` and `onblur`. The file's
  7 specs then passed 10 of 10 repeats (70 of 70, `r4-item-text-fixed-repeat10.log`; hashes in `r4-fixed-hashes.txt`).
  Mutation: the focus guard replaced by `true` fails the remote-composition spec only (`mut-u4-focus-guard-run.log`).
  With this guard the label typed without a key event also survives a rebuild through the local text, so the
  `oninput` line is now needed by the key-by-key and held-key specs only: removed, those two fail and the label spec
  passes (`mut-u4-ime-oninput-run.log`).
- **Unfocused input follows the model (measured):** two specs lock the other half of the focus guard: another client
  sets the label and this page's unfocused input shows it; a remote label arrives while the input is focused and
  unedited, and the input shows it after the blur with nothing sent over it. Both pass (`e2e-full-round5.log`;
  hashes in `r5-run-hashes.txt`); the copy `$effect` made inert (`if (false)`) fails both and nothing else
  (`mut-u5-copy-effect-run.log`; hashes in `mut-u5-copy-effect-hashes.log`).
- **Cancelled composition, count (measured):** the cancel sends exactly one update (the `compositionend` send). The
  `oncompositionend` line removed fails the cancel spec on that count and the composition spec
  (`mut-u5-compositionend-run.log`).
- **Focus state when the input becomes disabled (measured):** before CLOSED_BUGS #151 a focused input could not become
  disabled while its sheet was open (`diag-readonly.jsonl`). After #151 it can; the blur event fires then and the
  `focused` flag does not stick (CLOSED_BUGS #151, "Focus when an input becomes disabled"); the flag is also reset from
  the disabled state, so it does not depend on that event.
- **Callers that bind into an array (read):** the check, custom aspect and attack label inputs bind
  `check.label`, `aspect.label` and `attack.label`, and the rules element key inputs (`customTrait`, `spellTradition`)
  bind `rulesElement[idx].key`. Their rows are `{#each ... (uuid)}` blocks keyed by the entry's uuid (`ItemSheetChecksTab`,
  `SpellSheetCustomAspectsTab`, `WeaponSheetAttacksTab`, `ItemSheetRulesElementsTab`), and each settings component derives
  its entry from the `idx` prop (`ItemSheetCheckSettings.svelte:46`), so after a remote reorder the kept component
  instance writes into the entry it shows, not into the row now at its old index. Not run as a spec (read evidence).
- **Held-key auto-repeat (measured):** the spec presses one key down 12 times (auto-repeat `keydown` events), releases
  it, and finds all 12 characters in the input and on the server before and after the blur. It passes
  (`r4-item-text-run1.log`).
- **Found:** 2026-10-08 while diagnosing #122.
- **Status:** Closed 2026-10-09.

### 148. A refused check update left the model and expansion state changed, and the next edit saved them

The evidence files named here are in `.superpowers/sdd/2026-09-29-conditions-rework/bugbatch1-logs/` (local,
not checked in).

- **What:** `addCheck` pushed the new check into the live model, `deleteCheck` spliced it out and `deleteCheck`,
  `moveCheck` and `insertCheck` changed the sheet's expansion arrays, all before `this.update(...)` resolved. The
  model edit is deliberate: `refreshSystemDocument` sends `structuredClone(document.system)`
  (`RefreshSystemDocumentData.js`), so an edit made before the echo must already carry the change. When a `preUpdate`
  hook vetoed the update (it resolves undefined) or the server rejected it, nothing took the edits back, and the next
  edit saved them.
- **Failing first (measured, `failfirst-148-*.log`, build `5490ae64...`):**
  `tests/e2e/check-list-refused-update.spec.js` makes a weapon with checks through the flows and refuses its updates
  with a `preUpdateItem` listener that returns false, or rejects them with an `update` method on the item instance that
  throws (no flow refuses or rejects an update on demand; neither is a real user flow), then edits another check through
  the sheet. Refused Add Check: the edit saved the phantom check as well (one extra check stored). Refused Delete: the
  expansion state came back as one entry (`[false]`) instead of `[true, false]`. Refused reorder: the expansion state
  came back misaligned. The specs added afterwards (rejected Add Check, rejected Delete, upward reorder, insert, the
  toggle in flight) were written against the fixed code and proved by the mutations below, except the toggle in flight,
  which failed first on the build with the copy-back (below).
- **Fixed:** `CheckListMixin` sends each update through `commitCheckUpdate`, which undoes the caller's edits when the
  update resolves undefined or rejects: `addCheck` removes its check by `uuid` (when the model was not already rebuilt),
  `deleteCheck` puts its check back by `uuid` (skipped when the index named no check), and the sheet takes the
  expansion flags back with `undoDeleteCheck(idx, removed)` (`preDeleteCheck` returns the removed flags),
  `undoMoveCheck(from, to)` and `undoInsertCheck(at)` (`TitanItemSheetState`, `CheckListSheetMixin`, passed through
  `RulesElementItemSheetState`, `SpellSheetState`, `WeaponSheetState`). Each undo reverses its own entry of the
  arrays. The first text of the fix copied the arrays back from a snapshot taken before the change; measured on that
  build, an expansion toggle made while a rejected Delete was in flight was lost (the second row, collapsed in flight,
  was expanded again after the rejection: `inflight-toggle.jsonl`, last line), and the spec for it failed first on that
  build with expected `[true, false]`, received `[true, true]` (`failfirst-inflight-old-dist.log`; dist and source
  hashes in `failfirst-inflight-hashes.txt`). The model edits stay optimistic. Green on build `cffa8268...`
  (`green-undo-inverse-run2.log`: 9 tests of the check-list spec plus the 3 of `item-text-input.spec.js`).
- **Specs (9, each asserts the interception saw exactly one update, `toBe(1)`):** refused Add Check, refused Delete,
  refused reorder down, refused reorder up, refused insert (a copy dragged from a second weapon), rejected Add Check,
  rejected Delete, a toggle made while a rejected Delete is in flight (the held update throws only when the test says
  so), and a click on the Add Check button sends only its own update (#149).
- **Mutations (measured on build `cffa8268...`, whole spec file per mutation, `mut-u-<name>-run.log`, hashes in
  `mut-u-<name>-hashes.log`, each restored to build `cffa8268...`):** the add undo removed: refused and rejected Add
  Check fail; the delete model restore removed: refused Delete, rejected Delete and the toggle in flight fail; the
  delete expansion undo removed: the same three; the move expansion undo removed: both refused reorders; the insert
  expansion undo removed: the refused insert; the undo in the `catch` removed: rejected Add Check, rejected Delete and
  the toggle in flight; the undo after a vetoed update (`!committed`) removed: the five refused specs; the inverse
  move index set to the original index: the upward reorder only.
- **Found:** 2026-10-08 while diagnosing #122.
- **Status:** Closed 2026-10-09.

### 149. A click on an untyped button of a TITAN sheet, and Enter in a text input, sent a second update

The evidence files named here are in `.superpowers/sdd/2026-09-29-conditions-rework/bugbatch1-logs/` (local,
not checked in).

- **What:** `TitanDocumentSheet` extends `DocumentSheetV2`, whose form handler sends `document.update(formData)` when
  the sheet's `<form>` submits (`_onSubmitForm` → `#onSubmitDocumentForm` → `_processSubmitData`, the stack in
  `diag-second-update.jsonl`). The sheet's form has no named fields, yet a `<button>` without a `type` attribute inside
  it submits the form. Measured on build `fa2af98c...`: a click on Add Check of a weapon sheet reached `preUpdateItem`
  twice, with the keys `system, _id` (the check) and `type, _id` (`type: 'weapon'`, the form's data); collapse and
  expand sent none and Delete one (`diag-button-updates.jsonl`); the sheet held 17 buttons without a `type` attribute
  and 8 with `type="button"` (`diag-form.jsonl`). Enter in a check label input sent one `type, _id` update on a build
  without the handler below and none on the fixed build (`diag-enter-updates.jsonl`). The `preUpdate` hooks ran for the
  form update (measured); whether it reached the database is not verified.
- **How it was found:** the second update of a refused Add Check, which loosened the assertions of the #148 specs to
  `toBeGreaterThan(0)`. The first lead, `Select.svelte:114-121` calling `onchange` for a value outside its options, was
  not the cause: the update's only key is `type` and its stack is the form submit.
- **Failing first (measured):** the refused Add Check spec saw 2 updates where 1 was expected, and the own-update spec
  saw 2 (`failfirst-form-refused-Add-Check.log`, `ff2-only-its-own-update.log`; the sources' `git hash-object` values in
  `ff-form-hashes.txt`, `dist/index.js` sha256 `fa2af98c...`).
- **Fixed:** `TitanDocumentSheet.DEFAULT_OPTIONS.form` sets `handler` to a no-op (`ignoreFormSubmission`), with
  `submitOnChange` and `closeOnSubmit` false. The Svelte components write the documents themselves, and the handler
  covers every button and Enter without editing each button. Green on build `cffa8268...`
  (`green-undo-inverse-run2.log`).
- **Mutation (measured):** the `handler` line removed: the refused Add Check spec, the own-update spec and the spec
  "Enter in a check label input sends no update" (an edit first shows the interception sees the item's updates, then
  Enter on the unchanged input must add none) fail (`mut-u3-form-handler-run.log`; hashes in
  `mut-u3-form-handler-hashes.log`; restored build `0d925153...`). The sheet's options no longer restate core's
  `submitOnChange` and `closeOnSubmit` defaults (both false in core's `DocumentSheetV2`).
- **Found:** 2026-10-09 while fixing #148 (second review round).
- **Status:** Closed 2026-10-09.

### 150. After a failed test, the restarted `beforeAll` recorded the wrong document or failed in the creation flow

The evidence files named here are in `.superpowers/sdd/2026-09-29-conditions-rework/bugbatch1-logs/` (local,
not checked in).

- **What:** `createFromDirectory` and `createFolder` found the new directory entry by its name. When a test of a file
  fails, Playwright restarts the worker and runs the file's `beforeAll` again (already noted in the E2E conventions),
  which creates a second document of the same name while the first stays until the teardown. The flow recorded the
  first document's id again, so the second document was never recorded and the teardown reported `The sweep deleted
  documents no flow recorded: actors: 1`; once the lookup failed on strict mode (two matches). The cause is inferred
  from the registry, not from a log of the events: the wait for one matching entry is satisfied at once by the older
  entry, before the new entry renders. Measured with a throwaway spec of one deliberately failing test
  (`fail-probe.spec.js.txt`) against the by-name text of the flows (`mut-u-flows-by-name-run.log`; the registry shows
  the first shared actor's id recorded twice and the second shared actor unrecorded:
  `diag-fail-registry-by-name.jsonl`). The same sweep message ended the first run of the #148 specs after one of their
  tests failed (`green-undo-inverse-run1.log`).
- **Fixed:** the creation flows read the ids of the entries that already show the name before the click and take the
  one new id after it (`readEntryIds` in `tests/e2e/flows.js`). With the fix the probe records all four documents and
  the sweep deletes none (`diag-fail-registry-fixed.jsonl`).
- **Mutation (measured):** the by-name text put back: the probe's teardown fails with the sweep message
  (`mut-u-flows-by-name-run.log`; hashes in `mut-u-flows-by-name-hashes.log`).
- **Compendium packs:** `createCompendium` takes the new pack's id the same way. Core refuses a second pack with one
  label (`The Compendium pack e2e-dup-pack already exists in the World and cannot be created`,
  `diag-pack-dup-new.jsonl`), so a restarted `beforeAll` fails there; the by-name text answered with the older pack's id
  and recorded it twice, so the failure surfaced only as a page error (`diag-pack-dup-by-name.jsonl`,
  `mut-u3-pack-by-name-run.log`).
- **Not changed:** a lookup of a document by name elsewhere in the suite still finds both documents.
- **Found:** 2026-10-09 while running the #148 specs.
- **Status:** Closed 2026-10-09.

### 102. A create or delete of two or more embedded documents on an unlinked token with no stored delta was lost

Core citations refer to Foundry 14.364 at `C:\FoundryVTT\V14\dev\foundry`. The evidence files named here are in
`.superpowers/sdd/2026-09-29-conditions-rework/` (local, not checked in): `repro102b/` (the TITAN-world real-flow
repro), `bugbatch2-logs/pf2e/` (the no-TITAN control) and `bugbatch2-logs/impl/` (the fix's runs).

- **What:** Remove Expired Effects on an unlinked token whose stored `delta` is null did not survive a reload. The same
  token's actor lost an Item folder dropped on its sheet.
- **Measured in `test-titan`** (E2E GM 1, TITAN loaded, no synthetic documents, 4 runs): the scene, actors and effects
  were made through the UI, token (a) by a canvas drop of an actor whose prototype token is unlinked, token (b) by
  unlinking a linked token with the Token config toggle. Both tokens stored `delta: null`. Clear Expired Effects sent
  one `modifyDocument` `delete` of both effects with parent `Scene.<id>.Token.<id>.ActorDelta.<id>`, and the reply
  listed both ids with no error. The server copy of the token still held `delta: null` right after, 2 s later and
  after a reload; the client showed the effects gone until the reload (`repro102b/run1.log` to `run4.log`). A
  one-effect delete on a `delta: null` token, and the clear on a token whose delta a Stamina edit had created, were
  stored (`repro102b/c1.log` to `c3.log`).
- **Control with no TITAN, delete side, measured** (`test-pf2e`, pf2e 8.2.0, Foundry 14.364, no module enabled, 3
  runs; with `stylish-action-hud` enabled the same, 3 runs): a batch delete of two embedded Items on an unlinked token
  with `delta: null` left the stored delta null in 3 of 3 runs, a single delete stored a delta with one tombstone in 3
  of 3, and a batch of two after a Token HUD toggle had created the delta stored in 3 of 3
  (`bugbatch2-logs/pf2e/t102-final1.log` to `t102-final3.log`, `t102-nomod1.log` to `t102-nomod3.log`). pf2e cannot
  author Active Effects (`createEmbeddedDocuments('ActiveEffect')` on a pf2e actor returned 0 documents), so the
  control measured embedded Items, on the same ActorDelta path. The delete-side loss is a core defect.
- **Create side, control with no TITAN, measured** (`test-pf2e`, pf2e 8.2.0, Foundry 14.364; 3 runs with
  `stylish-action-hud` enabled, 3 with no module, and a pilot, identical; `bugbatch2-logs/pf2e/t102c-mod1.log` to
  `t102c-mod3.log`, `t102c-nomod1.log` to `t102c-nomod3.log`, `t102c-pilot.log`):
  `token.actor.createEmbeddedDocuments('Item', ...)` of 2 and of 3 Items on an unlinked token with `delta: null`
  returned all items and the client held them, but the server's token never stored a delta and held 0 created items at
  all three reads (right after, +1.5 s, after a reload); a single create persisted, and a batch of 2 after a Token HUD
  status toggle had created the delta persisted. Measured for Items, not Active Effects (pf2e authors none). The create
  side is a core defect like the delete side. The server's create path hands the same shared `writeParent` holder to
  each document (`_createDocuments`, `dist/database/backend/server-backend.mjs`); the mechanism inside core is read in
  `embedded-delta.mjs`, not instrumented.
- **Mechanism, read in core (the walk is read, not instrumented; the failing and passing specs below are the
  measurements that agree with it):** the server handles the documents of a batch one after another with the same
  `writeParent` holder. For each embedded document `EmbeddedDeltaMixin#batchWrite` and `#batchDelete`
  (`dist/database/backend/embedded-delta.mjs`, `#e`) walk up the ancestors, adopt every ancestor the parent's collection
  does not manage yet, and return the outermost ancestor they adopted. The first document adopts the delta and then the
  token (the token record has to be written to hold the delta), so the holder is the token. For the second document the
  delta is managed already, so the walk returns only the delta, which replaces the token as the write parent. The token
  record is then not written and the delta is lost. A one-document call, an update (`_preUpdate` adopts the document
  first), and a batch after the delta is stored take no second adoption of the token. Read: the client's private
  `TokenDocument#relinkActorDelta` (`client/documents/token.mjs:3964-3966`) sets the client's `_source.delta` before a
  descendant delete or update, which is inferred to be why the client shows the change until the reload.
- **Fixed:** `TitanActor#createEmbeddedDocuments` and `#deleteEmbeddedDocuments` write the first document of a batch of
  two or more alone when the actor is an unlinked token's synthetic actor (`isToken`) whose token source holds no
  delta, and then the rest in one call (`needsDeltaFirst` and `writeInSteps` in
  `src/document/types/actor/TitanActor.js`). The override is a workaround for the core defect. Callers that go through
  the actor's methods are covered (Remove Expired Effects, the combat and auto-removal paths, the folder drop, the
  stored-actor walker); a class-level call such as `Item.createDocuments(data, { parent })` bypasses it, and no TITAN
  code makes one.
  - **The guard reads client state** (`token._source.delta`). Core replaces it with the server's data on every load and
    sets it only after the server accepted a first write below the token (read: `relinkActorDelta`, run from the
    descendant events after the server's reply). It differs from the server only after a batch that bypassed the
    overrides and was lost. A server read before every batch would cost a round trip for no other case.
  - **The guard is tested again after each single write.** A document that a listener vetoed or that failed validation
    is dropped before the request (read: `#preCreateDocumentArray` and `#preDeleteDocumentArray`,
    `client/data/client-backend.mjs`), so it stores no delta and the next document goes alone too.
  - **`deleteAll`** is resolved to the ids of the whole embedded collection, as core resolves it
    (`client-backend.mjs`, `#preDeleteDocumentArray`), and split like any batch.
  - **A delete naming an id the actor lacks** is rejected before the first write, as core rejects it (the same strict
    `collection.get(id, { strict: true, invalid: true })`).
  - **A `deleteAll` that also names ids** throws core's own message, `A deleteAll operation must pass no IDs.`
    (`Document.deleteDocuments`, `common/abstract/document.mjs:696`), which the split path would otherwise skip.
  - **No TITAN flow creates two or more Active Effects on an unlinked token's actor (read, so the create-side split has
    no Active Effect spec).** The callers of `createEmbeddedDocuments('ActiveEffect', ...)` and `addActiveEffect` are:
    the Effects tab's Add New Effect button (one effect, `CharacterSheetEffectsTab.svelte`), the sheet drop of one
    effect (`TitanActorSheet#_onDropActiveEffect`, `activeEffect.toObject()`), `applyEffectToTargets` (`[effectData]`,
    one effect per target), core's `Actor#toggleStatusEffect` (one `ActiveEffect.create`,
    `client/documents/actor.mjs:583`; the Token HUD calls it, `client/applications/hud/token-hud.mjs:329`), the
    migration walker `StoredActorSources` (a batch, but a migration, not a user flow, and none is active) and the
    spreadsheet import `ApplyImport` (parents resolved from a compendium pack, never a scene token). The Item folder
    drop creates Items, whose transfer effects are not actor documents. Combat only deletes effects
    (`removeCombatEffects`, `_processExpiredEffects`), which the delete tests cover. The create-side split is tested
    with Items, the documents pf2e measured.
  - **Not atomic.** Core sends a batch as one server operation. The split sends the first document and then the rest
    as two operations, so when the server rejects the rest (for example a kept id that already exists), the first
    document stays written, where core writes none. A neutral write that stores the delta first is not available: no
    token field can be written without changing what the token inherits (not verified in core), and a client-side
    check of the whole batch before the first write exists only for the unknown-id case above; core drops invalid or
    vetoed documents one by one on the client and rejects whole batches only on the server (read). The hooks
    (`preCreateItem`, `createItem` and the like) run once per write, not once per batch.
- **Failing first** (measured, first version of the override and spec, `40b14d02`): the spec made the scene, an NPC
  actor with an unlinked prototype token, three expired effects, an Item folder with three items and two tokens by
  canvas drops (each with a server-read `delta: null` precondition). Remove Expired Effects on the token sheet and the
  folder drop on the token sheet each reloaded and read the client and the server copy. On the code without the
  override both failed: 3 effects remained after the reload, and the token's actor owned 0 items
  (`bugbatch2-logs/impl/red-1.log`). With the override both passed (`green-1.log`). Delete override disabled failed the
  effects test only, create override disabled the folder test only (`mut1-run.log`, `mut2-run.log`; hashes in
  `mut-hashes.log`).
- **Final override and spec (measured, `bugbatch2-logs/impl/`):** the override has the repeated guard, `deleteAll`, the
  unknown-id check, core's `deleteAll`-with-ids error and one shared helper; the spec (git `0fe21350...`, sha256
  `beedf32b...`) has 10 tests: delete of three and of exactly two effects, a token whose delta is stored (one request,
  no split), `deleteAll`, a delete naming an unknown id (rejected, no request, delta still null), a `deleteAll` that
  also names ids (rejected with core's message, no request), an Item folder drop of three and of exactly two items, a
  drop whose first item a `preCreateItem` listener vetoes, and a create whose later documents the server rejects (a kept
  `_id` that exists on the base actor: rejected with "already exists", the first document stays created). Each counts
  the `modifyDocument` requests and asserts them after the stored state.
  - **Red** (guard always false, `r1-red-run2.log`, on the 9-test spec): 7 failed, 2 passed. The failures of the delete
    tests, `deleteAll` and the three folder-drop tests are on the stored state after the reload (effects or items back
    or missing); the rejected-rest test fails because core creates none of a rejected batch. The stored-delta test and
    the unknown-id test pass.
  - **Green:** 10 passed alone (`r2-green-alone.log`); 9 passed alone and 28 passed after `base-effect.spec.js` on the
    9-test spec (`r1-green-alone.log`, `r1-green-after-base.log`).
  - **Mutations** (`mut-hashes.log`: sha256 and `git hash-object` before, during and after each, build after each
    mutation and restore, restored text identical to the baseline copies `TitanActor.r1-baseline.js` and
    `TitanActor.r2-baseline.js`): (a) delete override off fails the delete tests (three effects, exactly two,
    `deleteAll`) only; (b) create override off fails the three folder-drop tests and the rejected-rest test only; (c)
    the repeated guard made a single split fails the vetoed-first test only; (d) the `deleteAll` expansion off fails the
    `deleteAll` test only; (e) the unknown-id check off fails that test only (`r1-mut-a-run.log` to `r1-mut-e-run.log`,
    nine-test numbering); (f) the `deleteAll`-with-ids throw off fails that test only (`r2-mut-f-run.log`); (g) the
    guard ignoring the stored delta fails four tests, not one: the stored-delta test (requests [1,2] instead of [3]) and
    the three-document tests, because the always-true guard keeps splitting the rest (`r2-mut-g-run.log`).
  - **Gates:** unit 140 files, 1586 tests passed; eslint clean on the override and the spec; full e2e 753 passed, 0
    failed, 20.6 min, teardown sweep and census all 0 (`e2e-full-4.log`).
- **Found:** 2026-10-01 while the Task 5 fix round 2 identity e2e (plan B) was seeding its tokens.
- **Status:** Closed 2026-10-09.

### 109. A token sheet highlighted the Skills tab while showing the Effects tab

The evidence files named here are in `.superpowers/sdd/2026-09-29-conditions-rework/bugbatch2-logs/t109/` (local, not
checked in). Core citations refer to Foundry 14.364 at `C:\FoundryVTT\V14\dev\foundry`.

- **What was reported:** screenshots from the #102 repro showed the tab strip still highlighting "Skills" after Effects
  was clicked while the Effects content showed.
- **Measured** (E2E GM 1, `test-titan`, genuine flows, 120 samples in 4 runs of 30; `t109/final1.log`, `final2.log`,
  `v2run1.log`, `v2run2.log`): in one `page.evaluate` right after a real click, the strip's `active` class and the
  visible panel disagreed in 0 of 120 samples. In the 60 samples of the runs that started from Skills, the Effects
  button held `active` and the Effects panel showed in 60 of 60, and the Skills button still painted highlighted
  immediately after the click in 60 of 60; after the buttons' animations finished only Effects painted highlighted in
  60 of 60. The tab buttons' computed `transition` was `all 0.5s` in 60 of 60.
- **Cause and ruling:** the fade is core's, by design of core's button styling, and is not a TITAN defect (a ruling,
  not a measurement of core's intent). The only stylesheet rule that sets a transition on a tab button is core's
  `a.button, button` with `transition: 0.5s` (`public/css/foundry2.css:4056`, measured in `t109/pilot8.log`), so the
  old tab fades for up to 0.5 s after a click and a screenshot taken inside that time shows the old highlight. TITAN
  sets no transition on the buttons, and `Tabs.svelte` sets the `active` class and the panel from the same state.
- **Status:** Closed 2026-10-09, ruled not a TITAN defect (core's button fade).

### 114. Deactivating the viewed scene while a status's scrolling text is on screen throws

Core citations refer to Foundry 14.364 at `C:\FoundryVTT\V14\dev\foundry`. The evidence files named here are in
`.superpowers/sdd/test-suite-rewrite/phase-0/` and
`.superpowers/sdd/2026-09-29-conditions-rework/bugbatch2-logs/pf2e/` (local, not checked in).

- **User-reachable core defect with no TITAN fix.** A GM who deactivates the viewed scene within about 2 s of a
  status's scrolling text gets the error below in the console. TITAN has no code involved and cannot prevent it; the
  entry is closed per the convention for core defects (#116, #117), not because the error cannot occur for a user.
- **Measured** (probe, `test-titan`, TITAN loaded): a token's actor gains a status (`toggleStatusEffect`), which starts
  the 2 s scrolling text, and the viewed scene is deactivated at once (`scene.update({ active: false })`). The page
  throws `TypeError: Cannot read properties of null (reading 'off')` at `PreciseText.destroy` <-
  `InterfaceCanvasGroup.createScrollingText` (`client/canvas/groups/interface.mjs:174`) (`probe114-status.json`). A
  direct core call `canvas.interface.createScrollingText(...)` followed by the deactivation throws the same error with
  the same destroy sequence (`probe114-core.json`).
- **Read:** the deactivation runs `Canvas.tearDown`, which destroys the group's children, including the scrolling text
  (`client/canvas/groups/canvas-group-mixin.mjs:172-177`) and terminates the running animations
  (`client/canvas/board.mjs:1326`), so the awaited fade-in resolves; `createScrollingText`'s clean-up then removes and
  destroys the text a second time (`interface.mjs:234-235`), and the second `destroy()` sees `_texture === null`. A
  console error `Cannot read properties of null (reading 'position')` at `set y` is logged by the animation frame
  (`client/canvas/animation/canvas-animation.mjs:159`, `:270-271`).
- **Control with no TITAN, measured** (`test-pf2e`, pf2e 8.2.0, Foundry 14.364; `pf2e/control.spec.mjs`, "#114
  control"; with `stylish-action-hud` enabled and with no module, 3 runs each): a scrolling text created with
  `canvas.interface.createScrollingText` and the scene deactivated at once rejected with `TypeError: Cannot read
  properties of null (reading 'off')` in 12 of 12 trials with the module and 12 of 12 with none; the unobserved trials
  raised the page error in 6 of 6 and 6 of 6, with the stack `PreciseText.destroy` <-
  `InterfaceCanvasGroup.createScrollingText`; a 2.6 s wait before the deactivation threw nothing in 9 of 9 and 9 of 9
  (`pf2e/t114-r1.log` to `t114-r3.log`, `t114-nomod1.log` to `t114-nomod3.log`). With a 2.6 s wait the TITAN-world
  probes also threw nothing (`probe114-core-wait.json`, `probe114-status-wait.json`).
- **Cause:** a core defect: TITAN has no PIXI or canvas tear-down code (a search of `src/` and `dist/index.js` found no
  reference to `createScrollingText`, `InterfaceCanvasGroup` or `tearDownChildren`, `fix5-grep-114-titan.txt`), and the
  error occurs in a world without TITAN. It needs the scene to be deactivated within about 2 s of a status's scrolling
  text.
- **Handling in the test layer:** the #113 gate test waits until no animation runs on `canvas.interface` before it
  deactivates the scene; without that wait the spec failed with this error in 6 of 6 runs
  (`fix5-mut114-no-scrolling-text-wait-run1.log` to `-run6.log`). Under the 1 s poll rule the wait cannot last the 2 s
  of the animation, so the last test of `combat-turns.spec.js` reloads the page first (a reload ends the animations)
  and then deactivates the scene.
  The seats test of `unconscious.spec.js` restores the previously active scene the same way (2026-10-09): measured with
  another scene active before the file ran, the file followed by `unlinked-token-delta.spec.js` failed with this error
  in 3 of 3 runs that started (the file's own last test twice, the next file's first test once), and with the restore
  after a reload it passed in 3 of 3 (a run whose first sweep removed the pre-made scene stopped before any test and is
  not counted); removing the reload failed again in 2 of 2 started runs (`task-17-logs/r1-pair-active-*.log`,
  `r1-fixed-active-*.log`, `r1-mutation-reload*.log`). With no other scene active the file never switches scenes and
  nothing fails (5 of 5 runs, `r1-pair-*.log`).
- **Found:** 2026-10-01 while writing the gate test of CLOSED_BUGS #113 (test-suite rewrite, Phase 0 fix round 1).
- **Status:** Closed 2026-10-09 as a core defect with the attribution measured (precedent: #116, #117).

### 151. An open item sheet kept its inputs editable after the viewer lost ownership

The evidence files named here are in `.superpowers/sdd/2026-09-29-conditions-rework/bugbatch1-logs/` (local,
not checked in).

- **What (measured):** E2E Player 1 had the check label input of a weapon's sheet open as an owner. The GM set the
  player's ownership of the actor to Observer. The player's client then reported `isOwner` false for the item, and the
  input stayed enabled and focused, also 3 s later; a reopened sheet disabled it (`diag-readonly.jsonl`; probe
  `readonly-probe.spec.js.txt`). A character sheet opened as an owner did turn read-only (the updated document is the
  actor itself).
- **Cause (read):** core computes `isOwner` on each read from the permission (`client-document.mjs:153-155`) and
  re-renders only the updated document's own sheets (`client-document.mjs:501-507`); `TitanDocumentSheet` ignores
  later renders (`_replaceHTML` acts on the first render only). `ReactiveDocument` invalidated its readers on the
  document's own `update<Name>` hook and on embedded-child hooks, so the parent actor's `updateActor` for an ownership
  change never reached the `!document.data?.isOwner` readers of an item (or effect) sheet.
- **A stale edit (measured, the old behavior):** the player filled the still-enabled label input and blurred it. The
  input kept the typed text, the player's own model and the server kept the original label, and there was no notification
  and no page error (`diag-stale-edit.jsonl`; probe `stale-edit-probe.spec.js.txt`; build with the fix made inert,
  `7fd818d4...`). The edit was dropped silently.
- **Failing first (measured):** `tests/e2e/ownership.spec.js` "an item sheet that is open when the player loses
  ownership turns read-only, and editable again on regaining it" (GM lowers E2E Player 1 to Observer while the sheet is
  open, then back to Owner): with the ancestor handler made inert the label input stayed enabled (expected disabled,
  received enabled; `mut-u6-ownership-inert-run.log`, hashes in `mut-u6-ownership-inert-hashes.log`). The character
  sheet spec beside it passes either way and is a regression lock.
- **Fixed:** `ReactiveDocument` also listens to `update<Ancestor>` hooks for the document names of its ancestors and
  invalidates its readers when the changed document is an ancestor and the diff has `ownership`; other updates of an
  ancestor and a same-id sibling actor are ignored. Unit tests: `tests/unit/ReactiveDocument.test.js` (3 tests; three
  mutations each fail exactly one: `mut-u6-rd-*`). Green on build `6f158e95...` (`r6-ownership-green.log`).
- **Same class elsewhere (measured on the unfixed build `af543b73...`, `r7-head-ownership-run.log`;
  hashes in `r7-head-build-hashes.log`):** the same stale reads existed on five more paths. Each failed first in
  `tests/e2e/ownership.spec.js` and passed on the fixed build:
  - *Unlinked token.* A base-actor ownership change fires `updateActor` with the base actor's uuid only, which is
    neither the token's synthetic actor nor an ancestor. Probe P1 (`diag-r7.jsonl`, script `r7-probes.spec.js.txt`):
    after the GM lowered E2E Player 1 on the base actor, the synthetic actor's `ownership` held the lower level and
    the only update hook on the player's client was `updateActor` for the base actor's uuid (keys `ownership`,
    `_stats`, `_id`); the open synthetic item sheet's label input stayed enabled. Read: core rebuilds the synthetic
    actor from the base actor in `TokenDocument#_onUpdateBaseActor` (`client/documents/token.mjs:3778-3792`).
  - *Roll button.* `ResolveRollActor` read the item's `isOwner` once at mount; an open item sheet kept its info line
    after the player gained ownership.
  - *Edit Token header button.* `ActorSheetHeaderButtons.svelte` read `isOwner` once, and `game.user.can(
    'TOKEN_CONFIGURE')` without a dependency. The button did not appear on regaining ownership (probe P3 and the
    spec, with the world's `TOKEN_CONFIGURE` permission opened to players through the settings API and restored), and
    did not appear when the GM opened the permission while the sheet was open (received 0 of 1,
    `r8-perm-failfirst-run.log`). The window-header dropdown is built when it opens
    (`client/applications/api/application.mjs:1839`) and was current: its entries after the raise were Detach Window,
    Configure Sheet, Edit Token, Toggle Token Link (probe P6, `diag-r7.jsonl`).
  - *Chat cards.* `CheckChatResults.svelte` (Reset Expertise) and `CastingCheckChatMessage.svelte` (scaling aspects)
    read `getSpeakerActor(...)?.isOwner` through the message's bridge, which listened to the message only. A card
    created while the player was an Observer showed no Reset Expertise button after the player became an Owner (spec,
    linked speaker and unlinked-token speaker). The casting card has its own spec (a spell with a scaling damage
    aspect, three forced sixes): it failed the same way with the speaker source disabled (`mut-r8-speaker-casting`).
  - *Compendium documents.* A compendium document's permission comes from the world's `compendiumConfiguration`
    setting (`client/documents/collections/compendium-collection.mjs:946-963` `_onConfigure`), which no document hook
    reports. Probe P9 (unlocked pack, the GM set players to Owner): `isOwner` and `sheet.isEditable` became true and
    both inputs of the open sheet stayed disabled; fixed build: enabled, and disabled again on the restore.
- **Fixed (second pass):** `ReactiveDocument` takes its ownership sources from `getOwnershipSources`: ancestors, the base
  actor of a token in the chain, and for a chat message the speaker actor and its base actor; it invalidates on an
  `update<Name>` of a source whose diff has `ownership` (the `options.diff === false` gate is gone: the `ownership`
  key already filters, and a no-diff update that carries it is covered by a unit test). The hook names are fixed when
  the reader starts, so a chat message always listens to `updateActor` (its speaker is resolved when an update arrives
  and may not exist when the reader starts; unit test). A document of a pack also listens to `createSetting`,
  `updateSetting` and `deleteSetting` for `core.compendiumConfiguration`: `game.settings.set` creates the Setting
  document when none exists (`client/helpers/client-settings.mjs` `#setWorld`), and `Setting#_onCreate` and
  `#_onUpdate` call the setting's `onChange` before the hook (`client/documents/setting.mjs:39-51`), so the pack
  configuration is current when the reader runs. `Setting` has no `_onDelete` that calls `onChange`, so a deleted
  Setting document leaves the cached configuration unchanged; the delete hook is handled as the review asked and the
  re-read it triggers shows no change (unit test only; no real flow changes anything). `'rollActor'` is a reference
  whose `current` follows `document.data.isOwner` (nine consumers read `$derived(rollActorReference.current)`);
  `canEditToken` is a `$derived` of `document.data.isOwner` and of a counter that the permission-setting hooks
  advance. The first configuration of a world is a spec: the GM removes the Setting document and sets the
  configuration (settings API), and the open sheet turns editable.
- **Evidence and mutation counts (reconciled to `bugbatch1-logs/mut-r7-*-hashes.log` and `mut-r8-*-hashes.log`):**
  unit mutations: 10 in the first round (`mut-r7-*`, 8 for the ownership sources and the roll actor, 2 for the pack
  setting hook) and 6 in the second (`mut-r8-no-create-hook`, `no-delete-hook`, `no-update-hook`, `no-leak-cleanup`,
  `no-actor-always`, `focus-reset`); each fails at least one test. E2E mutations that fail their target spec: 9 in the
  first round (`r7-base-actor`, `r7-speaker-base`, `r7-speaker`, `r7-roll-static`, `r7-header-static`, `r7-pack-hook`,
  `r7-focus-sticky`, `r7-charown-core-only`, `r7-charown-rd-core`) and 8 in the second (`r8-bridge-ignores-ownership`,
  `r8-shell-effect-removed`, `r8-no-tracking`, `r8-sync-readonly-skipped`, `r8-perm-key`, `r8-speaker-casting`,
  `r8-casting-rows-loop`, `r8-pack-create-hook`); two ran and passed, as measured controls (`r7-char-static`,
  `r7-charown-rd-only`). Unit tests: `ReactiveDocument.test.js` 21, `ResolveRollActor.test.js` 8,
  `DocumentTextInput.test.js` 1. `tests/e2e/sheet-header.spec.js` (a base-actor edit does not re-render a token sheet)
  passed beside the ownership spec (`r7-fixed-ownership-header-run.log`, 21 of 21, and in the full runs). The first
  round's mutations ran on the build before the setting hook was added (`81ccfb90...`); the hook block touches none of
  the mutated lines. Full run of the second round on dist `48c42e91...`: 764 passed (21.1 min), teardown clean, sweep and census 0
  (`e2e-full-r8.log`; source hashes `r8-full-hashes.txt`); unit 1603 passed.
- **Role and ban (read, measured once):** a change of the viewing user's own `role` calls `game.logOut()`
  (`client/documents/user.mjs:364`). Probe P4: the GM set E2E Player 1 to Assistant GM and the player's page was at
  `/join` afterwards. A ban is the role `NONE` (`common/constants.mjs:1219-1224`: "You can use this role to temporarily
  or permanently ban a user"), so it takes the same path; it was not run separately.
- **Focus when an input becomes disabled:** with an input focused, the GM lowered the player to Observer (probe P2,
  `diag-r7.jsonl`, Chromium under Playwright): `blur` and `focusout` fired, the active element became the body, the
  input was disabled; after the restore and a remote label from another client the input showed the remote label. The
  focus guard no longer depends on that event: `DocumentTextInput` resets `focused` from its disabled state (an effect
  on `inactive`), which also holds where the browser dispatches no blur when it disables a focused element. Unit test
  `DocumentTextInput.test.js` (jsdom dispatches no blur on disabling; `mut-r8-focus-reset` fails it). The spec "a
  focused label input that turns read-only shows the label another client sets after ownership returns" locks the
  behavior end to end; before the reset existed, the mutation `onblur={() => {}}` failed it (expected "E2E Remote
  Label", received the old label, `mut-r7-focus-sticky-run.log`).
- **Character sheet spec:** the spec requires inputs on the owner's sheet, the same inputs disabled after the drop, and
  none disabled after the player regains ownership (CLOSED_BUGS #152). The mutation that makes the bridge ignore an
  update carrying `ownership` fails it ("no input of the open sheet stays disabled", `mut-r8-bridge-ignores-ownership`).
  Before #152's fix the same mutation passed, because core's disable on the sheet's own re-render covered the drop
  (`mut-r7-charown-rd-only`).
- **Evidence file renamed:** `r6-failfirst-old-dist.log` ran on the fixed build, so it was not a failing first. It is
  renamed `r6-run-on-fixed-build-not-failfirst.log` (hashes `r6-fixed-build-hashes.txt`). A real failing first: the
  item-sheet spec on a build with `ReactiveDocument` at the parent of the first fix commit (blob `3c36cd19`, dist
  `42e4d4bb...`, `r7-failfirst-pre151-run.log`, hashes `r7-failfirst-pre151-hashes.log`) failed ("the open sheet turns the
  label read-only", expected disabled, received enabled).
- **Found:** 2026-10-09 while measuring whether `DocumentTextInput`'s focus state can stick (CLOSED_BUGS #147).
- **Status:** Closed 2026-10-09.

### 152. A control that core disabled on a read-only render stayed disabled after the viewer regained ownership

The evidence files named here are in `.superpowers/sdd/2026-09-29-conditions-rework/bugbatch1-logs/` (local, not checked
in).

- **What (measured):** E2E Player 1 opened a character's sheet as an Owner (no input disabled), the GM lowered the
  player to Observer (106 inputs disabled) and back to Owner. One input stayed disabled: the Filter input of the Skills
  tab (`TopFilter` over `TextInput`, no `disabled` prop), parent chain `.filter > .header > .skill-tab`. The other
  inputs were enabled again (probe P7, `diag-r7.jsonl`, script `r7-p6-p7-debug.spec.js.txt`; build `81ccfb90...`).
- **Cause (read):** on every render of a sheet the viewer cannot edit, `DocumentSheetV2#_onRender` calls
  `_toggleDisabled(true)`, which disables every control of the window content (`client/applications/api/document-sheet.mjs`
  lines 230-244 and 268-271); core never calls `_toggleDisabled(false)`. A control whose `disabled` TITAN's component
  derives from `document.data.isOwner` is enabled again by Svelte when ownership returns; a control with no such binding
  (the Filter inputs) is not. A sheet of an embedded document is not rendered again when its parent's ownership changes
  (CLOSED_BUGS #151), so such a sheet was never given the disabled state of a viewer who lost ownership.
- **Ruling (the user, 2026-10-09):** what a read-only viewer sees does not change: core's blanket disable stays, and it
  is made reversible.
- **Failing first (measured, build `7c7f4975...`, `r8-failfirst-run.log`):** "an open character sheet turns read-only on
  losing ownership and editable on regaining it" failed at "no input of the open sheet stays disabled" (expected 0,
  received 1), and "the Filter input of an open item sheet follows the ownership of the player" failed at "the open sheet
  disables the filter for a viewer who cannot edit" (expected disabled, received enabled).
- **Fixed:** `TitanDocumentSheet._toggleDisabled` remembers the controls that were enabled until core's disable
  switched them off. `TitanDocumentSheet.syncDisabledControls` disables the controls again when the sheet is not
  editable and enables the remembered ones when it is. `DocumentSheetShell` runs it from an effect on
  `document.data.isOwner`, so it follows every ownership change the bridge reports, for sheets that are rendered again
  and for sheets that are not. A control that was already disabled when core disabled the controls (a component's own
  state) is not remembered and stays as the component set it. Constraint, in the method's comment: a component that
  disables a remembered control itself while the sheet is read-only has it enabled by the call.
- **Mutations (hashes in `mut-r8-*-hashes.log`):** the bridge made to ignore an update that carries `ownership` fails the
  character-sheet spec; the shell effect removed fails both specs; the remembering removed fails both
  ("the filter is enabled again"); the read-only branch skipped fails the item-sheet spec.
- **Not changed (read, listed in `docs/TODO.md`):** controls that a tab mounts after the sheet turned read-only are not
  touched by core's render; the TODO entry records it with the feature idea of letting read-only viewers use UI-only
  controls.
- **Found:** 2026-10-09 by the "editable again" step of the character-sheet ownership spec.
- **Status:** Closed 2026-10-09.

### 153. The casting check dialog raised `effect_update_depth_exceeded` for a spell with damage or healing

The evidence files named here are in `.superpowers/sdd/2026-09-29-conditions-rework/bugbatch1-logs/` (local, not checked
in).

- **What (measured):** opening the casting check dialog for a spell whose scaling aspect is a damage aspect raised the
  uncaught page error `effect_update_depth_exceeded` once, on the build with the code before this round and on the HEAD
  files (probe P10: the error came between the forced dice and the dialog opening; script `r8-depth-probe.spec.js.txt`,
  `diag-r8.jsonl`). The dialog opened and rolled.
- **Cause (read):** the effect of `CastingCheckDialogShell.svelte` that adds the Damage Mod and Healing Mod rows set
  `rows = [...baseRows]` and then called `rows.splice(...)` on the `$state` array, so the effect read the state it
  wrote and ran again without end whenever `$checkParameters.damage` or `.healing` was set.
- **Failing first (measured):** the casting-card spec of `tests/e2e/ownership.spec.js` (its `afterEach` fails on an
  uncaught page error) failed with `effect_update_depth_exceeded` on the GM's page (`r8-casting-run.log`, build
  `daaa4606...`).
- **Fixed:** the effect builds the rows in a local array and assigns `rows` once. The spec asserts the Damage Mod field
  in the dialog besides the clean page. The mutation `const nextRows = rows;` brings the error back and fails the spec
  with the error and with the missing field (`mut-r8-casting-rows-loop-run.log`).
- **Found:** 2026-10-09 while adding the casting-card spec.
- **Status:** Closed 2026-10-09.

### 155. A check never spent Resolve for doubled Training, doubled Expertise or a Resolve Cost

The evidence files named here are in `.superpowers/sdd/2026-10-10-e2e-coverage/t1-logs/` (local, not checked in).

- **What (measured):** a casting check rolled from its dialog with Double Training ticked, Expertise 1 and Double
  Expertise ticked (settings `autoSpendResolveDoubleTraining` and `autoSpendResolveDoubleExpertise` on, their default)
  left the character's Resolve at 3. The spec expected 1. The failing assertions were
  `doubling Training and Expertise spent 2 Resolve` and `the failed cast spent 1 Resolve` (`resolve-before-fix.log`).
- **Cause (read):** `CharacterDataModel#_rollCheck` called `this._expendCheckResolve(check)` with the `TitanCheck`
  object (`src/document/types/actor/types/character/CharacterDataModel.js`, the `_rollCheck` body). `_expendCheckResolve`
  reads `doubleTraining`, `doubleExpertise` and `resolveCost` from its argument, and a `TitanCheck` keeps them under
  `check.parameters` (`src/check/Check.js` constructor), so every read was `undefined` and no Resolve was spent. All
  five check types roll through `_rollCheck` (call sites in `CharacterDataModel.js` at the lines `await
  this._rollCheck(check, checkMessages)`). Measured for the casting check only; the other four share the call and
  are inferred to have been affected.
- **Fixed:** 2026-10-10: `_rollCheck` passes `check.parameters`. `tests/e2e/spell-casting.spec.js` ("Resolve spent by a
  cast") spends 2 Resolve for doubled Training and Expertise, spends 1 with the setting on and none with it off in
  one test, and spends 1 on a failed cast. The mutation that restores `_expendCheckResolve(check)` fails all three
  (`mutation-resolve.log`). `tests/e2e/check-resolve.spec.js` rolls an Attribute, Resistance and Attack check with
  Expertise doubled and an Item Check with a Resolve Cost of 2: each spends with its setting on and nothing with it off
  on the same flow, and restoring `_expendCheckResolve(check)` fails all four (`mutation-f1-resolve-all-kinds.log`).
- **Found:** 2026-10-10 while writing the Resolve test of the casting spec.
- **Status:** Closed 2026-10-10.

### 156. A spell's disabled standard aspect, and a custom aspect that costs nothing, scaled on the casting card

- **What (measured):** a spell with Damage and a Decrease Mod aspect switched on with no option (the spell stores it as
  disabled with a cost of 0) posted a casting card whose stored scaling aspects were `Damage` and `Decrease Mod`, and whose DOM listed a
  `Decrease Mod` block with the cost `0 ES` (`spending2.log`, assertion `only Damage scales`; a probe run read the
  block). Inferred, not measured: the roll then saw two affordable aspects and bought no Damage steps. A custom aspect with scaling on and cost 0 made the roll divide
  by zero: the casting message failed to validate (`results.damage: must be an integer`,
  `extraSuccessesRemaining: must be a number`), so no card posted and the page raised an error (`spending2.log`,
  `a titan check chat message should be created after the roll`).
- **Cause (read):** `getCastingCheckParameters` (`CharacterDataModel.js`, `processAspects`) added every standard and
  custom aspect with `scaling` set to the scaling aspects, whatever its `enabled` flag or cost. A step of cost 0 makes
  `Math.floor(extraSuccesses / cost)` in `calculateCastingCheckResults` infinite. A disabled aspect also still set the
  Reflexes, Resilience and Willpower flags of the card.
- **Fixed:** 2026-10-10: `processAspects` skips a standard aspect whose `enabled` is `false`, and adds a scaling aspect
  only when its step cost (`scalingCost ?? cost`) is at least 1; the damage or healing a free aspect starts with still
  counts. `tests/e2e/spell-aspect-spending.spec.js` ("aspects that a step cannot buy"). The mutations `if (false)` for
  the enabled check (`mutation-disabled-aspect.log`; an earlier attempt without the resistance test was not caught,
  because the cost guard excludes the disabled aspect too, `mutation-disabled-aspect-first-attempt-uncaught.log`) and
  `stepCost >= 0` (`mutation-zero-cost.log`) fail the spec.
- **Free scaling aspect, as built (2026-10-10):** a scaling custom aspect needs a cost of at least 1, because a step
  that costs nothing cannot be bounded by the extra successes. The Cost input of the custom aspect row keeps at least 1
  while Scaling is on, and a row whose Scaling is on with a cost of 0 shows a warning (`scalingNeedsCost`). An aspect
  with Scaling off may cost 0.
- **Found:** 2026-10-10 while writing the aspect spending spec.
- **Status:** Closed 2026-10-10.

### 157. The owner of a character could not use the scaling-aspect controls of a casting card that a GM rolled

- **What (measured):** E2E Player 1 owns the speaking character and saw the Increase control of a casting card that
  E2E GM 1 rolled; clicking it left the stored value unchanged and raised `User E2E Player 1 lacks permission to update
  ChatMessage` on the player's page (`spending2.log`, test `the player spends on a card that the GM cast for the
  player's character`).
- **Cause (read):** the card shows its controls to the owner of the speaking actor
  (`CastingCheckChatMessage.svelte`, `getSpeakerActor(...)?.isOwner`), but core lets only a message's author and a GM
  write it (`common/documents/chat-message.mjs`, `getUserLevel`; the server rejects the update). Inferred, not
  measured: the same split holds for every other card control that writes the message.
- **Fixed (first version, 2026-10-10):** `TitanChatMessage#update` sent the write of a speaker's owner to the active GM
  through a socket hook whose arguments carried the sender's id. Review found the flaw: any client could emit that hook
  with another user's id (a GM's passes every ownership check) and write any `system` data (`t1-review-1.md`).
- **Fixed (hardened, 2026-10-10):** the sender comes from the transport. Foundry's server appends the sending user's id,
  taken from the socket's authenticated session, as the second listener argument of every package socket event
  (`dist/packages/package.mjs` `registerCustomSocket`, `dist/server/sockets.mjs` `handleCustomSocket`; core build 364),
  and `SocketManager` hands it to the handler (`registerRequestHandler`, `request`); a request carries no identity.
  Only the active GM's client answers, and only the active GM's answer settles a request; the answer (written, or the
  reason for the refusal) returns to the requester, who sees a warning for a refusal or for no answer within 5 seconds.
- **Fixed (delta wire, 2026-10-10):** the first hardened version sent the new `currentValue` of every aspect, so two
  quick clicks on different aspects, or a GM edit in between, wrote one click's stale snapshot over the other's
  change. The request now names ONE aspect index and a signed number of steps
  (`TitanChatMessage#changeScalingAspect(index, steps)`), and the GM's client derives the result from the card as
  stored when the write runs (`applyScalingSteps` in `src/check/types/casting-check/ScalingAspectChange.js`:
  integer index and steps, remaining successes and damage or healing recomputed, refusal below the starting value or
  beyond the extra successes). A user's changes to a card run through one per-card queue (`#queueChange`), shared by
  the direct write (`writeScalingSteps`) and by the GM-side answer (`src/hooks/OnRelayChatMessageUpdate.js`, which
  also requires the sender to own the speaking actor of a casting check card). The `update` override is gone, so every
  other write (other fields, dotted keys, `operation` options, other message types) is core's and raises core's
  permission error.
  Tests (written, not run): `tests/unit/ScalingAspectChange.test.js` (`applyScalingSteps`),
  `tests/unit/SocketManager.test.js` (no GM, 5 s timeout, only the active GM's reply counts, handler throw, no
  handler, late reply, transport sender) and `tests/e2e/spell-aspect-spending.spec.js` (two quick clicks on different
  aspects relayed and direct, a GM edit concurrent with a relayed click, the allow-list, forged identities).
- **Found:** 2026-10-10 while writing the owner-player test of the aspect spending spec.
- **Status:** Closed 2026-10-10.

### 158. A failed Resistance or opposed check took negative damage when its successes exceeded the damage

- **What (measured):** the Fixed Strike check of `resistance-checks.spec.js` deals 1 damage that does not scale and is
  reduced by the Reflexes check. Four successes bank 3 extra successes, so the Resist button asks for Complexity 4; a
  Reflexes check with 3 successes failed and the card stored `damageTaken` -2 (`t2-logs/res-run2.log`, test "a failed
  Resistance never takes negative damage when its successes exceed the damage"). The unit test with the same numbers
  for the Attribute and the Resistance results expected 0 and received -2 (`t2-logs/bug158-unit-before-fix.log`).
- **Cause (read):** `ResistanceCheckResults.js` and `AttributeCheckResults.js` set `damageTaken` to
  `damageToReduce - successes` for a failed check, with no lower bound.
- **Fixed:** 2026-10-10: both results take `Math.max(damageToReduce - successes, 0)`. Covered by
  `tests/unit/check/type-results.test.js`, the Fixed Strike test of `resistance-checks.spec.js` and the Opposed Fixed
  test of `opposed-checks.spec.js`. The mutations that remove the floor from the Resistance result and from the
  Attribute result fail those specs (`t2-logs/mutation-res06-resistance-damage-clamp.log`,
  `mutation-res07-attribute-damage-clamp.log`).
- **Found:** 2026-10-10 while writing the resistance check spec.
- **Status:** Closed 2026-10-10.

### 159. Rend destroyed Magical Armor when the attack was not Magical

- **What (measured):** a defender wore Armor 4 with the Magical trait (the test asserts the stored trait). A Rend
  attack without the Magical trait rolled three 6s and its Rend button took the Armor from 4 to 1
  (`t2-logs/bug159-before-fix.log`: expected 4, received 1). The rules say Magical armor can only be destroyed by
  Magical weapons (`docs/TITAN Rules Compendium.md`, Magical, lines 2236 and 2628).
- **Cause (read):** `CharacterDataModel#applyRend` took the armor lost as `Math.min(armor, rend)` when
  `!isArmorMagical || options.magical !== true`, which is true for Magical armor hit by a non-Magical attack. The same
  condition is false for Magical armor hit by a Magical attack, so that attack lost nothing; this half was read, not
  measured before the fix.
- **Fixed:** 2026-10-10: the condition is `!isArmorMagical || options.magical === true`. Covered by "Rend cannot destroy
  Magical Armor unless the attack is Magical" in `attack-traits.spec.js` (a non-Magical Rend leaves Armor 4, a Magical
  Rend of three takes it to 1, Repair restores 4). The mutation that restores the old condition fails the spec
  (`t2-logs/mutation-atk07-magical-armor.log`).
- **Found:** 2026-10-10 while writing the attack traits spec.
- **Status:** Closed 2026-10-10.

### 160. An Ineffective attack could inflict more than 1 Wound

- **What (measured):** a defender at 1 Stamina and 0 Wounds took an 8 damage attack with the Ineffective trait and
  suffered 3 Wounds (`t2-logs/bug160-before-fix.log`: expected 1, received 3). The rules say Ineffective attacks can
  only inflict 1 Wound per attack (`docs/TITAN Rules Compendium.md`, Ineffective, line 2224; the trait's description in
  `lang/en.json` says the same).
- **Cause (read):** `CharacterDataModel#applyDamage` derived the Wounds from the Stamina deficit and never read
  `options.ineffective` for them.
- **Fixed:** 2026-10-10: the Wounds suffered are at most 1 when `options.ineffective` is set. Covered by "Ineffective
  attacks can only inflict 1 Wound per attack" in `attack-traits.spec.js`, next to the plain attack that inflicts 3. The
  mutation that raises the limit to 3 fails the spec (`t2-logs/mutation-atk08-ineffective-wounds.log`).
- **Found:** 2026-10-10 while writing the attack traits spec.
- **Status:** Closed 2026-10-10.

### 161. The Multi-Attack toggle of a weapon was never stored

- **What (measured):** the Multi-Attack button of an expanded weapon row left the weapon's `system.multiAttack`
  undefined on the server and the row's dice and Expertise unchanged (`t2-logs/bug161-before-fix.log`, the four
  multi-attack tests of `attack-scaling.spec.js`).
- **Cause (read):** the button calls `toggleMultiAttack`, which updates `system.multiAttack`, and
  `initializeAttackCheckOptions` reads `itemRollData.multiAttack`, but the weapon's system template
  (`WeaponSystemTemplate.js`) had no `multiAttack` field, so the update was dropped, and `WeaponDataModel#getRollData`
  did not return it. When the field was last part of the schema was not traced.
- **Fixed:** 2026-10-10: the template has `multiAttack: false` (so the weapon schema and the weapon chat card schema
  have it) and `getRollData` returns it; the two schema golden masters list the field. Covered by the multi-attack
  tests of `attack-scaling.spec.js` (the row shows 5 dice and 2 Expertise for Body 11 and Expertise 5, 6 dice for a
  Flurry attack, and each rolled card carries the halved numbers). The mutation that removes the template field fails
  the spec (`t2-logs/mutation-atk20-weapon-multiattack-field.log`).
- **Found:** 2026-10-10 while writing the multi-attack tests.
- **Status:** Closed 2026-10-10.

### 163. A resource value typed above its maximum or below zero was stored as typed

- **What (measured):** typing `-9` over a Resolve of 1 into the character sheet's current-value input left the server
  holding -8 (`t4-logs/resources-run1.log`, six failing tests of `resources.spec.js`: the above-maximum and the
  below-zero entry of Stamina, Wounds and Resolve, on the sheet and on the Player HUD bar). The meters showed the
  clamped value because data preparation clamps the in-memory value (`CharacterDataModel#_clampResources`), so a later
  rise of the maximum would reveal the stored value.
- **Cause (read):** the sheet input (`CharacterSheetResource.svelte`) and the HUD bar input (`PortraitBars.svelte`)
  passed no `min` or `max` to `DocumentIntegerInput`, and `refreshSystemDocument` stores the system data as typed.
- **Fixed:** 2026-10-10: both inputs pass `min={0}` and `max` of the resource, so the entry is clamped before it is
  stored. Covered by `resources.spec.js` (14 tests pass after the fix, `t4-logs/resources-run2.log`).
- **Found:** 2026-10-10 while writing the resource meter tests.
- **Status:** Closed 2026-10-10.

### 164. Any client could fire any hook on every other client through the system socket

- **What (read):** `SocketManager._onSocketReceived` called `Hooks.callAll(message.id, ...message.args)` for every
  message on `system.titan` that was not a request or reply, so a client could emit `{ id, args }` with any hook name
  (core hooks included) and have it fire on the GM's and every other client, and the two combat turn hooks accepted
  any sender, who could thereby run turn effects (persistent damage, fast healing, resolve regain) for a combatant the
  sender had no right to move. The live reproduction is `tests/e2e/socket-hooks.spec.js` (written, not run).
- **Cause (read):** the receiver trusted the hook name and the sender of a message that any connected client can emit.
- **Fixed:** 2026-10-10: only hooks registered with `SocketManager#registerMirroredHook` fire from the transport, and a
  remote sender must pass the hook's authorization with the sender id the server reports. `combatNextTurn` and
  `combatPreviousTurn` are the only registered hooks (`src/hooks/OnceInit.js`); their authorization
  (`src/hooks/AuthorizeCombatTurnHook.js`) allows a GM, or the owner of the combatant whose turn ended. A refusal shows
  a warning on the receiving client. `triggerSocketHook` still fires locally without the check, for registered names
  only. Covered by `tests/unit/SocketManager.test.js`, `tests/unit/AuthorizeCombatTurnHook.test.js` and
  `tests/e2e/socket-hooks.spec.js` (all written, not run).
- **Found:** 2026-10-10 in the review of the GM relay.
- **Status:** Closed 2026-10-10.

### 166. A turn start or turn end posted a blank report card when only expired effects were removed

- **What (read, not run):** with Report Effects off and Auto-remove Expired Effects on, an expiring effect set
  `reportData.expiredEffectsRemoved = true` in `_processExpiredEffects`; `onTurnStart` and `onTurnEnd` posted a report
  whenever `reportData` had any key, so a card holding only the header was whispered to the owners. The removed-effects
  message renders only beside a reported effect list (`TurnStartReportChatMessage.svelte`,
  `TurnEndReportChatMessage.svelte`), so the card showed nothing.
- **Fixed:** 2026-10-10: `CharacterDataModel#_hasTurnReportContent` ignores the flag; both methods post only when
  other content exists. Covered by "reportEffects false with Auto-remove enabled removes expired effects and posts no
  blank report" in `turn-matrix.spec.js` (written, not run).
- **Found:** 2026-10-10 while reading the turn code for the turn matrix.
- **Status:** Closed 2026-10-10.

### 168. A turn report's apply and revert buttons wrote the resource snapshot to a path the card does not read

- **What (read, not run):** the Apply and Revert buttons of Persistent Damage, Fast Healing (apply) and Resolve Regain
  updated `system.stamina`, `system.wounds` or `system.resolve` of the report message; the report schema and the card
  read the snapshots at `system.resource.stamina|wounds|resolve`, so the update was dropped and the card kept showing
  the value from before the click (`ChatMessageStamina.svelte` reads `system.resource.stamina.value`; the Revert Fast
  Healing button already wrote `system.resource`).
- **Fixed:** 2026-10-10: the five buttons write `system.resource.*`; the persistent damage button writes the wounds
  snapshot only when the report has one. Covered by the snapshot assertions after each button click in
  `turn-matrix.spec.js` (written, not run).
- **Found:** 2026-10-10 while reading the report buttons for the turn matrix.
- **Status:** Closed 2026-10-10.

### 169. The Multiply Base, Multiply Sum and Set Sum editors offered no Mod selector (and Multiply Base no all key), and a mod had no base value

- **What (measured, `t4-logs/stats-run1.log`: the option `mod` and the option `all` were not found):** the editors of the three operations list attribute,
  expertise, rating, resistance, resource, speed and training; `mod` was missing, and the Multiply Base key select
  offered no `all`. Read: a `mulSum`, `setSum` or `mulBase` element with the `mod` selector (which the sum-operations
  design lists, `docs/superpowers/specs/2026-06-01-rules-element-sum-operations-design.md:73-74`, and which the
  engine's generic appliers accept) read `stat.baseValue` of a mod, which was never set
  (`CharacterSystemTemplate.js` derived stat shape has only `mod`; `CharacterSheetMod.svelte` passes `baseValue={0}`),
  so the element would have made the mod NaN.
- **Fixed:** 2026-10-10: `CharacterDataModel#_calculateBaseMods` sets each mod's `baseValue` to 0; the three editors
  offer `mod` (the Multiply Base editor already had the key select for it) and the Multiply Base key select allows
  `all` (the engine expands `all` for every operation, `_expandAllKeyElements`). Covered by `rules-element-stats.spec.js`
  (written, not run: it expects every editor to offer every selector, authors `all` for skills with every operation but
  Flat Modifier, a Set Sum on the Armor mod with no armor, and a Multiply Sum doubling a worn armor plus ability).
- **Found:** 2026-10-10 while building the stat-element matrix.
- **Status:** Closed 2026-10-10 (pending the controller's run of the spec).

### 162. The Vicious trait did not add a Wound

- **What (measured):** a defender at 1 Stamina and 0 Wounds took 2 damage from an attack with the Vicious trait and
  suffered 1 Wound; the rules say a Vicious attack that inflicts Wounds inflicts 1 more (`docs/TITAN Rules Compendium.md`,
  Vicious, line 2286). The test expected 2 and received 1 (`t2-logs/vicious-measured-without-test-fail.log`). A Vicious
  attack that inflicts no Wound adds none, which the product did correctly.
- **Cause (read):** nothing in `src/` read Vicious outside the trait list, its description and the tag; unlike
  Ineffective and Penetrating it set no flag in the attack check and passed no option to `applyDamage`.
- **Fixed:** 2026-10-10 (user ruling: the check card carries the result it derived, as it does for the other traits):
  `AttackCheckOptions` and `AttackCheckParameters` have a `vicious` flag (a persisted boolean of the attack check
  message; the two schema golden masters list it), `initializeAttackCheckOptions` sets it from the Vicious trait, the
  attack card's damage buttons pass it, and `applyDamage` adds 1 Wound when Wounds are inflicted. The Ineffective limit
  of 1 Wound applies after the Vicious Wound, so a Vicious and Ineffective attack inflicts 1 (inferred from the rules
  text "can only inflict 1 Wound per attack"; no rule names the combination). Covered by "Vicious adds 1 Wound when the
  attack inflicts Wounds", "Vicious and Ineffective together inflict at most 1 Wound" and "Vicious adds no Wound when
  the attack inflicts none" in `attack-traits.spec.js` (written, not run).
- **Found:** 2026-10-10 while writing the attack traits spec.
- **Status:** Closed 2026-10-10.

### 170. Apply Half Damage applied no damage for a damage of 1 on four of the five cards

- **What (read):** the item, casting, Resistance and Attribute cards applied `Math.floor(damage / 2)`, which is 0 for a
  damage of 1, and `applyDamage` does nothing for 0, while the attack card applied `Math.max(Math.floor(damage / 2), 1)`.
  The reviewer found the difference by reading; the failing run of the new tests was not made.
- **Fixed:** 2026-10-10 (user ruling: at least 1 on every card): `computeHalfDamage`
  (`src/helpers/utility-functions/ComputeHalfDamage.js`, unit test `ComputeHalfDamage.test.js`) is the one half-damage
  rule and every card's button calls it. Covered by the "Apply Half Damage" tests of `resistance-checks.spec.js` (casting,
  item, Resistance cards), `opposed-checks.spec.js` (Attribute card) and `attack-traits.spec.js` (attack card), written,
  not run.
- **Found:** 2026-10-10 by the review of the check card specs.
- **Status:** Closed 2026-10-10.

### 167. The first combatant's turn start never ran when the combat began, and Next Round, Previous Round and Previous Turn from round 1 skipped the turn hooks

- **What (read, not run):** `TitanCombat` relayed `combatNextTurn` and `combatPreviousTurn` only from its `nextTurn` and
  `previousTurn` overrides. `Combat#startCombat` (`C:\FoundryVTT\V14\dev\foundry\client\documents\combat.mjs:206-213`)
  sets round 1 turn 0 and `nextRound` and `previousRound` (`:222-259`) update the turn directly, so none of them ran
  `onTurnEnd`, `onTurnStart`, the initiative pass or the reverts; a Previous Turn from round 1 turn 0 relayed no restored
  combatant and `onCombatPreviousTurn` warned and bailed.
- **Fixed:** 2026-10-10: every one of those routes ends in `Combat#update` of `round` and `turn`, so `TitanCombat#update`
  is the one place that relays the move (`options.direction` 1 or -1, or the update from round 0 to round 1 for Begin
  Combat); the two hook handlers accept a missing ending or starting combatant. A report is posted only when it has
  content (closed bug 166). Covered by "every route that moves the turn runs the same turn hooks" in `turn-matrix.spec.js`
  (written, not run).
- **Found:** 2026-10-10 while reading the turn code for the turn matrix.
- **Status:** Closed 2026-10-10.

### 171. An open sheet's name input did not follow a rename made elsewhere, and its next key press wrote the stale name back

- **What (measured):** the full e2e run failed "the name typed on the sheet reaches the clients and the HUD, not the placed
  tokens" (`linked-token-sync.spec.js`): after the GM renamed a linked actor, the actor, both token actors and the Player
  HUD showed the new name on both clients, but the player's open sheet kept the old name in `.document-name input`. Cause
  (read): `DocumentNameInput.svelte` copied `document.data.name` into a local `$state` once and never read it again, and
  its `onkeyup` handler sent that local value.
- **Fixed:** 2026-10-10: the input follows the document name while it has no focus (the rule `DocumentTextInput.svelte`
  uses), so a rename from another client or sheet shows and a focused input is never overwritten. Covered by the same
  test (written, not run after the fix).
- **Found:** 2026-10-10 by the full e2e run of `linked-token-sync.spec.js`.
- **Status:** Closed 2026-10-10.

### 172. Multiply Sum and Set Sum on the Armor mod or the Defense rating ignored the worn armor and the shield

- **What (measured, `final-run/e2e.log`, `rules-element-stats.spec.js:522`):** with Armor worn at value 3 and an ability
  adding a flat 2 to the Armor mod (5), a Multiply Sum of 2 on the Armor mod showed 7, not 10.
- **Cause (read):** `prepareDerivedData` applied the rules elements before `_applyArmorAndShields`, which then added the
  armor value and the shield's Defense, so the running total ("base value plus all accumulated modifiers",
  `docs/superpowers/specs/2026-06-01-rules-element-sum-operations-design.md:62-63`) the sum operations read lacked them.
- **Fixed:** 2026-10-10: `_applyArmorAndShieldValues` (armor value, shield Defense) now runs before
  `_applyRulesElements`; the Heavy trait (`_applyHeavyArmor`) stays after, because it reads the speed totals the elements
  leave. Covered by the Heavy armor test of `rules-element-stats.spec.js` (3 + 2 doubled is 10).
- **Found:** 2026-10-10 by the full e2e run of the stat-element specs.
- **Status:** Closed 2026-10-10 (pending the controller's re-run).

### 173. The Revert Resolve Regain button regained Resolve, and a revert of a capped regain spent nothing

- **What (read; measured by the full run, `final-run/e2e.log`, `turn-matrix.spec.js` "resolve regain: autoRevertResolveRegain enabled / showButton"):** after a regain stopped at the maximum (1 of 1, offered 2), the revert left Resolve at 1: `spendResolve` does nothing when it holds less than the amount. The card's button called `regainResolve` instead of spending.
- **Fixed:** 2026-10-10: the automatic revert (`_calculateResolveRegainRevert`) and the button spend at most the Resolve held; the button spends instead of regaining.
- **Found:** 2026-10-10 by the full run of the turn matrix.
- **Status:** Closed 2026-10-10.

### 174. The Remove Expired Effects button on a turn report did nothing

- **What (read; measured by the full run, "showButton: the card button removes the expired effects"):** the button tested `document?.isOwner` on the reactive bridge, which has no `isOwner` (only `data`), so its ownership assertion always failed and nothing was removed.
- **Fixed:** 2026-10-10: it tests `document.data?.isOwner` like the other report buttons.
- **Found:** 2026-10-10 by the full run of the turn matrix.
- **Status:** Closed 2026-10-10.
