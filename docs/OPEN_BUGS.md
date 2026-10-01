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

### 102. Removals on an unlinked token did not survive a reload (unconfirmed; probe used raw-data tokens)

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
- **Cause:** unknown. Not attributed to Foundry core or to TITAN.
- **Next measurement:** a real-path repro in `test-titan`. Make the unlinked token both ways: a canvas drop of an
  actor whose prototype token is unlinked, and a placed linked token unlinked with the toggle, then the sheet
  reopened. Give the base actor two expired effects, run Clear Expired Effects from the UI, then reload and read what
  was stored. Only if that loses data, run the same steps in `test-pf2e`, which does not load TITAN.
- **Found:** 2026-10-01 while the Task 5 fix round 2 identity e2e (plan B) was seeding its tokens.
- **Status:** Open; unconfirmed until the real-path repro.

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
