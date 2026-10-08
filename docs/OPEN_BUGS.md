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
- **Inventory, 2026-10-08 (measured):** zero Active Effects of a type other than `effect` or `condition` in `soresokai`
  (offline read of a copy of its LevelDB; the world was not logged into), `test-titan` (client, raw `_source`, E2E GM
  1), the system pack, the 11 compendium-module packs, the world pack, and the pack source JSON. Nothing was
  converted or backed up because there was nothing to convert. Positive control: the same scanner with `effect`
  counted as foreign returned 6 hits on `soresokai` actors, 2 on its scenes and 17 on the system pack. Logs:
  `.superpowers/sdd/test-suite-rewrite/non-titan-effects/` (`inventory.json`, `inventory-offline.log`,
  `inventory-test-titan-before.log`, `inventory-source-json.log`).
- **Re-measured creation, 2026-10-08 (`probe-analysis.log`, `probe-drop.log`, one throwaway actor, deleted):**
  - `createEmbeddedDocuments` and `ActiveEffect.create` with `{type: 'base'}` and no `changes` store nothing, resolve
    empty, and raise an error notification and a hook error (`changes is not iterable`). The 2026-09-30 note that no
    error is raised is wrong about the notification.
  - A base effect that carries `changes` (top-level or `system.changes`, as any foreign export does) builds as a
    `TitanActiveEffect` with a plain-object `system`, passes `fromDropData`, and reaches `preCreateActiveEffect`
    (a veto hook stopped it there; nothing was stored). So the client would send it; that the server stores it, and
    that the stored effect then stops the world loading, is inferred from the 2026-09-30 measurement, not re-run.
- **Effect of the core-model inheritance, 2026-10-08 (`.superpowers/sdd/2026-10-01-test-suite-real-data/ae-mixin/`):**
  `TitanActiveEffectDataModel` and `ConditionDataModel` now extend core's `ActiveEffectTypeDataModel` (through
  `TitanDataModelMixin`) instead of redefining `changes`. `CONFIG.ActiveEffect.dataModels` still holds only `effect` and
  `condition`, so a `base`-typed effect is still unconstructable and everything above is unchanged. What changed: a
  foreign effect whose `changes` are core-valid now stores its changes on an `effect`/`condition` model without loss,
  and registering core's model for `base` (`dataModels.base = foundry.data.ActiveEffectTypeDataModel`) needs no schema
  work. Not done: that registration is a separate decision.
- **Status:** Open. Not handled in code by user decision 2026-09-30; the existing local worlds hold none (inventory
  above). Fix options and the schema-compatibility analysis:
  `.superpowers/sdd/2026-10-01-test-suite-real-data/non-titan-effects-report.md`.

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

### 109. A token sheet may highlight the Skills tab while showing the Effects tab (unconfirmed)

- **What:** screenshots from the #102 real-flow repro show the tab strip still highlighting "Skills" after
  Effects was clicked, while the Effects content shows (`repro102b/shots/run1-*-after-reload.png`,
  `run3-*-A-before-clear.png`). A later re-render highlights Effects correctly. It has not been determined whether this
  is a real defect or screenshot timing.
- **Found:** 2026-10-01 during the #102 real-flow repro.
- **Status:** Open; unconfirmed until reproduced.

### 110. A condition effect whose rules elements a GM edited is overwritten by migration

- **What, read, not run:** the Active Effect sheet's Rules Elements tab
  (`src/document/types/active-effect/sheet/ActiveEffectSheetTabs.svelte:28`) does not gate on effect
  type. `getConditionEffectUpdate` (`src/helpers/migration/SyncConditionEffects.js:41-71`) marks a condition effect
  stale when its stored rules elements differ from the condition's definition. `storedActorNeedsMigration` includes
  that check. So a hand-edited condition effect may make every Prompt or Automatic GM load prompt for migration, and
  then have its edits overwritten. No document says this is intended.
