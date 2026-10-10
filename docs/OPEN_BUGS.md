# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

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

### 122. `addCheck` once stored the default label "Check" instead of the typed one

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-3/` (local, not checked in).
Files cited as `bugbatch1-logs/...` are in `.superpowers/sdd/2026-09-29-conditions-rework/` (local, not checked in).

- **What:** in one full e2e run, `addCheck` (`tests/e2e/flows.js`) failed at the label step on the sixth check of the
  `bulkActor` fixture: expected "E2E Bulk Check 5", stored "Check" (`phase-3/e2e-full.log`, failure 1).
- **Not reproduced:** 0 failures in 10 runs of `armor-trait-situations`, `attack-tags` and `character-sheet-layout` in
  full-suite order, without the wait added afterwards (`phase-3/layout-nowait-1.log` to `-10.log`,
  `layout-nowait-summary.txt`); 0 in 4 isolated runs of the layout spec (`layout-rerun-1.log` to `-4.log`); 0 in the
  two later full runs (`e2e-full-2.log`, `e2e-full-3.log`).
- **Cause (measured, 2026-10-07, CLOSED_BUGS #131):** in 8 samples of the Add Check button the data model's check
  count (`item.system.check.length`, read by the script; not a DOM row) showed the new check 0 to 4 ms after the click,
  with 2 operations pending at that moment, and the pending count reached 0 at 17 to 31 ms
  (`phase-3/measure-settle.log`, line `OPTIMISTIC`; script `phase-3/scripts/measure-settle.spec.js`); typing in that
  window is undone by the echo. Read: the model shows the check at once because `CheckListMixin.addCheck` pushes into
  the live model before it sends the update (`src/document/types/item/CheckListMixin.js:27-32`). `addCheck` and the
  other add flows now wait for the pending operations to finish (`settle`). The failure recurred once before that
  change (`e2e-r2-gate-1.log`) and did not in the 12 runs after it (2 full, 10 of the layout set); that is too few to
  call it fixed, so the entry stays open.
- **Helper gap closed (2026-10-08):** `addCheck` counted the checks and read each stored field through `fromUuid`, the
  client's model, which already holds a check at the click and a typed label at the `input` event, so neither read
  showed that the server stored them. `addCheck` now reads the count and every stored field with `readServerSystem`
  (the server's copy). Measured with the product mutated so `DocumentTextInput`'s `updateDocument` sends nothing
  (hashes in `bugbatch1-logs/mut122-hashes.log`, restored to the HEAD blob `a1f02a08`): the previous `addCheck` passed
  and left the server holding the label "Check" while the client model held "E2E Old Label"; the current `addCheck`
  failed on its label read (expected "E2E New Label", received "Check") (`bugbatch1-logs/mut122-run-mutated.log`).
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
- **Cause and mitigation:** the same race as #122: the data model holds the new check before the server echo (not a DOM
  row; see #122), and the echo's re-render resets text typed in that window. `fillList` and the attack-label loop poll
  each row, and the add flows now `settle` (CLOSED_BUGS #131). Not reproduced in 10 runs (`final-dist-run-1.log` to `-10.log`) and 9 runs
  (`final2-dist-run-1.log` to `-9.log`) of the 86 tests of the sheet list specs and `drag.spec.js` on the round 3 code,
  nor in 3 full runs of 655 tests on the round 4 code (`e2e-r4-gate-1.log`, `-2.log`, `-3.log`) and 1 of 653 tests on
  the round 5 code (`e2e-r5-gate-1.log`).
- **Found:** 2026-10-02 in the Part B review fixes.
- **Status:** Open.

### 129. A right-click on a placed token sometimes opens no Token HUD (`#token-hud` not found)

