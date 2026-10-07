# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

### 92. A world actor, token or pack holding a base-type Active Effect fails to load

- **What:** TITAN registers only the `effect` and `condition` Active Effect types.
  `src/hooks/OnceInit.js` sets `CONFIG.ActiveEffect.dataModels` to `{ effect, condition }`, replacing core's
  `{ base: ActiveEffectTypeDataModel }`, so the client cannot construct a base-type Active Effect (`changes is not
  iterable` in core's `_shimChanges`). Measured live: `createEmbeddedDocuments` with a base-type effect creates
  nothing and raises no error; a world actor holding one stops the world from loading (`game.ready` never set, page
  error from `trackCollectionFailures`); a packed actor holding one loads with the effect in `invalidDocumentIds`, and
  deleting that effect throws and leaves it stored.
- **Found:** 2026-09-30 by the Task 5 fix round (plan B), measured live.
- **Status:** Not handled in code by user decision 2026-09-30 (local worlds cleaned one-off).

### 102. Clearing expired effects on an unlinked token with no stored delta does not survive a reload

- **Reported:** On an unlinked token, removing an Item the token inherits from its base actor did not persist across
  a reload, even with Migration Mode Disabled. The user confirmed it is a bug.
- **Measured, with tokens built from raw data only:** probes in `test-titan` created each scene and token in code.
  The scene was never viewed, there was no canvas drop and no unlink click, and every write ran in one scripted
  burst. A token named like its base actor stored `delta: null`. On such a token, a create or delete of two or more
  embedded documents through `token.actor` was missing after a reload, and so was every later delta write until the
  Token record was written. One-document calls, updates, and calls after the delta existed were stored. Under the
  real-data rule (`docs/TODO.md`) none of this is evidence about Foundry's behaviour until it is re-run the real way.
- **Read in core, not run:** `client/documents/token.mjs:1657` gives a newly created unlinked token a delta only when
  its name differs from the base actor's. Changing `actorLink` on an existing token goes through `:2032` instead.
- **Contradicting observation (user):** on real tokens, bulk Clear Expired Effects and single-value edits persist.
- **Real-flow repro, measured (`test-titan`, E2E GM 1, 4 runs, no synthetic documents):**
  - **How the documents were made:**
    - The scene, the actors and their effects were made through the UI.
    - Each effect had a "Turn Start" duration with 1 remaining, and was expired by running a Combat Tracker combat on
      linked tokens.
    - Token (a) was a canvas drop of an actor whose prototype token was set unlinked, with the default name.
    - Token (b) was a linked token unlinked with the Token config toggle, with its sheet reopened.
  - **Before the clear:** both tokens stored `delta: null`.
  - **The clear:** Clear Expired Effects, run from the sheet, sent one `modifyDocument` ActiveEffect `delete` of both
    ids with parent `Scene.<id>.Token.<id>.ActorDelta.<id>`.
  - **The server reply:** `result` held both ids, with no error (websocket capture, run 4).
  - **What was stored:** the token's `delta` was still `null` on reads right after the clear and 2 s later, and after
    a reload. The client showed the effects removed until the reload, then both were back. The base actor kept both
    effects throughout.
  - **Evidence:** `.superpowers/sdd/2026-09-29-conditions-rework/repro102b/` (`run1.log` to `run4.log`, `shots/`).
  - An earlier run whose actors and effects were made through the document API gave the same result (`repro102/`).
- **Cause:** unknown. Not attributed to Foundry core or to TITAN. TITAN's clear is one batch
  `deleteEmbeddedDocuments('ActiveEffect', ids)` on the token's actor (`CharacterDataModel.js:4870-4883`, read).
- **Follow-up, measured the same way (3 runs each, websocket frames in all; `repro102b/c1.log`-`c3.log`):**
  - **One effect deleted** with its row button on a `delta: null` token is stored: a delta with one tombstone,
    present right after the delete and after a reload.
  - **The clear on a token whose delta already exists** is stored. The delta was created first by a real edit, a
    Stamina change on the token sheet. Both tombstones were present right after the clear and after a reload.
  - **The request shape is the same in all three cases:** one `ActiveEffect` `delete` with the same parent and a
    success reply. Only the number of ids and whether a delta already existed differ.
  - **Inferred, not proven:** only a delete of two or more documents on a token with no stored delta is lost. This
    fits the user's report that bulk clears persist on tokens that have been edited.
- **Next measurement:** the same steps in `test-pf2e`, which does not load TITAN, to separate a TITAN cause from a
  Foundry one.
- **Found:** 2026-10-01 while the Task 5 fix round 2 identity e2e (plan B) was seeding its tokens.
- **Status:** Open. Reproduced through real flows; cause not yet located.

### 106. `player-hud-visibility.spec.js` leaves tokens whose actors it deleted

- **What:** After the spec runs (also when it runs alone), the world still holds the unlinked `HUD Vis NPC` token and
  three linked tokens, all on scenes, whose actors are gone. `deleteFixtureActor` alone does remove a placed token
  (measured), so the leak comes from another part of the spec's setup or cleanup. The cause has not been diagnosed.
  A leaked orphan with pending migration work would count as a migration failure in later specs (#105).
- **Found:** 2026-10-01 by an orphan census after the Task 5 fix round 3 full e2e (654 passed).
- **Status:** Open. Fixed together with the conversion of the e2e specs to real Foundry data (`docs/TODO.md`). The four
  orphans in `test-titan` (`HUD Vis Player`, `HUD Vis NPC`, `HUD Vis Player 2`, `HUD Vis Owned`, all on
  `E2E Player HUD Scene`) were removed on 2026-10-01 with that scene by `node tests/e2e/census.js --sweep`; the census
  after it counted 0 orphaned tokens (measured). The full e2e run that followed left the same four tokens on the
  re-created scene (`node tests/e2e/census.js` after it: 4 orphaned tokens, measured).

### 108. `TitanActor#getCombatant` uses a core API that is deprecated and removed in v15

- **What:** `src/document/types/actor/TitanActor.js:83` calls `game.combat?.getCombatantByActor(this.id)`. Foundry
  logs a deprecation warning: deprecated since v14 and removed in v15 (measured console warning in the #102 repro).
  The call passes `this.id`; for a token's synthetic actor that is the base actor's id (read), the same identity
  pattern as CLOSED_BUGS #104. Whether it then finds the wrong combatant has not been measured.
- **Found:** 2026-10-01 during the #102 real-flow repro.
- **Status:** Open.

### 109. A token sheet may highlight the Skills tab while showing the Effects tab (unconfirmed)

- **What:** screenshots from the #102 real-flow repro show the tab strip still highlighting "Skills" after
  Effects was clicked, while the Effects content shows (`repro102b/shots/run1-*-after-reload.png`,
  `run3-*-A-before-clear.png`). A later re-render highlights Effects correctly. It has not been determined whether this
  is a real defect or screenshot timing.
- **Found:** 2026-10-01 during the #102 real-flow repro.
- **Status:** Open; unconfirmed until reproduced.

### 110. A condition effect whose rules elements a GM edited may be overwritten by migration (unconfirmed)

- **What, read, not run:** the Active Effect sheet's Rules Elements tab
  (`src/document/types/active-effect/sheet/ActiveEffectSheetTabs.svelte:28`) does not gate on effect
  type. `getConditionEffectUpdate` (`src/helpers/migration/SyncConditionEffects.js:41-71`) marks a condition effect
  stale when its stored rules elements differ from the condition's definition. `storedActorNeedsMigration` includes
  that check. So a hand-edited condition effect may make every Prompt or Automatic GM load prompt for migration, and
  then have its edits overwritten. No document says this is intended.
- **Found:** 2026-10-01 by a plan reviewer reading the code (Task 5 fix round 4 plan review).
- **Note (read, not run):** TITAN's Active Effect sheet, which has the Rules Elements tab, is registered for the
  `effect` subtype only (`src/hooks/OnceInit.js:247-251`). A condition may therefore open core's config instead, and
  this trigger path may not exist as written.
- **Status:** Open. The user deferred it on 2026-10-01 to a future document inheritance campaign
  (`docs/TODO.md`). For now GMs may edit a condition's rules elements.

### 111. A condition's description edited in its sheet is ignored by the HUD and chat reports

- **What, read, not run:**
  - The Player HUD's effect detail shows an Open Sheet button for conditions too
    (`src/ui/player-hud/elements/effects-panel/EffectsDetailBody.svelte:86-92`).
  - TITAN's Active Effect sheet is registered for the `effect` subtype only (`src/hooks/OnceInit.js:247-251`, read).
    So a condition most likely opens core's `ActiveEffectConfig`, whose Details tab edits the native `description`
    (`templates/sheets/active-effect/details.hbs:3`). Read, not run: which sheet opens at runtime has not been
    observed.
  - The HUD shows the definition text for a non-effect (`EffectsDetailBody.svelte:28-32`).
  - Turn-start reports carry the condition's `descriptionKey`
    (`src/document/types/actor/types/character/CharacterDataModel.js:5590-5605`).
  - So the edit is never shown.
- **Found:** 2026-10-01 by a reviewer of the test-suite rewrite plan.
- **Status:** Open. The user deferred it on 2026-10-01 to the document inheritance campaign (`docs/TODO.md`), together
  with #110.

### 114. Deactivating the viewed scene while a status's scrolling text is on screen throws

Core citations below refer to Foundry 14.364 at `C:\FoundryVTT\V14\dev\foundry`, the build the server runs
(`probe114-status-wait.json` records `game.release` as 14.364). The evidence files named here are in
`.superpowers/sdd/test-suite-rewrite/phase-0/` (local and not checked in).

- **Measured** (probe, `test-titan`, logged in as E2E GM 1, TITAN loaded):
  - Setup: a token's actor gains a status (`toggleStatusEffect`), which starts the 2 s scrolling text. The viewed
    scene is then deactivated at once (`scene.update({ active: false })`).
  - Result: the page throws `TypeError: Cannot read properties of null (reading 'off')` at `PreciseText.destroy` ←
    `InterfaceCanvasGroup.createScrollingText` (`client/canvas/groups/interface.mjs:174`) (`probe114-status.json`).
- **Destroy sequence, measured** (`probe114-status.json`, `probe114-core.json`): the scrolling text is destroyed
  twice. A wrapper on `PreciseText.prototype.destroy` recorded each call's stack:
  1. The deactivation runs `Scene.unview` → `Canvas.draw` → `Canvas.tearDown` → `InterfaceCanvasGroup.tearDown`.
     Read: the group's `_tearDown` destroys every non-layer child with its children
     (`client/canvas/groups/canvas-group-mixin.mjs:172-177`, `tearDownChildren = true` at `:35`).
  2. Read: `Canvas.tearDown` first terminates the running animations (`client/canvas/board.mjs:1326`), which resolves
     the fade-in that `createScrollingText` awaits, so it starts the scroll animation
     (`client/canvas/groups/interface.mjs:211-230`). Measured: a console error `TypeError: Cannot read properties of
     null (reading 'position')` at `set y` ← `#updateAttribute` ← `#animateFrame`. Read: `#animateFrame` catches the
     error and rejects the animation (`client/canvas/animation/canvas-animation.mjs:270-271`), and `animate` logs it
     (`:159`), so the awaited promise settles.
  3. `createScrollingText`'s clean-up removes the text (`interface.mjs:234`) and calls `text.destroy()` a second time
     (`:235`). Measured: the second call sees `destroyed === true` and `_texture === null`, and throws the `'off'`
     page error.
- **Measured, bearing on attribution:**
  - A direct core call, `canvas.interface.createScrollingText(...)` followed by deactivating the scene, throws the
    same error with the same destroy sequence (`probe114-core.json`). No TITAN document is involved.
  - The status-toggle trigger gives the same sequence (`probe114-status.json`).
  - Every frame in both destroy stacks and in both error stacks is `foundry.mjs`, `pixi.min.js`, or the probe wrapper.
  - Read: TITAN's `src/` has no PIXI or prototype patch and no canvas tear-down hook, and `dist/index.js` has no
    reference to `createScrollingText`, `InterfaceCanvasGroup` or `tearDownChildren` (`fix5-grep-114-titan.txt`).
- **Not run:** a control in a world without TITAN. Every measurement above ran with TITAN loaded, so attribution to
  core is not confirmed. The user will run that control.
- **Controls, measured:** with a 2.6 s wait before the deactivation, the text is destroyed once, from
  `createScrollingText`, and nothing throws. This holds for the core call (`probe114-core-wait.json`) and for the
  status toggle (`probe114-status-wait.json`).
- **Found:** 2026-10-01 while writing the gate test of CLOSED_BUGS #113 (test-suite rewrite, Phase 0 fix round 1).
- **Status:** Open; attribution awaits the no-TITAN control. TITAN does not patch core. The #113 gate test waits until
  no animation runs on `canvas.interface` before it deactivates the scene. Measured without that wait: the spec failed
  with this error in 6 of 6 runs (`fix5-mut114-no-scrolling-text-wait-run1.log` to `-run6.log`).
  Under the 1 s poll rule the wait cannot last the 2 s of the animation, so the last test of
  `condition-description.spec.js` reloads the page first (a reload ends the animations) and then deactivates the scene;
  the earlier wait for the animation to end is gone.

### 122. `addCheck` once stored the default label "Check" instead of the typed one

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).

- **What:** in one full e2e run, `addCheck` (`tests/e2e/flows.js`) failed at the label step on the sixth check of the
  `bulkActor` fixture: expected "E2E Bulk Check 5", stored "Check" (`phase-3/e2e-full.log`, failure 1).
- **Not reproduced:** 0 failures in 10 runs of `armor-trait-situations`, `attack-tags` and `character-sheet-layout` in
  full-suite order, without the wait added afterwards (`phase-3/layout-nowait-1.log` to `-10.log`,
  `layout-nowait-summary.txt`); 0 in 4 isolated runs of the layout spec (`layout-rerun-1.log` to `-4.log`); 0 in the
  two later full runs (`e2e-full-2.log`, `e2e-full-3.log`).
- **Cause (measured, 2026-10-07, CLOSED_BUGS #131):** in 8 samples of the Add Check button the new check's count showed
  0 to 4 ms after the click, with 2 operations pending at that moment, and the pending count reached 0 at 17 to 31 ms
  (`phase-3/measure-settle.log`, line `OPTIMISTIC`; script `phase-3/scripts/measure-settle.spec.js`); typing in that
  window is undone by the echo. `addCheck` and the other add flows now wait for the pending operations to finish
  (`settle`). The failure recurred once before that change (`e2e-r2-gate-1.log`) and did not in the 12 runs after it
  (2 full, 10 of the layout set); that is too few to call it fixed, so the entry stays open.
- **Found:** 2026-10-02 in Phase 3 Part A.
- **Status:** Open.

### 128. A typed check label was once stored as the default "Check" in the drag spec's fixture

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).

- **What:** in one full e2e run, the `beforeAll` of `drag.spec.js` failed in `fillList` for the `check` list: the
  stored labels were "E2E Drag Source Check 1", "Check", "E2E Drag Source Check 3" where the second was typed
  (`e2e-full-fix.clean.txt`, failure 2). This is the second occurrence of a typed check label stored as "Check"
  (first: #122).
- **Shared mechanism, read:** both are a `fill` plus `blur` on a check label input followed by a later check on the stored
  value; `fillList` filled all rows and polled once at the end, while `addCheck` (after #122) waits for the rows to
  render and polls per field. **Inferred, not measured:** an update from the previous row's commit re-renders the list
  and resets a later row's input before it commits.
- **Not reproduced:** 0 failures in 3 later full runs of the file (`drag-fix-1.log` to `drag-fix-3.log`).
- **Cause and mitigation:** the same race as #122: the local state shows the new row before the server echo, and the
  echo's re-render resets text typed in that window. `fillList` and the attack-label loop poll each row, and the add flows
  now `settle` (CLOSED_BUGS #131). Not reproduced in 10 runs (`final-dist-run-1.log` to `-10.log`) and 9 runs
  (`final2-dist-run-1.log` to `-9.log`) of the 86 tests of the sheet list specs and `drag.spec.js` on the round 3 code,
  nor in 3 full runs of 655 tests on the round 4 code (`e2e-r4-gate-1.log`, `-2.log`, `-3.log`).
- **Found:** 2026-10-02 in the Part B review fixes.
- **Status:** Open.

### 129. `condition-description.spec.js` "with no scene active, the fixture token is placed on a fully drawn fallback scene" once found no Token HUD

- **What:** in one full e2e run the test failed at `condition-description.spec.js:343`: after a right-click on the placed
  token, `#token-hud` was not found within 5 s (`e2e-full-fix.clean.txt`, failure 1). The spec is not touched by Part B.
- **Not reproduced:** 0 failures in 3 isolated runs of the file (`cd-fix-1.log` to `cd-fix-3.log`).
- **Also not reproduced:** 0 failures in 20 further runs of the file (`reverify-run-1.log` to `-10.log`,
  `reverify2-run-1.log` to `-10.log`) and in 5 full runs (`e2e-r2-1.log`, `e2e-r2-gate-1.log`, `-2.log`,
  `e2e-r2b-gate-1.log`, `-2.log`); its 10 s scrolling-text wait was replaced by a reload in the same period, so the
  runs do not test the original code.
- **Cause not located.**
- **Found:** 2026-10-02 in the Part B review fixes.
- **Status:** Open.