- **Found:** 2026-10-01 by a plan reviewer reading the code (Task 5 fix round 4 plan review).
- **Measured, 2026-10-07 (after the #111 fix made the condition effect open TITAN's own sheet):** with the world's
  `migrationMode` at its default `prompt`, a Blinded effect applied from the Token HUD held 4 rules elements. A
  reload of the GM client showed no migration dialog (control). The Rules Elements tab of the effect's own sheet
  (class `titan-condition-sheet`) added a fifth element through the add button (the `addRulesElement` flow), and the
  next reload of the GM client showed the "Migrate World" confirmation dialog. Confirming it left the effect with 4
  rules elements again, so the edit was overwritten (`.superpowers/sdd/test-suite-rewrite/bug-111/measure-110-run1.log`
  and `measure-110-run2.log`; run 1 read 5 after the dialog appeared; run 2 clicked "Migrate World" and read 4; the saved
  scratch spec `measure-110.spec.js.txt` is run 2's script, and run 1's script is not saved). Not measured: editing an existing element instead
  of adding one.
- **Status:** Open, tabled by the user on 2026-10-07. The user deferred it on 2026-10-01 to a future document
  inheritance campaign (`docs/TODO.md`). For now GMs may edit a condition's rules elements, and the next migration
  overwrites the edit.

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
  `combat-turns.spec.js` reloads the page first (a reload ends the animations) and then deactivates the scene;
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
  nor in 3 full runs of 655 tests on the round 4 code (`e2e-r4-gate-1.log`, `-2.log`, `-3.log`) and 1 of 653 tests on
  the round 5 code (`e2e-r5-gate-1.log`).
- **Found:** 2026-10-02 in the Part B review fixes.
- **Status:** Open.

### 129. A right-click on a placed token sometimes opens no Token HUD (`#token-hud` not found)

The Phase 4 evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-4/` (local, not checked in).

- **What:** in one full e2e run `condition-description.spec.js` "with no scene active, the fixture token is placed on a
  fully drawn fallback scene" (now the last test of `combat-turns.spec.js`) failed at line 343 of the former file: after
  a right-click on the placed token, `#token-hud` was not found within 5 s (`e2e-full-fix.clean.txt`, failure 1). That
  run used the former `condition-description.spec.js`, which is deleted.
- **Not reproduced (Part B):** 0 failures in 3 isolated runs of the file (`cd-fix-1.log` to `cd-fix-3.log`), in 20
  further runs of the file (`reverify-run-1.log` to `-10.log`, `reverify2-run-1.log` to `-10.log`) and in 5 full runs
  (`e2e-r2-1.log`, `e2e-r2-gate-1.log`, `-2.log`, `e2e-r2b-gate-1.log`, `-2.log`); its 10 s scrolling-text wait was
  replaced by a reload in the same period, so the runs do not test the original code.
- **Same symptom in Phase 4 (2026-10-07), measured:** `applyCondition` and `removeCondition` as they were before
  `restOnToken` (`hoverToken` moved the pointer in from outside the token and polled the token's `hover` flag, read in
  `git show 21386edf^:tests/e2e/flows.js`; the right-click followed once `hover` was true) failed in 21 of 240 toggles
  on the first token placed in the scene (`scratch-hud.json`): in 7 the right-click opened no HUD, in 8 the closing
  left-click left the HUD open, and 6 later toggles failed their "condition is on before the click" check as a result.
  The file holds only the state after each failure (`hover` false, no token controlled, no HUD), not the state before
  the click. That is the only saved run of the unchanged earlier flow. Three later runs of 240 toggles used other flows
  and also failed 0 times, so they do not show that the earlier flow stopped failing:
  - a probe (`hud-probe-run1.json` to `-run3.json`, spec `hud-probe.spec.js.txt`) that differs from the earlier flow in
    running a `page.evaluate` round trip (reading `hover`, the manager state and the controlled tokens) before every
    right-click and closing click, in releasing control with `canvas.tokens.releaseAll()` instead of the flow's
    `releaseTokenControl`, and in never calling `showChatLog`;
  - the flows with `restOnToken` and its two-frame wait (`scratch-hud3-run1.json` to `-run3.json`), then without the
    wait (`hud-flows-nopad-run1.json` to `-run3.json`, spec `hud-flows.spec.js.txt`).
  A pre-click delay of the probe's kind and `restOnToken` are alike in giving the canvas time before the click
  (inferred), so these runs cannot separate "the drop needs no cure" from "a pre-click delay prevents it".
- **Earlier flow rerun without recording, 2026-10-07 (fix round 3), measured:** the real `applyCondition` and
  `removeCondition` with the chat-tab activation and the closing-click re-entry removed (the earlier `hoverToken` and
  closing click; no `page.evaluate` before any click; spec `hud-flows.spec.js.txt`), 3 runs of 240 toggles on the first
  placed token: 1 failure in 720 (run 1, toggle 94, `stunned` remove: the closing left-click left the HUD open;
  `hud-flows-prefix-run1.json` to `-run3.json`, logs `hud-flows-prefix-run1.log` to `-run3.log`). The 21 of 240 of
  `scratch-hud.json` did not recur on this flow. No cause is claimed.
- **Cause not located.** An unrelated cause of failed Token HUD flows, a chat card over the token, was found and fixed
  (CLOSED_BUGS #134); nothing measured connects it to this symptom.
- **Found:** 2026-10-02 in the Part B review fixes; the second measurement 2026-10-07.
- **Status:** Open.

### 136. Deleting a weapon with its actor sheet open on Inventory once threw two "reading 'remove'" page errors

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-4/` (local, not checked in).

- **What:** in one scratch run (variant `c`), with the actor sheet open on the Inventory tab and an Attack Check dialog
  opened by `actor.system.requestAttackCheck`, deleting the weapon closed the dialog and threw two "Cannot read
  properties of undefined (reading 'remove')" page errors (`scratch-13.log`, `scratch-delete.json`; the stack was not
  kept).
- **Not reproduced:** the setup of the first run was rebuilt (spec saved as `variant-c.spec.js.txt`; the first run's own
  setup differed in details that were not saved) and threw no page error in 10 of 10 runs on the code of the final build
  (`variant-c-final.log`: commit `f9a69009` plus the removal of the shells' info notice that became `a44e43ef`; the tree
  hash was not recorded), in 10 of 10 on the code before the fixes of CLOSED_BUGS #133 and #135
  (`variant-c-prefix-all.log`: the working tree of commit `a44e43ef` with the item buttons' guard removed, the shells'
  `validate` reporting restored and the info notice restored by `sed`; the tree hash was not recorded), and in 3 of 3
  with the dialog opened from the item sheet's roll button (`scratch-variant-c-after2.log`).
- **Cause not located.**
- **Found:** 2026-10-07 while rewriting the Phase 4 delete tests.
- **Status:** Open.

### 140. A context menu of the Compendium directory stayed open after its entry was clicked (spreadsheet spec, one run)

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-6/` (local, not checked in).

- **What:** in the first run of `compendium-spreadsheet.spec.js` after its rewrite, the test 'deleteMissing removes a
  top-level pack document absent from the imported file' failed at `contextMenu.js:22`
  (`expect(page.locator('#context-menu')).toHaveCount(0)`: expected 0, received 1 for 1000 ms), reached through
  `choosePackMenuEntry` (spec :70) and `openImport` (spec :204) while choosing 'Import Spreadsheet' on a pack
  (`sheet-1.log`). The next test then failed in the `beforeAll` that the worker restart re-ran: `createActor`
  found 2 directory entries named 'E2E Original NPC' instead of 1 (`flows.js:80`), and the page reported "The Compendium
  pack e2e-spreadsheet-source already exists in the World and cannot be created" (`sheet-1.log`). Read from the spec:
  the first `beforeAll` had already made both, so the re-run duplicated them.
- **Not reproduced:** the immediate re-run passed 17 of 17 (`sheet-2.log`), the full run passed 656 (`e2e-full-1.log`),
  and 10 separate runs of the spec passed 18 of 18 each (`drag-hunt/sheet-run-1.log` to `sheet-run-10.log`).
- **Cause not located.** Whether the entry click did not land or the menu was re-opened is not measured.
- **Found:** 2026-10-07 during Phase 6 Part A.
- **Status:** Open.

### 143. The first scene's creation dialog stayed open in one isolated run of `chat-cards.spec.js`

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-6/` (local, not checked in).

- **What:** run alone, `chat-cards.spec.js` failed in its `beforeAll` once: `createFromDirectory` (`flows.js:74`)
  expected the scene creation dialog count to be 0 and received 1 for 1000 ms, reached through `createScene` and the
  `scene` shared fixture (`chat-cards.spec.js:93`); the other tests did not run (`drag-hunt2/chat-cards.log`).
- **Not reproduced:** 5 other isolated runs passed (`drag-hunt/chat-cards.log`, `scene-first/chat-cards-1.log` to
  `-3.log`, `drag-hunt2/chat-cards-rerun.log`), and the spec passed in every full run.
- **Cause not located.**
- **Found:** 2026-10-08 during Phase 6 Part A.
- **Status:** Open.