The Phase 4 evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-4/` (local, not checked in).
Files cited as `bugbatch1-logs/...` are in `.superpowers/sdd/2026-09-29-conditions-rework/` (local, not checked in).

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
- **Throttled repeat of the current flows, 2026-10-08, measured (`bugbatch1-logs/diag-C-newC-r1.jsonl` to `-r6.jsonl`,
  `diagC-newC-r1.log` to `-r6.log`):** a throwaway spec created the first scene, an actor and a token through the
  flows, then ran 240 `applyCondition`/`removeCondition` toggles on that first token (40 rounds of `offBalance`,
  `stunned`, `blinded`, each on then off) with the page's CPU throttled through CDP at rate 1, 2, 4 and 6: 0 failures
  in each of the four runs (960 toggles); the slowest toggle took 848, 885, 1010 and 1598 ms. The earlier flow that
  failed 21 of 240 toggles was not run in this setting, so the runs do not show that the helper rewrite is what
  removed the failures.
- **Cause not located.** An unrelated cause of failed Token HUD flows, a chat card over the token, was found and fixed
  (CLOSED_BUGS #134); nothing measured connects it to this symptom.
- **Found:** 2026-10-02 in the Part B review fixes; the second measurement 2026-10-07.
- **Status:** Open.

### 136. Deleting a weapon with its actor sheet open on Inventory once threw two "reading 'remove'" page errors

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-4/` (local, not checked in).
Files cited as `bugbatch1-logs/...` are in `.superpowers/sdd/2026-09-29-conditions-rework/` (local, not checked in).

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
- **Page errors keep their stack (2026-10-08):** `attachPageErrors` and the hook-error report now collect
  `error.stack` (the message when there is none); the earlier harness kept `error.message` only, so no run could have
  saved a stack. Measured with a throwaway page that threw in a timer: the collected entry was
  `Error: E2E diag stack probe\n    at throwsLater (...)` (`bugbatch1-logs/stack-capture-probe.log`). The hook-error
  path (`Hooks.onError`, `error?.stack`) was measured the same way with a listener that throws in a hook called from
  the page: the collected entry was `Hooks.onError (E2E probe location): Error: E2E hook error probe\n    at
  hookThatThrows (...)` (`bugbatch1-logs/hook-stack-probe.log`, `bugbatch1-logs/diag-hook-stack.jsonl`). The source
  frames of a minified stack map through `dist/index.js.map`.
- **Not reproduced with stacks enabled (2026-10-08), measured:** 30 of 30 runs of the saved variant-c flow (real
  actor, weapon dragged onto it, Inventory tab, `requestAttackCheck`, Delete Item button, `confirmDeletingItems` off,
  `expect(errors).toEqual([])` per run) threw no page error (`bugbatch1-logs/diag136-loop30.log`, spec in the
  scratchpad directory, not committed).
- **Cause not located.**
- **Found:** 2026-10-07 while rewriting the Phase 4 delete tests.
- **Status:** Open.

### 140. A context menu of the Compendium directory stayed open after its entry was clicked (spreadsheet spec, one run)

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-6/` (local, not checked in).
Files cited as `bugbatch1-logs/...` are in `.superpowers/sdd/2026-09-29-conditions-rework/` (local, not checked in).

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
- **Throttled repeat, 2026-10-08, measured (`bugbatch1-logs/diag-B-old-r1.jsonl` to `-r6.jsonl`, `diag-B-new-r1.jsonl`
  to `-r6.jsonl`):** a throwaway spec made a Compendium pack through `createCompendium`, right-clicked its entry,
  chose 'Import Spreadsheet' through `chooseContextMenuEntry` and closed all windows, 40 iterations per cell, with the
  page's CPU throttled through CDP at rates 1, 2, 4 and 6. The text of `createCompendium` from before this change (no
  trailing `settle`): 0 failures in 160 iterations. The current text (ends with `settle`): 0 failures in 160
  iterations. The failure was not reproduced under either, so the inference that the pack-creation render causes it is
  unconfirmed. `createCompendium` (and `createFolder`) now end with `settle`, a correct-by-construction change that is
  not shown to cure this bug.
- **Cause not located.** Whether the entry click did not land or the menu was re-opened is not measured.
- **Found:** 2026-10-07 during Phase 6 Part A.
- **Status:** Open.

### 143. The shared scene of `chat-cards.spec.js` failed to be created in isolated runs (dialog stayed open once)

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-6/` (local, not checked in).
Files cited as `bugbatch1-logs/...` are in `.superpowers/sdd/2026-09-29-conditions-rework/` (local, not checked in).

- **What:** run alone, `chat-cards.spec.js` failed in its `beforeAll` once: `createFromDirectory` (`flows.js:74`)
  expected the scene creation dialog count to be 0 and received 1 for 1000 ms, reached through `createScene` and the
  `scene` shared fixture (`chat-cards.spec.js:93`); the other tests did not run (`drag-hunt2/chat-cards.log`).
- **Seen a second time:** an isolated run of `chat-cards.spec.js` during Phase 6 Part B failed in its `beforeAll` with
  a `toHaveCount` failure (its stack was not read, and its log was overwritten by the next run, so no saved file shows
  it); the sweep of that run's teardown then deleted a scene that no flow had recorded.
