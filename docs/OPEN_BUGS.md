# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

### 92. A world actor, token or pack holding a base-type Active Effect fails to load (TITAN registers only the `effect` and `condition` AE types)

- **What:** `src/hooks/OnceInit.js` sets `CONFIG.ActiveEffect.dataModels` to `{ effect, condition }`, replacing core's
  `{ base: ActiveEffectTypeDataModel }`, so the client cannot construct a base-type Active Effect (`changes is not
  iterable` in core's `_shimChanges`). Measured live: `createEmbeddedDocuments` with a base-type effect creates
  nothing and raises no error; a world actor holding one stops the world from loading (`game.ready` never set, page
  error from `trackCollectionFailures`); a packed actor holding one loads with the effect in `invalidDocumentIds`, and
  deleting that effect throws and leaves it stored.
- **Found:** 2026-09-30 by the Task 5 fix round (plan B), measured live.
- **Status:** Not handled in code by user decision 2026-09-30 (local worlds cleaned one-off).

### 102. A multi-document create or delete on an unlinked token that has no stored delta is lost, along with every later write to that token

- **What:** An unlinked token whose stored `delta` is `null` loses a create or delete of two or more embedded
  documents through its synthetic actor. Core stores a `null` delta when the token is named like its base actor,
  which is core's default name. Examples are a two-effect create, or a two-id delete of inherited Items or effects.
  The client shows the change, and the server replies that every id succeeded, but nothing is stored. Every later
  delta write to that token is lost too, until something writes the Token record itself, for example moving the
  token. One-document calls, updates, and any call once the delta exists are stored. TITAN calls that send such a
  multi-document request:
  - `removeExpiredEffects` (`CharacterDataModel.js:4881`);
  - combat-effect cleanup (`:4908`);
  - turn-start expired-effect removal (`:5716`);
  - dropping several Items onto a token's sheet (`TitanActor.js:103` via `TitanActorSheet.js:393`).

  The sheet itself writes to the right document, the token's ActorDelta (measured). Cause, read in minified core
  `dist/database/backend/server-backend.mjs` and `embedded-delta.mjs` (not instrumented): `_createDocuments` and
  `_deleteDocuments` share one `writeParent` options object across documents processed concurrently. The first
  document's walk returns the Token, because the delta must be created. The second document's walk overwrites that
  with the ActorDelta, so only the delta is written and the Token keeps `delta: null`.
- **Found:** 2026-10-01 while the Task 5 fix round 2 identity e2e (plan B) was seeding its tokens. The user confirmed
  it is a bug. Measured live in `test-titan` with Migration Mode Disabled.
- **Status:** Open. The Foundry core defect needs a TITAN-side mitigation and an upstream report.

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
