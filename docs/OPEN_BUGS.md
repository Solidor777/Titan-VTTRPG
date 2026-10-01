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
- **Real-path token repro, measured (one complete run, `test-titan`, E2E GM 1):**
  - **Synthetic part:** the base actors and their two expired effects (`duration.remaining: 0`) were made through the
    document API. Under the no-synthetic-documents rule (`docs/TODO.md`) the repro is not yet fully valid.
  - **Tokens, made through the UI:**
    - token A: the actor dragged onto a viewed canvas, with an unlinked prototype token and the default name;
    - token B: a linked drop, unlinked with the token config toggle, and the sheet reopened.
  - **Before the clear:** both tokens stored `delta: null`.
  - **The clear:** Clear Expired Effects was run from the sheet's Effects tab and its dialog confirmed. The tab
    emptied, and the client delta held two effect tombstones.
  - **After a reload:** the server held `delta: null`, and both effects were back on the token and the sheet.
  - **Not measured:** the server state between the clear and the reload.
  - **Evidence:** logs and screenshots in `.superpowers/sdd/2026-09-29-conditions-rework/repro102/`
    (`run3.log`, `shots/`).
- **Cause:** unknown. Not attributed to Foundry core or to TITAN.
- **Next measurements:**
  - Repeat with the base actor and its effects also made through the UI, with effects expired through combat turns.
  - Read the server between the clear and the reload.
  - If the loss holds, run the same steps in `test-pf2e`, which does not load TITAN.
- **Found:** 2026-10-01 while the Task 5 fix round 2 identity e2e (plan B) was seeding its tokens.
- **Status:** Open. Reproduced once with real-path tokens; cause not yet located.

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
- **Status:** Open. Fixed together with the conversion of the e2e specs to real Foundry data (`docs/TODO.md`).

### 107. Dropping an Item folder on an actor sheet creates nothing

- **What:** `TitanActorSheet#_onDropFolder` (`src/document/types/actor/sheet/TitanActorSheet.js:383`) reads
  `if (folder && folder.type !== 'Item')`. The condition is inverted, so it turns away every Item folder and handles
  only folders of other types. Dropping an Item folder from the Items sidebar onto an actor or token sheet creates no
  Item, with no notification and no error. This was measured on two token sheets in the #102 repro.
- **Found:** 2026-10-01 during the #102 real-path repro.
- **Status:** Open.