- **Seen a third time, 2026-10-08:** the `beforeAll` of `base-effect.spec.js` failed in `createScene` at `flows.js:74`
  (`toHaveCount(0)` of the creation dialog, received 1 for 1000 ms) in one run, which ran with the base registration
  removed as a mutation (the scene is created before any base-effect work, so the mutation is inferred not to be the
  cause; not measured); the next run of the same code passed. The cited log
  (`.superpowers/sdd/2026-09-29-conditions-rework/bug92-logs/fix1/mut1-attempt1-flake143.log`) shows only the probe
  bundle's build, so whether the mutation had reached the system bundle in that run is not shown by it.
- **Not reproduced:** 5 other isolated runs passed (`drag-hunt/chat-cards.log`, `scene-first/chat-cards-1.log` to
  `-3.log`, `drag-hunt2/chat-cards-rerun.log`), and the spec passed in every full run.
- **Measured 2026-10-08, throwaway spec with the page's CPU throttled through CDP (rates 1, 2, 4, 6), first scene of a
  world with no active scene (it holds one inactive scene, so `active` and `viewed` were null before every run).** Texts
  named by commit: `e0a46d5d` (the text before this work), an intermediate text that was never committed (entry, record,
  polled draw wait, dialog), `249ccb24` (entry, record, dialog, polled draw wait: `waitForFunction`, 1000 ms) and
  `57ff347f` (entry, record, dialog, draw wait on the `canvasReady` hook, 1000 ms).
  - 20 pages in one process (`--repeat-each 20`), failures per 20 at rates 1, 2, 4, 6: `e0a46d5d` 1, 1, 15, 20;
    intermediate 0, 3, 20, 20; `249ccb24` 0, 0, 15, 20; `57ff347f` rate 4: 0, rate 6: 0 (not run at 1 and 2 in this
    form). All failures at rates 2 to 6 were the draw wait (`page.waitForFunction` timeout); the one at rate 1 was the
    creation dialog still open (`toHaveCount(0)` received 1) on the first page of the process
    (`diag-A-old-r*.jsonl`, `diag-A-new-r*.jsonl`, `diag-A-new2-r*.jsonl`, `diag-A-evt-r4.jsonl`, `-r6.jsonl`;
    `diag-A-old-r1.jsonl` also holds 2 earlier smoke lines).
  - The throttled draw-wait failures follow the polled wait, not the draw. The failure counts above are the
    before/after comparison: at rate 4 the polled draw wait failed 15 of 20 (`e0a46d5d` and `249ccb24`) and 20 of 20
    (intermediate text), the hook wait 0 of 20. The timings of the later probe (rate 4, 20 creations per wait
    mechanism) are medians: the wait started 417.5 (frame-aligned), 426.5 (`polling: 50`) and 426.5 ms (hook) after
    the click on OK; the `canvasReady` hook ran at 871.5, 865.5 and
    865.5 ms; the first state read that showed the scene drawn came at 1245.5 ms (frame-aligned) and 1233.5 ms
    (`polling: 50`). That read came a median of 358.5 and 364.5 ms after the hook (median of the per-creation
    differences; the difference of the two medians is 374 and 368 ms), the same lag for both polling intervals, so it is
    not the interval. 2 of the 20 frame-aligned waits lasted longer than 1000 ms (maximum 1067 ms), none of the 20
    `polling: 50` waits (maximum 908 ms), so those timings alone do not reproduce the 15 of 20 failures of the
    polled helper. The wait on the hook ended a median of 47 ms after the hook ran (maximum 51 ms) and the longest of
    its 20 waits lasted 552 ms (`diag-A3-raf-r4.jsonl`, `diag-A3-poll50-r4.jsonl`, `diag-A3-hook-r4.jsonl`; medians
    recomputed in `med-a3.log`). Core sets the canvas ready before it calls the hook (`board.mjs` `#initialize`,
    `#ready = true`, then the hook), so the state was already true at the hook; that a main thread busy after the hook
    delays the polled read is inferred (not measured). `waitForSceneDrawn` waits on the hook since `57ff347f`.
  - Event order from the click on OK, in 20 creations per run at no throttle (median, maximum), two runs
    (`diag-A-probe-old-r1.jsonl`, `diag-A-probe-new-r1.jsonl`, helper texts of those runs): the `createScene` hook 11.5
    (17) and 14.5 (20) ms, the directory entry 18.5 (24) and 21.5 (27) ms, the dialog gone 332.5 (358) and 333.5 (347)
    ms, `canvasReady` 392 (423) and 392 (408) ms; the dialog was gone before `canvasReady` in 40 of 40. At rate 4: the
    dialog gone 358 and 356.5 ms, `canvasReady` 921 (maximum 1461) and 890 (maximum 1084) ms.
  - 20 separate processes per cell (a cold first page each), rates 1 and 2, texts `e0a46d5d`, intermediate, the
    intermediate with the hook wait, and `57ff347f`: 0 failures in 160 processes (`diag-D-<text>-r1.jsonl`,
    `-r2.jsonl`, `diagD-<text>-r<rate>-<n>.log`; every line records `git hash-object tests/e2e/flows.js`, which was
    `ebced07ccbeb57cc022cbc23821685db00e88e3b` for all of them). The click-to-return time was a median of 929 to 1173 ms
    at rate 1 and 1244 to 1372 ms at rate 2 (maximum 1480 ms). The failure of the creation dialog at rate 1 in the
    single-process run was not reproduced, so the data does not separate the four texts and does not show that any of
    them avoids the dialog failure.
