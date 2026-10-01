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

### 93. Migration writes into an Adventure pack count as stored when Foundry rejected them

- **What:** The Adventure write target in `src/helpers/migration/StoredActorSources.js` (`createSourceTarget`) never
  checks what `adventure.update` returns. Core resolves `undefined`, without throwing, when the dry-run validation
  fails or a `preUpdate` hook vetoes the write, so the migration counts the actor as updated and can announce
  "complete" over writes that were never stored. The legacy-item converter also saves the actor list between creating
  the new effects and removing the legacy `effect` Items, so that intermediate save still holds an unregistered Item
  subtype, which core validation likely rejects (inferred from core source, not reproduced live). A rejected working
  copy is never reset, so later saves for the same Adventure carry it.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B), read in core source.
- **Status:** Open; fixed in Task 5 fix round 2.

### 94. Legacy timed effects converted inside an Adventure are stored enabled after they expired

- **What:** `TitanActiveEffect._preCreate` sets `showIcon` and disables a timed effect whose remaining duration is 0.
  Neither the migration's Adventure write path nor `Adventure#importContent` runs `_preCreate` for embedded effects,
  and `buildEffectData` stores every timed effect with `disabled: false`. An expired timed legacy effect converted
  inside an Adventure therefore applies its rules once the Adventure is imported, while the same effect converted on an
  actor is disabled.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B), read in core source.
- **Status:** Open; fixed in Task 5 fix round 2.

### 95. Migration shows "complete" when a world pack could not be read or re-locked

- **What:** `walkWorldPacks` reports a pack whose projection fails and skips it, and the lock restore logs and swallows
  its own failure. Neither failure is counted, so `migrateWorld` still shows "migration complete". When the only
  pending work sits in an unreadable pack, the scan answers "nothing to migrate" and no failure is ever shown.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B).
- **Status:** Open; fixed in Task 5 fix round 2.

### 96. Unlinked tokens whose base actor is gone are never migrated in world scenes and Scene packs

- **What:** The stored-actor walker skips an unlinked token without a base actor in world scenes and world Scene packs,
  so its delta keeps legacy `effect` Items and stale condition effects, while the Adventure path migrates such a
  token's delta as data. CLOSED_BUGS #83 says every stored actor is walked, which is not true for these tokens.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B).
- **Status:** Open; fixed in Task 5 fix round 2.

### 97. A failed version migration stores part-migrated data under the previous version

- **What:** `migrateDocument` in `src/helpers/migration/MigrateWorld.js` accumulates changes across the levels of a
  version. When a later level throws, it writes the earlier levels' changes together with the previous
  `documentVersion`, so a retry re-runs migrations on data they already changed. Latent: no version migrations exist
  yet.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B).
- **Status:** Open; fixed in Task 5 fix round 2.
