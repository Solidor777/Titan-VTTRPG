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

### 103. Deleting an item or effect without confirmation still tries to open the confirmation dialog

- **What:** `requestItemDeletion` and `requestEffectDeletion` (`CharacterDataModel.js:6331-6351`, `:6375-6396`)
  delete at once when confirmation is off. They then fall through to the "Otherwise, confirm" branch: there is no
  `else`. The document is normally already gone, so no dialog opens. If the delete was vetoed or failed, the
  confirmation dialog opens after the user turned confirmation off.
- **Found:** 2026-10-01 while diagnosing #102 (read in code).
- **Status:** Open.

### 104. Open sheets re-render on changes to a different actor that shares their id

- **What:** `ReactiveDocument.svelte.js` invalidates on `update<Document>` and on embedded Item/ActiveEffect hooks
  when the changed document's `id`, or its parent's, equals the bridged document's `id`. An unlinked token's synthetic
  actor has its base actor's id, so changes to any token's synthetic actor invalidate an open base-actor sheet, and
  the reverse. It should compare document identity, or `uuid`.
- **Found:** 2026-10-01 while diagnosing #102 (read in code).
- **Status:** Open.

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

### 107. Dropping an Item folder on an actor sheet creates nothing

- **What:** `TitanActorSheet#_onDropFolder` (`src/document/types/actor/sheet/TitanActorSheet.js:382`) reads
  `if (folder && folder.type !== 'Item')`. The condition is inverted, so it turns away every Item folder and handles
  only folders of other types. Dropping an Item folder from the Items sidebar onto an actor or token sheet creates no
  Item, with no notification and no error. This was measured on two token sheets in the #102 repro.
- **Found:** 2026-10-01 during the #102 real-path repro.
- **Status:** Open.

### 108. `TitanActor#getCombatant` uses a core API that is deprecated and removed in v15