- **Dialog failure, still unexplained:** all earlier occurrences above and the one rate-1 failure were the creation
  dialog still open 1000 ms after the click returned. Core's close waits for the dialog's `transitionend` with a 1000 ms
  fallback (`application.mjs:982`, read), and the dialog was gone at a median of 332 to 437 ms per cell (maximum 473 ms)
  in the 40 unthrottled probe runs and the 160 separate processes, without a failure; a transition that did not end
  would leave the dialog until about 1000 ms (inferred, never observed).
- **Helper change:** `createFromDirectory` waits for the directory entry, records the document, waits for the dialog to
  close, then runs a `whenCreated` wait (`createScene` passes the draw wait when no scene was active, the flag core
  tests, `Scene._preCreateOperation`); the earlier text recorded after every wait, so a failed wait left a created
  document unrecorded (the second occurrence above), and the earlier `createScene` tested `game.scenes.viewed`. The
  order of the dialog and the draw wait is kept as `57ff347f` has it because the dialog is the earlier event (above);
  no run separates the orders.
- **Cause not located.**
- **Found:** 2026-10-08 during Phase 6 Part A.
- **Status:** Open.

### 154. An open pack-item sheet may keep its read-only state when only the pack's lock changes (unconfirmed)

- **What, read, not run:** the shell effect of `DocumentSheetShell` runs on `document.data.isOwner`, while
  `TitanDocumentSheet.syncDisabledControls` branches on `this.isEditable`, which also depends on `pack.locked`
  (core `document-sheet.mjs`). A change of `locked` alone does not change `isOwner`, and core re-renders the pack, not
  the open item sheet. So the controls of an open pack-item sheet would keep their disabled or enabled state when only
  the lock flips. The existing compendium spec flips the lock and the ownership together. The reviewer read this
  against the 14.368 install, not the 364 build the server runs, so the code paths need re-reading in 364.
- **Found:** 2026-10-09 by the final review of the #151 follow-up round.
- **Status:** Open; not reproduced.

### 175. Opening a pack item sheet writes to the locked compendium when a check's damageReducedBy is missing (Rapid Fire)

- **Measured:** the compendium content sweep (`compendium-content.spec.js`, items test) opened the pack entry sheet of
  the ability Rapid Fire and collected the page error `You may not update documents in the locked compendium
  "titan-vttrpg-compendium.abilities"` plus an error notification. The owned copy of the same ability opened without
  an error. 37 checks in the module's pack sources lack `damageReducedBy`.
- **Cause (read):** the check settings show `DocumentDamageReducedBySelect` only when a damage check has a resistance or
  opposed check (`ItemSheetCheckSettings.svelte`). `Select.svelte` clamps a value outside its options on mount and calls
  `onchange` (`Select.svelte:114-122`); the wrapper's `onchange` runs `refreshSystemDocument`, which calls
  `document.update` when `document.isOwner` (`RefreshSystemDocumentData.js`). A GM owns a locked pack document, so the
  update is attempted and core refuses it. Not verified: that the stored value is undefined at mount.
- **Found:** 2026-10-10 by the compendium content sweep.
- **Status:** Open; not fixed (a mount-time write on viewing a sheet needs a decision on where to guard).
