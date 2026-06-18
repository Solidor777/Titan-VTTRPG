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
  the weapon sheet row renders), plus a checks-integration e2e asserting the stored parameter AND
  the rendered sub-label match the rolled attack's label.

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
  `tests/e2e/sheet-regressions.spec.js` ("createItemFromType adds an owned item to a world actor").

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
  the synthetic-drop e2e in `tests/e2e/sheet-regressions.spec.js`.

### 12. Weapon attacks tab crashed on load (`$appState.attacks` does not exist)

- **What:** `WeaponSheetAttackSettings.svelte` read `$appState.attacks.isExpanded[idx]` but the
  weapon sheet state defines `tabs.attacks.isExpanded` — `$appState.attacks` is undefined, so the
  attacks tab threw on first open.
- **Found:** 2026-06-10 by the user during the theming-foundation visual pass (pre-existing on main).
- **Fixed:** 2026-06-10 on `feature/theme-foundation` — path corrected to `tabs.attacks` with an
  `?? true` fallback for freshly added attacks; regression-locked by
  `tests/e2e/sheet-regressions.spec.js` ("the weapon attacks tab renders its seeded attack").

### 13. Adding a check crashed the open sheet (`props_invalid_value` on an undefined bind)

- **What:** `TitanItem.addCheck` updates the document before the sheet state's expansion array
  grows, so the freshly rendered sidebar row bound `undefined` into `ExpandButton`'s defaulted
  `expanded` prop — Svelte 5 throws `props_invalid_value` and the checks list failed to render
  until the tab was reloaded.
- **Found:** 2026-06-10 by the user during the theming-foundation visual pass (pre-existing on main).
- **Fixed:** 2026-06-10 on `feature/theme-foundation` — the bind is a function binding falling back
  to the seeded expanded default; same treatment on the weapon attack sidebar. Regression-locked by
  `tests/e2e/sheet-regressions.spec.js` ("adding a check while the sheet is open").

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
- **Found:** 2026-06-10 by the user (aspect options); pinned by the extended localization e2e guard,
  which now walks every spell tab with enabled aspects plus the casting-check dialog.
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
  actor's sheet, with an assert guard. Regression-locked in `tests/e2e/sheet-regressions.spec.js`.

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