- **What:** `src/document/types/actor/TitanActor.js:83` calls `game.combat?.getCombatantByActor(this.id)`. Foundry
  logs a deprecation warning: deprecated since v14 and removed in v15 (measured console warning in the #102 repro).
  The call passes `this.id`; for a token's synthetic actor that is the base actor's id (read), the same identity
  pattern as #104. Whether it then finds the wrong combatant has not been measured.
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

### 115. A turn report throws when an owning player has no assigned character

Found 2026-10-01 when the e2e harness gate began failing tests on page errors (test-suite rewrite, Phase 0 fix round
5e). The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-0/` (local, not checked in).

- **Measured** (`e2e-fix5e-gate.log`; stacks in `fix5e-diag-stacks-all.log`): every `socket-sync.spec.js` test raised
  `TypeError: Cannot read properties of null (reading 'id')` on E2E GM 1, in a `filter` callback of
  `getBestPlayerOwner` ← `_getTurnReportUserID` ← `onTurnStart` / `onTurnStartReverted`.
- **Cause, read:** `src/helpers/utility-functions/GetBestPlayerOwner.js` compared `owner.character.id` for each player
  owner. A user's `character` is a nullable `ForeignDocumentField` (Foundry 14.364 `common/documents/user.mjs:57`;
  `common/data/fields.mjs` `ForeignDocumentField` defaults `nullable: true`), so an owner with no assigned character
  throws.
- **Fixed** (2026-10-01): both comparisons read `owner.character?.id`. Measured after the fix
  (`fix5e-diag-stacks-socket-sync-after-115-fix.log`): no `reading 'id'` error in the run (20 matching lines before,
  `fix5e-diag-stacks-all.log`; 0 after).
- **Status:** Open until its gate test passes. The gate test is `socket-sync.spec.js` under the harness gate, which
  fails on this error; the spec still fails on #116 (and on #118 when no scene is active), so it cannot pass yet.

### 116. The combat tracker throws on a combat update when it views no updated combat

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-0/` (local, not checked in). Core
citations refer to Foundry 14.364 at `C:\FoundryVTT\V14\dev\foundry`.

- **Measured** (`e2e-fix5e-gate.log`, `fix5e-diag-stacks-all.log`): in every `socket-sync.spec.js` test, the E2E
  Player 1 client (and in A5 the E2E GM 2 client) raised `TypeError: Cannot use 'in' operator to search for 'turn' in
  undefined` at `CombatTracker._onRender` ← `#render`. Every frame of the stack is `foundry.mjs`.
- **Read:** `CombatTracker._onRender` sets `data = renderData.find(d => d._id === this.viewed?.id)` when
  `renderData` is an array, then evaluates `"turn" in data` (`client/applications/sidebar/tabs/combat-tracker.mjs:
  185-188`). When the array holds no entry for the viewed combat, or no combat is viewed, `data` is `undefined` and the
  `in` operator throws.
- **Not measured:** which combat each client viewed at the throw, and a control in a world without TITAN. Attribution
  to core is read from the source, not confirmed.
- **Found:** 2026-10-01, Phase 0 fix round 5e (the harness gate made `socket-sync.spec.js` fail on it).
- **Status:** Open; reported to the coordinator for a ruling (core or unclassified causes are not fixed in the run).

### 117. Deleting a chat message while its notification animates throws

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-0/` (local, not checked in). Core
citations refer to Foundry 14.364 at `C:\FoundryVTT\V14\dev\foundry`.

- **Measured** (`e2e-fix5e-gate.log`, `fix5e-diag-stacks-all.log`): `spell-rules-regressions.spec.js:473` raised
  `TypeError: Cannot set properties of null (setting 'hidden')` at `#postNotification` (`foundry.mjs`, the only frame).
- **Read:** `ChatLog#postNotification` awaits a 100 ms spacer animation, then re-queries the notification element by
  message id and sets `element.hidden = false` with no null check (`client/applications/sidebar/tabs/chat.mjs:1271,
  1296-1304`). The test posts a spell card with `sendToChat()`, waits for the card in `#chat`, and deletes the message
  in its `finally` block (`tests/e2e/spell-rules-regressions.spec.js:567-589`); a deletion inside that window leaves the
  query empty (inferred from the source, not measured by timing the deletion).
- **Not measured:** a control in a world without TITAN.
- **Found:** 2026-10-01, Phase 0 fix round 5e.
- **Status:** Open; reported to the coordinator for a ruling.

### 118. Seeding a combat with no scene drawn makes core draw tokens without a canvas

The evidence files named here are in `.superpowers/sdd/test-suite-rewrite/phase-0/` (local, not checked in). Core
citations refer to Foundry 14.364 at `C:\FoundryVTT\V14\dev\foundry`.

- **Measured:** with no active scene (after the census sweep removed the E2E scenes,
  `fix5e-sweep-after-failed-gate.log`), `combat-seed.spec.js` raised `TypeError: Cannot read properties of undefined
  (reading 'addChild')` twice at `GridLayer.addHighlightLayer` ← `TokenRuler.draw` ← `Token._draw` ←
  `PlaceableObject#draw` (`fix5e-diag-stacks-combat-seed-no-active-scene.log`). `socket-sync.spec.js`, run in the same
  state, raised the same error and `TypeError: Cannot read properties of undefined (reading 'OBJECTS')` at
  `RenderFlags.set` ← `TokenDocument._onRelatedUpdate` ← the actor's `_updateDependentTokens`
  (`fix5e-diag-stacks-socket-sync-after-115-fix.log`). Every frame is `foundry.mjs`.
- **Measured:** with an E2E scene active (the same spec run after other specs, `fix5e-diag-stacks-all.log`),
  `combat-seed.spec.js` passed. In the full gate (`e2e-fix5e-gate.log`) it failed with the `addChild` error.
- **Read:** the seed helper creates a scene that is not activated, then creates tokens on it
  (`tests/shared/combat.js:62-77`). `GridLayer.addHighlightLayer` adds to `this.highlight`
  (`client/canvas/layers/grid.mjs:98-103`), which is undefined until the canvas has drawn a scene. These are the same
  frames as CLOSED_BUGS #113, which a test helper caused by creating a token before the canvas drew.
- **Not diagnosed:** why core draws a token of a scene that is not viewed when no scene is drawn.
- **Found:** 2026-10-01, Phase 0 fix round 5e.
- **Status:** Open; reported to the coordinator for a ruling.
